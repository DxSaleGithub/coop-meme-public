use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid total supply")]
    InvalidTotalSupply,
}

#[error_code]
pub enum CoopMemeError {
    #[msg("Only the admin is authorized to perform this action.")]
    Unauthorized,
    #[msg("Invalid total supply")]
    InvalidTotalSupply,
    #[msg("Trading not active")]
    TradingNotActive,
    #[msg("Insufficient Amount")]
    InsufficientAmount,
    #[msg("Invalid fairshare token price")]
    InvalidFairSharePrice,
    #[msg("Invalid coop token name")]
    InvalidTokenName,
    #[msg("Invalid coop token symbol")]
    InvalidTokenSymbol,
    #[msg("Invalid coop token uri")]
    InvalidTokenUri,
    #[msg("Invalid arithmetic operation")]
    InvalidOperation,
    #[msg("Trading active")]
    TradingActive,
    #[msg("Not enough token")]
    NotEnoughToken,
    #[msg("Not enough sol")]
    NotEnoughSol,
    #[msg("Invalid token vote info")]
    InvalidTokenVoteInfo,
    #[msg("Token voting is not finalized")]
    VotingNotFinalized,
    #[msg("Token voting is finalized")]
    VotingFinalized,
    #[msg("Token is already listed")]
    TokenAlreadyListed,
    #[msg("Listing info not valid")]
    InvalidListingInfo,
}
