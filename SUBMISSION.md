# MileMark v3 — submission notes

Onchain milestone escrow. **v3 ABI** on Arbitrum Sepolia. This file is the project one-pager, not a third-party filing checklist. No HackQuest submit.

## What to review

- `contracts/` Foundry project: `MilestoneEscrow.sol` (N-of-M quorum + light dispute window), unit tests, `Deploy.s.sol`, `CreateDemo.s.sol`
- `web/` Next.js App Router: home, `/demo` judge kit, create (templates + quorum + window), campaign-by-id (attest, dispute, claim, reclaim)
- Clean Architecture: domain in `web/lib/milemark/` (including `lifecycle.ts`), ABI/addresses in `web/lib/contracts/`
- Docs: `README.md`, `docs/ARCHITECTURE.md`, `docs/DEMO.md`

## Quality gates

```bash
cd contracts && forge test
cd web && npm install && npm run typecheck && npm run build
```

## Live deploys

| Item | Value |
|---|---|
| Network | Arbitrum Sepolia (421614) |
| MilestoneEscrow **v3** | see `LIVE_ESCROW_V3` in `web/lib/contracts/addresses.ts` (new address; do not reuse v2) |
| Frozen v2 (do not wire) | `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207` |
| Obsolete v1 (do not use) | `0x72b474DB34268281CD10db655cc1517C33973049` |
| Featured demo | `/demo` · campaign id from `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |

## v3 vs v2 (breaking)

- `createCampaign` now takes `uint8 quorum` and `uint64 challengeWindow`.
- `completeMilestone` is replaced by `attestMilestone`. Quorum emits `MilestoneAttested` then `MilestoneCompleted`.
- `dispute(campaignId, index)` during the window (sponsor or attestor). Sticky; blocks claim.
- Claim waits until `completedAt + challengeWindow` (immediate if window is 0).
- Reclaim after deadline covers incomplete **and** disputed miles.

## Out of scope

Stylus, Permit2, multi-token, subgraphs, mainnet as the primary chain, onchain dispute resolution beyond the sticky flag, HackQuest submission.
