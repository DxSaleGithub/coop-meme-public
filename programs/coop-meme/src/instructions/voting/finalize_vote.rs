use crate::{
    error::*,
    events::{TradingOverEvent, VoteFinalizedEvent},
    state::{ConfigData, MemeCoinData, RBAControlList, RoleType, TokenOption},
    utils::has_role,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{self, mpl_token_metadata::types::DataV2, Metadata},
    token::{self, Mint},
};

#[derive(Accounts)]
pub struct FinalizeVote<'info> {
    #[account[mut]]
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
    // The option the VOTING-role admin declares as the winner.
    #[account(
        constraint = winning_option.token == coop_token.key() @ CoopMemeError::InvalidOption,
        constraint = winning_option.index != 0 && winning_option.index <= memecoin.total_options @ CoopMemeError::InvalidOption,
    )]
    pub winning_option: Box<Account<'info, TokenOption>>,
    /// CHECK: PDA for token metadata account
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
    pub fn finalize_vote(&mut self, final_uri: String) -> Result<()> {
        require!(!self.config.is_paused, CoopMemeError::Paused);
        require!(
            final_uri.len() > 0 && final_uri.len() < 256,
            CoopMemeError::InvalidTokenUri
        );
        has_role(&self.rbac.roles, RoleType::VOTING, self.user.key())?;
        require!(
            !self.memecoin.is_voting_finalized,
            CoopMemeError::VotingFinalized
        );

        let current_time = Clock::get()?.unix_timestamp as u64;
        if current_time > self.memecoin.token_market_end_time {
            if self.memecoin.is_trading_active {
                self.memecoin.is_trading_active = false;
                self.config.current_coop_token_metadata.is_trading_active = false;
                emit!(TradingOverEvent {
                    coop_token: self.coop_token.key(),
                    memecoin: self.memecoin.key(),
                });
            }
        } else {
            return Err(CoopMemeError::TradingActive.into());
        }

        // Validate winning option fields are non-empty.
        require!(
            !self.winning_option.name.is_empty(),
            CoopMemeError::InvalidTokenName
        );
        require!(
            !self.winning_option.symbol.is_empty(),
            CoopMemeError::InvalidTokenSymbol
        );
        require!(
            !self.winning_option.logo.is_empty(),
            CoopMemeError::InvalidTokenUri
        );

        // Advisory check: warn via error if admin chose an option other than the tracked leader,
        // but do NOT block — the VOTING admin may have off-chain evidence of the true winner
        // (e.g., the leader changed due to unvotes since the last on-chain update).
        // Uncomment the block below to make this a hard check instead:
        //
        // if self.memecoin.leading_option != Pubkey::default() {
        //     require!(
        //         self.winning_option.key() == self.memecoin.leading_option,
        //         CoopMemeError::InvalidOption
        //     );
        // }

        let final_name = &self.winning_option.name;
        let final_symbol = &self.winning_option.symbol;

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
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            }),
            None,
            Some(false),
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
        self.config.current_coop_token_metadata.is_voting_finalized = true;

        Ok(())
    }
}
