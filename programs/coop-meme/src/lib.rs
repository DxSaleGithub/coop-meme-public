#![allow(deprecated)] // for no warnings
#[allow(unexpected_cfgs)]
pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("58Pbrmtb3Ai1S1vtafW8CrvrUZGhgtRGxDErzr4oVvcu");

#[program]
pub mod coop_meme {

    use super::*;

    pub fn initialize(ctx: Context<Config>, team_wallet: Pubkey) -> Result<()> {
        ctx.accounts.init(&ctx.bumps, team_wallet)
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
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
        new_min_vote_token_amount: Option<u64>,
        new_min_option_add_token_amount: Option<u64>,
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
            new_min_vote_token_amount,
            new_min_option_add_token_amount,
        )
    }

    pub fn grant_role(ctx: Context<RBAControl>, role_type: RoleType, user: Pubkey) -> Result<()> {
        ctx.accounts.grant_role(role_type, user)
    }

    pub fn revoke_role(ctx: Context<RBAControl>, role_type: RoleType, user: Pubkey) -> Result<()> {
        ctx.accounts.revoke_role(role_type, user)
    }

    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        ctx.accounts.set_pause(Some(true))
    }

    pub fn unpause(ctx: Context<Pause>) -> Result<()> {
        ctx.accounts.set_pause(Some(false))
    }

    pub fn start_emergency_mode(ctx: Context<Emergency>) -> Result<()> {
        ctx.accounts.set_emergency(Some(true))
    }

    pub fn stop_emergency_mode(ctx: Context<Emergency>) -> Result<()> {
        ctx.accounts.set_emergency(Some(false))
    }

    pub fn emergency_withdraw_sol(ctx: Context<EmergencyWithdrawSOL>) -> Result<()> {
        ctx.accounts.emergency_withdraw_sol()
    }

    pub fn emergency_withdraw_coop_token(ctx: Context<EmergencyWithdrawCoopToken>) -> Result<()> {
        ctx.accounts.emergency_withdraw_coop_token()
    }

    pub fn withdraw_listed_coop_token(ctx: Context<EmergencyWithdrawCoopToken>) -> Result<()> {
        ctx.accounts.withdraw_listed_coop_token()
    }

    pub fn create_token(
        ctx: Context<MemeCoin>,
        total_supply: u64,
        token_share_price: u32,
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

    pub fn buy_tokens(ctx: Context<Trade>, amount: u64, min_tokens_receive: u64) -> Result<()> {
        ctx.accounts.buy_tokens(amount, min_tokens_receive)
    }

    pub fn sell_tokens(ctx: Context<Trade>, amount: u64, min_sol_receive: u64) -> Result<()> {
        ctx.accounts.sell_tokens(amount, min_sol_receive)
    }

    pub fn list_token(ctx: Context<List>) -> Result<()> {
        ctx.accounts.list_token()
    }

    pub fn burn_lp_token(ctx: Context<BurnLP>) -> Result<()> {
        // only admin can call
        ctx.accounts.burn_lp_token()
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

    pub fn vote(ctx: Context<UserVote>, votes: u64) -> Result<()> {
        ctx.accounts.user_votes(votes)
    }

    pub fn vote_with_option(
        ctx: Context<CreateOption>,
        create_option: CreateOptionInfo,
    ) -> Result<()> {
        ctx.accounts.create_new_option(&ctx.bumps, create_option)
    }

    pub fn unvote(ctx: Context<UserVote>, votes: u64) -> Result<()> {
        ctx.accounts.user_unvotes(votes)
    }

    pub fn unvote_all_tokens(ctx: Context<UnlockAll>) -> Result<()> {
        ctx.accounts.unvote_all_tokens()
    }

    pub fn finalize_vote(ctx: Context<FinalizeVote>) -> Result<()> {
        ctx.accounts.finalize_vote()
    }
}
