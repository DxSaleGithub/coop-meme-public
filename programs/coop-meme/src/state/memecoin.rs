use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MemeCoinData {
    pub token_id: u32,
    pub token_nonce: u64,
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub token_total_supply: u64,
    pub token_creation_time: u64,
    pub token_fairlaunch_end_time: u64,
    pub token_market_end_time: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub fairlaunch_token_reserves: u64,
    pub fairlaunch_cap: u64,
    pub fairlaunch_sol_raised: u64,
    pub fairlaunch_buyers: u64,
    pub bonding_curve_buy_cap: u64,
    pub initial_sale: bool,
    pub is_bonding_curve_active: bool,
    pub is_trading_active: bool,
    pub is_voting_finalized: bool,
    pub is_token_listed: bool,
    pub total_votes: u64,
    pub total_options: u32,
    pub memecoin_bump: u8,
    pub token_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct OptionsRegistry {
    pub token: Pubkey, // 32
    #[max_len(0)]
    pub token_registry: Vec<Pubkey>, // 4 + 32 * N
    pub bump: u8,      // 1
}

impl OptionsRegistry {
    pub fn get_size(&self) -> usize {
        // adding one element
        8 + 4 + ((self.token_registry.len() + 1) * 32) + 32 + 1
    }
}

// A combined identity option: name + symbol + logo voted on as a unit.
#[account]
#[derive(InitSpace)]
pub struct TokenOption {
    pub token: Pubkey,
    #[max_len(36)]
    pub name: String,
    #[max_len(14)]
    pub symbol: String,
    #[max_len(255)]
    pub logo: String,
    pub hashed_option_value: [u8; 32], // sha256(name || symbol || logo) for dedup seeding
    pub index: u32,
    pub total_votes: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserData {
    pub sol_deposit: u64,
    pub tokens_claimed: bool,
    pub refund: bool,
}
