#![allow(deprecated)] // for no warnings
#[allow(unexpected_cfgs)]
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("241PuxFSpzprqnwQNXGS4XdBkW79jkQ481KDtyxj4RZv");

#[program]
pub mod coop_meme {
    use super::*;

    pub fn initialize(ctx: Context<Config>, team_wallet: Pubkey) -> Result<()> {
        ctx.accounts.init(&ctx.bumps, team_wallet)
    }

    pub fn update_config(
        // only admin
        ctx: Context<UpdateConfig>,
        new_team_fee: Option<u16>,
        new_owner_fee: Option<u16>,
        new_affiliated_fee: Option<u16>,
        new_listing_fee: Option<u16>,
        new_team_wallet: Option<Pubkey>,
        new_coop_interval: Option<u64>,
        new_fairlaunch_period: Option<u64>,
        new_min_price_per_token: Option<u64>,
        new_max_price_per_token: Option<u64>,
        new_init_virtual_sol: Option<u128>,
        new_init_virtual_token: Option<u128>,
    ) -> Result<()> {
        ctx.accounts.update_config(
            new_team_fee,
            new_owner_fee,
            new_affiliated_fee,
            new_listing_fee,
            new_team_wallet,
            new_coop_interval,
            new_fairlaunch_period,
            new_min_price_per_token,
            new_max_price_per_token,
            new_init_virtual_sol,
            new_init_virtual_token,
        )
    }

    pub fn create_token(
        // only admin can call
        ctx: Context<MemeCoin>,
        total_supply: u128,
        token_share_price: u64,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        ctx.accounts.create_memecoin(
            &ctx.bumps,
            total_supply,
            token_share_price,
            name,
            symbol,
            uri,
        )
    }

    pub fn buy_tokens(ctx: Context<Trade>, amount: u128, min_tokens_receive: u128) -> Result<()> {
        ctx.accounts.buy_tokens(amount, min_tokens_receive)
    }

    pub fn sell_tokens(ctx: Context<Trade>, amount: u128, min_sol_receive: u128) -> Result<()> {
        ctx.accounts.sell_tokens(amount, min_sol_receive)
    }

    pub fn list_token(ctx: Context<List>) -> Result<()> {
        // only admin can call
        ctx.accounts.list_token()
    }

    pub fn swap_token_base_input(
        ctx: Context<SwapBaseInput>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        ctx.accounts.swap_base_input(amount_in, minimum_amount_out)
    }

    pub fn swap_token_base_output(
        ctx: Context<SwapBaseOutput>,
        max_amount_in: u64,
        amount_out: u64,
    ) -> Result<()> {
        ctx.accounts.swap_base_output(max_amount_in, amount_out)
    }
}
