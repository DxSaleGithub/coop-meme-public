use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};
use raydium_cpmm_cpi::{
    cpi,
    program::RaydiumCpmm,
    states::{AmmConfig, OBSERVATION_SEED, POOL_LP_MINT_SEED, POOL_SEED, POOL_VAULT_SEED},
};

use anchor_lang::solana_program::program::{invoke, invoke_signed};
use anchor_lang::system_program::{transfer, Transfer};

use crate::state::*;
use crate::{error::*, events::ListEvent};

#[derive(Accounts)]
pub struct List<'info> {
    #[account[
      mut
    ]]
    pub owner: Signer<'info>,
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.
    #[account[
      mut,
    ]]
    pub creator: AccountInfo<'info>,
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.
    #[account[
      mut,
      constraint = config.team_wallet == team_wallet.key()
    ]]
    pub team_wallet: AccountInfo<'info>,
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

    // Token_0 mint, the key must smaller then token_1 mint.
    #[account(
        constraint = token_0_mint.key() < token_1_mint.key(),
        mint::token_program = token_program,
    )]
    pub token_0_mint: Box<Account<'info, Mint>>,

    // Token_1 mint, the key must grater then token_0 mint.
    #[account(
        mint::token_program = token_program,
    )]
    pub token_1_mint: Box<Account<'info, Mint>>,
    #[account(
      seeds = [b"mint", creator.key().as_ref(), &memecoin.token_id.to_le_bytes()],
      bump = memecoin.token_bump
    )]
    pub coop_token: Box<Account<'info, Mint>>, // token 1
    #[account[
      mut,
      seeds = [b"memecoin", coop_token.key().as_ref()],
      bump = memecoin.memecoin_bump
    ]]
    pub memecoin: Box<Account<'info, MemeCoinData>>,
    // // #[account(
    // //   mut,
    // //   associated_token::mint = native_mint,
    // //   associated_token::authority = global_vault
    // // )]
    // // pub global_wsol_account: Box<Account<'info, TokenAccount>>,
    #[account(
      mut,
      associated_token::mint = coop_token,
      associated_token::authority = global_vault
    )]
    pub global_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.
    #[account(
      init_if_needed,
      associated_token::mint=token_0_mint,
      associated_token::authority=owner,
      payer=owner
    )]
    pub owner_token_0: Box<Account<'info, TokenAccount>>,
    // This will be the WSOL ATA for `payer`
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = token_1_mint,
        associated_token::authority = owner
    )]
    pub owner_token_1: Box<Account<'info, TokenAccount>>,

    /// CHECK: pool lp mint, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_LP_MINT_SEED.as_bytes(),
            pool_state.key().as_ref(),
        ],
        seeds::program = cp_swap_program.key(),
        bump,
    )]
    pub lp_mint: UncheckedAccount<'info>,
    /// CHECK: creator lp ATA token account, init by cp-swap
    #[account(mut)]
    pub owner_lp_token: UncheckedAccount<'info>,
    /// CHECK: Token_0 vault for the pool, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_VAULT_SEED.as_bytes(),
            pool_state.key().as_ref(),
            token_0_mint.key().as_ref()
        ],
        seeds::program = cp_swap_program.key(),
        bump,
    )]
    pub token_0_vault: UncheckedAccount<'info>,
    /// CHECK: Token_1 vault for the pool, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_VAULT_SEED.as_bytes(),
            pool_state.key().as_ref(),
            token_1_mint.key().as_ref() // shud be native mint
        ],
        seeds::program = cp_swap_program.key(),
        bump,
    )]
    pub token_1_vault: UncheckedAccount<'info>,
    // create pool fee account
    #[account(
        mut,
        address= raydium_cpmm_cpi::create_pool_fee_reveiver::id(),
    )]
    pub create_pool_fee: Box<Account<'info, TokenAccount>>,
    /// CHECK: an account to store oracle observations, init by cp-swap
    #[account(
        mut,
        seeds = [
            OBSERVATION_SEED.as_bytes(),
            pool_state.key().as_ref(),
        ],
        seeds::program = cp_swap_program.key(),
        bump,
    )]
    pub observation_state: UncheckedAccount<'info>,
    pub cp_swap_program: Program<'info, RaydiumCpmm>, // must be Program<'info, RaydiumProg> for prod
    /// CHECK: pool vault and lp mint authority
    /// Which config the pool belongs to.
    pub amm_config: Box<Account<'info, AmmConfig>>, // same as cp_swap_program
    /// CHECK: pool vault and lp mint authority
    #[account(
        seeds = [
            b"vault_and_lp_mint_auth_seed",
        ],
        seeds::program = cp_swap_program.key(),
        bump,
    )]
    pub authority: UncheckedAccount<'info>,
    /// CHECK: Initialize an account to store the pool state, init by cp-swap
    #[account(
        mut,
        seeds = [
           b"pool",
            amm_config.key().as_ref(),
            token_0_mint.key().as_ref(),
            token_1_mint.key().as_ref(),
        ],
        seeds::program = cp_swap_program.key(),
        bump,
    )]
    pub pool_state: UncheckedAccount<'info>,
    #[account(
      address = spl_token::native_mint::ID
    )]
    pub native_mint: Account<'info, Mint>,
    /// Program to create mint account and mint tokens
    pub token_program: Program<'info, Token>,
    /// Program to create an ATA for receiving position NFT
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// To create a new program account
    pub system_program: Program<'info, System>,
    /// Sysvar for program account
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> List<'info> {
    pub fn list_token(&mut self) -> Result<()> {
        require!(
            !self.memecoin.is_token_listed,
            CustomError::TokenAlreadyListed
        );
        let mut owner_token_ata;
        let mut owner_wsol_ata;
        let mut init_token_0;
        let mut init_token_1;

        let listing_fee = self.memecoin.real_sol_reserves * self.config.listing_fee as u128 / 10000;

        if (self.token_0_mint.key() == self.native_mint.key()
            && self.token_1_mint.key() == self.coop_token.key())
        {
            owner_wsol_ata = self.owner_token_0.to_account_info();
            owner_token_ata = self.owner_token_1.to_account_info();

            init_token_0 = self.memecoin.real_sol_reserves - listing_fee;
            init_token_1 = self.memecoin.real_token_reserves;
        } else if (self.token_1_mint.key() == self.native_mint.key()
            && self.token_0_mint.key() == self.coop_token.key())
        {
            owner_wsol_ata = self.owner_token_1.to_account_info();
            owner_token_ata = self.owner_token_0.to_account_info();

            init_token_0 = self.memecoin.real_token_reserves;
            init_token_1 = self.memecoin.real_sol_reserves - listing_fee;
        } else {
            return Err(CustomError::Unauthorized.into());
        }

        // trade is over -> check via timestamp and mark as inactive if not already
        let current_time = Clock::get()?.unix_timestamp as u64;
        if (self.memecoin.is_trading_active && self.memecoin.token_market_end_time < current_time) {
            self.memecoin.is_trading_active = false;
        }
        require!(!self.memecoin.is_trading_active, CustomError::TradingActive);
        require!(
            self.memecoin.is_voting_finalized,
            CustomError::VotingNotFinalized
        );
        require!(
            self.config.admin.key() == self.owner.key(),
            CustomError::Unauthorized
        );
        require!(
            self.memecoin.creator == self.creator.key(),
            CustomError::Unauthorized
        );
        msg!("Constraint passed");

        // transfer listing fee from gloval vault to team wallet
        let seeds: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];
        self._sol_transfer_with_signer(
            self.global_vault.to_account_info(),
            self.team_wallet.to_account_info(),
            &self.system_program,
            &[seeds],
            listing_fee as u64,
        )?;

        msg!("listing fee transferred");

        // wrap SOL into WSOL by transferring SOL from global vault to owner wsol ata
        self._wrap_sol(
            self.memecoin.real_sol_reserves - listing_fee,
            &[seeds],
            owner_wsol_ata,
        )?;

        msg!("sol to wsol for user done");

        require!(
            (self.memecoin.real_token_reserves as u64) <= self.global_token_ata.amount,
            CustomError::NotEnoughToken
        );

        // transfer tokens from global token ata to owner token ata
        self._token_transfer_with_signer(
            self.global_token_ata.to_account_info(),
            self.global_vault.to_account_info(),
            owner_token_ata.to_account_info(),
            &self.token_program,
            &[seeds],
            self.memecoin.real_token_reserves as u64,
        )?;

        msg!("token transfer to owner pda is successful");

        let cpi_accounts = cpi::accounts::Initialize {
            creator: self.owner.to_account_info(),
            amm_config: self.amm_config.to_account_info(),
            authority: self.authority.to_account_info(),
            pool_state: self.pool_state.to_account_info(),
            token_0_mint: self.token_0_mint.to_account_info(),
            token_1_mint: self.token_1_mint.to_account_info(),
            lp_mint: self.lp_mint.to_account_info(),
            creator_token_0: self.owner_token_0.to_account_info(),
            creator_token_1: self.owner_token_1.to_account_info(), //?
            creator_lp_token: self.owner_lp_token.to_account_info(),
            token_0_vault: self.token_0_vault.to_account_info(),
            token_1_vault: self.token_1_vault.to_account_info(),
            create_pool_fee: self.create_pool_fee.to_account_info(),
            observation_state: self.observation_state.to_account_info(),
            token_program: self.token_program.to_account_info(),
            token_0_program: self.token_program.to_account_info(),
            token_1_program: self.token_program.to_account_info(),
            associated_token_program: self.associated_token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            rent: self.rent.to_account_info(),
        };
        let cpi_context = CpiContext::new(self.cp_swap_program.to_account_info(), cpi_accounts);
        cpi::initialize(
            cpi_context,
            init_token_0 as u64,
            init_token_1 as u64,
            Clock::get()?.unix_timestamp as u64,
        )?;

        self.config.total_coop_listed = self.config.total_coop_listed + 1;
        self.memecoin.is_token_listed = true;

        emit!(ListEvent {
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            token_in: self.memecoin.real_token_reserves as u64,
            sol_in: (self.memecoin.real_sol_reserves - listing_fee) as u64,
            lp_mint: self.lp_mint.key()
        });
        Ok(())
    }

    fn _wrap_sol(
        &self,
        amount: u128,
        signer_seeds: &[&[&[u8]]],
        owner_wsol_ata: AccountInfo<'info>,
    ) -> Result<()> {
        // Step 1: Transfer SOL from vault to admin WSOL ATA
        transfer(
            CpiContext::new_with_signer(
                self.system_program.to_account_info(),
                Transfer {
                    from: self.global_vault.to_account_info(),
                    to: owner_wsol_ata.clone(),
                },
                signer_seeds,
            ),
            amount as u64,
        )?;

        // Step 2: Sync the ATA to make it a valid WSOL token account
        anchor_spl::token::sync_native(CpiContext::new(
            self.token_program.to_account_info(),
            anchor_spl::token::SyncNative {
                account: owner_wsol_ata.clone(),
            },
        ))?;

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

    // transfer sol from PDA
    fn _sol_transfer_with_signer(
        &self,
        source: AccountInfo<'info>,
        destination: AccountInfo<'info>,
        system_program: &Program<'info, System>,
        signers_seeds: &[&[&[u8]]],
        amount: u64,
    ) -> Result<()> {
        let ix = solana_program::system_instruction::transfer(source.key, destination.key, amount);
        invoke_signed(
            &ix,
            &[source, destination, system_program.to_account_info()],
            signers_seeds,
        )?;
        Ok(())
    }
}
