use crate::{
    error::*,
    events::UnlockAllTokens,
    state::{ConfigData, MemeCoinData, UserTokenVotes},
    utils::{token_transfer_with_signer, unfreeze_user_token_account},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, burn, Burn, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct UnlockAll<'info> {
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
      seeds = [b"fairlaunch", creator.key().as_ref(), &memecoin.token_id.to_le_bytes()],
      bump = memecoin.token_fairlaunch_bump
    )]
    pub fairlaunch_token: Box<Account<'info, Mint>>,
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
    #[account[
      init_if_needed,
      space = 8 + UserTokenVotes::INIT_SPACE,
      payer=user,
      seeds = [b"votes", user.key().as_ref(), coop_token.key().as_ref()],
      bump
    ]]
    pub user_token_votes: Box<Account<'info, UserTokenVotes>>,
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
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=memecoin,
      associated_token::token_program=token_program,
    )]
    pub vote_token_ata: Box<Account<'info, TokenAccount>>,
    #[account(
      mut,
      associated_token::mint=fairlaunch_token,
      associated_token::authority=memecoin,
      associated_token::token_program=token_program,
    )]
    pub vote_fairlaunch_token_ata: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,

    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> UnlockAll<'info> {
    pub fn unvote_all_tokens(&mut self) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(self.memecoin.is_token_listed, CoopMemeError::TokenNotListed);
        require!(
            !self.user_token_votes.all_unlocked,
            CoopMemeError::NotEnoughToken
        );

        let current_total_votes = self.user_token_votes.total_votes;
        let fairlaunch_votes = self.user_token_votes.fairlaunch_votes;
        let bondingcurve_votes = self.user_token_votes.bonding_curve_votes;
        let fairlaunch_token_amount = self.user_fairlaunch_token_ata.amount;

        let coop_token_key = self.coop_token.key(); // Pubkey copied here
        let fairlaunch_token_key = self.fairlaunch_token.key(); // Pubkey copied here

        self.user_token_votes.all_unlocked = true;

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

        if (fairlaunch_token_amount + fairlaunch_votes) > 0 {
            // burn fairlaunch tokens from user
            let burn_accounts = Burn {
                mint: self.fairlaunch_token.to_account_info(),
                from: self.user_fairlaunch_token_ata.to_account_info(),
                authority: self.memecoin.to_account_info(),
            };
            let burn_ctx = CpiContext::new(self.token_program.to_account_info(), burn_accounts);
            burn(burn_ctx, fairlaunch_token_amount)?;

            // burn fairlaunch tokens that has been  voted
            let seeds: &[&[u8]] = &[
                b"memecoin",
                fairlaunch_token_key.as_ref(),  // your static seed
                &[self.memecoin.memecoin_bump], // your bump, wrapped as byte slice
            ];
            let signer_seeds = &[seeds];
            let burn_accounts = Burn {
                mint: self.fairlaunch_token.to_account_info(),
                from: self.vote_fairlaunch_token_ata.to_account_info(),
                authority: self.memecoin.to_account_info(),
            };
            let burn_ctx = CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                burn_accounts,
                signer_seeds,
            );
            burn(burn_ctx, fairlaunch_token_amount)?;

            // transfer user 1:1 bonding curve tokens for burning fairlaunch token
            let seeds: &[&[u8]] = &[
                b"global",                        // your static seed
                &[self.config.global_vault_bump], // your bump, wrapped as byte slice
            ];

            token_transfer_with_signer(
                self.global_token_ata.to_account_info(),
                self.global_vault.to_account_info(),
                self.user_token_ata.to_account_info(),
                &self.token_program,
                &[seeds],
                (fairlaunch_votes + fairlaunch_token_amount) as u64,
            )?;

            // emit swap event here
        }

        if current_total_votes > 0 {
            if bondingcurve_votes > 0 {
                let seeds: &[&[u8]] = &[
                    b"memecoin",
                    coop_token_key.as_ref(),        // your static seed
                    &[self.memecoin.memecoin_bump], // your bump, wrapped as byte slice
                ];

                // transfer token from vote_ata to user
                token_transfer_with_signer(
                    self.vote_token_ata.to_account_info(),
                    self.memecoin.to_account_info(),
                    self.user_token_ata.to_account_info(),
                    &self.token_program,
                    &[seeds],
                    bondingcurve_votes as u64,
                )?;
            }
        }

        emit!(UnlockAllTokens {
            user: self.user.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            votes: current_total_votes
        });

        Ok(())
    }
}
