use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, Mint, Token, TokenAccount},
    token_interface::TokenInterface,
};

use crate::state::{ConfigData, GlobalVault};
#[derive(Accounts)]
pub struct Config<'info> {
    #[account[mut]]
    pub owner: Signer<'info>,
    #[account[
      init,
      space = 8 + ConfigData::INIT_SPACE,
      payer=owner,
      seeds = [b"config"],
      bump
    ]]
    pub config: Account<'info, ConfigData>,
    /// CHECK: global vault pda which stores SOL
    #[account(
      mut,
      seeds = [b"global"],
      bump,
    )]
    pub global_vault: AccountInfo<'info>,
    #[account(
      init,
      payer = owner,
      associated_token::mint = native_mint,
      associated_token::authority = global_vault
    )]
    pub global_wsol_account: Account<'info, TokenAccount>,
    #[account(
      address = spl_token::native_mint::ID
    )]
    pub native_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Config<'info> {
    pub fn init(&mut self, bumbs: &ConfigBumps, team_wallet: Pubkey) -> Result<()> {
        self.config.set_inner(ConfigData {
            admin: self.owner.key(),
            team_wallet: team_wallet,
            team_fee: 1000,
            owner_fee: 1000,
            affiliated_fee: 1000,
            listing_fee: 500,
            coop_interval: 600,
            fairlaunch_period: 300,
            min_price_per_token: 10_000,                   //  0.00001 sol
            max_price_per_token: 1_000_000_0,              // 0.01 sol
            init_virtual_sol: 1_000_000_000,               // 1 sol
            init_virtual_token: 1_000_000_000_000_000_000, // 1 billion token => init price = 0.01 sol per token
            total_coop_created: 0,
            total_coop_listed: 0,
            config_bump: bumbs.config,
            global_vault_bump: bumbs.global_vault,
        });

        Ok(())
    }

    // update methods here
}
