use crate::error::CoopMemeError;
use crate::*;
use anchor_spl::token::{self, FreezeAccount, Token};
use solana_program::program::{invoke, invoke_signed};
use solana_program::program_pack::Pack;
use spl_token::state::Account as SplTokenAccount;
use std::ops::{Div, Mul};

pub fn convert_to_float(value: u64, decimals: u8) -> f64 {
    (value as f64).div(f64::powf(10.0, decimals as f64))
}

pub fn convert_from_float(value: f64, decimals: u8) -> u64 {
    value.mul(f64::powf(10.0, decimals as f64)) as u64
}

pub fn sol_transfer_from_user<'info>(
    signer: &Signer<'info>,
    destination: AccountInfo<'info>,
    system_program: &Program<'info, System>,
    amount: u64,
) -> Result<()> {
    let ix = solana_program::system_instruction::transfer(signer.key, destination.key, amount);
    invoke(
        &ix,
        &[
            signer.to_account_info(),
            destination,
            system_program.to_account_info(),
        ],
    )?;
    Ok(())
}

//  transfer token from user
pub fn token_transfer_user<'info>(
    from: AccountInfo<'info>,
    authority: &Signer<'info>,
    to: AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    let cpi_ctx: CpiContext<_> = CpiContext::new(
        token_program.to_account_info(),
        token::Transfer {
            from,
            authority: authority.to_account_info(),
            to,
        },
    );
    token::transfer(cpi_ctx, amount)?;

    Ok(())
}

//  transfer token from PDA
pub fn token_transfer_with_signer<'info>(
    from: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    to: AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let cpi_ctx: CpiContext<_> = CpiContext::new_with_signer(
        token_program.to_account_info(),
        token::Transfer {
            from,
            to,
            authority,
        },
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    Ok(())
}

// transfer sol from PDA
pub fn sol_transfer_with_signer<'info>(
    source: AccountInfo<'info>,
    destination: AccountInfo<'info>,
    system_program: &Program<'info, System>,
    signers_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let ix = solana_program::system_instruction::transfer(source.key, destination.key, amount);
    invoke_signed(
        &ix,
        &[source, destination, system_program.to_account_info()],
        signers_seeds,
    )?;
    Ok(())
}

pub fn has_role<'info>(roles: &Vec<Role>, role_type: RoleType, user: Pubkey) -> Result<()> {
    let exists = roles
        .iter()
        .any(|r| r.user == user && r.role_type == role_type && r.status == true);

    if !exists {
        return Err(CoopMemeError::InSufficientRole.into());
    }

    Ok(())
}

pub fn freeze_user_token_account<'info>(
    global_vault: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    user_ata: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    signers_seeds: &[&[&[u8]]],
) -> Result<()> {
    let cpi_accounts = FreezeAccount {
        account: user_ata,
        mint,
        authority: global_vault,
    };

    let cpi_ctx = CpiContext::new_with_signer(token_program, cpi_accounts, signers_seeds);

    token::freeze_account(cpi_ctx)
}

pub fn unfreeze_user_token_account<'info>(
    global_vault: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    user_ata: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    signers_seeds: &[&[&[u8]]],
) -> Result<()> {
    let token_account_info = &user_ata;

    // Deserialize the raw account data into spl_token::state::Account
    let token_account_data =
        SplTokenAccount::unpack(&token_account_info.data.borrow()).map_err(|_| {
            error!(CoopMemeError::InvalidOperation);
            ProgramError::InvalidAccountData
        })?;

    if token_account_data.state == spl_token::state::AccountState::Frozen {
        let cpi_accounts = token::ThawAccount {
            account: user_ata,
            mint,
            authority: global_vault,
        };

        let cpi_ctx = CpiContext::new_with_signer(token_program, cpi_accounts, signers_seeds);

        token::thaw_account(cpi_ctx)?;
    }

    Ok(())
}

pub fn calculate_token_amount_when_buy(
    amount: u64,
    is_bonding_curve_active: bool,
    token_share_price: u32,
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
) -> Option<u64> {
    let token_amount;
    if (!is_bonding_curve_active) {
        // token_amount using fairlaunch
        // token_amount = amount / (self.memecoin.token_share_price as u64) * 1_000_000_000;
        token_amount = (amount as u128)
            .checked_mul(1_000_000_000 as u128)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap()
            .checked_div(token_share_price as u128)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        return Some(token_amount as u64);
    } else {
        // token amount using bonding curve
        return get_tokens_for_buy_sol(virtual_sol_reserves, virtual_token_reserves, amount as u64);
    }
}

pub fn get_tokens_for_buy_sol(
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
    sol_amount: u64,
) -> Option<u64> {
    if sol_amount == 0 {
        return None;
    }

    // Convert to common decimal basis (using 9 decimals as base)
    let current_sol = virtual_sol_reserves;
    let current_tokens = virtual_token_reserves;

    // Calculate new reserves using constant product formula
    let new_sol = current_sol.checked_add(sol_amount)?;
    let new_tokens = ((current_sol as u128).checked_mul(current_tokens as u128)?)
        .checked_div(new_sol as u128)?;

    let tokens_out = current_tokens.checked_sub(new_tokens as u64)?;

    // <u64 as TryInto<u64>>::try_into(tokens_out).ok()
    return Some(tokens_out);
}

pub fn calculate_sol_amount_when_sell(
    amount: u64,
    is_bonding_curve_active: bool,
    token_share_price: u32,
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
) -> Option<u64> {
    let sol_amount;
    if (!is_bonding_curve_active) {
        // sol amount using fairlaunch
        // sol_amount = amount * (self.memecoin.token_share_price as u64) / 1_000_000_000;
        sol_amount = (amount as u128)
            .checked_mul(token_share_price as u128)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap()
            .checked_div(1_000_000_000u128)
            .ok_or(CoopMemeError::InvalidOperation)
            .unwrap();
        return Some((sol_amount as u64));
    } else {
        // token amount using bonding curve
        return get_sol_for_sell_tokens(
            amount as u64,
            virtual_sol_reserves,
            virtual_token_reserves,
        );
    }
}

pub fn get_sol_for_sell_tokens(
    token_amount: u64,
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
) -> Option<u64> {
    if token_amount == 0 {
        return None;
    }

    // Convert to common decimal basis (using 9 decimals as base)
    let current_sol = virtual_sol_reserves;
    let current_tokens = virtual_token_reserves;

    // Calculate new reserves using constant product formula
    let new_tokens = current_tokens.checked_add(token_amount)?;

    let new_sol = ((current_sol as u128).checked_mul(current_tokens as u128)?)
        .checked_div(new_tokens as u128)?;

    let sol_out = current_sol.checked_sub(new_sol as u64)?;

    // <u64 as TryInto<u64>>::try_into(sol_out).ok()
    Some(sol_out)
}
