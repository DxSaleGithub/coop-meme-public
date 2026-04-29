use anchor_lang::prelude::*;

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

    pub timestamp: u64,
}

#[event]
pub struct ClaimedTokens {
    pub trader: Pubkey,
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
    pub contributed_sol: u64,
    pub amount: u64,
    pub timestamp: u64,
}

#[event]
pub struct RefundSol {
    pub trader: Pubkey,
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
    pub contributed_sol: u64,
    pub refund_sol: u64,
    pub timestamp: u64,
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
    pub direction: u8, // 1 -> Vote and Lock, 2 -> Unvote and Unlock, 3 -> Create option and vote
    pub option_index: u32,
    pub name: String,
    pub symbol: String,
    pub logo: String,
    pub votes: u64,
}

#[event]
pub struct UnlockAllTokens {
    pub user: Pubkey,
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
    pub votes: u64,
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

#[event]
pub struct BurnEvent {
    pub coop_token: Pubkey,
    pub memecoin: Pubkey,
    pub lp_mint: Pubkey,
}

#[event]
pub struct RevokeFreezeAuthority {
    pub token: Pubkey,
    pub old_authority: Pubkey,
}
