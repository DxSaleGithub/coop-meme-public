use crate::{
    error::*,
    state::{ConfigData, RBAControlList, RoleType},
    utils::{has_role, unfreeze_user_token_account},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

#[derive(Accounts)]
pub struct BatchThawAccounts<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.config_bump
    )]
    pub config: Box<Account<'info, ConfigData>>,
    /// CHECK: global vault
    #[account(
        mut,
        seeds = [b"global"],
        bump = config.global_vault_bump
    )]
    pub global_vault: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"roles"],
        bump = rbac.bump
    )]
    pub rbac: Box<Account<'info, RBAControlList>>,
    #[account(mut)]
    pub coop_token: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
    // remaining_accounts: one token ATA per holder to thaw
}

impl<'info> BatchThawAccounts<'info> {
    pub fn batch_thaw_accounts(&mut self, remaining_accounts: &[AccountInfo<'info>]) -> Result<()> {
        // require!(self.memecoin.is_token_listed, CoopMemeError::TokenNotListed);

        require!(!self.config.is_paused, CoopMemeError::Paused);
        has_role(&self.rbac.roles, RoleType::CREATING, self.creator.key())?;

        let seeds_for_unfreeze: &[&[u8]] = &[b"global", &[self.config.global_vault_bump]];

        for ata in remaining_accounts.iter() {
            unfreeze_user_token_account(
                self.global_vault.to_account_info(),
                self.coop_token.to_account_info(),
                ata.to_account_info(),
                self.token_program.to_account_info(),
                &[seeds_for_unfreeze],
            )?;
        }

        Ok(())
    }
}
