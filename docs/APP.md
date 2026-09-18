# App (frontend)

Canonical map of the Next.js client. Contract rules: [`ARCHITECTURE.md`](./ARCHITECTURE.md). Deploy, env, and Vercel: [`DEPLOY.md`](./DEPLOY.md). Judge kit: [`DEMO.md`](./DEMO.md).

Stack: **Next.js App Router** (`web/package.json` name `milemark-web`, Next `16.3.5`, React `19`, **wagmi** `3` / **viem** `2`), Tailwind v4, injected wallet only. Dev server: **`http://localhost:43147`** (`next dev --port 43147`).

Source of truth for campaign state is **onchain**. No database, no subgraph.

## Production

| Item | Value |
|---|---|
| Origin | https://milemark-pearl.vercel.app |
| Demo kit | https://milemark-pearl.vercel.app/demo |
| Create | https://milemark-pearl.vercel.app/create |
| Featured campaign | https://milemark-pearl.vercel.app/campaign/0 |
| RPC proxy | `POST https://milemark-pearl.vercel.app/rpc` (GET is 405) |

Verified 2026-09-17: `/demo` returns 200; proxy `eth_call campaignCount()` returns `1` against v3.

## Routes

| Route | File | What it does |
|---|---|---|
| `/` | `web/app/page.tsx` | Landing: problem statement, three steps, trust strip, lookup + link to featured `DEMO_CAMPAIGN_ID`, Arbiscan snippet of the live escrow. Server component. |
| `/create` | `web/app/create/page.tsx` | Create form container. Copy describes quorum + window + reclaim. |
| `/campaign/[id]` | `web/app/campaign/[id]/page.tsx` | Async server page; `params` is a Promise (Next 15+). Renders `CampaignStatus`. Invalid ids are handled client-side after parse. |
| `/demo` | `web/app/demo/page.tsx` | Judge kit: QR, copyable URLs, role cheat-sheet, 5-step script, live v3 + frozen v2 links. |
| `POST /rpc` | `web/app/rpc/route.ts` | Same-origin JSON-RPC proxy to `NEXT_PUBLIC_RPC` (20s timeout). Not a REST API. |

Root layout (`web/app/layout.tsx`): fonts (Geist, Syne), `Providers` (wagmi + react-query), `ConfigBanner` (amber, non-blocking: missing/v1/v2 escrow, wallet chain ≠ expected, `escrow.usdc()` ≠ `NEXT_PUBLIC_USDC_ADDRESS`, known-bad `fromBlock`), `Header`, footer (“Arbitrum Open House Singapore Online Buildathon”). `lang="en"`.

Header nav: Create, Demo, chain name chip, `ConnectWallet` (injected; switch-chain if `chainId !== milemarkChain.id`).

There is **no** `/api` router besides `/rpc`.

## How the UI talks to the chain

On Arbitrum Sepolia in the **browser**, wagmi’s HTTP transport is **`/rpc`** (same origin), not the public RPC URL. The Node server (Vercel Function / `next start`) forwards to `NEXT_PUBLIC_RPC` (default `https://sepolia-rollup.arbitrum.io/rpc`). That exists because browser egress to public rollup RPCs is unreliable.

On **Anvil** (`NEXT_PUBLIC_CHAIN_ID=31337`) the browser talks to `http://127.0.0.1:8545` (or `NEXT_PUBLIC_RPC`) directly.

Reads use `useReadContract` on `milemarkChain.id`. Writes use `useWriteContract` + `useWaitForTransactionReceipt`. Receipts link to Sepolia Arbiscan via `explorerTx`.

Campaign pages refetch after a successful write (`onSettled` → `useCampaign.refetch`). React Query `staleTime` is 4s; `refetchOnWindowFocus` is off.

## Role derivation and disabled buttons

`useCampaign` reads four views, then:

1. `parseCampaignView` / `parseMilestones` / `parseAttestors` / `parseFlags` (domain).
2. `resolveRoles(connectedWallet, view, attestors)` → `{ connected, isSponsor, isBeneficiary, isAttestor }` (case-insensitive address match).
3. `campaignTotals(milestones)` for progress bar (completed **and not disputed** counts as complete).

Disabled-button **reasons** are pure domain functions (also shown as helper copy):

| Action | Helper | Typical copy |
|---|---|---|
| Claim | `claimReason` | Connect beneficiary / only beneficiary / wait for quorum+window / **in challenge** / **disputed** |
| Reclaim | `reclaimReason` | Connect sponsor / only sponsor / deadline not passed or nothing left |
| Dispute | `disputeReason` | Connect sponsor or attestor / not quorum yet / already disputed / window closed |
| Attest | inline in `MilestoneList` | Disabled if not attestor, already attested, completed, or reclaimed. Hint: “Connect a listed attestor wallet to attest.” |

`canDispute` / `isChallengeOpen` / `isMileClaimable` in `web/lib/milemark/lifecycle.ts` mirror the contract using **wall-clock** `nowSec` (1s tick in `CampaignStatus`). The contract uses `block.timestamp`; the UI can be a second off around window close.

Milestone **status** labels (`milestoneStatus`): `open` → `attesting` (count > 0) → `challenging` (completed, window open) → `completed` (window elapsed) / `disputed` / `claimed` / `reclaimed`.

Create-form validation (`validateCreateCampaign`) runs **before** wallet submit: title, future deadline, addresses, unique attestors ≤ 32, `1 ≤ quorum ≤ unique`, window ≥ 0 integer, each mile description + USDC > 0. It also requires `isEscrowConfigured`.

Approve vs create: the form reads ERC-20 `allowance(owner, escrow)` and `balanceOf`. If allowance < total, only **Approve** is shown; after the approve receipt it switches to **Create campaign**. Insufficient balance blocks both.

On create success the client parses `CampaignCreated` logs with viem `parseEventLogs` and `router.replace(/campaign/{id})`.

## Timeline (no indexer)

`web/components/campaign/timeline.tsx` calls `publicClient.getContractEvents` six times (`CampaignCreated`, `MilestoneAttested`, `MilestoneCompleted`, `MilestoneDisputed`, `Claimed`, `Reclaimed`) with:

- `address`: `ESCROW_ADDRESS`
- `fromBlock`: `ESCROW_FROM_BLOCK` (`NEXT_PUBLIC_ESCROW_FROM_BLOCK` or **`309949200`**)
- `args: { campaignId }`

Logs are merged, sorted by `(blockNumber, logIndex)`, and linked to Arbiscan. If `fromBlock` is **after** the create block, the feed warns that the campaign exists but the log window missed `CampaignCreated`. That is why `309949351` must not be the current fromBlock (campaign 0 was created at **`309949346`**).

## `lib/milemark` (pure domain)

| Module | Responsibility |
|---|---|
| `address.ts` | `0x` + 40 hex, checksum-insensitive equality, `ZERO_ADDRESS`, `shortAddress` |
| `usdc.ts` | 6 decimals, `parseUsdc` / `formatUsdc` |
| `types.ts` | `CampaignView`, `Milestone`, `milestoneStatus`, `campaignTotals` |
| `parse.ts` | Campaign id (`/^\d+$/`), ABI tuple/named-struct decoding including `view_` wrapper |
| `roles.ts` | `resolveRoles` |
| `reasons.ts` | Disabled claim/reclaim/dispute copy |
| `lifecycle.ts` | Challenge window math, `canDispute`, `claimableMiles` / `challengingMiles` / `disputedMiles`, `formatChallengeRemaining` |
| `create.ts` | Draft validation, `MAX_ATTESTORS = 32` (must match Solidity) |
| `errors.ts` | Map custom error names + a few wallet strings to friendly English |
| `index.ts` | Barrel |

`web/lib/format.ts` re-exports domain formatters plus `formatCountdown` / `formatUnix` (presentation clocks).

`web/lib/links.ts`: clickable `ipfs://` / `ipns://` / `http(s)`. Other schemes show as “not browser-openable”.

`web/lib/templates.ts`: **single source** for create-form presets (not onchain). Default template is **Judge demo (2-of-3, 60s)** — this is **not** live campaign 0.

`web/lib/config-guardrails.ts`: pure warnings for wallet chain, USDC mismatch, fromBlock footguns.

`web/lib/abi.ts`: shim re-export of `web/lib/contracts/abi.ts`.

`web/lib/contracts/addresses.ts`: `LIVE_ESCROW_V3`, `LIVE_ESCROW_V2`, `OBSOLETE_ESCROW_V1`, Circle USDC, `ESCROW_FROM_BLOCK`, `DEMO_CAMPAIGN_ID`, `SMOKE_CAMPAIGN_ID`. `isEscrowConfigured` is false for zero / v1 / v2 addresses.

## Components

**Campaign (presentational + small write buttons)**

| File | Role |
|---|---|
| `campaign-status.tsx` | Container: load states, then header + miles + claim + timeline + reclaim |
| `campaign/header-card.tsx` | Title, quorum M-of-N, window, brief link, deadline, role chips, progress, parties, released/claimable/paid |
| `campaign/milestone-list.tsx` | Per-mile status, evidence link, attest + dispute (countdown, who-can-dispute, disputed styling) |
| `campaign/complete-button.tsx` | **Writes `attestMilestone`.** Historical filename. Label “Mark complete” if `quorum <= 1`, else `Attest (count/quorum)`. Optional evidence input. |
| `campaign/dispute-button.tsx` | Writes `dispute(campaignId, index)` with tx feedback + disabled reason |
| `campaign/claim-card.tsx` / `claim-button.tsx` | Writes `claim`; lists currently claimable miles + totals (one tx = all claimable) |
| `campaign/reclaim-card.tsx` / `reclaim-button.tsx` | Writes `reclaim` |
| `campaign/timeline.tsx` | Event feed; empty+exists warns about fromBlock |
| `campaign/deadline-line.tsx` | Local-timezone deadline + reclaimable amount |
| `campaign/role-chip.tsx` | “you” highlight when the connected wallet holds that role |
| `complete-button.tsx`, `claim-button.tsx`, `reclaim-button.tsx` | Re-exports of the campaign/* buttons |

**Create**

| File | Role |
|---|---|
| `create-campaign-form.tsx` | Container: template, allowance, approve/create, redirect |
| `create/template-bar.tsx` | Buttons for `CAMPAIGN_TEMPLATES` |
| `create/meta-fields.tsx` | Title, brief URI, deadline, challenge-window presets |
| `create/party-fields.tsx` | Beneficiary, attestor list, quorum (copy notes 1-of-n ≈ old v2 behaviour) |
| `create/milestone-fields.tsx` | Description + USDC rows |
| `create/fund-actions.tsx` | Total, balance, approve or create, `TxFeedback` |

**Demo**

| File | Role |
|---|---|
| `demo/demo-kit.tsx` | Script, roles, QR, copy links, onchain featured facts (will not call id 0 2-of-3 unless the chain says so), live v3 + frozen v2 |
| `demo/copy-link.tsx` | Clipboard + QR (`QrBlock`) |

**Shared:** `tx-feedback.tsx` (Arbiscan + `friendlyError`), `connect-wallet.tsx`, `config-banner.tsx` (non-blocking chain/USDC/fromBlock/escrow banners), `campaign-lookup.tsx`, `header.tsx`, `providers.tsx`, `ui/*` (button, card, input, label, separator).

**Hooks:** `use-campaign.ts`, `use-now-sec.ts` (1s tick for countdowns), `use-config-warnings.ts`.

## Templates (create form only)

Single source: `web/lib/templates.ts`. Each preset fills attestors slots, quorum, challenge window, deadline, and USDC miles (v3 `createCampaign` fields).

| id | Label | Quorum / slots | Window | Amounts (human USDC) |
|---|---|---|---|---|
| `judge` | Judge demo (2-of-3, 60s) | 2 / 3 | 60s | 4 + 6 |
| `freelance` | Freelance | 2 / 3 | 1 day | 20 + 50 + 30 |
| `grant` | Grant | 2 / 3 | 1 day | 25 + 35 + 40 |
| `delivery` | Delivery | 2 / 2 | 1 hour | 40 + 60 |

Window presets: 0 (instant claim), 60s, 1h, 1d.

## Featured live campaign vs templates

Do not confuse these:

1. **Live id `0`** on v3 — 1-of-1, 60s window, 3 USDC, title `MM v3 Demo Quorum`. Same deployer wallet is sponsor, beneficiary, and the only attestor. See [`DEMO.md`](./DEMO.md). Keep this labeled as the original smoke campaign.
2. **Create-form “Judge demo (2-of-3, 60s)”** — a *new* campaign the judge funds with three attestor addresses.
3. **`script/CreateDemo.s.sol`** — Foundry 1-of-1 helper; defaults 4+6 USDC and title `MileMark v3 demo`. Running it **now** would create id `1`, not rewrite id `0`.
4. **`script/CreateFeaturedDemo.s.sol`** — Foundry 2-of-3 featured mint (1h window, 3+4+3 USDC). Operator broadcasts, then sets `NEXT_PUBLIC_DEMO_CAMPAIGN_ID`.

## Config the UI reads

All public. Documented fully in [`DEPLOY.md`](./DEPLOY.md).

| Variable | Default (if unset) |
|---|---|
| `NEXT_PUBLIC_RPC` | `https://sepolia-rollup.arbitrum.io/rpc` |
| `NEXT_PUBLIC_CHAIN_ID` | `421614` (`31337` selects Anvil) |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | `LIVE_ESCROW_V3` |
| `NEXT_PUBLIC_USDC_ADDRESS` | Circle Sepolia USDC |
| `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` | `"0"` |
| `NEXT_PUBLIC_ESCROW_FROM_BLOCK` | `309949200` |

Tracked `web/.env.production` holds the same public values (no secrets). Vercel dashboard env overrides at build time. Unset vars fall back to the defaults above. Full required-vs-optional matrix: [`DEPLOY.md`](./DEPLOY.md).

## Clean Architecture rule

`web/lib/milemark/**` must stay free of `wagmi` / `react` / `next` imports. Parsing and “why is this button disabled?” belong there so the campaign page stays a composition root.
