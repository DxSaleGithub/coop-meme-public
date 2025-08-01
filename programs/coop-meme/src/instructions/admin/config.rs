use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, Mint, Token, TokenAccount},
};

use crate::{error::*, state::ConfigData};
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
            min_price_per_token: 100,                      //  0.0000001 sol
            max_price_per_token: 1_000_000_0,              // 0.01 sol
            init_virtual_sol: 10_000_000_000_000_000,      // 10 million sol
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

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.config_bump,
        has_one = admin @ CoopMemeError::Unauthorized
    )]
    pub config: Account<'info, ConfigData>,
}

impl<'info> UpdateConfig<'info> {
    pub fn update_config(
        &mut self,
        new_team_fee: Option<u16>,
        new_owner_fee: Option<u16>,
        new_affiliated_fee: Option<u16>,
        new_listing_fee: Option<u16>,
        new_team_wallet: Option<Pubkey>,
        new_coop_interval: Option<u64>,
        new_fairlaunch_period: Option<u32>,
        new_min_price_per_token: Option<u32>,
        new_max_price_per_token: Option<u32>,
        new_init_virtual_sol: Option<u64>,
        new_init_virtual_token: Option<u64>,
    ) -> Result<()> {
        require!(
            self.admin.key() == self.config.admin,
            CoopMemeError::Unauthorized
        );

        if let Some(fee) = new_team_fee {
            self.config.team_fee = fee;
        }

        if let Some(fee) = new_owner_fee {
            self.config.owner_fee = fee;
        }

        if let Some(fee) = new_affiliated_fee {
            self.config.affiliated_fee = fee;
        }

        if let Some(fee) = new_listing_fee {
            self.config.listing_fee = fee;
        }

        if let Some(wallet) = new_team_wallet {
            self.config.team_wallet = wallet;
        }

        if let Some(interval) = new_coop_interval {
            self.config.coop_interval = interval;
        }

        if let Some(period) = new_fairlaunch_period {
            self.config.fairlaunch_period = period;
        }

        if let Some(min_price) = new_min_price_per_token {
            self.config.min_price_per_token = min_price;
        }

        if let Some(max_price) = new_max_price_per_token {
            self.config.max_price_per_token = max_price;
        }

        if let Some(sol) = new_init_virtual_sol {
            self.config.init_virtual_sol = sol;
        }

        if let Some(token) = new_init_virtual_token {
            self.config.init_virtual_token = token;
        }

        Ok(())
    }

    // update methods here
}
