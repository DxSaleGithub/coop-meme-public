use crate::utils::{extend_mint_for_transfer_hook, set_transfer_hook_authority};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::rent::{
    DEFAULT_EXEMPTION_THRESHOLD, DEFAULT_LAMPORTS_PER_BYTE_YEAR,
};
// use anchor_lang::system_program::{transfer, Transfer};
// use anchor_spl::token_2022_extensions::spl_token_metadata_interface::state::TokenMetadata;
// use anchor_spl::token_interface::spl_token_metadata_interface::state::TokenMetadata;
// use spl_type_length_value::variable_len_pack::VariableLenPack;
use anchor_lang::{
    prelude::*, solana_program::program::invoke, solana_program::system_instruction::transfer,
};
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    // metadata::{self, mpl_token_metadata::types::DataV2, Metadata},
    token_2022::{self, spl_token_2022::instruction::AuthorityType, Token2022},
    token_interface::{
        token_metadata_initialize, token_metadata_update_field, Mint, TokenAccount,
        TokenMetadataInitialize, TokenMetadataUpdateField,
    },
};
use borsh::BorshSerialize;

use crate::{
    error::*,
    events::CreatedEvent,
    state::{ConfigData, MemeCoinData, RBAControlList, RoleType},
    utils::has_role,
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
      init,
      seeds = [b"mint", &(config.total_coop_created+1).to_le_bytes()],
      bump,
      payer = creator,
      mint::token_program = token_program,
      mint::decimals = 9,
      mint::authority = global_vault.key(),
      extensions::transfer_hook::program_id = hook_program.key(),
      extensions::transfer_hook::authority = global_vault.key(),
      extensions::metadata_pointer::authority = global_vault.key(),
      extensions::metadata_pointer::metadata_address = coop_token.key(),
    )]
    pub coop_token: Box<InterfaceAccount<'info, Mint>>,

    #[account[
      init,
      space = 8 + MemeCoinData::INIT_SPACE,
      payer=creator,
      seeds = [b"memecoin", coop_token.key().as_ref()],
      bump
    ]]
    pub memecoin: Box<Account<'info, MemeCoinData>>,
    /// CHECK: This is an ATA for coop token with global vault as authority.
    #[account(
      mut,
      seeds = [
          global_vault.key().as_ref(),             // authority
          token_2022::ID.as_ref(),                      //  Token 2022 Program
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
      associated_token::authority=memecoin,
      associated_token::token_program=token_program,
      payer=creator
    )]
    pub vote_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: This is an ata for coop token with votes token as authority to store locked tokens for voting.
    pub hook_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    #[account(address = token_2022::ID)]
    token_program: Program<'info, Token2022>,

    #[account(address = associated_token::ID)]
    associated_token_program: Program<'info, AssociatedToken>,
    // #[account(address = metadata::ID)]
    // mpl_token_metadata_program: Program<'info, Metadata>,
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
    ) -> Result<()> {
        msg!("i m here {}");

        has_role(&self.rbac.roles, RoleType::CREATING, self.creator.key())?;
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
            total_options: 0,
            total_votes: 0,
            memecoin_bump: bumps.memecoin,
            token_bump: bumps.coop_token,
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
        token_2022::mint_to(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                token_2022::MintTo {
                    mint: self.coop_token.to_account_info(),
                    to: self.global_token_ata.to_account_info(),
                    authority: self.global_vault.to_account_info(),
                },
                signer_seeds,
            ),
            total_supply as u64,
        )?;

        let cpi_accounts = TokenMetadataInitialize {
            program_id: self.token_program.to_account_info(),
            mint: self.coop_token.to_account_info(),
            metadata: self.coop_token.to_account_info(), // metadata account is the mint, since data is stored in mint
            mint_authority: self.global_vault.to_account_info(),
            update_authority: self.global_vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token_metadata_initialize(cpi_ctx, name, symbol, uri)?;

        let data = self.coop_token.to_account_info().data_len();
        let min_balance = Rent::get()?.minimum_balance(data);
        if min_balance > self.coop_token.to_account_info().get_lamports() {
            invoke(
                &transfer(
                    &self.creator.key(),
                    &self.coop_token.to_account_info().key(),
                    min_balance - self.coop_token.to_account_info().get_lamports(),
                ),
                &[
                    self.creator.to_account_info(),
                    self.coop_token.to_account_info(),
                    self.system_program.to_account_info(),
                ],
            )?;
        }

        // let cpi_accounts = TokenMetadataUpdateField {
        //     metadata: self.coop_token.to_account_info(),
        //     update_authority: self.creator.to_account_info(),
        //     program_id: self.token_program.to_account_info(),
        // };

        // let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);

        // token_metadata_update_field(cpi_ctx, Field::Key("AB".to_string()), args.mode.to_string())?;

        // let TokenMetadataArgs { name, symbol, uri } = TokenMetadataArgs { name, symbol, uri };

        // // Define token metadata
        // let token_metadata = TokenMetadata {
        //     name: name.clone(),
        //     symbol: symbol.clone(),
        //     uri: uri.clone(),
        //     // update_authority: self.global_vault.key(),
        //     ..Default::default()
        // };

        // // Add 4 extra bytes for size of MetadataExtension (2 bytes for type, 2 bytes for length)
        // let data_len = 4 + token_metadata.get_packed_len()?;

        // // let packed_data = token_metadata.try_to_vec()?;
        // // let data_len = 4 + packed_data.len(); // 4 extra bytes for MetadataExtension size prefix

        // // Calculate lamports required for the additional metadata
        // let lamports =
        //     data_len as u64 * DEFAULT_LAMPORTS_PER_BYTE_YEAR * DEFAULT_EXEMPTION_THRESHOLD as u64;

        // // Transfer additional lamports to mint account
        // transfer(
        //     CpiContext::new(
        //         self.system_program.to_account_info(),
        //         Transfer {
        //             from: self.creator.to_account_info(),
        //             to: self.coop_token.to_account_info(),
        //         },
        //     ),
        //     lamports,
        // )?;

        // // Initialize token metadata
        // token_metadata_initialize(
        //     CpiContext::new(
        //         self.token_program.to_account_info(),
        //         TokenMetadataInitialize {
        //             program_id: self.token_program.to_account_info(),
        //             mint: self.coop_token.to_account_info(),
        //             metadata: self.coop_token.to_account_info(),
        //             mint_authority: self.global_vault.to_account_info(),
        //             update_authority: self.global_vault.to_account_info(),
        //         },
        //     ),
        //     name,
        //     symbol,
        //     uri,
        // )?;

        // self.create_token_with_transfer_hook(hook_program_id);

        // // create metadata
        // metadata::create_metadata_accounts_v3(
        //     CpiContext::new_with_signer(
        //         self.mpl_token_metadata_program.to_account_info(),
        //         metadata::CreateMetadataAccountsV3 {
        //             metadata: self.token_metadata_account.to_account_info(),
        //             mint: self.coop_token.to_account_info(),
        //             mint_authority: self.global_vault.to_account_info(),
        //             payer: self.creator.to_account_info(),
        //             update_authority: self.global_vault.to_account_info(),
        //             system_program: self.system_program.to_account_info(),
        //             rent: self.rent.to_account_info(),
        //         },
        //         signer_seeds,
        //     ),
        //     DataV2 {
        //         name,
        //         symbol,
        //         uri,
        //         seller_fee_basis_points: 0,
        //         creators: None,
        //         collection: None,
        //         uses: None,
        //     },
        //     true,
        //     true,
        //     None,
        // )?;

        //  revoke mint authority
        // token_2022::set_authority(
        //     CpiContext::new_with_signer(
        //         self.token_program.to_account_info(),
        //         token_2022::SetAuthority {
        //             current_authority: self.global_vault.to_account_info(),
        //             account_or_mint: self.coop_token.to_account_info(),
        //         },
        //         signer_seeds,
        //     ),
        //     AuthorityType::MintTokens,
        //     None,
        // )?;

        emit!(CreatedEvent {
            token_id: self.memecoin.token_id,
            creator: self.creator.key(),
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            metadata: self.coop_token.key(),
            decimals: 9,
            token_supply: total_supply as u64,
            token_creation_time: self.memecoin.token_creation_time,
            token_fairlaunch_end_time: self.memecoin.token_fairlaunch_end_time,
            token_market_end_time: self.memecoin.token_market_end_time
        });

        Ok(())
    }

    // /// A simple function to extend the mint account with Transfer Hook and set its authority
    // pub fn create_token_with_transfer_hook(&self, hook_program_id: Pubkey) -> Result<()> {
    //     // 1. Extend mint account with Transfer Hook extension
    //     extend_mint_for_transfer_hook(
    //         self.coop_token.to_account_info(),
    //         self.creator.to_account_info(),
    //         self.token_program.to_account_info(),
    //         self.system_program.to_account_info(),
    //         self.rent.to_account_info(),
    //     )?;

    //     // 2. Set Transfer Hook authority to the hook_program_id
    //     set_transfer_hook_authority(
    //         self.coop_token.to_account_info(),
    //         self.token_program.to_account_info(),
    //         hook_program_id,
    //     )?;

    //     Ok(())
    // }
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct TokenMetadataArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
}
