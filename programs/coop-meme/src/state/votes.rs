use crate::state::OptionType;
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

#[account]
#[derive(InitSpace)]
pub struct CreateOptionInfo {
    pub option_type: OptionType,
    #[max_len(256)]
    pub option_value: String,
    pub votes: u64,
}
