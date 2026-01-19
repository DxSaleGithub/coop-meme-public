use anchor_lang::prelude::*;

use crate::Emergency;

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
    #[msg("Trading fairlaunch over")]
    TradingFairlaunchOver,
    #[msg("Trading fairlaunch not over")]
    TradingFairlaunchNotOver,
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
    #[msg("Token not listed")]
    TokenNotListed,
    #[msg("Listing info not valid")]
    InvalidListingInfo,
    #[msg("Option limit exceeded")]
    OptionLimitExceeded,
    #[msg("Token Option already exist")]
    TokenOptionAlreadyExist,
    #[msg("Token Option invalid")]
    InvalidOption,
    #[msg("Role already exists")]
    RoleExist,
    #[msg("Role does not exist")]
    RoleDoesNotExist,
    #[msg("Signer does not have sufficient role")]
    InSufficientRole,
    #[msg("Operation is paused currently")]
    Paused,
    #[msg("Operation is not paused currently")]
    NotPaused,
    #[msg("Operation is in emergency mode")]
    InEmergency,
    #[msg("Operation is not in emergency mode")]
    NotInEmergency,
    #[msg("Fairlaunch cap not exceeded")]
    CapNotExceeded,
    #[msg("Sol is refunded already")]
    AlreadyRefunded,
    #[msg("Fairlaunch tokens already claimed")]
    AlreadyClaimed,
    #[msg("Sell not allowed during fairlaunch")]
    NoSellDuringFairlaunch,
    #[msg("No tokens to claim")]
    NoTokensToClaim,
}
