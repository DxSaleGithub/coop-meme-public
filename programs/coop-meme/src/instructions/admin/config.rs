use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, Mint, Token, TokenAccount},
};

use crate::{
    error::*,
    state::{ConfigData, MemeCoinDataMetadata},
    RBAControlList,
};
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
    #[account[
      init,
      space = 8 + RBAControlList::INIT_SPACE,
      payer=owner,
      seeds = [b"roles"],
      bump
    ]]
    pub rbac: Account<'info, RBAControlList>,
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
            is_paused: false,
            in_emergency: false,
            team_wallet: team_wallet,
            team_fee: 100,
            owner_fee: 10,
            affiliated_fee: 10,
            listing_fee: 500,
            coop_interval: 600,
            fairlaunch_period: 300,
            init_virtual_sol: 30_000_000_000,              // 30 sol
            init_virtual_token: 1_000_000_000_000_000_000, // 1 billion token
            init_real_token: 1_000_000_000_000_000_000,
            fairlaunch_cap: 20_000_000_000,
            total_coop_created: 0,
            total_coop_listed: 0,
            min_vote_token_amount: 1000_000_000_000,
            min_option_add_token_amount: 10000_000_000_000,
            config_bump: bumbs.config,
            global_vault_bump: bumbs.global_vault,
            current_coop_token_metadata: MemeCoinDataMetadata {
                token_id: 0,
                token_nonce: 0,
                token_mint: Pubkey::default(),
                creator: Pubkey::default(),
                is_bonding_curve_active: false,
                is_trading_active: false,
                is_voting_finalized: false,
                is_token_listed: false,
                total_options: 0,
            },
        });

        self.rbac.set_inner(RBAControlList {
            admin: self.owner.key(),
            roles: Vec::new(),
            bump: bumbs.rbac,
        });

        Ok(())
    }
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
        new_init_virtual_sol: Option<u64>,
        new_init_virtual_token: Option<u64>,
        new_init_real_token: Option<u64>,
        new_fairlaunch_cap: Option<u64>,
        new_min_vote_token_amount: Option<u64>,
        new_min_option_add_token_amount: Option<u64>,
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

        if let Some(sol) = new_init_virtual_sol {
            self.config.init_virtual_sol = sol;
        }

        if let Some(token) = new_init_virtual_token {
            self.config.init_virtual_token = token;
        }

        if let Some(token) = new_init_real_token {
            self.config.init_real_token = token;
        }

        if let Some(token) = new_fairlaunch_cap {
            self.config.fairlaunch_cap = token;
        }

        if let Some(token_amount) = new_min_vote_token_amount {
            self.config.min_vote_token_amount = token_amount;
        }

        if let Some(token_amount) = new_min_option_add_token_amount {
            self.config.min_option_add_token_amount = token_amount;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct UpdateConfigStorage<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.config_bump,
        has_one = admin @ CoopMemeError::Unauthorized,
        realloc = 8 + ConfigData::INIT_SPACE + 8,
        // realloc = 8 + std::mem::size_of_val(&vote_options_registry) + std::mem::size_of::<OptionsRegistry>(),
        realloc::payer = admin,
        realloc::zero = false      // Preserve data
    )]
    pub config: Account<'info, ConfigData>,
    pub system_program: Program<'info, System>,
}

impl<'info> UpdateConfigStorage<'info> {
    pub fn add_new_field(&mut self) -> Result<()> {
        require!(
            self.admin.key() == self.config.admin,
            CoopMemeError::Unauthorized
        );
        Ok(())
    }
}

#[derive(Accounts)]
pub struct TransferOwnership<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: This is a system account so safe.
    #[account[]]
    pub new_admin: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.config_bump,
        has_one = admin @ CoopMemeError::Unauthorized
    )]
    pub config: Account<'info, ConfigData>,
    #[account[
      mut,
      seeds = [b"roles"],
      bump=rbac.bump
    ]]
    pub rbac: Account<'info, RBAControlList>,
}

impl<'info> TransferOwnership<'info> {
    pub fn transfer_ownership(&mut self) -> Result<()> {
        require!(
            self.admin.key() == self.config.admin,
            CoopMemeError::Unauthorized
        );
        self.config.admin = self.new_admin.key();
        self.rbac.admin = self.new_admin.key();
        Ok(())
    }
}
