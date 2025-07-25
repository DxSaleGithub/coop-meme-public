use anchor_lang::prelude::*;

use crate::UserVoteInfo;

#[event]
pub struct CreatedEvent {
    pub token_id: u32,
    pub creator: Pubkey,
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
    pub metadata: Pubkey,
    pub decimals: u8,
    pub token_supply: u64,
    pub token_creation_time: u64,       // create token
    pub token_fairlaunch_end_time: u64, // create token
    pub token_market_end_time: u64,
}

#[event]
pub struct TradeEvent {
    pub trader: Pubkey,
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
    pub direction: u8, // 1 -> SOL to tokens, 2 -> tokens to SOL

    pub amount_in: u64,
    pub minimum_receive_amount: u64,
    pub amount_out: u64,
}

#[event]
pub struct BondingCurveStartedEvent {
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
}

#[event]
pub struct TradingOverEvent {
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
}

#[event]
pub struct VoteEvent {
    pub user: Pubkey,
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
    pub direction: u8, // 1 -> Vote and Lock, 2 -> Unvote and Unlock

    pub name_vote: UserVoteInfo,
    pub symbol_vote: UserVoteInfo,
    pub uri_vote: UserVoteInfo,

    pub total_votes: u64,
}

#[event]
pub struct VoteFinalizedEvent {
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
    pub final_name: String,
    pub final_symbol: String,
    pub final_uri: String,
    pub total_votes: u64,
}

#[event]
pub struct ListEvent {
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
    pub token_in: u64,
    pub sol_in: u64,
    pub lp_mint: Pubkey,
}
