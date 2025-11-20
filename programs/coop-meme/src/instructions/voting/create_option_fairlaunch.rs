use crate::{
    error::*,
    events::{TradingOverEvent, UnlockAllTokens, VoteEvent},
    state::{ConfigData, MemeCoinData, TokenOption, UserTokenOptionVotes, UserTokenVotes},
    utils::{
        freeze_user_token_account, token_transfer_user, token_transfer_with_signer,
        unfreeze_user_token_account,
    },
    CreateOptionInfo, OptionType,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct CreateOptionFairlaunch<'info> {
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
      seeds = [b"mint", config.current_coop_token_metadata.token_mint.key().as_ref(), &memecoin.token_id.to_le_bytes()],
      bump = memecoin.token_fairlaunch_bump
    )]
    pub coop_token: Box<Account<'info, Mint>>,
    #[account[
      mut,
      seeds = [b"memecoin", config.current_coop_token_metadata.token_mint.key().as_ref()],
      bump = memecoin.memecoin_bump
    ]]
    pub memecoin: Box<Account<'info, MemeCoinData>>,
    #[account[
      init,
      payer=user,
      space = 8 + TokenOption::INIT_SPACE,
      seeds = [b"option", config.current_coop_token_metadata.token_mint.key().as_ref(), &(memecoin.total_options+1).to_le_bytes()],
      bump
    ]]
    pub token_option: Box<Account<'info, TokenOption>>,
    #[account[
      init_if_needed,
      space = 8 + UserTokenVotes::INIT_SPACE,
      payer=user,
      seeds = [b"votes", user.key().as_ref(), config.current_coop_token_metadata.token_mint.key().as_ref()],
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

impl<'info> CreateOptionFairlaunch<'info> {
    pub fn create_new_option(
        &mut self,
        bumps: &CreateOptionFairlaunchBumps,
        create_option: CreateOptionInfo,
    ) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        require!(
            !self.memecoin.is_bonding_curve_active,
            CoopMemeError::TradingFairlaunchOver
        );

        self.token_option.set_inner(TokenOption {
            token: self.config.current_coop_token_metadata.token_mint.key(),
            option_type: create_option.option_type,
            option_value: create_option.option_value,
            index: self.memecoin.total_options + 1,
            total_votes: 0,
            bump: bumps.token_option,
        });

        let current_total_votes = create_option.votes;

        require!(
            self.user_token_ata.amount >= self.config.min_option_add_token_amount
                && self.user_token_ata.amount >= current_total_votes,
            CoopMemeError::NotEnoughToken
        );

        self.memecoin.total_votes += current_total_votes;
        self.token_option.total_votes += current_total_votes;
        self.user_token_votes.total_votes += current_total_votes;
        self.user_token_votes.fairlaunch_votes += current_total_votes;
        self.user_token_option_votes.total_votes += current_total_votes;
        self.user_token_option_votes.fairlaunch_votes += current_total_votes;

        self.memecoin.total_options += 1;
        self.config.current_coop_token_metadata.total_options = self.memecoin.total_options;

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
            current_total_votes as u64,
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
            direction: 3, // vote and lock tokens with option
            option_index: self.token_option.index,
            option_type,
            option_value: option_value.to_string(),
            votes: current_total_votes
        });

        Ok(())
    }
}
