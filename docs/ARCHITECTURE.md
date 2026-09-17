# Architecture

MileMark is a **v2** onchain milestone escrow. The Solidity ABI is the source of truth. The Next.js app is a thin client over `getCampaign` / `getMilestones` / `getAttestors` plus four write paths. There is no indexer and no backend besides a same-origin RPC proxy.

Live Arbitrum Sepolia escrow: [`0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207`](https://sepolia.arbiscan.io/address/0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207). Circle testnet USDC: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`. Obsolete v1 `0x72b474DB34268281CD10db655cc1517C33973049` is ABI-incompatible and must not be wired.

## Layers (frontend)

Dependencies point inward. Domain code never imports wagmi, React, or Next.

| Layer | Path | Depends on | Responsibility |
|---|---|---|---|
| Domain | `web/lib/milemark/` | none (stdlib only) | Addresses, USDC 6-decimal math, parse campaign/milestones, roles, claim/reclaim reasons, create validation, friendly errors |
| Contracts | `web/lib/contracts/` | domain (address checks) | Barrel of committed ABI + live/default addresses |
| Infra | `web/lib/chains.ts`, `web/lib/wagmi.ts`, `web/app/rpc` | contracts | Chain defs, explorer URLs, wallet config, RPC proxy |
| Application | `web/hooks/use-campaign.ts` | contracts + wagmi | Campaign reads, parse, roles, refetch |
| Presentation | `web/components/campaign/*`, `web/components/create/*` | hooks + domain | Cards, forms, tx Arbiscan feedback |
| Containers | `campaign-status.tsx`, `create-campaign-form.tsx` | presentation + hooks | Wire state; no parse/validation of their own |
| Pages | `web/app/` | containers | Home, `/create`, `/campaign/[id]` |

```
web/
├── lib/milemark/          pure domain
├── lib/contracts/         ABI + addresses barrel
├── hooks/use-campaign.ts
├── components/campaign/   presentational campaign UI
├── components/create/     presentational create UI
├── components/campaign-status.tsx
└── components/create-campaign-form.tsx
```

## Onchain flow

1. Sponsor `approve`s USDC then `createCampaign(beneficiary, attestors, title, briefURI, deadline, descriptions, amounts)`.
2. Any listed attestor `completeMilestone(id, index, evidenceURI)` — any-order, evidence optional.
3. Beneficiary `claim(id)` for the sum of completed, unclaimed miles.
4. After `block.timestamp > deadline`, sponsor `reclaim(id)` for incomplete miles. Completed-but-unclaimed stays with the beneficiary.

Events: `CampaignCreated`, `MilestoneCompleted`, `Claimed`, `Reclaimed`.

## ABI freeze

Do not change function signatures, event topics, or error selectors on the live v2 deploy. NatSpec and UI refactors are the only expected follow-ups unless a **v3** is deployed to a new address.

See [DEMO.md](./DEMO.md) for the judge walkthrough.
