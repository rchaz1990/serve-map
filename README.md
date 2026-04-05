# Slate — Book the Experience. Follow the Talent.

## Overview

Slate is a Solana dApp that gives servers and bartenders portable on-chain reputations and automatic $SERVE token rewards for excellent service. Guests book tables, rate servers directly after verified dining experiences, and follow their favorites across every restaurant they ever work at.

Built for the **Solana Frontier Hackathon 2026 — Consumer Track**.

🌐 **Live Demo:** https://slatenow.xyz  
📄 **Whitepaper:** https://slatenow.xyz/whitepaper

---

## The Problem

Servers and bartenders build loyal followings their entire career but own nothing. When they change jobs their reviews stay on the restaurant's Yelp page. Their regulars lose them. They start over at zero.

Slate fixes this permanently.

---

## Features

- **Portable ServerProfile PDAs** stored on Solana — follow servers from job to job
- **Verified ratings system** — GPS geofencing + QR code + booking verification
- **Follow/block system** — guests follow servers, servers approve or block anyone
- **$SERVE SPL token** — automatic weekly rewards for top rated servers
- **Slate Pay** — cash out directly to bank account, no crypto knowledge needed
- **Google Places API** restaurant search
- **Real time restaurant intelligence** (coming soon)
- **Shareable server rating cards** for Instagram

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Solana + Anchor framework |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Wallets | Privy embedded wallets |
| Search | Google Places API |
| Deployment | Vercel |

---

## Smart Contract

**Program ID:** `9zMshqvyGNRH9AMyWB8BxJp46U4e5Bish7rhtpq9T9EE`  
**Network:** Localnet (devnet deployment in progress)

### On-chain accounts

| Account | Seeds |
|---|---|
| ServerProfile PDA | `[b"server-profile", owner.key()]` |
| Rating PDA | `[b"rating", server_profile, rater]` |
| FollowRequest PDA | `[b"follow", requester, server_profile]` |
| $SERVE Token Mint | `[b"serve_mint"]` |
| Treasury PDA | `[b"treasury"]` |

---

## How to Run Locally

### Prerequisites

- Node.js v18+
- Rust
- Solana CLI
- Anchor CLI

### Setup

```bash
git clone https://github.com/rchaz1990/serve-map
cd serve-map
```

### Start local blockchain

```bash
solana-test-validator
```

### Deploy smart contract

```bash
anchor build
anchor deploy
```

### Start frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000

### Environment Variables

Create `frontend/.env.local`:

```
NEXT_PUBLIC_GOOGLE_PLACES_KEY=your_google_places_api_key
```

---

## Demo Flow

1. Visit https://slatenow.xyz
2. Explore restaurants at `/explore`
3. View a server profile at `/server/1`
4. See the booking flow at `/book`
5. Rate a server at `/rate`
6. Claim a server profile at `/servers/signup` *(run locally for blockchain tx)*
7. View server dashboard at `/dashboard`
8. See Slate Pay at `/pay`
9. View shareable card at `/server/1/card`

---

## Live Pages

| Route | Description |
|---|---|
| `/` | Homepage |
| `/explore` | Restaurant discovery |
| `/server/1` | Server profile |
| `/book` | Reservation booking |
| `/rate` | GPS verified rating |
| `/servers/signup` | Server profile claim (on-chain) |
| `/server-waitlist` | Server early access waitlist |
| `/dashboard` | Server dashboard |
| `/account` | Guest account |
| `/my-servers` | Guest's followed servers |
| `/for-servers` | Server landing page |
| `/for-restaurants` | Restaurant landing page |
| `/pay` | Slate Pay cashout |
| `/live` | Real time restaurant intelligence |
| `/how-it-works` | Product explainer |
| `/whitepaper` | Full technical whitepaper |
| `/waitlist` | Restaurant waitlist |

---

## Traction

- 20+ NYC hospitality workers on early access waitlist
- Restaurant partner interest confirmed in NYC
- Built in under 2 weeks by solo founder with no prior coding experience

---

## Team

**Chaz Rodriguez — Founder**  
NYC native and hospitality industry veteran. Built Slate from zero coding experience using Claude Code + Solana tools.  
Twitter: [@slatenow](https://twitter.com/slatenow)

---

## Contact

📧 team@slatenow.xyz  
🌐 https://slatenow.xyz
