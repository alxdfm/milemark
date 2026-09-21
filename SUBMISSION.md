# MileMark — HackQuest one-pager

Onchain USDC milestone escrow. **v3 ABI** on Arbitrum Sepolia. This file is the project one-pager for reviewers — **not** a HackQuest portal filing. Do not submit from this repo.

## Problem

Grants, freelance retainers, and hackathon prizes still settle on trust or a human escrow agent. A missed mile either blocks the next payment or dumps the whole purse. Spreadsheets cannot enforce quorum, a challenge window, or a deadline reclaim.

## Solution

A sponsor locks Circle testnet USDC into a titled campaign with ordered milestone descriptions (completion is **any-order**). An **N-of-M attestor quorum** marks a mile complete. After a per-campaign **challenge window** the beneficiary claims; the sponsor or any attestor may **dispute** during the window (sticky, blocks claim). After the deadline the sponsor reclaims incomplete or disputed miles. **Source of truth is the contract** — no application database, no indexer.

## Live

| Item | Value |
|---|---|
| Network | Arbitrum Sepolia (`421614`) |
| Production UI | https://milemark-pearl.vercel.app |
| Demo kit | https://milemark-pearl.vercel.app/demo |
| Create | https://milemark-pearl.vercel.app/create |
| Featured campaign | https://milemark-pearl.vercel.app/campaign/0 — **the original 1-of-1 smoke** (see below) |
| Historical smoke | id `0` · 1-of-1 · 60s window · 3 USDC · title `MM v3 Demo Quorum` |
| Live 2-of-3 | id `1` · `MileMark Featured 2-of-3` · quorum 2 of 3 · 1h window · 10 USDC · **not** the featured id |
| `campaignCount` | `2` (verified onchain 2026-09-21) |
| MilestoneEscrow **v3** | [`0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC`](https://sepolia.arbiscan.io/address/0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC) |
| Deploy tx | [`0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464`](https://sepolia.arbiscan.io/tx/0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464) |
| Deployer | `0x3A17eD984f20C50C6927addDAEf633fff40f84D4` |
| USDC (Circle testnet) | [`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`](https://sepolia.arbiscan.io/token/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d) |
| Event fromBlock | `309949200` (deploy `309949272`; campaign 0 `309949346`) |
| Frozen v2 (do not wire) | `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207` |
| Obsolete v1 | `0x72b474DB34268281CD10db655cc1517C33973049` |

**Featured 2-of-3:** live `campaignCount` is `2`. A 2-of-3 campaign **is** onchain at id `1` — title `MileMark Featured 2-of-3`, quorum 2 of 3 attestors, 1h window, 3+4+3 = 10 USDC, created 2026-09-18 15:40 UTC (block `310231111`, tx [`0x01dd9f1a…`](https://sepolia.arbiscan.io/tx/0x01dd9f1a5b824d2574d16f5627030481a399594a9415431abc6e04e5c71a22e5)), deadline **2026-09-25 15:40 UTC**. It was made by hand, **not** by `contracts/script/CreateFeaturedDemo.s.sol` — that script hardcodes a different title, brief and milestone descriptions, and a 30-day deadline. `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` is still `0`, so `/demo` describes the 1-of-1 smoke and does **not** claim that campaign is 2-of-3. No mile on either campaign has been attested yet. Judges can also run their own 2-of-3 from **Create → Judge demo (2-of-3, 60s)**.

## Demo path (≈ 3 minutes)

1. Open https://milemark-pearl.vercel.app/demo — header chip **Arbitrum Sepolia**.
2. **Create** → template **Judge demo (2-of-3, 60s)**. Fill beneficiary + three attestors. Approve USDC, create, copy `/campaign/{id}`.
3. Two attestors `attestMilestone` (any-order). Activity: `MilestoneAttested` then `MilestoneCompleted`.
4. **Wait or dispute** during the 60s window. Claim stays blocked; countdown + disabled reasons are on the mile. Dispute is `dispute(campaignId, index)` (sponsor or attestor).
5. **Beneficiary claim** — one transaction collects every currently claimable mile. Leave a mile incomplete/disputed to show **reclaim** after the deadline.

Need Arbitrum Sepolia ETH + Circle testnet USDC ([faucet](https://faucet.circle.com/)). If you do not control the deployer key, treat id `0` as a **read-only** exhibit.

## Tech stack

- **Contracts:** Foundry, Solidity `^0.8.24`, OpenZeppelin `ReentrancyGuard` + `SafeERC20`, 44 unit tests
- **App:** Next.js App Router, wagmi/viem, same-origin `POST /rpc` proxy
- **Architecture:** Clean Architecture under `web/lib/milemark` (domain), `web/lib/contracts` (ABI), hooks, small presentational components
- **Source of truth:** onchain `getCampaign` / `getMilestones` / `getAttestors` / events. No DB.

## Differentiators

- **N-of-M quorum** (`attestMilestone`) — not a single “mark complete” admin
- **Light dispute window** — sticky veto by sponsor or attestor; blocks claim; reclaim after deadline
- **USDC escrow** — funds move only on create / claim / reclaim
- **No database / no indexer** — the UI is a thin client of the contract
- **Batch claim** — v3 `claim(campaignId)` already pays every currently claimable mile in one tx; the UI lists which miles and the total
- **Create templates** for Freelance, Grant, Delivery, plus the 60s judge demo — all v3 fields (attestors, quorum, window, deadline, miles)

## What to review

- `contracts/src/MilestoneEscrow.sol` — v3 ABI (no `completeMilestone`)
- `contracts/script/CreateFeaturedDemo.s.sol` — 2-of-3 featured mint (operator)
- `web/` — `/`, `/demo`, `/create`, `/campaign/[id]`
- Docs: `README.md`, `docs/DEMO.md`, `docs/APP.md`, `docs/DEPLOY.md`, `docs/ARCHITECTURE.md`

## Quality gates

```bash
cd contracts && forge test
cd web && npm install && npm run typecheck && npm run build
```

Vercel Root Directory must be **`web/`**. Details: `docs/DEPLOY.md`.

## Out of scope

Stylus, Permit2, Safe multisig, indexer, mainnet/Robinhood, onchain dispute resolution beyond the sticky flag, HackQuest portal submission.
