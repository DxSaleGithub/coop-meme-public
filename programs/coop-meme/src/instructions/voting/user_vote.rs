use crate::{
    error::*,
    events::{TradingOverEvent, VoteEvent},
    state::{
        ConfigData, MemeCoinData, TokenOption, TokenVotes, UserTokenVotes, VoteInfo, VoteOptionInfo,
    },
    utils::{token_transfer_user, token_transfer_with_signer},
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
        // name_vote: UserVoteInfo,
        // symbol_vote: UserVoteInfo,
        // uri_vote: UserVoteInfo,
        vote_info: VoteInfo,
    ) -> Result<()> {
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
        self._validate_vote_info(&vote_info)?;

        let current_total_votes = vote_info.token_amount;

        // self.token_votes.name_votes[name_vote.field_index as usize] += name_vote.token_amount;
        // self.token_votes.symbol_votes[symbol_vote.field_index as usize] += symbol_vote.token_amount;
        // self.token_votes.uri_votes[uri_vote.field_index as usize] += uri_vote.token_amount;

        // let current_vote_list_length = self.token_votes.votes.len() as u8;

        // if current_vote_list_length == 0 {
        //     self.token_votes.votes.push(vote_info);
        // } else if vote_info.option_index < current_vote_list_length {
        //     self.token_votes.votes[vote_info.option_index as usize].token_amount +=
        //         vote_info.token_amount;
        // }

        if self.token_votes.votes.len() <= vote_info.option_index as usize {
            let missing = vote_info.option_index + 1 - self.token_votes.votes.len() as u8;
            self.token_votes.votes.extend(vec![0; missing as usize]);
        }
        self.token_votes.votes[vote_info.option_index as usize] += vote_info.token_amount;

        if self.user_token_votes.votes.len() <= vote_info.option_index as usize {
            let missing = vote_info.option_index + 1 - self.user_token_votes.votes.len() as u8;
            self.user_token_votes
                .votes
                .extend(vec![0; missing as usize]);
        }
        self.user_token_votes.votes[vote_info.option_index as usize] += vote_info.token_amount;

        // self.user_token_votes.name_votes[name_vote.field_index as usize] += name_vote.token_amount;
        // self.user_token_votes.symbol_votes[symbol_vote.field_index as usize] +=
        //     symbol_vote.token_amount;
        // self.user_token_votes.uri_votes[uri_vote.field_index as usize] += uri_vote.token_amount;

        self.token_votes.total_votes += current_total_votes;
        self.user_token_votes.total_votes += current_total_votes;

        // transfer token from user to vote_ata
        token_transfer_user(
            self.user_token_ata.to_account_info(),
            &self.user,
            self.vote_token_ata.to_account_info(),
            &self.token_program,
            current_total_votes as u64,
        )?;

        emit!(VoteEvent {
            user: self.user.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            direction: 1, // vote and lock tokens
            vote_info,
            // name_vote,
            // symbol_vote,
            // uri_vote,
            total_votes: current_total_votes
        });
        Ok(())
    }

    pub fn user_unvotes(
        &mut self,
        // name_vote: UserVoteInfo,
        // symbol_vote: UserVoteInfo,
        // uri_vote: UserVoteInfo,
        vote_info: VoteInfo,
    ) -> Result<()> {
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
        self._validate_unvote_info(&vote_info)?;
        let current_total_votes = vote_info.token_amount;

        // self.token_votes.votes[vote_info.option_index as usize].token_amount +=
        //     vote_info.token_amount;

        // self.user_token_votes.votes[vote_info.option_index as usize].token_amount +=
        //     vote_info.token_amount;

        if self.token_votes.votes.len() <= vote_info.option_index as usize {
            let missing = vote_info.option_index + 1 - self.token_votes.votes.len() as u8;
            self.token_votes.votes.extend(vec![0; missing as usize]);
        }
        self.token_votes.votes[vote_info.option_index as usize] -= vote_info.token_amount;

        if self.user_token_votes.votes.len() <= vote_info.option_index as usize {
            let missing = vote_info.option_index + 1 - self.user_token_votes.votes.len() as u8;
            self.user_token_votes
                .votes
                .extend(vec![0; missing as usize]);
        }
        self.user_token_votes.votes[vote_info.option_index as usize] -= vote_info.token_amount;

        // self.token_votes.name_votes[name_vote.field_index as usize] -= name_vote.token_amount;
        // self.token_votes.symbol_votes[symbol_vote.field_index as usize] -= symbol_vote.token_amount;
        // self.token_votes.uri_votes[uri_vote.field_index as usize] -= uri_vote.token_amount;

        // self.user_token_votes.name_votes[name_vote.field_index as usize] -= name_vote.token_amount;
        // self.user_token_votes.symbol_votes[symbol_vote.field_index as usize] -=
        //     symbol_vote.token_amount;
        // self.user_token_votes.uri_votes[uri_vote.field_index as usize] -= uri_vote.token_amount;

        self.token_votes.total_votes -= current_total_votes;
        self.user_token_votes.total_votes -= current_total_votes;

        let coop_token_key = self.coop_token.key(); // Pubkey copied here
        let seeds: &[&[u8]] = &[
            b"votes",
            coop_token_key.as_ref(),  // your static seed
            &[self.token_votes.bump], // your bump, wrapped as byte slice
        ];

        // transfer token from vote_ata to user
        token_transfer_with_signer(
            self.vote_token_ata.to_account_info(),
            self.token_votes.to_account_info(),
            self.user_token_ata.to_account_info(),
            &self.token_program,
            &[seeds],
            current_total_votes as u64,
        )?;

        emit!(VoteEvent {
            user: self.user.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            direction: 2, // unvote and unlock tokens
            // name_vote,
            // symbol_vote,
            // uri_vote,
            vote_info,
            total_votes: current_total_votes
        });
        Ok(())
    }

    pub fn user_vote_with_option(
        &mut self,
        // name_vote: UserVoteInfo,
        // symbol_vote: UserVoteInfo,
        // uri_vote: UserVoteInfo,
        vote_option_info: VoteOptionInfo,
    ) -> Result<()> {
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
        let vote_option_index = self.memecoin.token_options.len();
        let current_total_votes = vote_option_info.token_amount;

        let vote_info = VoteInfo {
            option_index: vote_option_index as u8,
            token_amount: current_total_votes,
        };
        require!(
            self.user_token_ata.amount >= self.config.min_option_add_token_amount
                && self.user_token_ata.amount >= current_total_votes,
            CoopMemeError::NotEnoughToken
        );
        require!(
            self.memecoin.token_options.len() <= 20,
            CoopMemeError::OptionLimitExceeded
        );

        let new_option = &vote_option_info.token_option;
        require!(
            !self._contains_token_option(&self.memecoin.token_options, new_option),
            CoopMemeError::TokenOptionAlreadyExist
        );

        self.memecoin
            .token_options
            .push(vote_option_info.token_option);

        // self.token_votes.name_votes[name_vote.field_index as usize] += name_vote.token_amount;
        // self.token_votes.symbol_votes[symbol_vote.field_index as usize] += symbol_vote.token_amount;
        // self.token_votes.uri_votes[uri_vote.field_index as usize] += uri_vote.token_amount;

        // self.token_votes.votes[vote_option_index as usize].token_amount += current_total_votes;
        // self.user_token_votes.votes[vote_option_index as usize].token_amount += current_total_votes;

        if self.token_votes.votes.len() <= vote_info.option_index as usize {
            let missing = vote_info.option_index + 1 - self.token_votes.votes.len() as u8;
            self.token_votes.votes.extend(vec![0; missing as usize]);
        }
        self.token_votes.votes[vote_info.option_index as usize] += vote_info.token_amount;

        if self.user_token_votes.votes.len() <= vote_info.option_index as usize {
            let missing = vote_info.option_index + 1 - self.user_token_votes.votes.len() as u8;
            self.user_token_votes
                .votes
                .extend(vec![0; missing as usize]);
        }
        self.user_token_votes.votes[vote_info.option_index as usize] += vote_info.token_amount;

        // self.user_token_votes.name_votes[name_vote.field_index as usize] += name_vote.token_amount;
        // self.user_token_votes.symbol_votes[symbol_vote.field_index as usize] +=
        //     symbol_vote.token_amount;
        // self.user_token_votes.uri_votes[uri_vote.field_index as usize] += uri_vote.token_amount;

        self.token_votes.total_votes += current_total_votes;
        self.user_token_votes.total_votes += current_total_votes;

        // transfer token from user to vote_ata
        token_transfer_user(
            self.user_token_ata.to_account_info(),
            &self.user,
            self.vote_token_ata.to_account_info(),
            &self.token_program,
            current_total_votes as u64,
        )?;

        emit!(VoteEvent {
            user: self.user.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            direction: 3, // vote and lock tokens with option
            vote_info,
            // name_vote,
            // symbol_vote,
            // uri_vote,
            total_votes: current_total_votes
        });
        Ok(())
    }

    pub fn unvote_all_tokens(&mut self) -> Result<()> {
        let current_total_votes = self.user_token_votes.total_votes;
        self.token_votes.total_votes -= current_total_votes;
        for i in 0..self.token_votes.votes.len() {
            self.token_votes.votes[i] -= self.user_token_votes.votes[i];
            self.user_token_votes.votes[i] = 0;
        }
        self.user_token_votes.total_votes = 0;

        let coop_token_key = self.coop_token.key(); // Pubkey copied here
        let seeds: &[&[u8]] = &[
            b"votes",
            coop_token_key.as_ref(),  // your static seed
            &[self.token_votes.bump], // your bump, wrapped as byte slice
        ];

        // transfer token from vote_ata to user
        token_transfer_with_signer(
            self.vote_token_ata.to_account_info(),
            self.token_votes.to_account_info(),
            self.user_token_ata.to_account_info(),
            &self.token_program,
            &[seeds],
            current_total_votes as u64,
        )?;

        let vote_info = VoteInfo {
            option_index: (0),
            token_amount: current_total_votes,
        };

        emit!(VoteEvent {
            user: self.user.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            direction: 4, // unlock all tokens
            // name_vote,
            // symbol_vote,
            // uri_vote,
            vote_info,
            total_votes: current_total_votes
        });
        Ok(())
    }

    fn _validate_vote_info(&self, vote_info: &VoteInfo) -> Result<()> {
        let current_total_votes = vote_info.token_amount;

        require!(
            self.user_token_ata.amount >= current_total_votes,
            CoopMemeError::NotEnoughToken
        );
        require!(
            vote_info.option_index <= self.memecoin.token_options.len() as u8 - 1,
            CoopMemeError::InvalidTokenVoteInfo
        );

        Ok(())
    }
    fn _contains_token_option(
        &self,
        token_options: &Vec<TokenOption>,
        new_option: &TokenOption,
    ) -> bool {
        token_options.iter().any(|existing| {
            existing.token_name == new_option.token_name
                || existing.token_symbol == new_option.token_symbol
                || existing.token_uri == new_option.token_uri
        })
    }

    fn _validate_unvote_info(
        &self,
        // name_votes: &UserVoteInfo,
        // sym_votes: &UserVoteInfo,
        // uri_votes: &UserVoteInfo,
        vote_info: &VoteInfo,
    ) -> Result<()> {
        let current_total_votes = vote_info.token_amount;

        require!(
            self.user_token_votes.total_votes >= current_total_votes,
            CoopMemeError::NotEnoughToken
        );
        require!(
            vote_info.option_index <= self.memecoin.token_options.len() as u8 - 1,
            CoopMemeError::InvalidTokenVoteInfo
        );
        Ok(())
    }
}
