use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    metadata::{self, mpl_token_metadata::types::DataV2, Metadata},
    token::{self, spl_token::instruction::AuthorityType, Mint, Token, TokenAccount},
};

use crate::{
    error::*,
    events::CreatedEvent,
    state::{ConfigData, MemeCoinData, TokenVotes},
};
#[derive(Accounts)]
pub struct MemeCoin<'info> {
    #[account[mut]]
    pub creator: Signer<'info>,

    #[account[
      mut,
      seeds = [b"config"],
      bump = config.config_bump
    ]]
    pub config: Account<'info, ConfigData>,
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
        init,
        seeds = [b"mint", creator.key().as_ref(), &(config.total_coop_created+1).to_le_bytes() ],
        bump,
        payer = creator,
        mint::decimals = 9,
        mint::authority = global_vault.key(),
    )]
    pub coop_token: Box<Account<'info, Mint>>,
    #[account[
      init,
      space = 8 + MemeCoinData::INIT_SPACE,
      payer=creator,
      seeds = [b"memecoin", coop_token.key().as_ref()],
      bump
    ]]
    pub memecoin: Box<Account<'info, MemeCoinData>>,
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

    #[account[
      init,
      space = 8 + TokenVotes::INIT_SPACE,
      payer=creator,
      seeds = [b"votes", coop_token.key().as_ref()],
      bump
    ]]
    pub token_votes: Box<Account<'info, TokenVotes>>,

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

    /// CHECK: This is an ata for coop token with votes token as authority to store locked tokens for voting.
    #[account(
      init_if_needed,
      associated_token::mint=coop_token,
      associated_token::authority=token_votes,
      associated_token::token_program=token_program,
      payer=creator
    )]
    pub vote_token_ata: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    #[account(address = token::ID)]
    token_program: Program<'info, Token>,

    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,

    #[account(address = metadata::ID)]
    mpl_token_metadata_program: Program<'info, Metadata>,
}

impl<'info> MemeCoin<'info> {
    pub fn create_memecoin(
        &mut self,
        bumps: &MemeCoinBumps,
        total_supply: u64,
        token_share_price: u32,
        name: String,
        symbol: String,
        uri: String,
        token_names: [String; 5],
        token_symbols: [String; 5],
        token_uris: [String; 5],
    ) -> Result<()> {
        require!(
            total_supply == 1_000_000_000_000_000_000,
            CoopMemeError::InvalidTotalSupply
        );
        require!(
            self.config.min_price_per_token <= token_share_price
                && token_share_price < self.config.max_price_per_token,
            CoopMemeError::InvalidFairSharePrice
        );
        require!(
            !name.is_empty() && name.len() < 37,
            CoopMemeError::InvalidTokenName
        );
        require!(
            !symbol.is_empty() && symbol.len() < 15,
            CoopMemeError::InvalidTokenSymbol
        );
        require!(
            !uri.is_empty() && uri.len() < 200,
            CoopMemeError::InvalidTokenUri
        );

        let clock = Clock::get()?; // Pull the clock sysvar
        let current_time = clock.unix_timestamp as u64; // i64 in seconds

        self.memecoin.set_inner(MemeCoinData {
            token_id: self.config.total_coop_created.checked_add(1).unwrap(),
            token_mint: self.coop_token.key(),
            creator: self.creator.key(),
            token_share_price: token_share_price,
            token_total_supply: total_supply,
            token_creation_time: current_time as u64,
            token_fairlaunch_end_time: current_time
                .checked_add(self.config.fairlaunch_period as u64)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap(),
            token_market_end_time: current_time
                .checked_add(self.config.coop_interval)
                .ok_or(CoopMemeError::InvalidOperation)
                .unwrap(),
            virtual_sol_reserves: self.config.init_virtual_sol,
            virtual_token_reserves: total_supply,
            real_sol_reserves: 0,
            real_token_reserves: total_supply,
            is_bonding_curve_active: false,
            is_trading_active: true,
            is_token_listed: false,
            is_voting_finalized: false,
            token_names,
            token_symbols,
            token_uris,
            memecoin_bump: bumps.memecoin,
            token_bump: bumps.coop_token,
        });

        self.token_votes.set_inner(TokenVotes {
            minimum_tokens: 1_000_000_000_000,
            total_votes: 0,
            name_votes: [0; 5],
            symbol_votes: [0; 5],
            uri_votes: [0; 5],
            bump: bumps.token_votes,
        });

        self.config.total_coop_created = self.config.total_coop_created + 1;

        // create global token account
        associated_token::create(CpiContext::new(
            self.associated_token_program.to_account_info(),
            associated_token::Create {
                payer: self.creator.to_account_info(),
                associated_token: self.global_token_ata.to_account_info(),
                authority: self.global_vault.to_account_info(),
                mint: self.coop_token.to_account_info(),
                token_program: self.token_program.to_account_info(),
                system_program: self.system_program.to_account_info(),
            },
        ))?;

        let signer_seeds: &[&[&[u8]]] = &[&[b"global", &[self.config.global_vault_bump]]];

        // mint tokens to global vault ata for token
        token::mint_to(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                token::MintTo {
                    mint: self.coop_token.to_account_info(),
                    to: self.global_token_ata.to_account_info(),
                    authority: self.global_vault.to_account_info(),
                },
                signer_seeds,
            ),
            total_supply as u64,
        )?;

        // create metadata
        metadata::create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                self.mpl_token_metadata_program.to_account_info(),
                metadata::CreateMetadataAccountsV3 {
                    metadata: self.token_metadata_account.to_account_info(),
                    mint: self.coop_token.to_account_info(),
                    mint_authority: self.global_vault.to_account_info(),
                    payer: self.creator.to_account_info(),
                    update_authority: self.global_vault.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                    rent: self.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name,
                symbol,
                uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            true,
            true,
            None,
        )?;

        //  revoke mint authority
        token::set_authority(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                token::SetAuthority {
                    current_authority: self.global_vault.to_account_info(),
                    account_or_mint: self.coop_token.to_account_info(),
                },
                signer_seeds,
            ),
            AuthorityType::MintTokens,
            None,
        )?;

        emit!(CreatedEvent {
            token_id: self.memecoin.token_id,
            creator: self.creator.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            metadata: self.token_metadata_account.key(),
            decimals: 9,
            token_supply: total_supply as u64,
            token_creation_time: self.memecoin.token_creation_time,
            token_fairlaunch_end_time: self.memecoin.token_fairlaunch_end_time,
            token_market_end_time: self.memecoin.token_market_end_time
        });

        Ok(())
    }
}
