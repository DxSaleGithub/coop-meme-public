use crate::{
    error::*,
    events::{TradingOverEvent, VoteEvent},
    state::{ConfigData, MemeCoinData, TokenOption, UserTokenOptionVotes, UserTokenVotes},
    utils::{token_transfer_signer_with_extra, token_transfer_with_extra},
    OptionType,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    // token::{self, Mint, Token, TokenAccount},
    token_2022::{self, transfer, Token2022},
    token_interface::{Mint, TokenAccount},
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
      seeds = [b"mint", &memecoin.token_id.to_le_bytes()],
      bump = memecoin.token_bump
    )]
    pub coop_token: Box<InterfaceAccount<'info, Mint>>,
    #[account[
      mut,
      seeds = [b"memecoin", coop_token.key().as_ref()],
      bump = memecoin.memecoin_bump
    ]]
    pub memecoin: Box<Account<'info, MemeCoinData>>,
    #[account[
      mut,
      seeds = [b"option", coop_token.key().as_ref(), &token_option.index.to_le_bytes()],
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
    pub user_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=memecoin,
      associated_token::token_program=token_program,
    )]
    pub vote_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: ExtraAccountMetaList Account,
    #[account(mut)]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    /// CHECK: This is an ata for coop token with votes token as authority to store locked tokens for voting.
    #[account(mut)]
    pub hook_program: UncheckedAccount<'info>,
    /// CHECK: This is an ata for coop token with votes token as authority to store locked tokens for voting.
    #[account(mut)]
    pub whitelist: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,

    #[account(address = token_2022::ID)]
    token_program: Program<'info, Token2022>,

    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> UserVote<'info> {
    pub fn user_votes(&mut self, votes: u64) -> Result<()> {
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
        require!(
            self.user_token_ata.amount >= self.config.min_vote_token_amount,
            CoopMemeError::NotEnoughToken
        );
        self._validate_vote_info(votes)?;

        self.memecoin.total_votes += votes;
        self.token_option.total_votes += votes;
        self.user_token_votes.total_votes += votes;
        self.user_token_option_votes.total_votes += votes;

        // // transfer token from user to vote_ata
        // token_transfer_user(
        //     self.user_token_ata.to_account_info(),
        //     &self.user,
        //     self.vote_token_ata.to_account_info(),
        //     &self.token_program,
        //     votes,
        // )?;

        token_transfer_with_extra(
            &self.token_program.to_account_info(),
            &self.user_token_ata.to_account_info(),
            &self.coop_token.to_account_info(),
            &self.vote_token_ata.to_account_info(),
            &self.user.to_account_info(),
            &self.memecoin.to_account_info(),
            &self.extra_account_meta_list.to_account_info(),
            &self.hook_program.to_account_info(),
            &self.whitelist.to_account_info(),
            votes,
            9,
        )?;

        let option_value = &self.token_option.option_value;
        let option_type;
        if self.token_option.option_type == OptionType::NAME {
            option_type = 1;
        } else if self.token_option.option_type == OptionType::SYM {
            option_type = 2;
        } else {
            option_type = 3;
        }

        emit!(VoteEvent {
            user: self.user.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            direction: 1, // vote and lock tokens
            option_index: self.token_option.index,
            option_type,
            option_value: option_value.to_string(),
            votes
        });
        Ok(())
    }

    pub fn user_unvotes(&mut self, votes: u64) -> Result<()> {
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
        self._validate_unvote_info(votes)?;

        self.memecoin.total_votes -= votes;
        self.token_option.total_votes -= votes;
        self.user_token_votes.total_votes -= votes;
        self.user_token_option_votes.total_votes -= votes;

        let coop_token_key = self.coop_token.key(); // Pubkey copied here
        let seeds: &[&[u8]] = &[
            b"memecoin",
            coop_token_key.as_ref(),        // your static seed
            &[self.memecoin.memecoin_bump], // your bump, wrapped as byte slice
        ];

        // // transfer token from vote_ata to user
        // token_transfer_with_signer(
        //     self.coop_token.to_account_info(),
        //     self.vote_token_ata.to_account_info(),
        //     self.memecoin.to_account_info(),
        //     self.user_token_ata.to_account_info(),
        //     &self.token_program,
        //     &[seeds],
        //     votes,
        // )?;

        token_transfer_signer_with_extra(
            &self.token_program.to_account_info(),
            &self.vote_token_ata.to_account_info(),
            &self.coop_token.to_account_info(),
            &self.user_token_ata.to_account_info(),
            &self.memecoin.to_account_info(),
            &self.memecoin.to_account_info(),
            &self.extra_account_meta_list.to_account_info(),
            &self.hook_program.to_account_info(),
            &self.whitelist.to_account_info(),
            &[seeds],
            votes,
            9,
        )?;

        let option_value = &self.token_option.option_value;
        let option_type;
        if self.token_option.option_type == OptionType::NAME {
            option_type = 1;
        } else if self.token_option.option_type == OptionType::SYM {
            option_type = 2;
        } else {
            option_type = 3;
        }

        emit!(VoteEvent {
            user: self.user.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            direction: 2, // unvote and unlock tokens
            option_index: self.token_option.index,
            option_type,
            option_value: option_value.to_string(),
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
