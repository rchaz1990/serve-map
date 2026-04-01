use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

declare_id!("9zMshqvyGNRH9AMyWB8BxJp46U4e5Bish7rhtpq9T9EE");

// ============================================================
// CONSTANTS
// ============================================================

/// Minimum number of verified ratings required to qualify for rewards.
pub const MIN_RATINGS_FOR_REWARD: u64 = 5;
/// Minimum average score (1–5 scale) required to qualify for rewards.
pub const MIN_AVERAGE_FOR_REWARD: u8 = 4;
/// Reward payout per eligible server: 10 $SERVE (6 decimals).
pub const REWARD_AMOUNT: u64 = 10_000_000;

// ============================================================
// PROGRAM
// ============================================================

#[program]
pub mod serve_mvp {
    use super::*;

    // ------------------------------------------------------------------
    // ServerProfile
    // ------------------------------------------------------------------

    /// Creates a portable on-chain profile for a server or bartender.
    /// PDA seeds: ["server_profile", owner]
    pub fn initialize_profile(
        ctx: Context<InitializeProfile>,
        name: String,
        restaurant: String,
    ) -> Result<()> {
        require!(name.len() <= 64, ServeError::NameTooLong);
        require!(restaurant.len() <= 64, ServeError::RestaurantNameTooLong);

        let profile = &mut ctx.accounts.server_profile;
        profile.owner = ctx.accounts.owner.key();
        profile.name = name;
        profile.restaurant = restaurant;
        profile.total_ratings = 0;
        profile.cumulative_score = 0;
        profile.average_score = 0;
        profile.follower_count = 0;
        profile.is_verified = false;
        profile.bump = ctx.bumps.server_profile;

        Ok(())
    }

    // ------------------------------------------------------------------
    // Rating
    // ------------------------------------------------------------------

    /// Submits a 1–5 star rating for a server after a verified booking.
    /// One Rating PDA per (server, rater) pair; prevents duplicate reviews.
    /// PDA seeds: ["rating", server_profile, rater]
    pub fn submit_rating(
        ctx: Context<SubmitRating>,
        score: u8,
        comment: String,
        booking_verified: bool,
    ) -> Result<()> {
        require!(booking_verified, ServeError::BookingNotVerified);
        require!(score >= 1 && score <= 5, ServeError::InvalidScore);
        require!(comment.len() <= 280, ServeError::CommentTooLong);
        require!(
            ctx.accounts.rater.key() != ctx.accounts.server_profile.owner,
            ServeError::CannotRateSelf
        );

        let rating = &mut ctx.accounts.rating;
        rating.rater = ctx.accounts.rater.key();
        rating.server = ctx.accounts.server_profile.key();
        rating.score = score;
        rating.booking_verified = booking_verified;
        rating.comment = comment;
        rating.bump = ctx.bumps.rating;

        // Update server profile aggregate stats.
        let profile = &mut ctx.accounts.server_profile;
        profile.total_ratings = profile
            .total_ratings
            .checked_add(1)
            .ok_or(ServeError::Overflow)?;
        profile.cumulative_score = profile
            .cumulative_score
            .checked_add(score as u64)
            .ok_or(ServeError::Overflow)?;
        profile.average_score = (profile.cumulative_score / profile.total_ratings) as u8;

        Ok(())
    }

    // ------------------------------------------------------------------
    // FollowRequest
    // ------------------------------------------------------------------

    /// Guest sends a follow request to a server.
    /// PDA seeds: ["follow", requester, server_profile]
    pub fn request_follow(ctx: Context<RequestFollow>) -> Result<()> {
        require!(
            ctx.accounts.requester.key() != ctx.accounts.server_profile.owner,
            ServeError::CannotFollowSelf
        );

        let follow_request = &mut ctx.accounts.follow_request;
        follow_request.requester = ctx.accounts.requester.key();
        follow_request.target_server = ctx.accounts.server_profile.key();
        follow_request.status = FollowStatus::Pending;
        follow_request.bump = ctx.bumps.follow_request;

        Ok(())
    }

    /// Server approves a pending follow request, incrementing their follower count.
    pub fn approve_follow(ctx: Context<ApproveFollow>) -> Result<()> {
        require!(
            ctx.accounts.follow_request.status == FollowStatus::Pending,
            ServeError::RequestNotPending
        );

        ctx.accounts.follow_request.status = FollowStatus::Approved;
        ctx.accounts.server_profile.follower_count = ctx
            .accounts
            .server_profile
            .follower_count
            .checked_add(1)
            .ok_or(ServeError::Overflow)?;

        Ok(())
    }

    /// Server blocks a user at any time — creates a block record if none exists,
    /// or transitions an existing Pending/Approved request to Blocked.
    /// If the request was Approved, the follower count is decremented.
    ///
    /// Blocking a user only restricts following. It does not prevent verified booking ratings.
    pub fn block_user(ctx: Context<BlockUser>) -> Result<()> {
        let follow_request = &mut ctx.accounts.follow_request;

        // Distinguish a freshly init'd account (requester == default) from
        // a pre-existing one so we can apply the right state transition.
        if follow_request.requester == Pubkey::default() {
            // New record — wire up fields before setting Blocked.
            follow_request.requester = ctx.accounts.user_to_block.key();
            follow_request.target_server = ctx.accounts.server_profile.key();
            follow_request.bump = ctx.bumps.follow_request;
        } else {
            require!(
                follow_request.status != FollowStatus::Blocked,
                ServeError::AlreadyBlocked
            );
            // Revoke follower status if they were already approved.
            if follow_request.status == FollowStatus::Approved {
                ctx.accounts.server_profile.follower_count = ctx
                    .accounts
                    .server_profile
                    .follower_count
                    .saturating_sub(1);
            }
        }

        follow_request.status = FollowStatus::Blocked;
        Ok(())
    }

    // ------------------------------------------------------------------
    // $SERVE Token Mint
    // ------------------------------------------------------------------

    /// Initializes the $SERVE SPL token mint and treasury PDA.
    /// The treasury PDA is the mint authority, enabling on-chain reward distribution.
    /// PDA seeds (mint): ["serve_mint"]  |  PDA seeds (treasury): ["treasury"]
    pub fn initialize_serve_mint(ctx: Context<InitializeServeMint>) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        treasury.mint = ctx.accounts.serve_mint.key();
        treasury.authority = ctx.accounts.authority.key();
        treasury.bump = ctx.bumps.treasury;
        Ok(())
    }

    /// Mints $SERVE rewards to a top-rated server's token account.
    /// Requirements: ≥5 verified ratings AND average score ≥4.
    /// Anyone may call this on behalf of a qualifying server (permissionless automation).
    pub fn distribute_rewards(ctx: Context<DistributeRewards>) -> Result<()> {
        let profile = &ctx.accounts.server_profile;

        require!(
            profile.total_ratings >= MIN_RATINGS_FOR_REWARD,
            ServeError::InsufficientRatings
        );
        require!(
            profile.average_score >= MIN_AVERAGE_FOR_REWARD,
            ServeError::ScoreTooLow
        );

        // Treasury PDA signs the MintTo CPI.
        let treasury_bump = ctx.accounts.treasury.bump;
        let seeds: &[&[u8]] = &[b"treasury", &[treasury_bump]];
        let signer_seeds = &[seeds];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.serve_mint.to_account_info(),
                    to: ctx.accounts.server_token_account.to_account_info(),
                    authority: ctx.accounts.treasury.to_account_info(),
                },
                signer_seeds,
            ),
            REWARD_AMOUNT,
        )?;

        Ok(())
    }
}

// ============================================================
// ACCOUNT STRUCTS
// ============================================================

#[account]
#[derive(InitSpace)]
pub struct ServerProfile {
    /// Wallet that owns this profile; used as PDA seed and authority check.
    pub owner: Pubkey,
    #[max_len(64)]
    pub name: String,
    #[max_len(64)]
    pub restaurant: String,
    pub total_ratings: u64,
    pub cumulative_score: u64,
    /// Integer average (cumulative_score / total_ratings), updated on each rating.
    pub average_score: u8,
    pub follower_count: u64,
    pub is_verified: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Rating {
    pub rater: Pubkey,
    /// The ServerProfile account address (not the server's wallet).
    pub server: Pubkey,
    pub score: u8,
    pub booking_verified: bool,
    #[max_len(280)]
    pub comment: String,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct FollowRequest {
    pub requester: Pubkey,
    /// The ServerProfile account address.
    pub target_server: Pubkey,
    pub status: FollowStatus,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
}

// ============================================================
// ENUMS
// ============================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum FollowStatus {
    Pending,
    Approved,
    Blocked,
}

impl Default for FollowStatus {
    fn default() -> Self {
        FollowStatus::Pending
    }
}

// ============================================================
// INSTRUCTION CONTEXTS
// ============================================================

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + ServerProfile::INIT_SPACE,
        seeds = [b"server_profile", owner.key().as_ref()],
        bump,
    )]
    pub server_profile: Account<'info, ServerProfile>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitRating<'info> {
    /// One Rating PDA per (server_profile, rater) pair — duplicate reviews revert.
    #[account(
        init,
        payer = rater,
        space = 8 + Rating::INIT_SPACE,
        seeds = [b"rating", server_profile.key().as_ref(), rater.key().as_ref()],
        bump,
    )]
    pub rating: Account<'info, Rating>,
    #[account(mut)]
    pub server_profile: Account<'info, ServerProfile>,
    #[account(mut)]
    pub rater: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestFollow<'info> {
    #[account(
        init,
        payer = requester,
        space = 8 + FollowRequest::INIT_SPACE,
        seeds = [b"follow", requester.key().as_ref(), server_profile.key().as_ref()],
        bump,
    )]
    pub follow_request: Account<'info, FollowRequest>,
    pub server_profile: Account<'info, ServerProfile>,
    #[account(mut)]
    pub requester: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveFollow<'info> {
    #[account(
        mut,
        seeds = [b"follow", follow_request.requester.as_ref(), server_profile.key().as_ref()],
        bump = follow_request.bump,
    )]
    pub follow_request: Account<'info, FollowRequest>,
    #[account(
        mut,
        seeds = [b"server_profile", server.key().as_ref()],
        bump = server_profile.bump,
        constraint = server_profile.owner == server.key() @ ServeError::Unauthorized,
    )]
    pub server_profile: Account<'info, ServerProfile>,
    /// The server must sign to approve a follow request.
    pub server: Signer<'info>,
}

#[derive(Accounts)]
pub struct BlockUser<'info> {
    /// init_if_needed allows blocking users who have never sent a request.
    #[account(
        init_if_needed,
        payer = server,
        space = 8 + FollowRequest::INIT_SPACE,
        seeds = [b"follow", user_to_block.key().as_ref(), server_profile.key().as_ref()],
        bump,
    )]
    pub follow_request: Account<'info, FollowRequest>,
    #[account(
        mut,
        seeds = [b"server_profile", server.key().as_ref()],
        bump = server_profile.bump,
        constraint = server_profile.owner == server.key() @ ServeError::Unauthorized,
    )]
    pub server_profile: Account<'info, ServerProfile>,
    /// CHECK: Used only as a key for PDA derivation and block record linkage.
    pub user_to_block: UncheckedAccount<'info>,
    #[account(mut)]
    pub server: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeServeMint<'info> {
    /// The $SERVE SPL token mint. Authority is set to the treasury PDA.
    #[account(
        init,
        payer = authority,
        seeds = [b"serve_mint"],
        bump,
        mint::decimals = 6,
        mint::authority = treasury,
    )]
    pub serve_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = 8 + Treasury::INIT_SPACE,
        seeds = [b"treasury"],
        bump,
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(
        mut,
        seeds = [b"serve_mint"],
        bump,
        constraint = treasury.mint == serve_mint.key() @ ServeError::MintMismatch,
    )]
    pub serve_mint: Account<'info, Mint>,
    /// Treasury PDA is the mint authority — signs the MintTo CPI.
    #[account(
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,
    /// The qualifying server's profile — eligibility is checked here.
    pub server_profile: Account<'info, ServerProfile>,
    /// Server's ATA for $SERVE tokens. Must be owned by server_profile.owner.
    #[account(
        mut,
        token::mint = serve_mint,
        token::authority = server_profile.owner,
    )]
    pub server_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ============================================================
// ERRORS
// ============================================================

#[error_code]
pub enum ServeError {
    #[msg("Name exceeds the 64-character limit.")]
    NameTooLong,
    #[msg("Restaurant name exceeds the 64-character limit.")]
    RestaurantNameTooLong,
    #[msg("Score must be between 1 and 5.")]
    InvalidScore,
    #[msg("A verified booking is required to submit a rating.")]
    BookingNotVerified,
    #[msg("Comment exceeds the 280-character limit.")]
    CommentTooLong,
    #[msg("You cannot rate your own profile.")]
    CannotRateSelf,
    #[msg("You cannot follow your own profile.")]
    CannotFollowSelf,
    #[msg("The follow request is not in a Pending state.")]
    RequestNotPending,
    #[msg("This user is already blocked.")]
    AlreadyBlocked,
    #[msg("Arithmetic overflow.")]
    Overflow,
    #[msg("Signer is not the server profile owner.")]
    Unauthorized,
    #[msg("Server does not have enough verified ratings to qualify for rewards.")]
    InsufficientRatings,
    #[msg("Server average score is below the reward threshold of 4.")]
    ScoreTooLow,
    #[msg("Mint account does not match the treasury's recorded mint.")]
    MintMismatch,
}