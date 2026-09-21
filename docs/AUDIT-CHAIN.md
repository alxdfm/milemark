# Onchain reconciliation audit (2026-09-21)

Third docs pass, after [`AUDIT.md`](./AUDIT.md) (product/docs, 2026-09-17) and [`AUDIT-DEPLOY.md`](./AUDIT-DEPLOY.md) (deploy docs, 2026-09-18). Scope: **does every factual claim in the repo still match live Arbitrum Sepolia?** Source of truth: `eth_call` / `eth_getCode` / `eth_getLogs` against `https://sepolia-rollup.arbitrum.io/rpc`, compared to the committed Foundry artifact.

No Solidity was changed. Two user-facing strings in `web/components/demo/demo-kit.tsx` were corrected because they asserted something the chain contradicts.

## Live facts verified (2026-09-21)

| Item | Result |
|---|---|
| Escrow v3 | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` — 9210 bytes |
| Bytecode vs repo | **identical** to `contracts/out/MilestoneEscrow.sol/MilestoneEscrow.json` `deployedBytecode` once the 4 immutable slots (offsets 1331 / 5551 / 6204 / 6578, the `usdc` address) are filled |
| Deploy tx | `0xf78262e4…e464` → block **`309949272`**, from `0x3A17eD98…84D4`, status success |
| `usdc()` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| `MAX_ATTESTORS()` | `32` |
| **`campaignCount()`** | **`2`** |
| Campaign 0 | tx `0x9eb5776f…b4e4`, block `309949346`, 3 USDC, quorum 1, window 60 |
| Campaign 1 | tx `0x01dd9f1a…22e5`, block **`310231111`**, 10 USDC, quorum 2, window 3600, created 2026-09-18 15:40 UTC |
| Attestations | **none on either campaign** — every mile `attestationCount 0`, `completed false`, `claimable 0` |
| Frozen v2 / obsolete v1 | code still present (6819 / 4588 bytes) — must not be wired |
| `/`, `/demo`, `/create` | HTTP 200 |
| `contracts/test/MilestoneEscrow.t.sol` | 44 `test_` functions (matches every doc that says 44) |

## Campaign `1` is not `CreateFeaturedDemo.s.sol` output

The script hardcodes values that campaign `1` does not carry:

| Field | `CreateFeaturedDemo.s.sol` | Live campaign `1` |
|---|---|---|
| Title | `MileMark featured 2-of-3` | `MileMark Featured 2-of-3` |
| Brief | `https://github.com/alxdfm/milemark` | `ipfs://milemark-featured-demo-brief` |
| Mile 0 | `Public demo live on Sepolia` | `Milestone 1: Scope agreed` |
| Mile 1 | `Two attestors reach quorum` | `Milestone 2: Delivery submitted` |
| Mile 2 | `Claim after the challenge window` | `Milestone 3: Acceptance` |
| Deadline | 30 days | 7 days (2026-09-25 15:40 UTC) |

Amounts (3+4+3), quorum (2) and window (3600) do match, which is exactly why this needed writing down: it is a hand-made lookalike. This is the same failure mode [`AUDIT.md`](./AUDIT.md) logged for campaign `0` being described as the create-form template.

## Incongruences found → fixes

| Where | Claim | Fix |
|---|---|---|
| `SUBMISSION.md` | “live `campaignCount` is still `1` (only id `0`)” | Rewritten: count is `2`, campaign `1` documented with tx, block, shape and deadline |
| `docs/DEMO.md` | “Live `campaignCount` is `1` as of this writing”; whole “Featured 2-of-3 (operator)” section written as if unminted | Section replaced by **The live 2-of-3 (campaign `1`)** with the full onchain table; minting instructions kept under a subsection |
| `docs/APP.md` | “Verified 2026-09-17: … `campaignCount()` returns `1`”; “Running it **now** would create id `1`” | Re-verified 2026-09-21 (`2`); next mint is id `2`; campaign `1` added as a fifth entry under “Featured live campaign vs templates” |
| `README.md` | “id `0` until `CreateFeaturedDemo` is broadcast” | Live table now carries `campaignCount`, the featured id `0` row and a separate id `1` row |
| `docs/DEPLOY.md` | “Featured 2-of-3: run `CreateFeaturedDemo.s.sol`”; env matrix “until Featured is minted”; count read “2 on 2026-09-20” without saying what id `1` is | All three name campaign `1` and state the script has not been broadcast on live v3 |
| `docs/LOCAL.md` | env matrix “`0` until Featured is minted” | Names id `1` as the unwired 2-of-3; campaign table gained a row |
| `docs/ARCHITECTURE.md` | “not the 2-of-3 featured mint” (implied none existed) | “the live 2-of-3 exhibit is campaign `1`” |
| `web/.env.production`, `web/.env.example` | “After CreateFeaturedDemo, set …” | State that a 2-of-3 already exists at id `1` and is deliberately not wired |
| `contracts/.env.example` | “mints the NEXT id (id 0 already exists…)” | Next id is `2`; both existing ids described |
| `web/lib/contracts/addresses.ts` | “A 2-of-3 featured exhibit is minted with `script/CreateFeaturedDemo.s.sol`” | Points at live id `1` with its create tx and block |
| `web/components/demo/demo-kit.tsx` | “not 2-of-3 until CreateFeaturedDemo is broadcast”; operator-runs-the-script paragraph | Both corrected; `/demo` now links judges to `/campaign/1` |

[`AUDIT.md`](./AUDIT.md) and [`AUDIT-DEPLOY.md`](./AUDIT-DEPLOY.md) were **not** rewritten. They are dated logs: `campaignCount` really was `1` on 2026-09-17 and 2026-09-18.

## Deliberately not changed

- **`NEXT_PUBLIC_DEMO_CAMPAIGN_ID` stays `0`.** Pointing it at `1` is a product call, and campaign `1`'s deadline is **2026-09-25 15:40 UTC**. Wiring a campaign that expires days later would put an expired exhibit on the landing page.
- **No new campaign was minted.** That needs a funded Sepolia key, which this repo does not ship.

## Open items

1. Campaign `1` expires **2026-09-25 15:40 UTC**. `attestMilestone` has no deadline guard, so it stays attestable, but the UI will render it expired and the sponsor can `reclaim`. A featured exhibit that outlives judging needs a fresh mint (next id `2`).
2. Neither campaign has a single attestation, so both activity timelines show only `CampaignCreated`. Attesting one mile on the featured campaign would show quorum, window countdown and disabled-claim reasoning without the judge signing anything.
3. No demo video is checked in ([`DEMO.md`](./DEMO.md) says the in-app kit is the script).
