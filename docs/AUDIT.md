# Documentation audit log

Audit date: 2026-09-17. Source of truth: `contracts/src/MilestoneEscrow.sol` (v3 ABI), `web/` App Router, `web/.env.example`, `web/lib/contracts/addresses.ts`, `artifacts/v3-deploy/`, and live Arbitrum Sepolia / production frontend.

Repo docs are **English**. No Portuguese/English factual split was found (no PT copies existed to contradict).

## Method

1. Inventory every project-owned markdown file (`README.md`, `SUBMISSION.md`, `docs/*`, `artifacts/v3-deploy/DEPLOY.md`). Vendor docs under `contracts/lib/` were ignored.
2. Cross-check addresses, chain id, USDC, campaign id, fromBlock, function names, and routes against Solidity, the committed ABI, env examples, and chain `eth_call` / receipts.
3. Hit production `https://milemark-pearl.vercel.app` (`/`, `/demo`, `/create`, `/campaign/0`, `POST /rpc`).
4. Fix docs (and tiny comments) so “current” always means v3. Leave v1/v2 labeled frozen/historical.

## Live facts verified on-chain (2026-09-17)

| Item | Verified value |
|---|---|
| Network | Arbitrum Sepolia (`421614`) |
| Escrow v3 | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` (code present) |
| Deploy tx | `0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464` |
| Deploy block | **`309949272`** |
| Deployer | `0x3A17eD984f20C50C6927addDAEf633fff40f84D4` |
| `usdc()` | Circle Sepolia USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| `campaignCount()` | `1` (only id `0`) |
| Demo create tx | `0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4` |
| Demo create block | **`309949346`** |
| Production UI | `https://milemark-pearl.vercel.app` — `/demo` HTTP 200, `/rpc` JSON-RPC proxy works |
| Production `/rpc` `campaignCount` | `1` (same escrow) |

Campaign **id `0`** (not the Foundry `CreateDemo.s.sol` defaults):

- Title `MM v3 Demo Quorum`, brief `https://example.com/v3-demo`
- Sponsor = beneficiary = sole attestor = deployer `0x3A17…84D4`
- Quorum **1**, challenge window **60s**, 2 miles (`Attest mile` 1 USDC + `Claimable after window` 2 USDC = **3 USDC**)
- Neither mile completed at audit time (`claimable = 0`)
- Deadline ≈ 2026-10-01 20:07 UTC; created ≈ 2026-09-17 20:07 UTC

## What was wrong → what was corrected

| Issue | Before | After |
|---|---|---|
| Production frontend URL missing from README / SUBMISSION / DEMO / ARCHITECTURE | Docs described routes as `/demo` with no host. Live app is `https://milemark-pearl.vercel.app` (includes `/demo`). | Canonical URL in README, SUBMISSION, DEMO, DEPLOY, APP. Deep links use that host. |
| Featured campaign 0 described as if it were the “Judge demo (2-of-3)” template / `CreateDemo.s.sol` output | DEMO + README implied a 2-of-3, 10 USDC, GitHub-brief campaign. Chain shows 1-of-1, 3 USDC, `example.com` brief, same wallet for all roles. | DEMO and APP document **live id 0** separately from the **create-form template** and from `CreateDemo.s.sol` (which would mint the **next** id). |
| `NEXT_PUBLIC_ESCROW_FROM_BLOCK` vs “around 309949351” | Repo uses `309949200` (comment: exact deploy `309949272`). `web/.env.production` is **not in git** (`web/.gitignore` ignores `.env*`). Block `309949351` is ~5 blocks **after** campaign 0’s `CampaignCreated` (`309949346`). Using it as `fromBlock` would drop the create event from the activity timeline. | Keep **`309949200`** as the safe UI `fromBlock`. Document exact deploy `309949272` and demo-create `309949346`. Do not switch current fromBlock to 309949351. |
| No Vercel / Root Directory guide | README only covered Foundry + `cd web && npm run dev`. Deploying the **monorepo root** (no root `package.json`) 404s `/demo`. | New [`docs/DEPLOY.md`](./DEPLOY.md): Vercel Root Directory = `web/`, or a tarball with `package.json` at the archive root. |
| Docs set too thin for the product | ARCHITECTURE was a short layer list. No APP map, no consolidated ops, no audit log, no mermaid lifecycle, no trust model. | Expanded ARCHITECTURE; added APP, DEPLOY, AUDIT. README is the entry point. |
| DEMO.md markdown links | `[/demo](/demo)` and `[/campaign/0](/campaign/0)` do not resolve to production. | Absolute production URLs. |
| `completeMilestone` as “the path” | Only appeared in SUBMISSION as a **v2 → v3 changelog** line (correct). UI already calls `attestMilestone`. Filename `complete-button.tsx` is historical. | Changelog kept, clearly labeled historical. APP.md notes the leftover filename. No UI copy change (labels are not false). |
| README “Demo video **TODO**” | Looked like a missing asset that might exist. | Stated fact: no recorded judge video in this repo. |
| Artifact deploy note read as a fresh-broadcast recipe | `artifacts/v3-deploy/DEPLOY.md` did not say v3 is already live / which fromBlock to wire. | Marked live, linked to `docs/DEPLOY.md`, listed fromBlock + production URL. |
| `CreateDemo.s.sol` NatSpec vs live id 0 | Script defaults (4+6 USDC, title `MileMark v3 demo`, GitHub brief, optional 2-of-2) do not describe campaign 0. | Comment: live id 0 is a hand-crafted 1-of-1; the script creates a **new** campaign. Behavior unchanged. |
| In-app `/demo` implied featured campaign was the 2-of-3 script | Walkthrough only described creating a new 2-of-3; the “Open live campaign” button goes to id `0` (1-of-1). | One clarifying paragraph on `/demo`: id 0 is 1-of-1 / 3 USDC / 60s; the numbered walkthrough is for a **new** 2-of-3. |

## Checked and already correct (no change)

- Escrow v3 address, deployer, deploy tx, Circle USDC, chain id `421614`, default RPC `https://sepolia-rollup.arbitrum.io/rpc`.
- Write path is `attestMilestone` (not `completeMilestone`) in Solidity, ABI, and `CompleteButton`.
- Events: `CampaignCreated`, `MilestoneAttested`, `MilestoneCompleted`, `MilestoneDisputed`, `Claimed`, `Reclaimed`.
- Quorum `1 <= q <= unique attestors`, `MAX_ATTESTORS = 32`, first non-empty evidence wins, sticky dispute, reclaim after deadline of incomplete **or** disputed miles.
- Dev server port **43147** matches `web/package.json`.
- 44 `test_*` functions in `contracts/test/MilestoneEscrow.t.sol` (run `forge test` locally; this audit did not re-broadcast or claim a forge summary).
- In-app landing / `/demo` copy matches v3 (quorum, window, frozen v2 listed, no v1-as-current).

## Intentionally not changed

- Solidity behavior, ABI, product features.
- Historical v1 `0x72b474DB34268281CD10db655cc1517C33973049` and frozen v2 `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207` — kept, labeled obsolete.
- `CompleteButton` filename / “Mark complete” label for 1-of-1 (still true: quorum 1 completes on that attest).
- No invented prize claims, metrics, or extra tx hashes.
