use crate::{
    error::*,
    events::{BondingCurveStartedEvent, TradeEvent},
    state::{ConfigData, MemeCoinData},
    utils::*,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    metadata::{self, Metadata},
    token::{self, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct TradeFairlaunch<'info> {
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
      seeds = [b"mint", config.current_coop_token_metadata.token_mint.key().as_ref(), &memecoin.token_id.to_le_bytes()],
      bump = memecoin.token_fairlaunch_bump
    )]
    pub coop_token: Box<Account<'info, Mint>>,
    #[account[
      mut,
      seeds = [b"memecoin", config.current_coop_token_metadata.token_mint.key().as_ref()],
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
    pub trader_token_ata: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,

    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,

    #[account(address = metadata::ID)]
    mpl_token_metadata_program: Program<'info, Metadata>,
}

impl<'info> TradeFairlaunch<'info> {
    pub fn buy_tokens(&mut self, amount: u64, min_tokens_receive: u64) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        require!(
            !self.memecoin.is_bonding_curve_active,
            CoopMemeError::TradingFairlaunchOver
        );
        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp; // i64 in seconds

        if (current_time as u64 > self.memecoin.token_fairlaunch_end_time
            && !self.memecoin.is_bonding_curve_active)
        {
            self.memecoin.is_bonding_curve_active = true;
            self.config
                .current_coop_token_metadata
                .is_bonding_curve_active = true;
            emit!(BondingCurveStartedEvent {
                coop_token: self.config.current_coop_token_metadata.token_mint.key(),
                memecoin: self.memecoin.key(),
            });
            return Ok(());
        }

        let team_fees = self._calculate_and_send_fees(amount).unwrap().unwrap();
        let mut amount_to_buy = amount
            .checked_sub(team_fees)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        let mut token_amount = calculate_token_amount_when_buy(
            amount_to_buy,
            self.memecoin.is_bonding_curve_active,
            self.memecoin.token_share_price,
            self.memecoin.virtual_sol_reserves,
            self.memecoin.virtual_token_reserves,
        )
        .unwrap();

        // check if 600 million fairlaunch tokens has been sold, if yes, start bonding curve
        if token_amount > self.memecoin.fairlaunch_token_reserves {
            let refund_token = token_amount - self.memecoin.fairlaunch_token_reserves;
            let refund_sol = calculate_sol_amount_when_sell(
                refund_token,
                false,
                self.memecoin.token_share_price,
                self.memecoin.virtual_sol_reserves,
                self.memecoin.virtual_token_reserves,
            )
            .unwrap();
            token_amount = self.memecoin.fairlaunch_token_reserves;
            amount_to_buy = amount_to_buy - refund_sol;

            let seeds: &[&[u8]] = &[
                b"global",                        // your static seed
                &[self.config.global_vault_bump], // your bump, wrapped as byte slice
            ];

            sol_transfer_with_signer(
                self.global_vault.to_account_info(),
                self.trader.to_account_info(),
                &self.system_program,
                &[seeds],
                refund_sol,
            )?;

            self.memecoin.is_bonding_curve_active = true;
            self.config
                .current_coop_token_metadata
                .is_bonding_curve_active = true;
            emit!(BondingCurveStartedEvent {
                coop_token: self.config.current_coop_token_metadata.token_mint.key(),
                memecoin: self.memecoin.key(),
            });
        }

        self.memecoin.fairlaunch_sol_raised = self
            .memecoin
            .fairlaunch_sol_raised
            .checked_add(amount_to_buy)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.memecoin.real_token_reserves = self
            .memecoin
            .real_token_reserves
            .checked_sub(token_amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.memecoin.fairlaunch_token_reserves = self
            .memecoin
            .fairlaunch_token_reserves
            .checked_sub(token_amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];
        require!(
            token_amount > min_tokens_receive,
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
            coop_token: self.config.current_coop_token_metadata.token_mint.key(),
            memecoin: self.memecoin.key(),
            amount_in: amount as u64,
            direction: 1, // from SOL to fairlaunch tokens
            minimum_receive_amount: min_tokens_receive as u64,
            amount_out: token_amount as u64,
            timestamp: Clock::get()?.unix_timestamp as u64
        });

        Ok(())
    }

    pub fn sell_tokens(&mut self, amount: u64, min_sol_receive: u64) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        require!(
            !self.memecoin.is_bonding_curve_active,
            CoopMemeError::TradingFairlaunchOver
        );
        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp; // i64 in seconds

        if (current_time as u64 > self.memecoin.token_fairlaunch_end_time
            && !self.memecoin.is_bonding_curve_active)
        {
            self.memecoin.is_bonding_curve_active = true;
            self.config
                .current_coop_token_metadata
                .is_bonding_curve_active = true;
            emit!(BondingCurveStartedEvent {
                coop_token: self.config.current_coop_token_metadata.token_mint.key(),
                memecoin: self.memecoin.key(),
            });

            return Ok(());
        }

        let sol_amount = calculate_sol_amount_when_sell(
            amount,
            self.memecoin.is_bonding_curve_active,
            self.memecoin.token_share_price,
            self.memecoin.virtual_sol_reserves,
            self.memecoin.virtual_token_reserves,
        )
        .unwrap();
        require!(
            sol_amount > min_sol_receive,
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

        self.memecoin.fairlaunch_sol_raised = self
            .memecoin
            .fairlaunch_sol_raised
            .checked_sub(sol_amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.memecoin.real_token_reserves = self
            .memecoin
            .real_token_reserves
            .checked_add(amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.memecoin.fairlaunch_token_reserves = self
            .memecoin
            .fairlaunch_token_reserves
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
            coop_token: self.config.current_coop_token_metadata.token_mint.key(),
            memecoin: self.memecoin.key(),
            amount_in: amount as u64,
            direction: 2, // from tokens to SOL
            minimum_receive_amount: min_sol_receive as u64,
            amount_out: sol_amount as u64,
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
        let owner_fees = team_fees
            .checked_mul(self.config.owner_fee as u64)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap()
            .checked_div(10000)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        // let affiliate_fees = team_fees * self.config.affiliated_fee as u64 / 10000;
        let affiliate_fees = team_fees
            .checked_mul(self.config.affiliated_fee as u64)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap()
            .checked_div(10000)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();

        sol_transfer_from_user(
            &self.trader,
            self.creator.to_account_info(),
            &self.system_program,
            owner_fees as u64,
        )?;

        sol_transfer_from_user(
            &self.trader,
            self.affiliate.to_account_info(),
            &self.system_program,
            (affiliate_fees as u64),
        )?;

        sol_transfer_from_user(
            &self.trader,
            self.team_wallet.to_account_info(),
            &self.system_program,
            (team_fees
                .checked_sub(owner_fees)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()
                .checked_sub(affiliate_fees)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()) as u64,
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
        // let team_fees = amount *  / 10000;
        let team_fees = amount
            .checked_mul(self.config.team_fee as u64)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap()
            .checked_div(10000)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        // let owner_fees = team_fees * self.config.owner_fee as u64 / 10000;
        let owner_fees = team_fees
            .checked_mul(self.config.owner_fee as u64)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap()
            .checked_div(10000)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        // let affiliate_fees = team_fees * self.config.affiliated_fee as u64 / 10000;
        let affiliate_fees = team_fees
            .checked_mul(self.config.affiliated_fee as u64)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap()
            .checked_div(10000)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.creator.to_account_info(),
            &self.system_program,
            &[seeds],
            owner_fees as u64,
        )?;

        sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.affiliate.to_account_info(),
            &self.system_program,
            &[seeds],
            affiliate_fees as u64,
        )?;

        sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.team_wallet.to_account_info(),
            &self.system_program,
            &[seeds],
            (team_fees
                .checked_sub(owner_fees)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()
                .checked_sub(affiliate_fees)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()) as u64,
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
