use crate::{
    error::*,
    state::{ConfigData, MemeCoinData},
    utils::unfreeze_user_token_account,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct BatchThawAccounts<'info> {
    /// CHECK: This is a system account so safe.
    #[account[
      mut,
      constraint = memecoin.creator == creator.key()
    ]]
    pub creator: AccountInfo<'info>,
    #[account[
      mut,
      seeds = [b"config"],
      bump = config.config_bump
    ]]
    pub config: Box<Account<'info, ConfigData>>,
    /// CHECK: This is an ata for coop token for user.
    #[account(
      mut,
      seeds = [b"mint", creator.key().as_ref(), &memecoin.token_id.to_le_bytes(), &memecoin.token_nonce.to_le_bytes()],
      bump = memecoin.token_bump
    )]
    pub coop_token: Box<Account<'info, Mint>>,
    #[account[
      mut,
      seeds = [b"memecoin", coop_token.key().as_ref()],
      bump = memecoin.memecoin_bump
    ]]
    pub memecoin: Box<Account<'info, MemeCoinData>>,
    /// CHECK: This is a PDA owned by the program used as the global SOL/token vault.
    /// It does not store any data and is used only for lamport/token transfers.
    /// PDA seeds = [b"global"], bump = config.global_vault_bump
    #[account(
      mut,
      seeds = [b"global"],
      bump = config.global_vault_bump
    )]
    pub global_vault: AccountInfo<'info>,
    /// CHECK: This is an ata for coop token for user.

    #[account[mut]]
    pub user_1: AccountInfo<'info>,
    /// CHECK: This is an ata for coop token for user.
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=user_1,
      associated_token::token_program=token_program,
    )]
    pub user_1_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is an ata for coop token for user.

    #[account[mut]]
    pub user_2: AccountInfo<'info>,
    /// CHECK: This is an ata for coop token for user.
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=user_2,
      associated_token::token_program=token_program,
    )]
    pub user_2_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is an ata for coop token for user.

    #[account[mut]]
    pub user_3: AccountInfo<'info>,
    /// CHECK: This is an ata for coop token for user.
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=user_3,
      associated_token::token_program=token_program,
    )]
    pub user_3_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is an ata for coop token for user.

    #[account[mut]]
    pub user_4: AccountInfo<'info>,
    /// CHECK: This is an ata for coop token for user.
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=user_4,
      associated_token::token_program=token_program,
    )]
    pub user_4_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is an ata for coop token for user.

    #[account[mut]]
    pub user_5: AccountInfo<'info>,
    /// CHECK: This is an ata for coop token for user.
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=user_5,
      associated_token::token_program=token_program,
    )]
    pub user_5_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is an ata for coop token for user.

    #[account[mut]]
    pub user_6: AccountInfo<'info>,
    /// CHECK: This is an ata for coop token for user.
    #[account(
      mut,
      associated_token::mint=coop_token,
      associated_token::authority=user_6,
      associated_token::token_program=token_program,
    )]
    pub user_6_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is an ata for coop token for user.

    // #[account[mut]]
    // pub user_7: AccountInfo<'info>,
    // /// CHECK: This is an ata for coop token for user.
    // #[account(
    //   mut,
    //   associated_token::mint=coop_token,
    //   associated_token::authority=user_7,
    //   associated_token::token_program=token_program,
    // )]
    // pub user_7_token_ata: Box<Account<'info, TokenAccount>>,
    // /// CHECK: This is an ata for coop token for user.

    // #[account[mut]]
    // pub user_8: AccountInfo<'info>,
    // /// CHECK: This is an ata for coop token for user.
    // #[account(
    //   mut,
    //   associated_token::mint=coop_token,
    //   associated_token::authority=user_8,
    //   associated_token::token_program=token_program,
    // )]
    // pub user_8_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is an ata for coop token for user.

    // #[account[mut]]
    // pub user_9: AccountInfo<'info>,
    // /// CHECK: This is an ata for coop token for user.
    // #[account(
    //   mut,
    //   associated_token::mint=coop_token,
    //   associated_token::authority=user_8,
    //   associated_token::token_program=token_program,
    // )]
    // pub user_9_token_ata: Box<Account<'info, TokenAccount>>,
    // /// CHECK: This is an ata for coop token for user.

    // #[account[mut]]
    // pub user_10: AccountInfo<'info>,
    // /// CHECK: This is an ata for coop token for user.
    // #[account(
    //   mut,
    //   associated_token::mint=coop_token,
    //   associated_token::authority=user_10,
    //   associated_token::token_program=token_program,
    // )]
    // pub user_10_token_ata: Box<Account<'info, TokenAccount>>,
    /// SPL Token program
    pub token_program: Program<'info, Token>,
}

impl<'info> BatchThawAccounts<'info> {
    pub fn batch_thaw_accounts(&mut self) -> Result<()> {
        // require!(self.memecoin.is_token_listed, CoopMemeError::TokenNotListed);

        let seeds_for_unfreeze: &[&[u8]] = &[
            b"global",                        // your static seed
            &[self.config.global_vault_bump], // your bump, wrapped as byte slice
        ];

        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_1_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_2_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_3_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_4_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_5_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        unfreeze_user_token_account(
            self.global_vault.to_account_info(),
            self.coop_token.to_account_info(),
            self.user_6_token_ata.to_account_info(),
            self.token_program.to_account_info(),
            &[seeds_for_unfreeze],
        )?;

        // unfreeze_user_token_account(
        //     self.global_vault.to_account_info(),
        //     self.coop_token.to_account_info(),
        //     self.user_7_token_ata.to_account_info(),
        //     self.token_program.to_account_info(),
        //     &[seeds_for_unfreeze],
        // )?;

        // unfreeze_user_token_account(
        //     self.global_vault.to_account_info(),
        //     self.coop_token.to_account_info(),
        //     self.user_8_token_ata.to_account_info(),
        //     self.token_program.to_account_info(),
        //     &[seeds_for_unfreeze],
        // )?;

        // unfreeze_user_token_account(
        //     self.global_vault.to_account_info(),
        //     self.coop_token.to_account_info(),
        //     self.user_9_token_ata.to_account_info(),
        //     self.token_program.to_account_info(),
        //     &[seeds_for_unfreeze],
        // )?;

        // unfreeze_user_token_account(
        //     self.global_vault.to_account_info(),
        //     self.coop_token.to_account_info(),
        //     self.user_10_token_ata.to_account_info(),
        //     self.token_program.to_account_info(),
        //     &[seeds_for_unfreeze],
        // )?;

        Ok(())
    }
}
