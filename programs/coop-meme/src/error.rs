use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid total supply")]
    InvalidTotalSupply,
}

#[error_code]
pub enum CustomError {
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
}
