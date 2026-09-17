# Architecture

MileMark is a **v3** onchain milestone escrow. The Solidity ABI is the source of truth. The Next.js app is a thin client over `getCampaign` / `getMilestones` / `getAttestors` / `hasAttestedAll` plus five write paths (`createCampaign`, `attestMilestone`, `dispute`, `claim`, `reclaim`). There is no indexer and no backend besides a same-origin RPC proxy.

Live Arbitrum Sepolia **v3** escrow: [`0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC`](https://sepolia.arbiscan.io/address/0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC) (`LIVE_ESCROW_V3`). Circle testnet USDC: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`. Deploy tx [`0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464`](https://sepolia.arbiscan.io/tx/0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464).

Frozen, ABI-incompatible predecessors — **do not wire the UI**:

- v2 `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207`
- v1 `0x72b474DB34268281CD10db655cc1517C33973049`

## Layers (frontend)

Dependencies point inward. Domain code never imports wagmi, React, or Next.

| Layer | Path | Depends on | Responsibility |
|---|---|---|---|
| Domain | `web/lib/milemark/` | none (stdlib only) | Addresses, USDC 6-decimal math, parse campaign/milestones, roles, claim/reclaim/dispute reasons, quorum + challenge-window lifecycle, create validation, friendly errors |
| Contracts | `web/lib/contracts/` | domain (address checks) | Barrel of committed ABI + live/default addresses |
| Infra | `web/lib/chains.ts`, `web/lib/wagmi.ts`, `web/app/rpc` | contracts | Chain defs, explorer URLs, wallet config, RPC proxy |
| Application | `web/hooks/use-campaign.ts` | contracts + wagmi | Campaign reads, parse, roles, refetch |
| Presentation | `web/components/campaign/*`, `web/components/create/*`, `web/components/demo/*` | hooks + domain | Cards, forms, demo kit, tx Arbiscan feedback |
| Containers | `campaign-status.tsx`, `create-campaign-form.tsx` | presentation + hooks | Wire state; no parse/validation of their own |
| Pages | `web/app/` | containers | Home, `/create`, `/campaign/[id]`, `/demo` |

```
web/
├── lib/milemark/          pure domain
├── lib/contracts/         ABI + addresses barrel
├── hooks/use-campaign.ts
├── components/campaign/   presentational campaign UI
├── components/create/     presentational create UI
├── components/demo/       shareable judge kit
├── components/campaign-status.tsx
└── components/create-campaign-form.tsx
```

## Onchain flow (v3)

1. Sponsor `approve`s USDC then `createCampaign(beneficiary, attestors, quorum, title, briefURI, deadline, challengeWindow, descriptions, amounts)`.
2. Each listed attestor may `attestMilestone(id, index, evidenceURI)` **once** per mile (any-order). The mile completes when `attestationCount >= quorum`. Evidence policy: **first non-empty URI wins**.
3. Completing a mile starts `challengeWindow` seconds. During the window the **sponsor or any listed attestor** may `dispute(id, index)` — sticky, no onchain resolution, blocks claim forever for that mile.
4. After the window with no dispute (`challengeWindow == 0` ⇒ immediately), the beneficiary `claim(id)` for the sum of claimable unclaimed miles.
5. After `block.timestamp > deadline`, the sponsor `reclaim(id)` for **incomplete or disputed** miles. Completed, undisputed, unclaimed amounts stay with the beneficiary even if their challenge window has not yet elapsed.

Events: `CampaignCreated`, `MilestoneAttested`, `MilestoneCompleted`, `MilestoneDisputed`, `Claimed`, `Reclaimed`.

## Invariants

Documented in NatSpec on `MilestoneEscrow` (`@custom:invariants`):

1. A mile is `completed` iff `attestationCount >= quorum` (latched once).
2. Each attestor may attest a given mile at most once (`hasAttested`).
3. Claimable iff `completed && !claimed && !disputed && !reclaimed && block.timestamp >= completedAt + challengeWindow`.
4. Dispute is sticky and only valid inside the window, by sponsor or attestor.
5. Reclaim after deadline takes incomplete **or** disputed amounts. Completed undisputed amounts are never reclaimable.
6. Attest / complete / dispute do not move tokens. Only create / claim / reclaim transfer USDC (`ReentrancyGuard` on those three).
7. `completed` and `reclaimed` are mutually exclusive after a successful reclaim of that index.

Quorum bounds: `1 <= quorum <= unique(attestors).length`, unique set capped at `MAX_ATTESTORS` (32). Duplicate attestors are skipped at create.

## ABI freeze

Do not change function signatures, event topics, or error selectors on a **live** v3 deploy. NatSpec and UI refactors are the only expected follow-ups unless a **v4** is deployed to a new address. Leave v2 untouched.

See [DEMO.md](./DEMO.md) for the judge walkthrough and `/demo` in the app.
