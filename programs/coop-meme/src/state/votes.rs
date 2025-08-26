use crate::state::TokenOption;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TokenVotes {
    // pub minimum_tokens: u64,
    pub total_votes: u64,
    // pub name_votes: [u64; 5],
    // pub symbol_votes: [u64; 5],
    // pub uri_votes: [u64; 5],
    #[max_len(20)] // should have same max length as memecoin.token_options
    pub votes: Vec<u64>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserTokenVotes {
    pub total_votes: u64,
    // pub name_votes: [u64; 5],
    // pub symbol_votes: [u64; 5],
    // pub uri_votes: [u64; 5],
    #[max_len(20)] // should have same max length as memecoin.token_options
    pub votes: Vec<u64>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteInfo {
    pub option_index: u8,
    pub token_amount: u64,
}

impl Default for VoteInfo {
    fn default() -> Self {
        Self {
            option_index: 0,
            token_amount: 0,
        }
    }
}

#[account]
#[derive(InitSpace)]
pub struct VoteOptionInfo {
    pub token_option: TokenOption,
    pub token_amount: u64,
}
