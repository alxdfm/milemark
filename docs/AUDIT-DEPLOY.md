# Deploy-doc audit (2026-09-18)

Follow-up to [`AUDIT.md`](./AUDIT.md) (product/docs pass, 2026-09-17). Scope: **can a newcomer deploy contracts + frontend using only repo docs and `.env.example` files?** Source of truth: Solidity scripts, `web/` env reads, git-tracked env templates, and live Arbitrum Sepolia / production HTTP (2026-09-18).

Product Solidity behavior was **not** changed. One comment in `web/lib/contracts/addresses.ts` was softened because “RPCs reject fromBlock 0” is not always true.

## Live facts re-checked (2026-09-18)

Via production `POST https://milemark-pearl.vercel.app/rpc` (chain id `0x66eee` = **421614**):

| Item | Result |
|---|---|
| Escrow v3 code | present at `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` |
| Deploy tx | `0xf78262e4…e464` → block **`309949272`**, deployer `0x3A17eD98…84D4` |
| `usdc()` | Circle USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| `campaignCount()` | `1` (only id `0`) |
| Campaign 0 create tx | `0x9eb5776f…b4e4` → block **`309949346`**, `CampaignCreated` log on the escrow |
| `MAX_ATTESTORS()` | `32` |
| `fromBlock 309949200` logs | 1 × `CampaignCreated` at `309949346` |
| `fromBlock 309949351` logs | **0** (skips create — timeline would be empty) |
| Production `/`, `/demo`, `/create`, `/campaign/0` | HTTP **200** |
| `GET /rpc` | HTTP **405** (POST-only proxy) |
| Frozen v1 / v2 | still have bytecode; must not be wired |

Script env names match code: `PRIVATE_KEY`, `USDC_ADDRESS`, `DEPLOY_MOCK_USDC`, `ESCROW_ADDRESS`, `BENEFICIARY`, `ATTESTOR`, `ATTESTOR_2`, `QUORUM`, `CHALLENGE_WINDOW`, `DEADLINE_SECONDS`. Frontend: only the six `NEXT_PUBLIC_*` keys listed in [`DEPLOY.md`](./DEPLOY.md). `foundry.toml` interpolates `ARB_SEPOLIA_RPC_URL` and `ARBISCAN_API_KEY`.

## Gaps found → fixes

| Gap | Before | Fix |
|---|---|---|
| `docs/DEPLOY.md` was an ops *summary*, not a newcomer runbook | Prerequisites, post-deploy `cast` checks, how to pick campaign id / `fromBlock`, config matrix (var → meaning → example → required), smoke URLs, and failure-mode symptoms were scattered or missing | Rewrote [`DEPLOY.md`](./DEPLOY.md) as the single canonical guide with those sections |
| Tracked `web/.env.production` documented as **absent** | `DEPLOY.md`, `APP.md`, `AUDIT.md` said it was gitignored / not tracked. Git actually tracks it (`web/.gitignore` has `!.env.production`). README/WEB_DEPLOY were already correct | Docs now describe it as **public** compile-time defaults. Precedence: fallbacks → `.env.production` → `.env.local` / Vercel dashboard |
| `vercel.json` documented as missing | `DEPLOY.md`: “There is no `vercel.json` in the repo.” File exists at `web/vercel.json` (`framework: nextjs`) | Documented; still does **not** replace Root Directory = `web/` |
| `.env.example` comments were incomplete | Purpose/example often present; **required for local vs Sepolia vs Vercel** was not. `CreateDemo` keys were a commented blob; `ESCROW_ADDRESS` was not a first-class entry | Expanded `contracts/.env.example` and `web/.env.example`. Header on `web/.env.production` pointing at the example |
| How to choose `fromBlock` | Warned against `309949351` but did not spell out receipt → round number ≤ create block → `cast logs` verify, or that a **new** escrow should not keep `309949200` forever | Step-by-step in DEPLOY.md §2 |
| Post-deploy validations | Implied “copy the printed address” | `cast chain-id` / `code` / `usdc()` / `campaignCount` / `MAX_ATTESTORS` / receipt block |
| `/demo` 404 tribal knowledge | Present but easy to miss; tarball vs git vs repo-root not in one table with smoke URLs | Vercel table + smoke checklist + failure-mode row |
| `NEXT_PUBLIC_*` rebuild rule | Unstated | Dashboard/env changes require a **rebuild** (compile-time) |
| USDC env vs `escrow.usdc()` | Unstated. Create form approves `NEXT_PUBLIC_USDC_ADDRESS`; contract pulls `usdc()` | Failure-mode row + post-deploy `usdc()` check |
| Quorum / CreateDemo vs live id 0 | DEMO.md already split them; DEPLOY did not say `CreateDemo` needs **10 USDC** and mints the **next** id | Config table + §2 |
| ABI mismatch / wrong chain / GET `/rpc` symptoms | Partial (banner, timeline empty) | Failure-mode table including `isEscrowConfigured`, switch-chain button, 405 on GET `/rpc` |
| README docs index | DEPLOY.md described only as “Env vars, Vercel Root Directory, Foundry, ABI sync” | Points at the canonical guide; adds this audit file |
| Artifact notes | Historical recipes without a newcomer path | Still historical; first line points at `docs/DEPLOY.md` |

## Intentionally unchanged

- Solidity, ABI, campaign math, UI behavior.
- Live addresses, tx hashes, `fromBlock` **`309949200`**, demo id `0`.
- v1/v2 labeled frozen/historical only.
- `SUBMISSION.md` live table (already matched chain).
- No secrets committed. `contracts/.env` / `web/.env.local` stay gitignored.

## Remaining risks (docs cannot eliminate)

1. **Public RPC variability.** Address-filtered `eth_getLogs` from block `0` succeeded on the production proxy on 2026-09-18; other providers still reject `fromBlock 0` or huge ranges. Prefer a start just before deploy.
2. **`CreateDemo` ≠ featured id 0.** A newcomer who runs the script on live v3 creates id `1` (4+6 USDC) and may think `/campaign/0` should change. Docs now say this explicitly.
3. **Vercel Root Directory is a dashboard setting** — not encoded in git except the warning. A fresh Vercel project on the monorepo will 404 `/demo` until Root Directory is `web/`.
4. **No automated check** that `NEXT_PUBLIC_USDC_ADDRESS == escrow.usdc()` or that `fromBlock ≤ CampaignCreated`.
5. **Anvil account 0 keys** are public; using them on Sepolia would drain a funded wallet. Docs warn; cannot prevent.
