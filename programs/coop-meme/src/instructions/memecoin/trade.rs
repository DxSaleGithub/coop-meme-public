use crate::{
    error::*,
    events::{BondingCurveStartedEvent, TradeEvent, TradingOverEvent},
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
      seeds = [b"mint", creator.key().as_ref(), &memecoin.token_id.to_le_bytes()],
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
    pub trader_token_ata: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,

    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,

    #[account(address = metadata::ID)]
    mpl_token_metadata_program: Program<'info, Metadata>,
}

impl<'info> Trade<'info> {
    pub fn buy_tokens(&mut self, amount: u64, min_tokens_receive: u64) -> Result<()> {
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp; // i64 in seconds

        if (current_time as u64 > self.memecoin.token_market_end_time) {
            self.memecoin.is_trading_active = false;
            emit!(TradingOverEvent {
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
            });
            return Ok(());
        }

        if (current_time as u64 > self.memecoin.token_fairlaunch_end_time
            && !self.memecoin.is_bonding_curve_active)
        {
            self.memecoin.is_bonding_curve_active = true;
            // Set virtual reserves to preserve price and ensure curve continuity
            // self.memecoin.virtual_sol_reserves = 1_000_000_000; // 1 SOL (in lamports)
            // self.memecoin.virtual_token_reserves = (1_000_000_000u128)
            //     .checked_mul(1_000_000_000) // 9 decimals
            //     .unwrap()
            //     .checked_div(self.memecoin.token_share_price as u128)
            //     .unwrap()
            //     .try_into()
            //     .unwrap();

            self.memecoin.virtual_sol_reserves = (self.memecoin.token_share_price as u128)
                .checked_mul(self.memecoin.virtual_token_reserves as u128)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()
                .checked_div(1_000_000_000u128)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()
                .try_into()
                .unwrap();
            emit!(BondingCurveStartedEvent {
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
            });
        }

        let team_fees = self._calculate_and_send_fees(amount).unwrap().unwrap();
        let amount_to_buy = amount
            .checked_sub(team_fees)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        // let team_fees = 0;
        let token_amount = self
            ._calculate_token_amount_when_buy(amount_to_buy, self.memecoin.is_bonding_curve_active)
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

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];
        require!(
            token_amount > min_tokens_receive,
            CoopMemeError::InsufficientAmount
        );

        token_transfer_with_signer(
            self.global_token_ata.to_account_info(),
            self.global_vault.to_account_info(),
            self.trader_token_ata.to_account_info(),
            &self.token_program,
            &[seeds],
            token_amount as u64,
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

        Ok(())
    }

    pub fn sell_tokens(&mut self, amount: u64, min_sol_receive: u64) -> Result<()> {
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp; // i64 in seconds

        if (current_time as u64 > self.memecoin.token_market_end_time) {
            self.memecoin.is_trading_active = false;
            emit!(TradingOverEvent {
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
            });
            return Ok(());
        }

        if (current_time as u64 > self.memecoin.token_fairlaunch_end_time
            && !self.memecoin.is_bonding_curve_active)
        {
            self.memecoin.is_bonding_curve_active = true;
            // Set virtual reserves to preserve price and ensure curve continuity
            // self.memecoin.virtual_sol_reserves = 1_000_000_000; // 1 SOL (in lamports)
            // self.memecoin.virtual_token_reserves = (1_000_000_000u128)
            //     .checked_mul(1_000_000_000) // 9 decimals
            //     .unwrap()
            //     .checked_div(self.memecoin.token_share_price as u128)
            //     .unwrap()
            //     .try_into()
            //     .unwrap();
            self.memecoin.virtual_sol_reserves = (self.memecoin.token_share_price as u128)
                .checked_mul(self.memecoin.virtual_token_reserves as u128)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()
                .checked_div(1_000_000_000u128)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()
                .try_into()
                .unwrap();
            emit!(BondingCurveStartedEvent {
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
            });
        }

        let sol_amount = self
            ._calculate_sol_amount_when_sell(amount, self.memecoin.is_bonding_curve_active)
            .unwrap();
        require!(
            sol_amount > min_sol_receive,
            CoopMemeError::InsufficientAmount
        );

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
        // let sol_amount_to_sell = sol_amount
        //     .checked_sub(team_fees)
        //     .ok_or(CoopMemeError::InvalidOperation)
        //     .unwrap();

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
        // let team_fees = amount * self.config.team_fee as u64 / 10000;
        // let owner_fees = team_fees * self.config.owner_fee as u64 / 10000;
        // let affiliate_fees = team_fees * self.config.affiliated_fee as u64 / 10000;

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

    fn _calculate_token_amount_when_buy(
        &self,
        amount: u64,
        is_bonding_curve_active: bool,
    ) -> Option<u64> {
        let mut token_amount;
        if (!is_bonding_curve_active) {
            // token_amount using fairlaunch
            // token_amount = amount / (self.memecoin.token_share_price as u64) * 1_000_000_000;
            token_amount = (amount as u128)
                .checked_mul(1_000_000_000 as u128)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()
                .checked_div(self.memecoin.token_share_price as u128)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap();
            return Some(token_amount as u64);
        } else {
            // token amount using bonding curve
            return self._get_tokens_for_buy_sol(amount as u64);
        }
    }

    fn _get_tokens_for_buy_sol(&self, sol_amount: u64) -> Option<u64> {
        if sol_amount == 0 {
            return None;
        }

        // Convert to common decimal basis (using 9 decimals as base)
        let current_sol = self.memecoin.virtual_sol_reserves;
        let current_tokens = (self.memecoin.virtual_token_reserves);

        // Calculate new reserves using constant product formula
        let new_sol = current_sol.checked_add(sol_amount)?;
        let new_tokens = ((current_sol as u128).checked_mul(current_tokens as u128)?)
            .checked_div(new_sol as u128)?;

        let tokens_out = current_tokens.checked_sub(new_tokens as u64)?;

        // <u64 as TryInto<u64>>::try_into(tokens_out).ok()
        return Some(tokens_out);
    }

    fn _calculate_sol_amount_when_sell(
        &self,
        amount: u64,
        is_bonding_curve_active: bool,
    ) -> Option<u64> {
        let mut sol_amount;
        if (!is_bonding_curve_active) {
            // sol amount using fairlaunch
            // sol_amount = amount * (self.memecoin.token_share_price as u64) / 1_000_000_000;
            sol_amount = (amount as u128)
                .checked_mul(self.memecoin.token_share_price as u128)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap()
                .checked_div(1_000_000_000u128)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap();
            return Some((sol_amount as u64));
        } else {
            // token amount using bonding curve
            return self._get_sol_for_sell_tokens(amount as u64);
        }
    }

    fn _get_sol_for_sell_tokens(&self, token_amount: u64) -> Option<u64> {
        if token_amount == 0 {
            return None;
        }

        // Convert to common decimal basis (using 9 decimals as base)
        let current_sol = self.memecoin.virtual_sol_reserves;
        let current_tokens = (self.memecoin.virtual_token_reserves);

        // Calculate new reserves using constant product formula
        let new_tokens = current_tokens.checked_add(token_amount)?;

        let new_sol = ((current_sol as u128).checked_mul(current_tokens as u128)?)
            .checked_div(new_tokens as u128)?;

        let sol_out = current_sol.checked_sub(new_sol as u64)?;

        // <u64 as TryInto<u64>>::try_into(sol_out).ok()
        Some(sol_out)
    }
}
