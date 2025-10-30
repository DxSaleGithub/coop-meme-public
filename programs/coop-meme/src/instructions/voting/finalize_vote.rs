use crate::{
    error::*,
    events::{TradingOverEvent, VoteFinalizedEvent},
    state::{ConfigData, MemeCoinData, RBAControlList, RoleType},
    utils::has_role,
    OptionType, TokenOption,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self},
    metadata::{self, mpl_token_metadata::types::DataV2, Metadata},
    token::{self, Mint},
};

#[derive(Accounts)]
pub struct FinalizeVote<'info> {
    #[account[mut, signer]]
    pub user: Signer<'info>,
    #[account[
      constraint = memecoin.creator == creator.key()
    ]]
    /// CHECK: This is a system account so safe.
    pub creator: AccountInfo<'info>,
    #[account[
      mut,
      seeds = [b"config"],
      bump = config.config_bump
    ]]
    pub config: Box<Account<'info, ConfigData>>,
    #[account[
      mut,
      seeds = [b"roles"],
      bump=rbac.bump
    ]]
    pub rbac: Account<'info, RBAControlList>,
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
    /// CHECK: This is a PDA for coop token metadata account
    #[account(mut)]
    name_option: Account<'info, TokenOption>,
    /// CHECK: This is a PDA for coop token metadata account
    #[account(mut)]
    symbol_option: Account<'info, TokenOption>,
    /// CHECK: This is a PDA for coop token metadata account
    #[account(mut)]
    uri_option: Account<'info, TokenOption>,
    /// CHECK: This is a PDA for coop token metadata account
    #[account(
      mut,
      seeds = [
          b"metadata",
          metadata::ID.as_ref(),
          coop_token.key().as_ref(),
      ],
      bump,
      seeds::program = metadata::ID
    )]
    token_metadata_account: UncheckedAccount<'info>,

    #[account(address = metadata::ID)]
    mpl_token_metadata_program: Program<'info, Metadata>,
}

impl<'info> FinalizeVote<'info> {
    pub fn finalize_vote(&mut self) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);

        has_role(&self.rbac.roles, RoleType::VOTING, self.user.key())?;
        // require!(
        //     self.config.admin.key() == self.user.key(),
        //     CoopMemeError::Unauthorized
        // );
        require!(
            !self.memecoin.is_voting_finalized,
            CoopMemeError::VotingFinalized
        );
        // trade is over -> check via timestamp and mark as inactive if not already
        let current_time = Clock::get()?.unix_timestamp as u64;
        if (self.memecoin.is_trading_active && self.memecoin.token_market_end_time < current_time) {
            self.memecoin.is_trading_active = false;
            emit!(TradingOverEvent {
                coop_token: self.coop_token.key(),
                memecoin: self.memecoin.key(),
            });
        }
        require!(
            !self.memecoin.is_trading_active,
            CoopMemeError::TradingActive
        );
        require!(
            self.memecoin.creator == self.creator.key(),
            CoopMemeError::Unauthorized
        );
        require!(
            self.symbol_option.token == self.coop_token.key(),
            CoopMemeError::InvalidOption
        );
        require!(
            self.uri_option.token == self.coop_token.key(),
            CoopMemeError::InvalidOption
        );
        require!(
            self.name_option.token == self.coop_token.key(),
            CoopMemeError::InvalidOption
        );
        require!(
            self.name_option.option_type == OptionType::NAME,
            CoopMemeError::InvalidTokenName
        );
        require!(
            self.symbol_option.option_type == OptionType::SYM,
            CoopMemeError::InvalidTokenSymbol
        );
        require!(
            self.uri_option.option_type == OptionType::URI,
            CoopMemeError::InvalidTokenUri
        );
        require!(
            self.name_option.index <= self.memecoin.total_options,
            CoopMemeError::InvalidOption
        );
        require!(
            self.symbol_option.index <= self.memecoin.total_options,
            CoopMemeError::InvalidOption
        );
        require!(
            self.uri_option.index <= self.memecoin.total_options,
            CoopMemeError::InvalidOption
        );
        require!(
            self.name_option.option_value.len() != 0,
            CoopMemeError::InvalidOption
        );
        require!(
            self.symbol_option.option_value.len() != 0,
            CoopMemeError::InvalidOption
        );
        require!(
            self.uri_option.option_value.len() != 0,
            CoopMemeError::InvalidOption
        );

        if self.memecoin.total_votes > 0 {
            require!(
                self.name_option.total_votes > 0,
                CoopMemeError::InvalidTokenVoteInfo
            );
            require!(
                self.uri_option.total_votes > 0,
                CoopMemeError::InvalidTokenVoteInfo
            );
            require!(
                self.symbol_option.total_votes > 0,
                CoopMemeError::InvalidTokenVoteInfo
            );
        }

        let final_name = &self.name_option.option_value;
        let final_symbol = &self.symbol_option.option_value;
        let final_uri = &self.uri_option.option_value;

        let signer_seeds: &[&[&[u8]]] = &[&[b"global", &[self.config.global_vault_bump]]];

        metadata::update_metadata_accounts_v2(
            CpiContext::new_with_signer(
                self.mpl_token_metadata_program.to_account_info(),
                metadata::UpdateMetadataAccountsV2 {
                    metadata: self.token_metadata_account.to_account_info(),
                    update_authority: self.global_vault.to_account_info(),
                },
                signer_seeds,
            ),
            Some(self.global_vault.key()),
            Some(DataV2 {
                name: final_name.to_string(),
                symbol: final_symbol.to_string(),
                uri: final_uri.to_string(),
                seller_fee_basis_points: 0, // or your actual value
                creators: None,             // set if you want to update
                collection: None,
                uses: None,
            }), // optional new update authority
            None,        // optional primary_sale_happened
            Some(false), // optional is_mutable)?;
        )?;

        emit!(VoteFinalizedEvent {
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            final_name: final_name.to_string(),
            final_symbol: final_symbol.to_string(),
            final_uri: final_uri.to_string(),
            total_votes: self.memecoin.total_votes
        });

        self.memecoin.is_voting_finalized = true;

        Ok(())
    }
}
