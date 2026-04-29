use crate::{
    error::*,
    events::{TradingOverEvent, VoteEvent},
    state::{ConfigData, MemeCoinData, TokenOption, UserTokenOptionVotes, UserTokenVotes},
    utils::{
        freeze_user_token_account, token_transfer_user, token_transfer_with_signer,
        unfreeze_user_token_account,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct UserVote<'info> {
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
    #[account[
      mut,
      seeds = [b"option", coop_token.key().as_ref(), token_option.hashed_option_value.as_ref()],
      bump = token_option.bump
    ]]
    pub token_option: Box<Account<'info, TokenOption>>,
    #[account[
      init_if_needed,
      space = 8 + UserTokenVotes::INIT_SPACE,
      payer=user,
      seeds = [b"votes", user.key().as_ref(), coop_token.key().as_ref()],
      bump
    ]]
    pub user_token_votes: Box<Account<'info, UserTokenVotes>>,
    #[account[
      init_if_needed,
      space = 8 + UserTokenOptionVotes::INIT_SPACE,
      payer=user,
      seeds = [b"option", user.key().as_ref(), token_option.key().as_ref()],
      bump
    ]]
    pub user_token_option_votes: Box<Account<'info, UserTokenOptionVotes>>,
    /// CHECK: This is an ata for coop token for user.
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
      associated_token::authority=memecoin,
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
    pub fn user_votes(&mut self, votes: u64) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        require!(
            self.memecoin.is_bonding_curve_active,
            CoopMemeError::TradingNotActive
        );
        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp; // i64 in seconds

        if (current_time as u64 > self.memecoin.token_market_end_time) {
            if !self.memecoin.is_trading_active {
                self.memecoin.is_trading_active = false;
                self.config.current_coop_token_metadata.is_trading_active = false;
                emit!(TradingOverEvent {
                    coop_token: self.coop_token.key(),
                    memecoin: self.memecoin.key(),
                });
            }
            return Ok(());
        }
        require!(
            self.user_token_ata.amount >= self.config.min_vote_token_amount,
            CoopMemeError::NotEnoughToken
        );
        require!(
            votes >= self.config.min_vote_token_amount,
            CoopMemeError::InvalidVoteTokenAmount
        );
        self._validate_vote_info(votes)?;

        self.memecoin.total_votes += votes;
        self.token_option.total_votes += votes;
        self.user_token_votes.total_votes += votes;
        self.user_token_option_votes.total_votes += votes;

        // Update leading option if this one now has more votes.
        if self.token_option.total_votes > self.memecoin.leading_votes {
            self.memecoin.leading_option = self.token_option.key();
            self.memecoin.leading_votes = self.token_option.total_votes;
        }

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

        // transfer token from user to vote_ata
        token_transfer_user(
            self.user_token_ata.to_account_info(),
            &self.user,
            self.vote_token_ata.to_account_info(),
            &self.token_program,
            votes,
        )?;

        let seeds_for_freeze: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        freeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_freeze],
        )?;

        emit!(VoteEvent {
            user: self.user.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            direction: 1,
            option_index: self.token_option.index,
            name: self.token_option.name.clone(),
            symbol: self.token_option.symbol.clone(),
            logo: self.token_option.logo.clone(),
            votes
        });
        Ok(())
    }

    pub fn user_unvotes(&mut self, votes: u64) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        require!(
            self.memecoin.is_bonding_curve_active,
            CoopMemeError::TradingNotActive
        );
        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp; // i64 in seconds

        if (current_time as u64 > self.memecoin.token_market_end_time) {
            if !self.memecoin.is_trading_active {
                self.memecoin.is_trading_active = false;
                self.config.current_coop_token_metadata.is_trading_active = false;
                emit!(TradingOverEvent {
                    coop_token: self.coop_token.key(),
                    memecoin: self.memecoin.key(),
                });
            }
            return Ok(());
        }
        self._validate_unvote_info(votes)?;

        self.memecoin.total_votes -= votes;
        self.token_option.total_votes -= votes;
        self.user_token_votes.total_votes -= votes;
        self.user_token_option_votes.total_votes -= votes;

        // Keep leading_votes in sync. If the leader is fully unvoted, clear the hint.
        if self.token_option.key() == self.memecoin.leading_option {
            if self.token_option.total_votes == 0 {
                self.memecoin.leading_option = Pubkey::default();
                self.memecoin.leading_votes = 0;
            } else {
                self.memecoin.leading_votes = self.token_option.total_votes;
            }
        }

        let coop_token_key = self.coop_token.key(); // Pubkey copied here
        let seeds: &[&[u8]] = &[
            b"memecoin",
            coop_token_key.as_ref(),        // your static seed
            &[self.memecoin.memecoin_bump], // your bump, wrapped as byte slice
        ];

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

        // transfer token from vote_ata to user
        token_transfer_with_signer(
            self.vote_token_ata.to_account_info(),
            self.memecoin.to_account_info(),
            self.user_token_ata.to_account_info(),
            &self.token_program,
            &[seeds],
            votes,
        )?;

        let seeds_for_freeze: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        freeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_freeze],
        )?;

        emit!(VoteEvent {
            user: self.user.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            direction: 2,
            option_index: self.token_option.index,
            name: self.token_option.name.clone(),
            symbol: self.token_option.symbol.clone(),
            logo: self.token_option.logo.clone(),
            votes
        });

        Ok(())
    }

    fn _validate_vote_info(&self, votes: u64) -> Result<()> {
        require!(
            self.user_token_ata.amount >= votes,
            CoopMemeError::NotEnoughToken
        );
        require!(
            self.token_option.index <= self.memecoin.total_options,
            CoopMemeError::InvalidTokenVoteInfo
        );
        Ok(())
    }

    fn _validate_unvote_info(&self, votes: u64) -> Result<()> {
        require!(
            self.user_token_votes.total_votes >= votes,
            CoopMemeError::NotEnoughToken
        );
        require!(
            self.token_option.index <= self.memecoin.total_options,
            CoopMemeError::InvalidTokenVoteInfo
        );
        require!(
            self.user_token_option_votes.total_votes >= votes,
            CoopMemeError::NotEnoughToken
        );
        Ok(())
    }
}
