use anchor_lang::prelude::*;
use anchor_spl::token::spl_token::instruction::AuthorityType::FreezeAccount;
use anchor_spl::token::{self, Mint, Token};

use crate::{
    error::*,
    events::RevokeFreezeAuthority,
    state::{ConfigData, MemeCoinData, RBAControlList, RoleType},
    utils::has_role,
};

#[derive(Accounts)]
pub struct FreezeAuthorityRevoke<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
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
    #[account[
      mut,
      seeds = [b"roles"],
      bump=rbac.bump
    ]]
    pub rbac: Box<Account<'info, RBAControlList>>,
    #[account(
      mut,
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
    #[account(address = token::ID)]
    token_program: Program<'info, Token>,
}

impl<'info> FreezeAuthorityRevoke<'info> {
    pub fn revoke_freeze_authority(&mut self) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        has_role(&self.rbac.roles, RoleType::CREATING, self.user.key())?;

        let current_freeze_authority = self.coop_token.freeze_authority;

        if current_freeze_authority.is_none() {
            return Err((CoopMemeError::NoFreezeAuthoritySet).into());
        }

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        let ctx_accounts = token::SetAuthority {
            current_authority: self.global_vault.to_account_info(),
            account_or_mint: self.coop_token.to_account_info(),
        };

        token::set_authority(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                ctx_accounts,
                &[seeds],
            ),
            FreezeAccount,
            None,
        )?;

        emit!(RevokeFreezeAuthority {
            token: self.coop_token.key(),
            old_authority: self.global_vault.key(),
        });

        Ok(())
    }
}
