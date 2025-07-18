use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MemeCoinData {
    pub token_id: u32,                  // create token
    pub token_mint: Pubkey,             // create token
    pub creator: Pubkey,                // create token
    pub token_share_price: u64,         // create token
    pub token_total_supply: u128,       // create token
    pub token_creation_time: u64,       // create token
    pub token_fairlaunch_end_time: u64, // create token
    pub token_market_end_time: u64,     // create token
    pub virtual_sol_reserves: u128,     // create token + buy + sell
    pub virtual_token_reserves: u128,   // create token + buy + sell
    pub real_sol_reserves: u128,        // create token + buy + sell
    pub real_token_reserves: u128,      // create token + buy + sell
    pub is_bonding_curve_active: bool,  // create token + buy + sell
    pub is_trading_active: bool,        // create token + buy + sell + listing
    pub memecoin_bump: u8,
    pub token_bump: u8,
}
