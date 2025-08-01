use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ConfigData {
    pub admin: Pubkey,
    pub team_wallet: Pubkey,
    pub team_fee: u16,
    pub owner_fee: u16,
    pub affiliated_fee: u16,
    pub listing_fee: u16,
    pub coop_interval: u64,
    pub fairlaunch_period: u32,
    pub min_price_per_token: u32,
    pub max_price_per_token: u32,
    pub init_virtual_sol: u64,
    pub init_virtual_token: u64,
    pub total_coop_created: u32,
    pub total_coop_listed: u32,
    pub config_bump: u8,
    pub global_vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct GlobalVault {}
