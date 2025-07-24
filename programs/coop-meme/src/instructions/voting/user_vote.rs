use crate::{error::*, state::*};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    metadata::{self, Metadata},
    token::{self, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct UserVote<'info> {
    #[account[mut]]
    pub user: Signer<'info>,
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.
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
    #[account[
      mut,
      seeds = [b"memecoin", coop_token.key().as_ref()],
      bump = memecoin.memecoin_bump
    ]]
    pub memecoin: Box<Account<'info, MemeCoinData>>,

    #[account[
      mut,
      seeds = [b"votes", coop_token.key().as_ref()],
      bump = token_votes.bump
    ]]
    pub token_votes: Box<Account<'info, TokenVotes>>,

    #[account[
      init_if_needed,
      space = 8 + UserTokenVotes::INIT_SPACE,
      payer=user,
      seeds = [b"votes", user.key().as_ref(), coop_token.key().as_ref()],
      bump
    ]]
    pub user_token_votes: Box<Account<'info, UserTokenVotes>>,

    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=user,
      associated_token::token_program=token_program,
    )]
    pub user_token_ata: Box<Account<'info, TokenAccount>>,
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=token_votes,
      associated_token::token_program=token_program,
    )]
    pub vote_token_ata: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,

    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> UserVote<'info> {
    pub fn user_votes(
        &mut self,
        name_vote: UserVoteInfo,
        symbol_vote: UserVoteInfo,
        uri_vote: UserVoteInfo,
    ) -> Result<()> {
        require!(
            self.user_token_ata.amount >= self.token_votes.minimum_tokens,
            CustomError::NotEnoughToken
        );
        self._validate_vote_info(&name_vote, &symbol_vote, &uri_vote)?;

        let current_total_votes =
            name_vote.token_amount + symbol_vote.token_amount + uri_vote.token_amount;

        self.token_votes.name_votes[name_vote.field_index as usize] += name_vote.token_amount;
        self.token_votes.symbol_votes[symbol_vote.field_index as usize] += symbol_vote.token_amount;
        self.token_votes.uri_votes[uri_vote.field_index as usize] += uri_vote.token_amount;

        self.user_token_votes.name_votes[name_vote.field_index as usize] += name_vote.token_amount;
        self.user_token_votes.symbol_votes[symbol_vote.field_index as usize] +=
            symbol_vote.token_amount;
        self.user_token_votes.uri_votes[uri_vote.field_index as usize] += uri_vote.token_amount;

        self.token_votes.total_votes += current_total_votes;
        self.user_token_votes.total_votes += current_total_votes;

        // transfer token from user to vote_ata
        self._token_transfer_user(
            self.user_token_ata.to_account_info(),
            &self.user,
            self.vote_token_ata.to_account_info(),
            &self.token_program,
            current_total_votes as u64,
        )?;
        Ok(())
    }

    pub fn user_unvotes(
        &mut self,
        name_vote: UserVoteInfo,
        symbol_vote: UserVoteInfo,
        uri_vote: UserVoteInfo,
    ) -> Result<()> {
        self._validate_unvote_info(&name_vote, &symbol_vote, &uri_vote)?;
        let current_total_votes =
            name_vote.token_amount + symbol_vote.token_amount + uri_vote.token_amount;

        self.token_votes.name_votes[name_vote.field_index as usize] -= name_vote.token_amount;
        self.token_votes.symbol_votes[symbol_vote.field_index as usize] -= symbol_vote.token_amount;
        self.token_votes.uri_votes[uri_vote.field_index as usize] -= uri_vote.token_amount;

        self.user_token_votes.name_votes[name_vote.field_index as usize] -= name_vote.token_amount;
        self.user_token_votes.symbol_votes[symbol_vote.field_index as usize] -=
            symbol_vote.token_amount;
        self.user_token_votes.uri_votes[uri_vote.field_index as usize] -= uri_vote.token_amount;

        self.token_votes.total_votes -= current_total_votes;
        self.user_token_votes.total_votes -= current_total_votes;

        let coop_token_key = self.coop_token.key(); // Pubkey copied here
        let seeds: &[&[u8]] = &[
            b"votes",
            coop_token_key.as_ref(),  // your static seed
            &[self.token_votes.bump], // your bump, wrapped as byte slice
        ];

        // transfer token from vote_ata to user
        self._token_transfer_with_signer(
            self.vote_token_ata.to_account_info(),
            self.token_votes.to_account_info(),
            self.user_token_ata.to_account_info(),
            &self.token_program,
            &[seeds],
            current_total_votes as u64,
        )?;
        Ok(())
    }

    fn _validate_vote_info(
        &self,
        name_votes: &UserVoteInfo,
        sym_votes: &UserVoteInfo,
        uri_votes: &UserVoteInfo,
    ) -> Result<()> {
        let current_total_votes =
            name_votes.token_amount + sym_votes.token_amount + uri_votes.token_amount;
        require!(
            self.user_token_ata.amount >= current_total_votes,
            CustomError::NotEnoughToken
        );
        require!(
            name_votes.field_index <= 4,
            CustomError::InvalidTokenVoteInfo
        );
        require!(
            sym_votes.field_index <= 4,
            CustomError::InvalidTokenVoteInfo
        );
        require!(
            uri_votes.field_index <= 4,
            CustomError::InvalidTokenVoteInfo
        );
        Ok(())
    }

    fn _validate_unvote_info(
        &self,
        name_votes: &UserVoteInfo,
        sym_votes: &UserVoteInfo,
        uri_votes: &UserVoteInfo,
    ) -> Result<()> {
        let current_total_votes =
            name_votes.token_amount + sym_votes.token_amount + uri_votes.token_amount;

        require!(
            self.user_token_votes.total_votes >= current_total_votes,
            CustomError::NotEnoughToken
        );
        require!(
            name_votes.field_index <= 4,
            CustomError::InvalidTokenVoteInfo
        );
        require!(
            sym_votes.field_index <= 4,
            CustomError::InvalidTokenVoteInfo
        );
        require!(
            uri_votes.field_index <= 4,
            CustomError::InvalidTokenVoteInfo
        );
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
}
