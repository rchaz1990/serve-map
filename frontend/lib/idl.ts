// IDL copied from target/idl/serve_mvp.json
// Program: 9zMshqvyGNRH9AMyWB8BxJp46U4e5Bish7rhtpq9T9EE

export const IDL = {
  address: '9zMshqvyGNRH9AMyWB8BxJp46U4e5Bish7rhtpq9T9EE',
  metadata: {
    name: 'serve_mvp',
    version: '0.1.0',
    spec: '0.1.0',
    description: 'Created with Anchor',
  },
  instructions: [
    {
      name: 'approve_follow',
      docs: ['Server approves a pending follow request, incrementing their follower count.'],
      discriminator: [240, 211, 210, 140, 3, 134, 26, 69],
      accounts: [
        {
          name: 'follow_request',
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [102, 111, 108, 108, 111, 119] },
              { kind: 'account', path: 'follow_request.requester', account: 'FollowRequest' },
              { kind: 'account', path: 'server_profile' },
            ],
          },
        },
        {
          name: 'server_profile',
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [115, 101, 114, 118, 101, 114, 95, 112, 114, 111, 102, 105, 108, 101] },
              { kind: 'account', path: 'server' },
            ],
          },
        },
        { name: 'server', docs: ['The server must sign to approve a follow request.'], signer: true },
      ],
      args: [],
    },
    {
      name: 'block_user',
      docs: [
        'Server blocks a user at any time — creates a block record if none exists,',
        'or transitions an existing Pending/Approved request to Blocked.',
        'If the request was Approved, the follower count is decremented.',
        '',
        'Blocking a user only restricts following. It does not prevent verified booking ratings.',
      ],
      discriminator: [10, 164, 178, 6, 231, 175, 185, 191],
      accounts: [
        {
          name: 'follow_request',
          docs: ['init_if_needed allows blocking users who have never sent a request.'],
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [102, 111, 108, 108, 111, 119] },
              { kind: 'account', path: 'user_to_block' },
              { kind: 'account', path: 'server_profile' },
            ],
          },
        },
        {
          name: 'server_profile',
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [115, 101, 114, 118, 101, 114, 95, 112, 114, 111, 102, 105, 108, 101] },
              { kind: 'account', path: 'server' },
            ],
          },
        },
        { name: 'user_to_block' },
        { name: 'server', writable: true, signer: true },
        { name: 'system_program', address: '11111111111111111111111111111111' },
      ],
      args: [],
    },
    {
      name: 'distribute_rewards',
      docs: [
        'Mints $SERVE rewards to a top-rated server\'s token account.',
        'Requirements: ≥5 verified ratings AND average score ≥4.',
        'Anyone may call this on behalf of a qualifying server (permissionless automation).',
      ],
      discriminator: [97, 6, 227, 255, 124, 165, 3, 148],
      accounts: [
        {
          name: 'serve_mint',
          writable: true,
          pda: { seeds: [{ kind: 'const', value: [115, 101, 114, 118, 101, 95, 109, 105, 110, 116] }] },
        },
        {
          name: 'treasury',
          docs: ['Treasury PDA is the mint authority — signs the MintTo CPI.'],
          pda: { seeds: [{ kind: 'const', value: [116, 114, 101, 97, 115, 117, 114, 121] }] },
        },
        {
          name: 'server_profile',
          docs: ['The qualifying server\'s profile — eligibility is checked here.'],
        },
        {
          name: 'server_token_account',
          docs: ['Server\'s ATA for $SERVE tokens. Must be owned by server_profile.owner.'],
          writable: true,
        },
        { name: 'token_program', address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
      ],
      args: [],
    },
    {
      name: 'initialize_profile',
      docs: [
        'Creates a portable on-chain profile for a server or bartender.',
        'PDA seeds: ["server_profile", owner]',
      ],
      discriminator: [32, 145, 77, 213, 58, 39, 251, 234],
      accounts: [
        {
          name: 'server_profile',
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [115, 101, 114, 118, 101, 114, 95, 112, 114, 111, 102, 105, 108, 101] },
              { kind: 'account', path: 'owner' },
            ],
          },
        },
        { name: 'owner', writable: true, signer: true },
        { name: 'system_program', address: '11111111111111111111111111111111' },
      ],
      args: [
        { name: 'name', type: 'string' },
        { name: 'restaurant', type: 'string' },
      ],
    },
    {
      name: 'initialize_serve_mint',
      docs: [
        'Initializes the $SERVE SPL token mint and treasury PDA.',
        'The treasury PDA is the mint authority, enabling on-chain reward distribution.',
        'PDA seeds (mint): ["serve_mint"]  |  PDA seeds (treasury): ["treasury"]',
      ],
      discriminator: [57, 240, 37, 22, 246, 142, 201, 218],
      accounts: [
        {
          name: 'serve_mint',
          docs: ['The $SERVE SPL token mint. Authority is set to the treasury PDA.'],
          writable: true,
          pda: { seeds: [{ kind: 'const', value: [115, 101, 114, 118, 101, 95, 109, 105, 110, 116] }] },
        },
        {
          name: 'treasury',
          writable: true,
          pda: { seeds: [{ kind: 'const', value: [116, 114, 101, 97, 115, 117, 114, 121] }] },
        },
        { name: 'authority', writable: true, signer: true },
        { name: 'token_program', address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { name: 'system_program', address: '11111111111111111111111111111111' },
        { name: 'rent', address: 'SysvarRent111111111111111111111111111111111' },
      ],
      args: [],
    },
    {
      name: 'request_follow',
      docs: [
        'Guest sends a follow request to a server.',
        'PDA seeds: ["follow", requester, server_profile]',
      ],
      discriminator: [24, 122, 12, 245, 101, 111, 38, 187],
      accounts: [
        {
          name: 'follow_request',
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [102, 111, 108, 108, 111, 119] },
              { kind: 'account', path: 'requester' },
              { kind: 'account', path: 'server_profile' },
            ],
          },
        },
        { name: 'server_profile' },
        { name: 'requester', writable: true, signer: true },
        { name: 'system_program', address: '11111111111111111111111111111111' },
      ],
      args: [],
    },
    {
      name: 'submit_rating',
      docs: [
        'Submits a 1–5 star rating for a server after a verified booking.',
        'One Rating PDA per (server, rater) pair; prevents duplicate reviews.',
        'PDA seeds: ["rating", server_profile, rater]',
      ],
      discriminator: [238, 207, 253, 243, 170, 69, 73, 199],
      accounts: [
        {
          name: 'rating',
          docs: ['One Rating PDA per (server_profile, rater) pair — duplicate reviews revert.'],
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [114, 97, 116, 105, 110, 103] },
              { kind: 'account', path: 'server_profile' },
              { kind: 'account', path: 'rater' },
            ],
          },
        },
        { name: 'server_profile', writable: true },
        { name: 'rater', writable: true, signer: true },
        { name: 'system_program', address: '11111111111111111111111111111111' },
      ],
      args: [
        { name: 'score', type: 'u8' },
        { name: 'comment', type: 'string' },
        { name: 'booking_verified', type: 'bool' },
      ],
    },
  ],
  accounts: [
    { name: 'FollowRequest', discriminator: [218, 60, 167, 215, 150, 174, 103, 175] },
    { name: 'Rating', discriminator: [203, 130, 231, 178, 120, 130, 70, 17] },
    { name: 'ServerProfile', discriminator: [195, 28, 71, 202, 172, 159, 17, 48] },
    { name: 'Treasury', discriminator: [238, 239, 123, 238, 89, 1, 168, 253] },
  ],
  errors: [
    { code: 6000, name: 'NameTooLong', msg: 'Name exceeds the 64-character limit.' },
    { code: 6001, name: 'RestaurantNameTooLong', msg: 'Restaurant name exceeds the 64-character limit.' },
    { code: 6002, name: 'InvalidScore', msg: 'Score must be between 1 and 5.' },
    { code: 6003, name: 'BookingNotVerified', msg: 'A verified booking is required to submit a rating.' },
    { code: 6004, name: 'CommentTooLong', msg: 'Comment exceeds the 280-character limit.' },
    { code: 6005, name: 'CannotRateSelf', msg: 'You cannot rate your own profile.' },
    { code: 6006, name: 'CannotFollowSelf', msg: 'You cannot follow your own profile.' },
    { code: 6007, name: 'RequestNotPending', msg: 'The follow request is not in a Pending state.' },
    { code: 6008, name: 'AlreadyBlocked', msg: 'This user is already blocked.' },
    { code: 6009, name: 'Overflow', msg: 'Arithmetic overflow.' },
    { code: 6010, name: 'Unauthorized', msg: 'Signer is not the server profile owner.' },
    { code: 6011, name: 'InsufficientRatings', msg: 'Server does not have enough verified ratings to qualify for rewards.' },
    { code: 6012, name: 'ScoreTooLow', msg: 'Server average score is below the reward threshold of 4.' },
    { code: 6013, name: 'MintMismatch', msg: 'Mint account does not match the treasury\'s recorded mint.' },
  ],
  types: [
    {
      name: 'FollowRequest',
      type: {
        kind: 'struct',
        fields: [
          { name: 'requester', type: 'pubkey' },
          { name: 'target_server', docs: ['The ServerProfile account address.'], type: 'pubkey' },
          { name: 'status', type: { defined: { name: 'FollowStatus' } } },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'FollowStatus',
      type: { kind: 'enum', variants: [{ name: 'Pending' }, { name: 'Approved' }, { name: 'Blocked' }] },
    },
    {
      name: 'Rating',
      type: {
        kind: 'struct',
        fields: [
          { name: 'rater', type: 'pubkey' },
          { name: 'server', docs: ['The ServerProfile account address (not the server\'s wallet).'], type: 'pubkey' },
          { name: 'score', type: 'u8' },
          { name: 'booking_verified', type: 'bool' },
          { name: 'comment', type: 'string' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'ServerProfile',
      type: {
        kind: 'struct',
        fields: [
          { name: 'owner', docs: ['Wallet that owns this profile; used as PDA seed and authority check.'], type: 'pubkey' },
          { name: 'name', type: 'string' },
          { name: 'restaurant', type: 'string' },
          { name: 'total_ratings', type: 'u64' },
          { name: 'cumulative_score', type: 'u64' },
          { name: 'average_score', docs: ['Integer average (cumulative_score / total_ratings), updated on each rating.'], type: 'u8' },
          { name: 'follower_count', type: 'u64' },
          { name: 'is_verified', type: 'bool' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'Treasury',
      type: {
        kind: 'struct',
        fields: [
          { name: 'mint', type: 'pubkey' },
          { name: 'authority', type: 'pubkey' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
  ],
} as const
