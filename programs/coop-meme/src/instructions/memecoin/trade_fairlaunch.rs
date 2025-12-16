use crate::{
    error::*,
    events::{BondingCurveStartedEvent, TradeEvent},
    state::{ConfigData, MemeCoinData, UserData},
    utils::*,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

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
      seeds = [b"mint", memecoin.creator.key().as_ref(), &memecoin.token_id.to_le_bytes()],
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
      payer=trader,
      space= 8 + UserData::INIT_SPACE,
      seeds = [b"user", coop_token.key().as_ref()],
      bump
    )]
    pub user_data: Box<Account<'info, UserData>>,
    pub system_program: Program<'info, System>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,
}

impl<'info> TradeFairlaunch<'info> {
    pub fn buy_tokens(&mut self, amount: u64) -> Result<()> {
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
        let amount_to_buy = amount
            .checked_sub(team_fees)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();

        self.memecoin.fairlaunch_sol_raised = self
            .memecoin
            .fairlaunch_sol_raised
            .checked_add(amount_to_buy)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        self.user_data.sol_deposit = self
            .user_data
            .sol_deposit
            .checked_add(amount_to_buy)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();

        emit!(TradeEvent {
            trader: self.trader.key(),
            coop_token: self.config.current_coop_token_metadata.token_mint.key(),
            memecoin: self.memecoin.key(),
            amount_in: amount as u64,
            direction: 1, // SOL deposit in fairlaunch
            minimum_receive_amount: 0,
            amount_out: 0,
            timestamp: Clock::get()?.unix_timestamp as u64
        });

        Ok(())
    }

    pub fn sell_tokens(&mut self, amount: u64) -> Result<()> {
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

        require!(
            self.user_data.sol_deposit >= amount,
            CoopMemeError::NotEnoughSol
        );

        let team_fees = self
            ._calculate_and_send_fees_with_signer(amount)
            .unwrap()
            .unwrap();

        self.memecoin.fairlaunch_sol_raised = self
            .memecoin
            .fairlaunch_sol_raised
            .checked_sub(amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();

        self.user_data.sol_deposit = self
            .user_data
            .sol_deposit
            .checked_sub(amount)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();

        emit!(TradeEvent {
            trader: self.trader.key(),
            coop_token: self.config.current_coop_token_metadata.token_mint.key(),
            memecoin: self.memecoin.key(),
            amount_in: amount as u64,
            direction: 2, // SOL withdraw to user
            minimum_receive_amount: 0,
            amount_out: 0,
            timestamp: Clock::get()?.unix_timestamp as u64
        });

        Ok(())
    }

    pub fn refund(&mut self) -> Result<()> {
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
            self.memecoin.fairlaunch_sol_raised > self.memecoin.fairlaunch_cap,
            CoopMemeError::CapNotExceeded
        );
        require!(!self.user_data.refund, CoopMemeError::AlreadyRefunded);

        // Safe proportional token calculation (divide-first order)
        let ratio = self
            .user_data
            .sol_deposit
            .checked_div(self.memecoin.fairlaunch_sol_raised)
            .ok_or_else(|| error!(CoopMemeError::InvalidOperation))?;

        let user_real_sol = ratio
            .checked_mul(self.memecoin.fairlaunch_cap)
            .ok_or_else(|| error!(CoopMemeError::InvalidOperation))?;

        require!(
            user_real_sol <= self.memecoin.fairlaunch_cap,
            CoopMemeError::InvalidFairSharePrice
        );
        let sol_to_refund = self.user_data.sol_deposit - user_real_sol;

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        self.user_data.refund = true;

        sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.creator.to_account_info(),
            &self.system_program,
            &[seeds],
            sol_to_refund as u64,
        )?;

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
