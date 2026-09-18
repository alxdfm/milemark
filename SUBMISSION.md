# MileMark v3 — submission notes

Onchain milestone escrow. **v3 ABI** on Arbitrum Sepolia. This file is the project one-pager, not a third-party filing checklist. No HackQuest submit.

**Production:** https://milemark-pearl.vercel.app — judge kit at [`/demo`](https://milemark-pearl.vercel.app/demo), featured campaign [`/campaign/0`](https://milemark-pearl.vercel.app/campaign/0).

## What to review

- `contracts/` Foundry: `MilestoneEscrow.sol` (N-of-M quorum + light dispute window), 44 unit tests, `Deploy.s.sol`, `CreateDemo.s.sol`
- `web/` Next.js App Router: home, `/demo`, create (templates + quorum + window), campaign-by-id (attest, dispute, claim, reclaim), `POST /rpc` proxy
- Clean Architecture: domain in `web/lib/milemark/` (including `lifecycle.ts`), ABI/addresses in `web/lib/contracts/`
- Docs: `README.md`, `docs/ARCHITECTURE.md`, `docs/APP.md`, `docs/DEMO.md`, `docs/DEPLOY.md` (canonical deploy), `docs/AUDIT.md`, `docs/AUDIT-DEPLOY.md`

## Quality gates

```bash
cd contracts && forge test
cd web && npm install && npm run typecheck && npm run build
```

Vercel must build from **`web/`** (or a tarball whose root is `web/package.json`). Deploying the monorepo root 404s `/demo`. Details: `docs/DEPLOY.md`.

## Live deploys

| Item | Value |
|---|---|
| Network | Arbitrum Sepolia (421614) |
| Frontend | https://milemark-pearl.vercel.app |
| MilestoneEscrow **v3** | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` |
| Deploy tx | `0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464` |
| Deployer | `0x3A17eD984f20C50C6927addDAEf633fff40f84D4` |
| Featured demo | `/demo` · campaign id `0` (1-of-1, 60s window, 3 USDC; **not** the 2-of-3 create template) · create tx `0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4` |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Event fromBlock | `309949200` (deploy `309949272`) |
| Frozen v2 (do not wire) | `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207` |
| Obsolete v1 (do not use) | `0x72b474DB34268281CD10db655cc1517C33973049` |

## v3 vs v2 (breaking, historical)

- `createCampaign` takes `uint8 quorum` and `uint64 challengeWindow`.
- v2 `completeMilestone` **does not exist** on v3. Current path: `attestMilestone`. Quorum emits `MilestoneAttested` then `MilestoneCompleted`.
- `dispute(campaignId, index)` during the window (sponsor or attestor). Sticky; blocks claim.
- Claim waits until `completedAt + challengeWindow` (immediate if window is 0).
- Reclaim after deadline covers incomplete **and** disputed miles.

## Out of scope

Stylus, Permit2, multi-token, subgraphs, mainnet as the primary chain, onchain dispute resolution beyond the sticky flag, HackQuest submission.
