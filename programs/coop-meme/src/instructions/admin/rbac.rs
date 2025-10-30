use anchor_lang::prelude::*;

use crate::{error::*, RBAControlList, Role, RoleType};
#[derive(Accounts)]
pub struct RBAControl<'info> {
    #[account[mut, signer]]
    pub owner: Signer<'info>,
    #[account[
      mut,
      seeds = [b"roles"],
      bump=rbac.bump
    ]]
    pub rbac: Account<'info, RBAControlList>,
    pub system_program: Program<'info, System>,
}

impl<'info> RBAControl<'info> {
    pub fn grant_role(&mut self, role_type: RoleType, user: Pubkey) -> Result<()> {
        require!(
            self.owner.key() == self.rbac.admin.key(),
            CoopMemeError::Unauthorized
        );

        let exists = self
            .rbac
            .roles
            .iter()
            .any(|r| r.user == user && r.role_type == role_type && r.status == true);

        if exists {
            return Err(CoopMemeError::RoleExist.into());
        }
        self.rbac.roles.push(Role {
            role_type,
            user,
            status: true,
        });
        Ok(())
    }

    pub fn revoke_role(&mut self, role_type: RoleType, user: Pubkey) -> Result<()> {
        require!(
            self.owner.key() == self.rbac.admin.key(),
            CoopMemeError::Unauthorized
        );

        let exists = self
            .rbac
            .roles
            .iter()
            .any(|r| r.user == user && r.role_type == role_type && r.status == true);

        if !exists {
            return Err(CoopMemeError::RoleDoesNotExist.into());
        }

        if let Some(role) = self
            .rbac
            .roles
            .iter_mut()
            .find(|r| r.user == user && r.role_type == role_type)
        {
            role.status = false; // or whatever value you wish to set
        }
        Ok(())
    }
}
