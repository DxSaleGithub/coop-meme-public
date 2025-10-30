use crate::{error::*, state::ConfigData};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(mut, signer)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.config_bump,
        has_one = admin @ CoopMemeError::Unauthorized
    )]
    pub config: Account<'info, ConfigData>,
}

impl<'info> Pause<'info> {
    pub fn set_pause(&mut self, is_paused: Option<bool>) -> Result<()> {
        require!(
            self.admin.key() == self.config.admin,
            CoopMemeError::Unauthorized
        );

        if let Some(pause_status) = is_paused {
            self.config.is_paused = pause_status;
        }

        Ok(())
    }
}
