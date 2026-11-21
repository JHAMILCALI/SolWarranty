use anchor_lang::prelude::*;

// Solana Playground sustituye este ID al compilar el programa creado allí.
// No usar este valor como dirección de un despliegue.
declare_id!("11111111111111111111111111111111");

const DAY: i64 = 86_400;
const MAX_DURATION: i64 = 730 * DAY;

#[program]
pub mod solwarranty {
    use super::*;

    pub fn initialize_store(ctx: Context<InitializeStore>, name: String) -> Result<()> {
        require!(
            !name.trim().is_empty() && name.as_bytes().len() <= 48,
            WarrantyError::NameTooLong
        );
        let store = &mut ctx.accounts.store;
        store.authority = ctx.accounts.authority.key();
        store.name = name;
        store.next_warranty_id = 0;
        store.draft_count = 0;
        store.bump = ctx.bumps.store;
        Ok(())
    }

    pub fn create_warranty(
        ctx: Context<CreateWarranty>,
        warranty_id: u64,
        buyer: Pubkey,
        product_name: String,
        serial_hash: [u8; 32],
        receipt_hash: [u8; 32],
        duration_seconds: i64,
    ) -> Result<()> {
        validate_warranty(&product_name, duration_seconds)?;
        require!(buyer != Pubkey::default(), WarrantyError::InvalidBuyer);
        let store = &mut ctx.accounts.store;
        require!(
            warranty_id == store.next_warranty_id,
            WarrantyError::InvalidWarrantyId
        );
        store.next_warranty_id = store
            .next_warranty_id
            .checked_add(1)
            .ok_or(WarrantyError::Overflow)?;
        store.draft_count = store
            .draft_count
            .checked_add(1)
            .ok_or(WarrantyError::Overflow)?;
        let warranty = &mut ctx.accounts.warranty;
        warranty.store = store.key();
        warranty.buyer = buyer;
        warranty.warranty_id = warranty_id;
        warranty.product_name = product_name;
        warranty.serial_hash = serial_hash;
        warranty.receipt_hash = receipt_hash;
        warranty.duration_seconds = duration_seconds;
        warranty.activated_at = 0;
        warranty.expires_at = 0;
        warranty.status = WarrantyStatus::Draft;
        warranty.next_claim_id = 0;
        warranty.open_claim_count = 0;
        warranty.bump = ctx.bumps.warranty;
        Ok(())
    }

    pub fn update_warranty(
        ctx: Context<ManageWarranty>,
        buyer: Pubkey,
        product_name: String,
        serial_hash: [u8; 32],
        receipt_hash: [u8; 32],
        duration_seconds: i64,
    ) -> Result<()> {
        validate_warranty(&product_name, duration_seconds)?;
        require!(buyer != Pubkey::default(), WarrantyError::InvalidBuyer);
        let warranty = &mut ctx.accounts.warranty;
        require!(
            warranty.status == WarrantyStatus::Draft,
            WarrantyError::WarrantyNotDraft
        );
        warranty.buyer = buyer;
        warranty.product_name = product_name;
        warranty.serial_hash = serial_hash;
        warranty.receipt_hash = receipt_hash;
        warranty.duration_seconds = duration_seconds;
        Ok(())
    }

    pub fn activate_warranty(ctx: Context<ManageWarranty>) -> Result<()> {
        let warranty = &mut ctx.accounts.warranty;
        require!(
            warranty.status == WarrantyStatus::Draft,
            WarrantyError::WarrantyNotDraft
        );
        let now = Clock::get()?.unix_timestamp;
        warranty.expires_at = now
            .checked_add(warranty.duration_seconds)
            .ok_or(WarrantyError::Overflow)?;
        warranty.activated_at = now;
        warranty.status = WarrantyStatus::Active;
        let store = &mut ctx.accounts.store;
        store.draft_count = store
            .draft_count
            .checked_sub(1)
            .ok_or(WarrantyError::Overflow)?;
        Ok(())
    }

    pub fn create_claim(
        ctx: Context<CreateClaim>,
        claim_id: u64,
        reason: ClaimReason,
        description_hash: [u8; 32],
    ) -> Result<()> {
        let warranty = &mut ctx.accounts.warranty;
        require!(
            warranty.status == WarrantyStatus::Active,
            WarrantyError::WarrantyNotActive
        );
        require!(
            Clock::get()?.unix_timestamp <= warranty.expires_at,
            WarrantyError::WarrantyExpired
        );
        require!(
            warranty.open_claim_count == 0,
            WarrantyError::ClaimAlreadyOpen
        );
        require!(
            claim_id == warranty.next_claim_id,
            WarrantyError::InvalidClaimId
        );
        warranty.next_claim_id = warranty
            .next_claim_id
            .checked_add(1)
            .ok_or(WarrantyError::Overflow)?;
        warranty.open_claim_count = warranty
            .open_claim_count
            .checked_add(1)
            .ok_or(WarrantyError::Overflow)?;
        let claim = &mut ctx.accounts.claim;
        claim.warranty = warranty.key();
        claim.claimant = ctx.accounts.claimant.key();
        claim.claim_id = claim_id;
        claim.reason = reason;
        claim.description_hash = description_hash;
        claim.status = ClaimStatus::Open;
        claim.resolution = ClaimResolution::None;
        claim.created_at = Clock::get()?.unix_timestamp;
        claim.resolved_at = 0;
        claim.bump = ctx.bumps.claim;
        Ok(())
    }

    pub fn resolve_claim(ctx: Context<ResolveClaim>, resolution: ClaimResolution) -> Result<()> {
        require!(
            resolution != ClaimResolution::None,
            WarrantyError::InvalidResolution
        );
        let claim = &mut ctx.accounts.claim;
        require!(
            claim.status == ClaimStatus::Open,
            WarrantyError::ClaimNotOpen
        );
        claim.status = ClaimStatus::Resolved;
        claim.resolution = resolution;
        claim.resolved_at = Clock::get()?.unix_timestamp;
        let warranty = &mut ctx.accounts.warranty;
        warranty.open_claim_count = warranty
            .open_claim_count
            .checked_sub(1)
            .ok_or(WarrantyError::Overflow)?;
        Ok(())
    }

    pub fn close_draft(ctx: Context<CloseDraft>) -> Result<()> {
        require!(
            ctx.accounts.warranty.status == WarrantyStatus::Draft,
            WarrantyError::WarrantyNotDraft
        );
        require!(
            ctx.accounts.warranty.open_claim_count == 0,
            WarrantyError::ActiveClaimsExist
        );
        let store = &mut ctx.accounts.store;
        store.draft_count = store
            .draft_count
            .checked_sub(1)
            .ok_or(WarrantyError::Overflow)?;
        Ok(())
    }
}

fn validate_warranty(product_name: &str, duration_seconds: i64) -> Result<()> {
    require!(
        !product_name.is_empty() && product_name.as_bytes().len() <= 64,
        WarrantyError::NameTooLong
    );
    require!(
        (DAY..=MAX_DURATION).contains(&duration_seconds),
        WarrantyError::InvalidDuration
    );
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeStore<'info> {
    #[account(init, payer = authority, space = Store::SPACE, seeds = [b"store", authority.key().as_ref()], bump)]
    pub store: Account<'info, Store>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(warranty_id: u64)]
pub struct CreateWarranty<'info> {
    #[account(mut, seeds = [b"store", authority.key().as_ref()], bump = store.bump, has_one = authority)]
    pub store: Account<'info, Store>,
    #[account(init, payer = authority, space = Warranty::SPACE, seeds = [b"warranty", store.key().as_ref(), &warranty_id.to_le_bytes()], bump)]
    pub warranty: Account<'info, Warranty>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ManageWarranty<'info> {
    #[account(mut, seeds = [b"store", authority.key().as_ref()], bump = store.bump, has_one = authority)]
    pub store: Account<'info, Store>,
    #[account(mut, seeds = [b"warranty", store.key().as_ref(), &warranty.warranty_id.to_le_bytes()], bump = warranty.bump, has_one = store)]
    pub warranty: Account<'info, Warranty>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(claim_id: u64)]
pub struct CreateClaim<'info> {
    #[account(seeds = [b"store", store.authority.as_ref()], bump = store.bump)]
    pub store: Account<'info, Store>,
    #[account(mut, seeds = [b"warranty", store.key().as_ref(), &warranty.warranty_id.to_le_bytes()], bump = warranty.bump, has_one = store, constraint = warranty.buyer == claimant.key() @ WarrantyError::Unauthorized)]
    pub warranty: Account<'info, Warranty>,
    #[account(init, payer = claimant, space = Claim::SPACE, seeds = [b"claim", warranty.key().as_ref(), &claim_id.to_le_bytes()], bump)]
    pub claim: Account<'info, Claim>,
    #[account(mut)]
    pub claimant: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveClaim<'info> {
    #[account(seeds = [b"store", authority.key().as_ref()], bump = store.bump, has_one = authority)]
    pub store: Account<'info, Store>,
    #[account(mut, seeds = [b"warranty", store.key().as_ref(), &warranty.warranty_id.to_le_bytes()], bump = warranty.bump, has_one = store)]
    pub warranty: Account<'info, Warranty>,
    #[account(mut, seeds = [b"claim", warranty.key().as_ref(), &claim.claim_id.to_le_bytes()], bump = claim.bump, has_one = warranty)]
    pub claim: Account<'info, Claim>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseDraft<'info> {
    #[account(mut, seeds = [b"store", authority.key().as_ref()], bump = store.bump, has_one = authority)]
    pub store: Account<'info, Store>,
    #[account(mut, close = authority, seeds = [b"warranty", store.key().as_ref(), &warranty.warranty_id.to_le_bytes()], bump = warranty.bump, has_one = store)]
    pub warranty: Account<'info, Warranty>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct Store {
    pub authority: Pubkey,
    pub name: String,
    pub next_warranty_id: u64,
    pub draft_count: u32,
    pub bump: u8,
}
impl Store {
    pub const SPACE: usize = 8 + 32 + 4 + 48 + 8 + 4 + 1;
}

#[account]
pub struct Warranty {
    pub store: Pubkey,
    pub buyer: Pubkey,
    pub warranty_id: u64,
    pub product_name: String,
    pub serial_hash: [u8; 32],
    pub receipt_hash: [u8; 32],
    pub duration_seconds: i64,
    pub activated_at: i64,
    pub expires_at: i64,
    pub status: WarrantyStatus,
    pub next_claim_id: u64,
    pub open_claim_count: u32,
    pub bump: u8,
}
impl Warranty {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 4 + 64 + 32 + 32 + 8 + 8 + 8 + 1 + 8 + 4 + 1;
}

#[account]
pub struct Claim {
    pub warranty: Pubkey,
    pub claimant: Pubkey,
    pub claim_id: u64,
    pub reason: ClaimReason,
    pub description_hash: [u8; 32],
    pub status: ClaimStatus,
    pub resolution: ClaimResolution,
    pub created_at: i64,
    pub resolved_at: i64,
    pub bump: u8,
}
impl Claim {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1 + 32 + 1 + 1 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum WarrantyStatus {
    Draft,
    Active,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ClaimStatus {
    Open,
    Resolved,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ClaimReason {
    Screen,
    Battery,
    Charging,
    Other,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ClaimResolution {
    None,
    Accepted,
    Rejected,
}

#[error_code]
pub enum WarrantyError {
    #[msg("Wallet no autorizada")]
    Unauthorized,
    #[msg("La garantía debe estar en borrador")]
    WarrantyNotDraft,
    #[msg("La garantía debe estar activa")]
    WarrantyNotActive,
    #[msg("La garantía ha vencido")]
    WarrantyExpired,
    #[msg("Ya existe una reclamación abierta")]
    ClaimAlreadyOpen,
    #[msg("La reclamación no está abierta")]
    ClaimNotOpen,
    #[msg("ID de garantía inesperado")]
    InvalidWarrantyId,
    #[msg("ID de reclamación inesperado")]
    InvalidClaimId,
    #[msg("Duración inválida")]
    InvalidDuration,
    #[msg("Texto demasiado largo o vacío")]
    NameTooLong,
    #[msg("Desbordamiento aritmético")]
    Overflow,
    #[msg("Hay reclamaciones abiertas")]
    ActiveClaimsExist,
    #[msg("Comprador inválido")]
    InvalidBuyer,
    #[msg("Resolución inválida")]
    InvalidResolution,
}
