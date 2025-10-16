use crate::state::MemeCoinData;
use crate::utils::{
    sol_transfer_with_signer, token_transfer_with_signer, unfreeze_user_token_account,
};
use crate::{error::*, state::ConfigData};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::{self, AssociatedToken};
use anchor_spl::token::{self, Mint, Token, TokenAccount};
#[derive(Accounts)]
pub struct Emergency<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.config_bump,
        has_one = admin @ CoopMemeError::Unauthorized
    )]
    pub config: Account<'info, ConfigData>,
}

impl<'info> Emergency<'info> {
    pub fn set_emergency(&mut self, in_emergency: Option<bool>) -> Result<()> {
        require!(
            self.admin.key() == self.config.admin,
            CoopMemeError::Unauthorized
        );

        if let Some(emergency_status) = in_emergency {
            self.config.in_emergency = emergency_status;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct EmergencyWithdrawSOL<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.config_bump,
        has_one = admin @ CoopMemeError::Unauthorized
    )]
    pub config: Account<'info, ConfigData>,
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.
    /// It does not store any data and is used only for lamport/token transfers.
    /// PDA seeds = [b"global"], bump = config.global_vault_bump
    #[account(
      mut,
      seeds = [b"global"],
      bump = config.global_vault_bump
    )]
    pub global_vault: AccountInfo<'info>,
    /// CHECK: This is a system account so safe.
    #[account[
      mut,
      constraint = config.team_wallet == team_wallet.key()
    ]]
    pub team_wallet: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> EmergencyWithdrawSOL<'info> {
    pub fn emergency_withdraw_sol(&mut self) -> Result<()> {
        require!(
            self.admin.key() == self.config.admin,
            CoopMemeError::Unauthorized
        );
        require!(self.config.is_paused, CoopMemeError::NotPaused);
        require!(self.config.in_emergency, CoopMemeError::NotInEmergency);

        let vault_info = &self.global_vault;
        let admin_info = &self.team_wallet.to_account_info();

        // Calculate rent-exempt threshold for a 0-data-length account (the PDA)
        let rent = Rent::get()?;
        let rent_exempt_minimum = rent.minimum_balance(vault_info.data_len());

        let vault_lamports = vault_info.lamports();
        let withdraw_amount = vault_lamports
            .checked_sub(rent_exempt_minimum)
            .ok_or(CoopMemeError::NotEnoughSol)?;

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        if withdraw_amount > 0 {
            sol_transfer_with_signer(
                self.global_vault.to_account_info(),
                self.admin.to_account_info(),
                &self.system_program,
                &[seeds],
                withdraw_amount,
            )?;
        }

        // // Only transfer if there is a positive withdrawable amount
        // if withdraw_amount > 0 {
        //     // Use invoke_signed for PDA authority
        //     **vault_info.try_borrow_mut_lamports()? -= withdraw_amount;
        //     **admin_info.try_borrow_mut_lamports()? += withdraw_amount;
        // }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct EmergencyWithdrawCoopToken<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: This is a system account so safe.
    #[account[
      mut,
      constraint = memecoin.creator == creator.key()
    ]]
    pub creator: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.config_bump,
        has_one = admin @ CoopMemeError::Unauthorized
    )]
    pub config: Account<'info, ConfigData>,
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
      mut,
      associated_token::mint = mint,
      associated_token::authority = global_vault
    )]
    pub global_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is a system account so safe.
    #[account[
      mut,
      constraint = config.team_wallet == team_wallet.key()
    ]]
    pub team_wallet: AccountInfo<'info>,
    #[account(
      seeds = [b"mint", creator.key().as_ref(), &memecoin.token_id.to_le_bytes()],
      bump = memecoin.token_bump
    )]
    pub mint: Box<Account<'info, Mint>>,
    #[account[
      mut,
      seeds = [b"memecoin", mint.key().as_ref()],
      bump = memecoin.memecoin_bump
    ]]
    pub memecoin: Box<Account<'info, MemeCoinData>>,
    /// CHECK: This is an ATA for coop token for trader.
    #[account(
      init_if_needed,
      associated_token::mint=mint,
      associated_token::authority=admin,
      associated_token::token_program=token_program,
      payer=admin
    )]
    pub admin_token_ata: Box<Account<'info, TokenAccount>>,
    #[account(address = token::ID)]
    token_program: Program<'info, Token>,
    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> EmergencyWithdrawCoopToken<'info> {
    pub fn emergency_withdraw_coop_token(&mut self) -> Result<()> {
        require!(
            self.admin.key() == self.config.admin,
            CoopMemeError::Unauthorized
        );
        require!(self.config.is_paused, CoopMemeError::NotPaused);
        require!(self.config.in_emergency, CoopMemeError::NotInEmergency);

        let seeds_for_unfreeze: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];
        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.mint.to_account_info(),
            self.admin_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        if self.global_token_ata.amount > 0 {
            token_transfer_with_signer(
                self.global_token_ata.to_account_info(),
                self.global_vault.to_account_info(),
                self.admin_token_ata.to_account_info(),
                &self.token_program,
                &[seeds],
                self.global_token_ata.amount as u64,
            )?;
        }

        Ok(())
    }

    pub fn withdraw_listed_coop_token(&mut self) -> Result<()> {
        require!(
            self.admin.key() == self.config.admin,
            CoopMemeError::Unauthorized
        );

        require!(self.memecoin.is_token_listed, CoopMemeError::TokenNotListed);

        let seeds_for_unfreeze: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];
        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.mint.to_account_info(),
            self.admin_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        if self.global_token_ata.amount > 0 {
            token_transfer_with_signer(
                self.global_token_ata.to_account_info(),
                self.global_vault.to_account_info(),
                self.admin_token_ata.to_account_info(),
                &self.token_program,
                &[seeds],
                self.global_token_ata.amount as u64,
            )?;
        }

        Ok(())
    }
}
