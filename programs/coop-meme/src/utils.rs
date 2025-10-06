use crate::error::CoopMemeError;
use crate::*;
use anchor_spl::token_2022::spl_token_2022::instruction::transfer_checked;
use anchor_spl::token_2022::{self, Token2022};
use solana_program::instruction::AccountMeta;
use solana_program::instruction::Instruction;
use solana_program::program::invoke;
use solana_program::program::invoke_signed;
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
    token_program: &Program<'info, Token2022>,
    amount: u64,
) -> Result<()> {
    let cpi_ctx: CpiContext<_> = CpiContext::new(
        token_program.to_account_info(),
        token_2022::Transfer {
            from,
            authority: authority.to_account_info(),
            to,
        },
    );
    token_2022::transfer(cpi_ctx, amount)?;

    Ok(())
}

//  transfer token from PDA
pub fn token_transfer_with_signer<'info>(
    mint: AccountInfo<'info>,
    from: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    to: AccountInfo<'info>,
    token_program: &Program<'info, Token2022>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let cpi_ctx: CpiContext<_> = CpiContext::new_with_signer(
        token_program.to_account_info(),
        token_2022::TransferChecked {
            from,
            to,
            authority,
            mint,
        },
        signer_seeds,
    );
    // token_2022::transfer(cpi_ctx, amount)?;

    token_2022::transfer_checked(cpi_ctx, amount, 9)?;

    Ok(())
}

pub fn token_transfer_with_extra<'info>(
    token_program: &AccountInfo<'info>,
    from: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    memecoin: &AccountInfo<'info>,
    extra_account_meta_list: &AccountInfo<'info>,
    hook_program: &AccountInfo<'info>,
    whitelist: &AccountInfo<'info>,
    amount: u64,
    decimals: u8,
) -> Result<()> {
    // Create the list of accounts in order
    let mut accounts = vec![
        AccountMeta::new(*from.key, false),
        AccountMeta::new_readonly(*mint.key, false),
        AccountMeta::new(*to.key, false),
        AccountMeta::new_readonly(*authority.key, true),
        // AccountMeta::new_readonly(*token_program.key, false),
    ];
    accounts.push(AccountMeta::new(*extra_account_meta_list.key, false));
    accounts.push(AccountMeta::new(*memecoin.key, false));
    accounts.push(AccountMeta::new(*whitelist.key, false));
    accounts.push(AccountMeta::new(hook_program.key(), false));

    // Build the transfer_checked instruction
    let ix = transfer_checked(
        token_program.key,
        from.key,
        mint.key,
        to.key,
        authority.key,
        &[], // multisigners if any
        amount,
        decimals,
    )?;

    // Manually override accounts of the instruction with full list including extras
    let mut instruction = Instruction {
        program_id: *token_program.key,
        accounts,
        data: ix.data,
    };

    invoke(
        &instruction,
        &[
            from.clone(),
            mint.clone(),
            to.clone(),
            authority.clone(),
            // token_program.clone(),
            extra_account_meta_list.clone(),
            memecoin.clone(),
            whitelist.clone(),
            hook_program.clone(),
        ],
    )?;

    Ok(())
}

pub fn token_transfer_signer_with_extra<'info>(
    token_program: &AccountInfo<'info>,
    from: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    memecoin: &AccountInfo<'info>,
    extra_account_meta_list: &AccountInfo<'info>,
    hook_program: &AccountInfo<'info>,
    whitelist: &AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
    decimals: u8,
) -> Result<()> {
    // Create the list of accounts in order
    let mut accounts = vec![
        AccountMeta::new(*from.key, false),
        AccountMeta::new_readonly(*mint.key, false),
        AccountMeta::new(*to.key, false),
        AccountMeta::new_readonly(*authority.key, true),
        // AccountMeta::new_readonly(*token_program.key, false),
    ];
    accounts.push(AccountMeta::new(*extra_account_meta_list.key, false));
    accounts.push(AccountMeta::new(*memecoin.key, false));
    accounts.push(AccountMeta::new(*whitelist.key, false));
    accounts.push(AccountMeta::new(hook_program.key(), false));

    // Build the transfer_checked instruction
    let ix = transfer_checked(
        token_program.key,
        from.key,
        mint.key,
        to.key,
        authority.key,
        &[], // multisigners if any
        amount,
        decimals,
    )?;

    // Manually override accounts of the instruction with full list including extras
    let mut instruction = Instruction {
        program_id: *token_program.key,
        accounts,
        data: ix.data,
    };

    invoke_signed(
        &instruction,
        &[
            from.clone(),
            mint.clone(),
            to.clone(),
            authority.clone(),
            // token_program.clone(),
            extra_account_meta_list.clone(),
            memecoin.clone(),
            whitelist.clone(),
            hook_program.clone(),
        ],
        signer_seeds,
    )?;

    Ok(())
}

//  transfer token from PDA
// pub fn token_transfer_with_signer_2<'info>(
//     mint: AccountInfo<'info>,
//     from: AccountInfo<'info>,
//     authority: AccountInfo<'info>,
//     to: AccountInfo<'info>,
//     token_program: &Program<'info, Token2022>,
//     extra_account_meta_list: AccountInfo<'info>,
//     signer_seeds: &[&[&[u8]]],
//     amount: u64,
// ) -> Result<()> {
//     let cpi_ctx: CpiContext<_> = CpiContext::new_with_signer(
//         token_program.to_account_info(),
//         token_2022::TransferChecked {
//             from,
//             to,
//             authority,
//             mint,
//         },
//         signer_seeds,
//     );
//     // token_2022::transfer(cpi_ctx, amount)?;

//     token_2022::transfer_checked(cpi_ctx, amount, 9)?;

//     Ok(())
// }

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

pub fn extend_mint_for_transfer_hook<'info>(
    mint_account: AccountInfo<'info>,
    payer_account: AccountInfo<'info>,
    token_2022_program: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    rent_sysvar: AccountInfo<'info>,
) -> Result<()> {
    // Instruction  7 = ExtendAccount instruction, then extension types as bytes
    let instruction_data = vec![7u8, 6u8]; // 6u8 is Transfer Hook extension ID

    let accounts = vec![
        AccountMeta::new(mint_account.key(), false),
        AccountMeta::new(payer_account.key(), true),
        AccountMeta::new_readonly(system_program.key(), false),
        AccountMeta::new_readonly(token_2022_program.key(), false),
        AccountMeta::new_readonly(rent_sysvar.key(), false),
    ];

    let ix = Instruction {
        program_id: *token_2022_program.key,
        accounts,
        data: instruction_data,
    };

    invoke_signed(
        &ix,
        &[
            mint_account,
            payer_account,
            system_program,
            token_2022_program,
            rent_sysvar,
        ],
        &[],
    )?;
    // .map_err(|e| error!(e))?;

    Ok(())
}

pub fn set_transfer_hook_authority<'info>(
    mint_account: AccountInfo<'info>,
    token_2022_program: AccountInfo<'info>,
    hook_program_id: Pubkey,
) -> Result<()> {
    // Instruction
    // 0 = SetTransferHook instruction enum variant
    // followed by 32 bytes pubkey (hook program id)

    let mut data = vec![0u8];
    data.extend_from_slice(hook_program_id.as_ref());

    let accounts = vec![AccountMeta::new(mint_account.key(), false)];

    let ix = Instruction {
        program_id: *token_2022_program.key,
        accounts,
        data,
    };

    invoke_signed(&ix, &[mint_account], &[])?;
    // .map_err(|e| error!(e))?;

    Ok(())
}
