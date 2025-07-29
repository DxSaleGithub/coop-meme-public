use std::alloc::GlobalAlloc;

use crate::{
    error::*,
    events::{BondingCurveStartedEvent, TradeEvent, TradingOverEvent},
    state::{ConfigData, GlobalVault, MemeCoinData},
    utils::*,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::{invoke, invoke_signed};
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
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.
    /// It does not store any data and is used only for lamport/token transfers.
    /// PDA seeds = [b"global"], bump = config.global_vault_bump
    #[account[
      mut
    ]]
    pub affiliate: AccountInfo<'info>,
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.

    #[account[
      mut,
      constraint = memecoin.creator == creator.key()
    ]]
    pub creator: AccountInfo<'info>,
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.

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
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.
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
    pub fn buy_tokens(&mut self, amount: u128, min_tokens_receive: u128) -> Result<()> {
        require!(
            self.memecoin.is_trading_active,
            CustomError::TradingNotActive
        );
        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp; // i64 in seconds

        if (current_time as u64 > self.memecoin.token_market_end_time) {
            self.memecoin.is_trading_active = false;
            emit!(TradingOverEvent {
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
            });
            // return Err(CustomError::TradingNotActive.into());
            return Ok(());
        }

        if (current_time as u64 > self.memecoin.token_fairlaunch_end_time
            && !self.memecoin.is_bonding_curve_active)
        {
            self.memecoin.is_bonding_curve_active = true;
            // Set virtual reserves to preserve price and ensure curve continuity
            self.memecoin.virtual_sol_reserves = 1_000_000_000; // 1 SOL (in lamports)
            self.memecoin.virtual_token_reserves = (1_000_000_000u128)
                .checked_mul(1_000_000_000) // 9 decimals
                .unwrap()
                .checked_div(self.memecoin.token_share_price as u128)
                .unwrap()
                .try_into()
                .unwrap();
            emit!(BondingCurveStartedEvent {
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
            });
        }

        let team_fees = self._calculate_and_send_fees(amount).unwrap().unwrap();

        // let team_fees = 0;
        let token_amount = self
            ._calculate_token_amount_when_buy(
                amount - team_fees,
                self.memecoin.is_bonding_curve_active,
            )
            .unwrap();

        self.memecoin.virtual_sol_reserves = self
            .memecoin
            .virtual_sol_reserves
            .checked_add(amount - team_fees)
            .ok_or(CustomError::InvalidOperation)
            .unwrap();
        self.memecoin.virtual_token_reserves = self
            .memecoin
            .virtual_token_reserves
            .checked_sub(token_amount)
            .ok_or(CustomError::InvalidOperation)
            .unwrap();
        self.memecoin.real_sol_reserves = self
            .memecoin
            .real_sol_reserves
            .checked_add(amount - team_fees)
            .ok_or(CustomError::InvalidOperation)
            .unwrap();
        self.memecoin.real_token_reserves = self
            .memecoin
            .real_token_reserves
            .checked_sub(token_amount)
            .ok_or(CustomError::InvalidOperation)
            .unwrap();

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];
        require!(
            token_amount > min_tokens_receive,
            CustomError::InsufficientAmount
        );

        self._token_transfer_with_signer(
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
            amount_out: token_amount as u64
        });

        Ok(())
    }

    pub fn sell_tokens(&mut self, amount: u128, min_sol_receive: u128) -> Result<()> {
        require!(
            self.memecoin.is_trading_active,
            CustomError::TradingNotActive
        );
        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp; // i64 in seconds

        if (current_time as u64 > self.memecoin.token_market_end_time) {
            self.memecoin.is_trading_active = false;
            emit!(TradingOverEvent {
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
            });
            // return Err(CustomError::TradingNotActive.into());
            return Ok(());
        }

        if (current_time as u64 > self.memecoin.token_fairlaunch_end_time
            && !self.memecoin.is_bonding_curve_active)
        {
            self.memecoin.is_bonding_curve_active = true;
            // Set virtual reserves to preserve price and ensure curve continuity
            self.memecoin.virtual_sol_reserves = 1_000_000_000; // 1 SOL (in lamports)
            self.memecoin.virtual_token_reserves = (1_000_000_000u128)
                .checked_mul(1_000_000_000) // 9 decimals
                .unwrap()
                .checked_div(self.memecoin.token_share_price as u128)
                .unwrap()
                .try_into()
                .unwrap();
            emit!(BondingCurveStartedEvent {
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
            });
        }

        let sol_amount = self
            ._calculate_sol_amount_when_sell(
                amount,
                current_time as u64,
                self.memecoin.is_bonding_curve_active,
            )
            .unwrap();
        require!(
            sol_amount > min_sol_receive,
            CustomError::InsufficientAmount
        );

        token_transfer_user(
            self.trader_token_ata.to_account_info(),
            &self.trader,
            self.global_token_ata.to_account_info(),
            &self.token_program,
            amount as u64,
        )?;

        msg!("token transfer done"); // Todo:: Remove

        let team_fees = self
            ._calculate_and_send_fees_with_signer(sol_amount)
            .unwrap()
            .unwrap();

        self.memecoin.virtual_sol_reserves = self
            .memecoin
            .virtual_sol_reserves
            .checked_sub(sol_amount - team_fees)
            .ok_or(CustomError::InvalidOperation)
            .unwrap();
        self.memecoin.virtual_token_reserves = self
            .memecoin
            .virtual_token_reserves
            .checked_add(amount)
            .ok_or(CustomError::InvalidOperation)
            .unwrap();
        self.memecoin.real_sol_reserves = self
            .memecoin
            .real_sol_reserves
            .checked_sub(sol_amount - team_fees)
            .ok_or(CustomError::InvalidOperation)
            .unwrap();
        self.memecoin.real_token_reserves = self
            .memecoin
            .real_token_reserves
            .checked_add(amount)
            .ok_or(CustomError::InvalidOperation)
            .unwrap();

        emit!(TradeEvent {
            trader: self.trader.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            amount_in: amount as u64,
            direction: 2, // from tokens to SOL
            minimum_receive_amount: min_sol_receive as u64,
            amount_out: sol_amount as u64
        });

        Ok(())
    }

    fn _calculate_and_send_fees(&self, amount: u128) -> Result<(Option<((u128))>)> {
        let team_fees = amount * self.config.team_fee as u128 / 10000;
        let owner_fees = team_fees * self.config.owner_fee as u128 / 10000;
        let affiliate_fees = team_fees * self.config.affiliated_fee as u128 / 10000;

        msg!(
            "all fees - team, owner, affialiate and remaining {:?} {:?} {:?} {:?}",
            team_fees,
            owner_fees,
            affiliate_fees,
            amount - team_fees
        );
        msg!("sol transfer as owner fees done");

        self._sol_transfer_from_user(
            &self.trader,
            self.creator.to_account_info(),
            &self.system_program,
            owner_fees as u64,
        )?;

        msg!("sol transfer as affiliate fees done");
        self._sol_transfer_from_user(
            &self.trader,
            self.affiliate.to_account_info(),
            &self.system_program,
            (affiliate_fees as u64),
        )?;

        self._sol_transfer_from_user(
            &self.trader,
            self.team_wallet.to_account_info(),
            &self.system_program,
            (team_fees - owner_fees - affiliate_fees) as u64,
        )?;

        msg!("sol transfer as team fees done");
        msg!(
            "all fees - team, owner, affialiate and remaining {:?} {:?} {:?} {:?}",
            team_fees,
            owner_fees,
            affiliate_fees,
            amount - team_fees
        );

        self._sol_transfer_from_user(
            &self.trader,
            self.global_vault.to_account_info(),
            &self.system_program,
            (amount - team_fees) as u64,
        )?;

        msg!("sol transfer as buy amount done");

        return Ok(Some(team_fees as u128));
    }

    fn _calculate_and_send_fees_with_signer(&self, amount: u128) -> Result<(Option<((u128))>)> {
        let team_fees = amount * self.config.team_fee as u128 / 10000;
        let owner_fees = team_fees * self.config.owner_fee as u128 / 10000;
        let affiliate_fees = team_fees * self.config.affiliated_fee as u128 / 10000;

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        self._sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.creator.to_account_info(),
            &self.system_program,
            &[seeds],
            owner_fees as u64,
        )?;

        self._sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.affiliate.to_account_info(),
            &self.system_program,
            &[seeds],
            affiliate_fees as u64,
        )?;

        self._sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.team_wallet.to_account_info(),
            &self.system_program,
            &[seeds],
            (team_fees - affiliate_fees - owner_fees) as u64,
        )?;

        self._sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.trader.to_account_info(),
            &self.system_program,
            &[seeds],
            (amount - team_fees) as u64,
        )?;
        return Ok(Some(team_fees as u128));
    }

    fn _calculate_token_amount_when_buy(
        &self,
        amount: u128,
        is_bonding_curve_active: bool,
    ) -> Option<u128> {
        let mut token_amount;
        if (!is_bonding_curve_active) {
            // token_amount using fairlaunch
            token_amount = amount / (self.memecoin.token_share_price as u128) * 1_000_000_000;
            return Some(token_amount);
        } else {
            // token amount using bonding curve
            return self._get_tokens_for_buy_sol(amount as u128);
        }
    }

    fn _get_tokens_for_buy_sol(&self, sol_amount: u128) -> Option<u128> {
        if sol_amount == 0 {
            return None;
        }

        // Convert to common decimal basis (using 9 decimals as base)
        let current_sol = self.memecoin.virtual_sol_reserves as u128;
        let current_tokens = (self.memecoin.virtual_token_reserves as u128);

        // Calculate new reserves using constant product formula
        let new_sol = current_sol.checked_add(sol_amount as u128)?;
        let new_tokens = (current_sol.checked_mul(current_tokens)?).checked_div(new_sol)?;

        let tokens_out = current_tokens.checked_sub(new_tokens)?;

        // <u128 as TryInto<u64>>::try_into(tokens_out).ok()

        return Some(tokens_out);
    }

    fn _calculate_sol_amount_when_sell(
        &self,
        amount: u128,
        current_time: u64,
        is_bonding_curve_active: bool,
    ) -> Option<u128> {
        let mut sol_amount;
        if (!is_bonding_curve_active) {
            // sol amount using fairlaunch
            sol_amount = amount * (self.memecoin.token_share_price as u128) / 1_000_000_000;
            return Some((sol_amount));
        } else {
            // token amount using bonding curve
            return self._get_sol_for_sell_tokens(amount as u128);
        }
    }

    fn _get_sol_for_sell_tokens(&self, token_amount: u128) -> Option<u128> {
        if token_amount == 0 {
            return None;
        }

        // Convert to common decimal basis (using 9 decimals as base)
        let current_sol = self.memecoin.virtual_sol_reserves as u128;
        let current_tokens = (self.memecoin.virtual_token_reserves as u128);

        // Calculate new reserves using constant product formula
        let new_tokens = current_tokens.checked_add(token_amount)?;

        let new_sol = (current_sol.checked_mul(current_tokens)?).checked_div(new_tokens)?;

        let sol_out = current_sol.checked_sub(new_sol)?;

        // <u128 as TryInto<u64>>::try_into(sol_out).ok()
        Some(sol_out)
    }

    fn _sol_transfer_from_user(
        &self,
        signer: &Signer<'info>,
        destination: AccountInfo<'info>,
        system_program: &Program<'info, System>,
        amount: u64,
    ) -> Result<()> {
        let ix = solana_program::system_instruction::transfer(signer.key, destination.key, amount);
        invoke(
            &ix,
            &[
                signer.to_account_info(),
                destination.to_account_info(),
                system_program.to_account_info(),
            ],
        )?;
        Ok(())
    }

    //  transfer token from user
    fn _token_transfer_user(
        &self,
        from: AccountInfo<'info>,
        authority: &Signer<'info>,
        to: AccountInfo<'info>,
        token_program: &Program<'info, Token>,
        amount: u64,
    ) -> Result<()> {
        let cpi_ctx: CpiContext<_> = CpiContext::new(
            token_program.to_account_info(),
            token::Transfer {
                from,
                authority: authority.to_account_info(),
                to,
            },
        );
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    //  transfer token from PDA
    fn _token_transfer_with_signer(
        &self,
        from: AccountInfo<'info>,
        authority: AccountInfo<'info>,
        to: AccountInfo<'info>,
        token_program: &Program<'info, Token>,
        signer_seeds: &[&[&[u8]]],
        amount: u64,
    ) -> Result<()> {
        let cpi_ctx: CpiContext<_> = CpiContext::new_with_signer(
            token_program.to_account_info(),
            token::Transfer {
                from,
                to,
                authority,
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    // transfer sol from PDA
    fn _sol_transfer_with_signer(
        &self,
        source: AccountInfo<'info>,
        destination: AccountInfo<'info>,
        system_program: &Program<'info, System>,
        signers_seeds: &[&[&[u8]]],
        amount: u64,
    ) -> Result<()> {
        let ix = solana_program::system_instruction::transfer(source.key, destination.key, amount);
        invoke_signed(
            &ix,
            &[source, destination, system_program.to_account_info()],
            signers_seeds,
        )?;
        Ok(())
    }
}
