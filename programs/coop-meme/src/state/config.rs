use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ConfigData {
    pub admin: Pubkey,
    pub is_paused: bool,
    pub in_emergency: bool,
    pub team_wallet: Pubkey,
    pub team_fee: u16,
    pub owner_fee: u16,
    pub affiliated_fee: u16,
    pub listing_fee: u16,
    pub coop_interval: u64,
    pub fairlaunch_period: u32,
    pub init_virtual_sol: u64,
    pub init_virtual_token: u64,
    pub init_real_token: u64,
    pub fairlaunch_cap: u64,
    pub min_vote_token_amount: u64, // minimum tokens to stake for voting an option
    pub min_option_add_token_amount: u64, // minimum tokens to state for adding a new option
    pub total_coop_created: u32,
    pub total_coop_listed: u32,
    pub config_bump: u8,
    pub global_vault_bump: u8,
    pub current_coop_token_metadata: MemeCoinDataMetadata,
}

#[account]
#[derive(InitSpace)]
pub struct MemeCoinDataMetadata {
    pub token_id: u32,
    pub token_nonce: u64,
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub is_bonding_curve_active: bool,
    pub is_trading_active: bool,
    pub is_voting_finalized: bool,
    pub is_token_listed: bool,
    pub total_options: u32,
}

#[account]
#[derive(InitSpace)]
pub struct GlobalVault {}
