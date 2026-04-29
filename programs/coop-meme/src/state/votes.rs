use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserTokenVotes {
    pub total_votes: u64,
    pub all_unlocked: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserTokenOptionVotes {
    pub total_votes: u64,
    pub bump: u8,
}

#[derive(InitSpace, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct CreateOptionInfo {
    #[max_len(36)]
    pub name: String,
    #[max_len(14)]
    pub symbol: String,
    #[max_len(255)]
    pub logo: String,
    pub votes: u64,
}
