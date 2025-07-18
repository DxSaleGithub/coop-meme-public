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

declare_id!("74Shjhw7y3AuTArpaLDv6cWaj9hk1yuQ93L6dUrZavyV");

#[program]
pub mod coop_meme_2 {
    use super::*;

    pub fn initialize(ctx: Context<Config>, team_wallet: Pubkey) -> Result<()> {
        ctx.accounts.init(&ctx.bumps, team_wallet)
    }

    pub fn create_token(
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
}
