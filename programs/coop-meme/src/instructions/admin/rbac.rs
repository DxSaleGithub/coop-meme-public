use anchor_lang::prelude::*;

use crate::{error::*, events::{RoleGrantedEvent, RoleRevokedEvent}, RBAControlList, Role, RoleType};
#[derive(Accounts)]
pub struct RBAControl<'info> {
    #[account[mut]]
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
        let role_type_u8 = match role_type {
            RoleType::VOTING => 0,
            RoleType::LISTING => 1,
            RoleType::CREATING => 2,
        };
        self.rbac.roles.push(Role {
            role_type,
            user,
            status: true,
        });
        emit!(RoleGrantedEvent {
            admin: self.owner.key(),
            user,
            role_type: role_type_u8,
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

        let role_type_u8 = match role_type {
            RoleType::VOTING => 0,
            RoleType::LISTING => 1,
            RoleType::CREATING => 2,
        };
        self.rbac
            .roles
            .retain(|r| !(r.user == user && r.role_type == role_type));
        emit!(RoleRevokedEvent {
            admin: self.owner.key(),
            user,
            role_type: role_type_u8,
        });
        Ok(())
    }
}
