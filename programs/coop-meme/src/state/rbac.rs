use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RBAControlList {
    pub admin: Pubkey,
    #[max_len(10)]
    pub roles: Vec<Role>,
    pub bump: u8,
}

#[derive(InitSpace, Clone, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub enum RoleType {
    VOTING,
    LISTING,
    CREATING,
}

#[derive(InitSpace, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct Role {
    pub role_type: RoleType,
    pub user: Pubkey,
    pub status: bool,
}
