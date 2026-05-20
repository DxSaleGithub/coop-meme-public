use crate::{
    error::*,
    events::{TradingOverEvent, VoteEvent},
    state::{
        ConfigData, MemeCoinData, OptionsRegistry, TokenOption, UserTokenOptionVotes,
        UserTokenVotes,
    },
    utils::{freeze_user_token_account, token_transfer_with_signer, unfreeze_user_token_account},
    CreateOptionInfo,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
#[instruction(hashed_option_value:[u8;32])]
pub struct CreateOption<'info> {
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
      init,
      payer=user,
      space = 8 + TokenOption::INIT_SPACE,
      seeds = [b"option", coop_token.key().as_ref(), &hashed_option_value],
      bump
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
    /// CHECK: ATA for coop token for user.
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
    #[account(
      mut,
      seeds = [b"options", coop_token.key().as_ref()],
      bump=vote_options_registry.bump,
      realloc = vote_options_registry.get_size(),
      realloc::payer = user,
      realloc::zero = false,
    )]
    pub vote_options_registry: Box<Account<'info, OptionsRegistry>>,

    pub system_program: Program<'info, System>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,

    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> CreateOption<'info> {
    pub fn create_new_option(
        &mut self,
        bumps: &CreateOptionBumps,
        create_option: CreateOptionInfo,
        hashed_option_value: [u8; 32],
    ) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(
            self.memecoin.is_trading_active,
            CoopMemeError::TradingNotActive
        );
        require!(
            self.memecoin.is_bonding_curve_active,
            CoopMemeError::TradingFairlaunchNotOver
        );

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        if current_time as u64 > self.memecoin.token_market_end_time {
            self.memecoin.is_trading_active = false;
            self.config.current_coop_token_metadata.is_trading_active = false;
            emit!(TradingOverEvent {
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
            });
            return Ok(());
        }

        require!(
            self.vote_options_registry.token == self.coop_token.key(),
            CoopMemeError::InvalidOption
        );

        // Validate field lengths
        require!(
            !create_option.name.is_empty() && create_option.name.len() < 37,
            CoopMemeError::InvalidTokenName
        );
        require!(
            !create_option.symbol.is_empty() && create_option.symbol.len() < 15,
            CoopMemeError::InvalidTokenSymbol
        );
        require!(
            !create_option.logo.is_empty() && create_option.logo.len() < 256,
            CoopMemeError::InvalidTokenUri
        );

        let expected_hash = anchor_lang::solana_program::hash::hashv(&[
            create_option.name.as_bytes(),
            create_option.symbol.as_bytes(),
            create_option.logo.as_bytes(),
        ])
        .to_bytes();
        require!(
            hashed_option_value == expected_hash,
            CoopMemeError::InvalidOption
        );

        let current_total_votes = create_option.votes;

        require!(
            self.user_token_ata.amount >= self.config.min_option_add_token_amount
                && current_total_votes >= self.config.min_option_add_token_amount,
            CoopMemeError::NotEnoughToken
        );

        self.token_option.set_inner(TokenOption {
            token: self.coop_token.key(),
            name: create_option.name.clone(),
            symbol: create_option.symbol.clone(),
            logo: create_option.logo.clone(),
            hashed_option_value,
            index: self.memecoin.total_options.checked_add(1).ok_or(CoopMemeError::InvalidOperation)?,
            total_votes: 0,
            bump: bumps.token_option,
        });

        self.memecoin.total_votes = self.memecoin.total_votes.checked_add(current_total_votes).ok_or(CoopMemeError::InvalidOperation)?;
        self.token_option.total_votes = self.token_option.total_votes.checked_add(current_total_votes).ok_or(CoopMemeError::InvalidOperation)?;
        self.user_token_votes.total_votes = self.user_token_votes.total_votes.checked_add(current_total_votes).ok_or(CoopMemeError::InvalidOperation)?;
        self.user_token_option_votes.total_votes = self.user_token_option_votes.total_votes.checked_add(current_total_votes).ok_or(CoopMemeError::InvalidOperation)?;
        self.memecoin.total_options = self.memecoin.total_options.checked_add(1).ok_or(CoopMemeError::InvalidOperation)?;
        self.config.current_coop_token_metadata.total_options = self.memecoin.total_options;

        let seeds_for_unfreeze: &[&[u8]] = &[b"global", &[self.config.global_vault_bump]];
        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        // 1) Approve: grant global_vault delegate authority for exactly `current_total_votes`.
        anchor_spl::token::approve(
            CpiContext::new(
                self.token_program.to_account_info(),
                anchor_spl::token::Approve {
                    to: self.user_token_ata.to_account_info(),
                    delegate: self.global_vault.to_account_info(),
                    authority: self.user.to_account_info(),
                },
            ),
            current_total_votes,
        )?;

        // 2) Delegated Transfer: PDA-signed, global_vault acts as delegate.
        let seeds_for_transfer: &[&[u8]] = &[b"global", &[self.config.global_vault_bump]];
        token_transfer_with_signer(
            self.user_token_ata.to_account_info(),
            self.global_vault.to_account_info(),
            self.vote_token_ata.to_account_info(),
            &self.token_program,
            &[seeds_for_transfer],
            current_total_votes,
        )?;

        let seeds_for_freeze: &[&[u8]] = &[b"global", &[self.config.global_vault_bump]];
        freeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_freeze],
        )?;

        self.vote_options_registry
            .token_registry
            .push(self.token_option.key());

        emit!(VoteEvent {
            user: self.user.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            direction: 3,
            option_index: self.token_option.index,
            name: create_option.name,
            symbol: create_option.symbol,
            logo: create_option.logo,
            votes: current_total_votes
        });

        Ok(())
    }
}
