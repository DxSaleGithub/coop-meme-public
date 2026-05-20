use crate::{error::*, events::PauseEvent, state::ConfigData};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(mut)]
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
        require!(is_paused != None, CoopMemeError::InvalidOption);

        if let Some(pause_status) = is_paused {
            self.config.is_paused = pause_status;
            emit!(PauseEvent {
                admin: self.admin.key(),
                is_paused: pause_status,
            });
        }

        Ok(())
    }
}
