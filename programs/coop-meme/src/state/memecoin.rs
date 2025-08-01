use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MemeCoinData {
    pub token_id: u32,
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub token_share_price: u32,
    pub token_total_supply: u64,
    pub token_creation_time: u64,
    pub token_fairlaunch_end_time: u64,
    pub token_market_end_time: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub is_bonding_curve_active: bool,
    pub is_trading_active: bool,
    pub is_voting_finalized: bool,
    pub is_token_listed: bool,

    #[max_len(16)]
    pub token_names: [String; 5],

    #[max_len(6)]
    pub token_symbols: [String; 5],

    #[max_len(128)]
    pub token_uris: [String; 5],

    pub memecoin_bump: u8,
    pub token_bump: u8,
}
