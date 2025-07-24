use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TokenVotes {
    pub minimum_tokens: u64,
    pub total_votes: u64,
    pub name_votes: [u64; 5],
    pub symbol_votes: [u64; 5],
    pub uri_votes: [u64; 5],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserTokenVotes {
    pub total_votes: u64,
    pub name_votes: [u64; 5],
    pub symbol_votes: [u64; 5],
    pub uri_votes: [u64; 5],
    pub bump: u8,
}

#[account]
pub struct UserVoteInfo {
    pub field_index: u8,
    pub token_amount: u64,
}
