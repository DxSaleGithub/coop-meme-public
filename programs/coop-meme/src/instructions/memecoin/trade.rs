use std::u64;

use crate::{
    error::*,
    events::{BondingCurveStartedEvent, ClaimedTokens, RefundSol, TradeEvent, TradingOverEvent},
    state::{ConfigData, MemeCoinData, UserData},
    utils::*,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct Trade<'info> {
    #[account[
      mut
    ]]
    pub trader: Signer<'info>,
    /// CHECK: This is a system account so safe.
    #[account[
      mut
    ]]
    pub affiliate: AccountInfo<'info>,
    /// CHECK: This is a system account so safe.
    #[account[
      mut,
      constraint = memecoin.creator == creator.key()
    ]]
    pub creator: AccountInfo<'info>,
    /// CHECK: This is a system account so safe.
    #[account[
      mut,
      constraint = config.team_wallet == team_wallet.key()
    ]]
    pub team_wallet: AccountInfo<'info>,
    #[account[
      mut,
      seeds = [b"config"],
      bump = config.config_bump
    ]]
    pub config: Box<Account<'info, ConfigData>>,
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.
    /// It does not store any data and is used only for lamport/token transfers.
    /// PDA seeds = [b"global"], bump = config.global_vault_bump
    #[account(
      mut,
      seeds = [b"global"],
      bump = config.global_vault_bump
    )]
    pub global_vault: AccountInfo<'info>,
    #[account(
      seeds = [b"mint", creator.key().as_ref(), &memecoin.token_id.to_le_bytes(), &memecoin.token_nonce.to_le_bytes()],
      bump = memecoin.token_bump
    )]
    pub coop_token: Box<Account<'info, Mint>>,
    #[account[
      mut,
      seeds = [b"memecoin", coop_token.key().as_ref()],
      bump = memecoin.memecoin_bump
    ]]
    pub memecoin: Box<Account<'info, MemeCoinData>>,
    #[account(
      mut,
      associated_token::mint = coop_token,
      associated_token::authority = global_vault
    )]
    pub global_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is an ATA for coop token for trader.
    #[account(
      init_if_needed,
      associated_token::mint=coop_token,
      associated_token::authority=trader,
      associated_token::token_program=token_program,
      payer=trader
    )]
    pub trader_token_ata: Box<Account<'info, TokenAccount>>, // /// CHECK: This is an ATA for coop token for trade
    /// CHECK: This is an ATA for coop token for trader.
    #[account(
      init_if_needed,
      payer=trader,
      space= 8 + UserData::INIT_SPACE,
      seeds = [b"user", trader.key().as_ref(), coop_token.key().as_ref()],
      bump
    )]
    pub user_data: Box<Account<'info, UserData>>,

    pub system_program: Program<'info, System>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,

    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Trade<'info> {
    pub fn buy_tokens(&mut self, amount: u64, min_tokens_receive: u64) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        require!(
            self.memecoin.bonding_curve_buy_cap >= amount,
            CoopMemeError::CapExceeded
        );
        require!(amount > 0, CoopMemeError::InsufficientAmount);

        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp; // i64 in seconds
        if (current_time as u64 > self.memecoin.token_market_end_time) {
            if !self.memecoin.is_trading_active {
                self.memecoin.is_trading_active = false;
                self.config.current_coop_token_metadata.is_trading_active = false;
                emit!(TradingOverEvent {
                    coop_token: self.coop_token.key(),
                    memecoin: self.memecoin.key(),
                });
            }
            return Ok(());
        }
        if current_time as u64 > self.memecoin.token_fairlaunch_end_time {
            if !self.memecoin.is_bonding_curve_active {
                self.memecoin.is_bonding_curve_active = true;
                self.config
                    .current_coop_token_metadata
                    .is_bonding_curve_active = true;
                emit!(BondingCurveStartedEvent {
                    coop_token: self.config.current_coop_token_metadata.token_mint.key(),
                    memecoin: self.memecoin.key(),
                });
            }
        } else {
            return Err((CoopMemeError::TradingFairlaunchNotOver).into());
        }

        let current_global_vault_sol = self.global_vault.lamports();

        if !self.memecoin.initial_sale && self.memecoin.fairlaunch_sol_raised > 0 {
            // buy tokens using fairlaunch sol raised
            let fairlaunch_cap = self.memecoin.fairlaunch_cap;
            let token_raised = self.memecoin.fairlaunch_sol_raised;

            let mut sol_amount_to_buy;

            if token_raised < fairlaunch_cap {
                sol_amount_to_buy = token_raised;
            } else {
                sol_amount_to_buy = fairlaunch_cap;
            }
            let token_amount_from_fairlaunch = calculate_token_amount_when_buy(
                sol_amount_to_buy,
                self.memecoin.is_bonding_curve_active,
                0,
                self.memecoin.virtual_sol_reserves,
                self.memecoin.virtual_token_reserves,
            )
            .unwrap();

            self.memecoin.virtual_sol_reserves = self
                .memecoin
                .virtual_sol_reserves
                .checked_add(sol_amount_to_buy)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap();
            self.memecoin.virtual_token_reserves = self
                .memecoin
                .virtual_token_reserves
                .checked_sub(token_amount_from_fairlaunch)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap();
            self.memecoin.real_sol_reserves = self
                .memecoin
                .real_sol_reserves
                .checked_add(sol_amount_to_buy)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap();
            self.memecoin.real_token_reserves = self
                .memecoin
                .real_token_reserves
                .checked_sub(token_amount_from_fairlaunch)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap();

            self.memecoin.initial_sale = true;
            self.memecoin.fairlaunch_token_reserves = token_amount_from_fairlaunch;
        }

        let team_fees = self._calculate_and_send_fees(amount).unwrap().unwrap();
        let amount_to_buy = amount
            .checked_sub(team_fees)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        let token_amount = calculate_token_amount_when_buy(
            amount_to_buy,
            self.memecoin.is_bonding_curve_active,
            0,
            self.memecoin.virtual_sol_reserves,
            self.memecoin.virtual_token_reserves,
        )
        .unwrap();

        self.memecoin.virtual_sol_reserves = self
            .memecoin
            .virtual_sol_reserves
            .checked_add(amount_to_buy)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.memecoin.virtual_token_reserves = self
            .memecoin
            .virtual_token_reserves
            .checked_sub(token_amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.memecoin.real_sol_reserves = self
            .memecoin
            .real_sol_reserves
            .checked_add(amount_to_buy)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.memecoin.real_token_reserves = self
            .memecoin
            .real_token_reserves
            .checked_sub(token_amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();

        let one_unit = 1_000_000_000;
        if self.memecoin.real_token_reserves < (300_000_000 * one_unit) {
            self.memecoin.bonding_curve_buy_cap = u64::MAX;
        } else {
            let new_buy_cap = (self.memecoin.token_total_supply
                - self.memecoin.real_token_reserves)
                / (100_000_000 * one_unit);
            if new_buy_cap > 1 {
                self.memecoin.bonding_curve_buy_cap = new_buy_cap * one_unit;
            } else {
                self.memecoin.bonding_curve_buy_cap = one_unit;
            }
        }

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];
        require!(
            token_amount >= min_tokens_receive,
            CoopMemeError::InsufficientAmount
        );

        let seeds_for_unfreeze: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];
        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.trader_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        token_transfer_with_signer(
            self.global_token_ata.to_account_info(),
            self.global_vault.to_account_info(),
            self.trader_token_ata.to_account_info(),
            &self.token_program,
            &[seeds],
            token_amount as u64,
        )?;

        let seeds_for_freeze: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        freeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.trader_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_freeze],
        )?;

        emit!(TradeEvent {
            trader: self.trader.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            amount_in: amount as u64,
            direction: 1, // from SOL to tokens
            minimum_receive_amount: min_tokens_receive as u64,
            amount_out: token_amount as u64,
            timestamp: Clock::get()?.unix_timestamp as u64
        });

        require!(
            self.global_vault.lamports() == current_global_vault_sol + amount_to_buy,
            CoopMemeError::DepositFailed
        );

        Ok(())
    }

    pub fn sell_tokens(&mut self, amount: u64, min_sol_receive: u64) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp; // i64 in seconds

        if (current_time as u64 > self.memecoin.token_market_end_time) {
            if !self.memecoin.is_trading_active {
                self.memecoin.is_trading_active = false;
                self.config.current_coop_token_metadata.is_trading_active = false;
                emit!(TradingOverEvent {
                    coop_token: self.coop_token.key(),
                    memecoin: self.memecoin.key(),
                });
            }
            return Ok(());
        }
        if current_time as u64 > self.memecoin.token_fairlaunch_end_time {
            if !self.memecoin.is_bonding_curve_active {
                self.memecoin.is_bonding_curve_active = true;
                self.config
                    .current_coop_token_metadata
                    .is_bonding_curve_active = true;
                emit!(BondingCurveStartedEvent {
                    coop_token: self.config.current_coop_token_metadata.token_mint.key(),
                    memecoin: self.memecoin.key(),
                });
            }
        } else {
            return Err((CoopMemeError::TradingFairlaunchNotOver).into());
        }

        let current_global_vault_sol = self.global_vault.lamports();

        let sol_amount = calculate_sol_amount_when_sell(
            amount,
            self.memecoin.is_bonding_curve_active,
            0,
            self.memecoin.virtual_sol_reserves,
            self.memecoin.virtual_token_reserves,
        )
        .unwrap();
        require!(
            sol_amount >= min_sol_receive,
            CoopMemeError::InsufficientAmount
        );

        let seeds_for_unfreeze: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.trader_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        token_transfer_user(
            self.trader_token_ata.to_account_info(),
            &self.trader,
            self.global_token_ata.to_account_info(),
            &self.token_program,
            amount as u64,
        )?;

        let team_fees = self
            ._calculate_and_send_fees_with_signer(sol_amount)
            .unwrap()
            .unwrap();

        self.memecoin.virtual_sol_reserves = self
            .memecoin
            .virtual_sol_reserves
            .checked_sub(sol_amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.memecoin.virtual_token_reserves = self
            .memecoin
            .virtual_token_reserves
            .checked_add(amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.memecoin.real_sol_reserves = self
            .memecoin
            .real_sol_reserves
            .checked_sub(sol_amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.memecoin.real_token_reserves = self
            .memecoin
            .real_token_reserves
            .checked_add(amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();

        let seeds_for_freeze: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        freeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.trader_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_freeze],
        )?;
        emit!(TradeEvent {
            trader: self.trader.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            amount_in: amount as u64,
            direction: 2, // from tokens to SOL
            minimum_receive_amount: min_sol_receive as u64,
            amount_out: sol_amount as u64,
            timestamp: Clock::get()?.unix_timestamp as u64
        });

        require!(
            self.global_vault.lamports() == current_global_vault_sol - sol_amount,
            CoopMemeError::DepositFailed
        );

        Ok(())
    }

    // pub fn claim_tokens(&mut self) -> Result<()> {
    //     require!(!self.config.is_paused, CoopMemeError::Paused);
    //     if self.memecoin.is_trading_active {
    //         require!(
    //             self.memecoin.is_bonding_curve_active,
    //             CoopMemeError::TradingFairlaunchNotOver
    //         );
    //     } else {
    //         require!(self.memecoin.is_token_listed, CoopMemeError::TokenNotListed);
    //     }
    //     if self.memecoin.fairlaunch_sol_raised > 0 {
    //         require!(self.memecoin.initial_sale, CoopMemeError::TradingNotActive);
    //     }
    //     require!(
    //         self.user_data.sol_deposit > 0,
    //         CoopMemeError::NoDepositInFairlaunch
    //     );
    //     require!(
    //         !self.user_data.tokens_claimed,
    //         CoopMemeError::AlreadyClaimed
    //     );

    //     // Safe proportional token calculation (divide-first order)
    //     let numerator = (self.user_data.sol_deposit as u128)
    //         .checked_mul(self.memecoin.fairlaunch_token_reserves as u128)
    //         .ok_or_else(|| error!(CoopMemeError::InvalidOperation))?;

    //     let user_tokens_u128 = numerator
    //         .checked_div(self.memecoin.fairlaunch_sol_raised as u128)
    //         .ok_or_else(|| error!(CoopMemeError::InvalidOperation))?;

    //     require!(
    //         user_tokens_u128 < u64::MAX as u128,
    //         CoopMemeError::InvalidOperation
    //     );
    //     let user_tokens = user_tokens_u128 as u64;

    //     self.user_data.tokens_claimed = true;

    //     let seeds: &[&[u8]] = &[
    //         b"global",                        // your static seed
    //         &[self.config.global_vault_bump], // your bump, wrapped as byte slice
    //     ];
    //     let seeds_for_unfreeze: &[&[u8]] = &[
    //         b"global",                        // your static seed
    //         &[self.config.global_vault_bump], // your bump, wrapped as byte slice
    //     ];

    //     unfreeze_user_token_account(
    //         self.global_vault.to_account_info(),
    //         self.coop_token.to_account_info(),
    //         self.trader_token_ata.to_account_info(),
    //         self.token_program.to_account_info(),
    //         &[seeds_for_unfreeze],
    //     )?;

    //     token_transfer_with_signer(
    //         self.global_token_ata.to_account_info(),
    //         self.global_vault.to_account_info(),
    //         self.trader_token_ata.to_account_info(),
    //         &self.token_program,
    //         &[seeds],
    //         user_tokens as u64,
    //     )?;

    //     let seeds_for_freeze: &[&[u8]] = &[
    //         b"global",                        // your static seed
    //         &[self.config.global_vault_bump], // your bump, wrapped as byte slice
    //     ];

    //     if !self.memecoin.is_token_listed {
    //         freeze_user_token_account(
    //             self.global_vault.to_account_info(),
    //             self.coop_token.to_account_info(),
    //             self.trader_token_ata.to_account_info(),
    //             self.token_program.to_account_info(),
    //             &[seeds_for_freeze],
    //         )?;
    //     }

    //     emit!(ClaimedTokens {
    //         trader: self.trader.key(),
    //         coop_token: self.coop_token.key(),
    //         memecoin: self.memecoin.key(),
    //         contributed_sol: self.user_data.sol_deposit,
    //         amount: user_tokens,
    //         timestamp: Clock::get()?.unix_timestamp as u64
    //     });

    //     Ok(())
    // }

    pub fn claim_tokens_and_refund_sol(&mut self) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        if self.memecoin.is_trading_active {
            require!(
                self.memecoin.is_bonding_curve_active,
                CoopMemeError::TradingFairlaunchNotOver
            );
        } else {
            require!(self.memecoin.is_token_listed, CoopMemeError::TokenNotListed);
        }
        require!(
            self.user_data.sol_deposit > 0,
            CoopMemeError::NoDepositInFairlaunch
        );
        require!(!self.user_data.refund, CoopMemeError::AlreadyRefunded);
        require!(
            !self.user_data.tokens_claimed,
            CoopMemeError::AlreadyClaimed
        );
        if self.memecoin.fairlaunch_sol_raised > 0 {
            require!(self.memecoin.initial_sale, CoopMemeError::TradingNotActive);
        }
        let mut is_refund: bool = false;

        if self.memecoin.fairlaunch_sol_raised > self.memecoin.fairlaunch_cap {
            is_refund = true;
        }

        if is_refund {
            // Safe proportional token calculation (divide-first order)
            let numerator = (self.user_data.sol_deposit as u128)
                .checked_mul(self.memecoin.fairlaunch_cap as u128)
                .ok_or_else(|| error!(CoopMemeError::InvalidOperation))?;

            let user_real_sol_u128 = numerator
                .checked_div(self.memecoin.fairlaunch_sol_raised as u128)
                .ok_or_else(|| error!(CoopMemeError::InvalidOperation))?;

            require!(
                user_real_sol_u128 < u64::MAX as u128,
                CoopMemeError::InvalidOperation
            );
            let user_real_sol = user_real_sol_u128 as u64;

            require!(
                user_real_sol <= self.memecoin.fairlaunch_cap
                    && self.user_data.sol_deposit > user_real_sol,
                CoopMemeError::InvalidFairSharePrice
            );
            let sol_to_refund = self.user_data.sol_deposit - user_real_sol;

            if sol_to_refund > 0 {
                let seeds: &[&[u8]] = &[
                    b"global",                        // your static seed
                    &[self.config.global_vault_bump], // your bump, wrapped as byte slice
                ];

                self.user_data.refund = true;

                sol_transfer_with_signer(
                    self.global_vault.to_account_info(),
                    self.trader.to_account_info(),
                    &self.system_program,
                    &[seeds],
                    sol_to_refund as u64,
                )?;
            }

            emit!(RefundSol {
                trader: self.trader.key(),
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
                contributed_sol: self.user_data.sol_deposit,
                refund_sol: sol_to_refund,
                timestamp: Clock::get()?.unix_timestamp as u64
            });
        }

        // claim tokens

        // Safe proportional token calculation (divide-first order)
        let numerator = (self.user_data.sol_deposit as u128)
            .checked_mul(self.memecoin.fairlaunch_token_reserves as u128)
            .ok_or_else(|| error!(CoopMemeError::InvalidOperation))?;

        let user_tokens_u128 = numerator
            .checked_div(self.memecoin.fairlaunch_sol_raised as u128)
            .ok_or_else(|| error!(CoopMemeError::InvalidOperation))?;

        require!(
            user_tokens_u128 < u64::MAX as u128,
            CoopMemeError::InvalidOperation
        );
        let user_tokens = user_tokens_u128 as u64;

        if user_tokens > 0 {
            self.user_data.tokens_claimed = true;

            let seeds: &[&[u8]] = &[
                b"global",                        // your static seed
                &[self.config.global_vault_bump], // your bump, wrapped as byte slice
            ];
            let seeds_for_unfreeze: &[&[u8]] = &[
                b"global",                        // your static seed
                &[self.config.global_vault_bump], // your bump, wrapped as byte slice
            ];

            unfreeze_user_token_account(
                self.global_vault.to_account_info(),
                self.coop_token.to_account_info(),
                self.trader_token_ata.to_account_info(),
                self.token_program.to_account_info(),
                &[seeds_for_unfreeze],
            )?;

            token_transfer_with_signer(
                self.global_token_ata.to_account_info(),
                self.global_vault.to_account_info(),
                self.trader_token_ata.to_account_info(),
                &self.token_program,
                &[seeds],
                user_tokens,
            )?;

            let seeds_for_freeze: &[&[u8]] = &[
                b"global",                        // your static seed
                &[self.config.global_vault_bump], // your bump, wrapped as byte slice
            ];

            if !self.memecoin.is_token_listed {
                freeze_user_token_account(
                    self.global_vault.to_account_info(),
                    self.coop_token.to_account_info(),
                    self.trader_token_ata.to_account_info(),
                    self.token_program.to_account_info(),
                    &[seeds_for_freeze],
                )?;
            }
        }

        emit!(ClaimedTokens {
            trader: self.trader.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            contributed_sol: self.user_data.sol_deposit,
            amount: user_tokens,
            timestamp: Clock::get()?.unix_timestamp as u64
        });

        Ok(())
    }

    fn _calculate_and_send_fees(&self, amount: u64) -> Result<(Option<((u64))>)> {
        // let team_fees = amount *  / 10000;
        let team_fees = amount
            .checked_mul(self.config.team_fee as u64)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap()
            .checked_div(10000)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        // let owner_fees = team_fees * self.config.owner_fee as u64 / 10000;
        // let owner_fees = team_fees
        //     .checked_mul(self.config.owner_fee as u64)
        //     .ok_or(CoopMemeError::InvalidOperation)
        //     .unwrap()
        //     .checked_div(10000)
        //     .ok_or(CoopMemeError::InvalidOperation)
        //     .unwrap();

        // let affiliate_fees = team_fees * self.config.affiliated_fee as u64 / 10000;
        // let affiliate_fees = team_fees
        //     .checked_mul(self.config.affiliated_fee as u64)
        //     .ok_or(CoopMemeError::InvalidOperation)
        //     .unwrap()
        //     .checked_div(10000)
        //     .ok_or(CoopMemeError::InvalidOperation)
        //     .unwrap();

        // sol_transfer_from_user(
        //     &self.trader,
        //     self.creator.to_account_info(),
        //     &self.system_program,
        //     owner_fees as u64,
        // )?;

        // sol_transfer_from_user(
        //     &self.trader,
        //     self.affiliate.to_account_info(),
        //     &self.system_program,
        //     affiliate_fees as u64,
        // )?;

        sol_transfer_from_user(
            &self.trader,
            self.team_wallet.to_account_info(),
            &self.system_program,
            team_fees,
        )?;

        sol_transfer_from_user(
            &self.trader,
            self.global_vault.to_account_info(),
            &self.system_program,
            (amount
                .checked_sub(team_fees)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()) as u64,
        )?;

        return Ok(Some(team_fees as u64));
    }

    fn _calculate_and_send_fees_with_signer(&self, amount: u64) -> Result<(Option<((u64))>)> {
        let team_fees = amount
            .checked_mul(self.config.team_fee as u64)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap()
            .checked_div(10000)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        // let owner_fees = team_fees * self.config.owner_fee as u64 / 10000;
        // let owner_fees = team_fees
        //     .checked_mul(self.config.owner_fee as u64)
        //     .ok_or(CoopMemeError::InvalidOperation)
        //     .unwrap()
        //     .checked_div(10000)
        //     .ok_or(CoopMemeError::InvalidOperation)
        //     .unwrap();

        // let affiliate_fees = team_fees * self.config.affiliated_fee as u64 / 10000;
        // let affiliate_fees = team_fees
        //     .checked_mul(self.config.affiliated_fee as u64)
        //     .ok_or(CoopMemeError::InvalidOperation)
        //     .unwrap()
        //     .checked_div(10000)
        //     .ok_or(CoopMemeError::InvalidOperation)
        //     .unwrap();

        let seeds: &[&[u8]] = &[b"global", &[self.config.global_vault_bump]];

        // sol_transfer_with_signer(
        //     self.global_vault.to_account_info(),
        //     self.creator.to_account_info(),
        //     &self.system_program,
        //     &[seeds],
        //     owner_fees as u64,
        // )?;

        // sol_transfer_with_signer(
        //     self.global_vault.to_account_info(),
        //     self.affiliate.to_account_info(),
        //     &self.system_program,
        //     &[seeds],
        //     affiliate_fees as u64,
        // )?;

        sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.team_wallet.to_account_info(),
            &self.system_program,
            &[seeds],
            team_fees,
        )?;

        sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.trader.to_account_info(),
            &self.system_program,
            &[seeds],
            (amount
                .checked_sub(team_fees)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()) as u64,
        )?;
        return Ok(Some(team_fees as u64));
    }
}
