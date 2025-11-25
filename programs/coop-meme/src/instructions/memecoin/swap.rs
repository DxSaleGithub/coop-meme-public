use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self},
    token::{self, burn, Burn, Mint, Token, TokenAccount},
};

use crate::{
    error::*,
    events::CreatedEvent,
    state::{ConfigData, MemeCoinData},
    utils::{freeze_user_token_account, token_transfer_with_signer, unfreeze_user_token_account},
};
#[derive(Accounts)]
pub struct Swap<'info> {
    #[account[mut]]
    pub user: Signer<'info>,
    /// CHECK: This is a system account so safe.
    #[account[
      constraint = memecoin.creator == creator.key()
    ]]
    pub creator: AccountInfo<'info>,
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
    #[account(
      mut,
      seeds = [b"mint", coop_token.key().as_ref(), &memecoin.token_id.to_le_bytes()],
      bump = memecoin.token_fairlaunch_bump
    )]
    pub fairlaunch_token: Box<Account<'info, Mint>>,
    #[account[
      mut,
      seeds = [b"memecoin", coop_token.key().as_ref()],
      bump = memecoin.memecoin_bump
    ]]
    pub memecoin: Box<Account<'info, MemeCoinData>>,
    /// CHECK: This is an ATA for coop token with global vault as authority.
    #[account(
    mut,
    seeds = [
        global_vault.key().as_ref(),             // authority
        token::ID.as_ref(),                      // SPL Token Program
        coop_token.key().as_ref(),                    // mint
    ],
    bump,
    seeds::program = associated_token::ID        // Associated Token Program
    )]
    pub global_token_ata: AccountInfo<'info>,
    /// CHECK: This is an ATA for coop token with global vault as authority.
    #[account(
    mut,
    seeds = [
        global_vault.key().as_ref(),             // authority
        token::ID.as_ref(),                      // SPL Token Program
        fairlaunch_token.key().as_ref(),                    // mint
    ],
    bump,
    seeds::program = associated_token::ID        // Associated Token Program
    )]
    pub global_fairlaunch_token_ata: AccountInfo<'info>,
    /// CHECK: This is an ata for coop token for user.
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=user,
      associated_token::token_program=token_program,
    )]
    pub user_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is an ata for coop token for user.
    #[account(
      mut,
      associated_token::mint=fairlaunch_token,
      associated_token::authority=user,
      associated_token::token_program=token_program,
    )]
    pub user_fairlaunch_token_ata: Box<Account<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,
    // #[account(address = associated_token::ID)]
    // associated_token_program: Program<'info, AssociatedToken>,

    // #[account(address = metadata::ID)]
    // mpl_token_metadata_program: Program<'info, Metadata>,
}

impl<'info> Swap<'info> {
    pub fn swap_fairlaunch_to_bonding_curve(&mut self) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        require!(
            self.memecoin.is_bonding_curve_active,
            CoopMemeError::TradingNotActive
        );
        require!(
            !self.memecoin.is_token_listed,
            CoopMemeError::TokenAlreadyListed
        );

        let coop_token_key = self.coop_token.key(); // Pubkey copied here

        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        // let seeds: &[&[u8]] = &[
        //     b"memecoin",
        //     coop_token_key.as_ref(),        // your static seed
        //     &[self.memecoin.memecoin_bump], // your bump, wrapped as byte slice
        // ];

        let seeds_for_unfreeze: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];
        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;
        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.fairlaunch_token.to_account_info(),
            self.user_fairlaunch_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        // transfer token from global ata to user
        token_transfer_with_signer(
            self.global_token_ata.to_account_info(),
            self.global_vault.to_account_info(),
            self.user_token_ata.to_account_info(),
            &self.token_program,
            &[seeds],
            self.user_fairlaunch_token_ata.amount,
        )?;

        // burn fairlauch tokens
        let burn_accounts = Burn {
            mint: self.fairlaunch_token.to_account_info(),
            from: self.user_fairlaunch_token_ata.to_account_info(),
            authority: self.user.to_account_info(),
        };
        let burn_ctx = CpiContext::new(self.token_program.to_account_info(), burn_accounts);
        burn(burn_ctx, self.user_fairlaunch_token_ata.amount)?;

        Ok(())
    }
}
