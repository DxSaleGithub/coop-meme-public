use crate::state::{ConfigData, MemeCoinData};
use crate::{error::*, events::BurnEvent};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, burn, Burn, Mint, Token},
};
use raydium_cpmm_cpi::{
    cpi,
    program::RaydiumCpmm,
    states::{AmmConfig, POOL_LP_MINT_SEED, POOL_VAULT_SEED},
};
use solana_program::program_pack::Pack; // <-- This import is required
use spl_token::state::Account as SplAccount;

#[derive(Accounts)]
pub struct BurnLP<'info> {
    #[account[
      mut
    ]]
    pub owner: Signer<'info>,
    /// CHECK: This is a system account so safe.
    #[account[
      mut,
    ]]
    pub creator: AccountInfo<'info>,
    #[account[
      mut,
      seeds = [b"config"],
      bump = config.config_bump
    ]]
    pub config: Box<Account<'info, ConfigData>>,
    // Token_0 mint, the key must smaller then token_1 mint.
    #[account(
        constraint = token_0_mint.key() < token_1_mint.key(),
        mint::token_program = token_program,
    )]
    pub token_0_mint: Box<Account<'info, Mint>>,
    // Token_1 mint, the key must be greater than token_0 mint.
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
    pub cp_swap_program: Program<'info, RaydiumCpmm>, // must be Program<'info, RaydiumProg> for prod
    /// CHECK: amm config pda
    /// Which config the pool belongs to.
    pub amm_config: Box<Account<'info, AmmConfig>>, // same as cp_swap_program
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
    /// Program to create mint account and mint tokens
    pub token_program: Program<'info, Token>,
    /// Program to create an ATA for receiving position NFT
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// To create a new program account
    pub system_program: Program<'info, System>,
    /// Sysvar for program account
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> BurnLP<'info> {
    pub fn burn_lp_token(&mut self) -> Result<()> {
        require!(self.memecoin.is_token_listed, CoopMemeError::TokenNotListed);
        require!(
            self.config.admin.key() == self.owner.key(),
            CoopMemeError::Unauthorized
        );
        require!(
            self.memecoin.creator == self.creator.key(),
            CoopMemeError::Unauthorized
        );
        // burn minted LP tokens
        self._burn_lp_tokens()?;

        emit!(BurnEvent {
            coop_token: self.coop_token.key(),
            memecoin: self.memecoin.key(),
            lp_mint: self.lp_mint.key()
        });

        Ok(())
    }

    fn _burn_lp_tokens(&self) -> Result<()> {
        let lp_mint_account_info = &self.lp_mint;
        let owner_lp_token_account_info = &self.owner_lp_token;

        // Scope the borrow
        let amount = {
            let account_data = &owner_lp_token_account_info.try_borrow_data()?;
            let token_account = SplAccount::unpack_from_slice(account_data)?;
            token_account.amount
        }; // reference is dropped here

        if amount <= 0 {
            return Err((CoopMemeError::InvalidOperation.into()));
        }

        let burn_accounts = Burn {
            mint: lp_mint_account_info.to_account_info(),
            from: owner_lp_token_account_info.to_account_info(),
            authority: self.owner.to_account_info(),
        };

        let burn_ctx = CpiContext::new(self.token_program.to_account_info(), burn_accounts);

        burn(burn_ctx, amount)?;
        Ok(())
    }
}
