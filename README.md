# MileMark

Onchain USDC milestone escrow for the **Arbitrum Open House Singapore Online Buildathon**. **v3 ABI**, live on **Arbitrum Sepolia**.

Sponsors lock USDC into a titled campaign with ordered milestones (completion is **any-order**), an **N-of-M attestor quorum**, a per-campaign **challenge window**, and a deadline. Listed attestors vote via `attestMilestone`; the mile completes at quorum. After the window (or immediately if it is 0) the beneficiary claims. The sponsor or any attestor may dispute during the window. After the deadline the sponsor reclaims incomplete or disputed miles.

**Production UI:** https://milemark-pearl.vercel.app (includes [`/demo`](https://milemark-pearl.vercel.app/demo)).

## Docs

| Doc | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Product, roles, lifecycle (mermaid), contract API/storage/events/errors/invariants, trust model |
| [`docs/APP.md`](docs/APP.md) | Routes, components, hooks, `lib/milemark`, how the UI derives roles and disabled buttons |
| [`docs/DEMO.md`](docs/DEMO.md) | Judge script, live campaign `0` facts, wallet cheat-sheet |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | **Canonical deploy guide**: prerequisites, Foundry, fromBlock, Vercel Root Directory (`web/`), env matrix, smoke checks, failure modes |
| [`docs/AUDIT-DEPLOY.md`](docs/AUDIT-DEPLOY.md) | Deploy-doc audit: gaps found → fixes (2026-09-18) |
| [`artifacts/v3-web-deploy/WEB_DEPLOY.md`](artifacts/v3-web-deploy/WEB_DEPLOY.md) | Production tarball / Vercel rebuild notes |
| [`docs/AUDIT.md`](docs/AUDIT.md) | Product/docs incongruence log (2026-09-17) |
| [`SUBMISSION.md`](SUBMISSION.md) | One-pager for reviewers |

## Live (current = v3 only)

| Item | Value |
|---|---|
| Network | Arbitrum Sepolia (421614) |
| Frontend | https://milemark-pearl.vercel.app |
| MilestoneEscrow v3 | [`0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC`](https://sepolia.arbiscan.io/address/0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC) |
| Deploy tx | [`0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464`](https://sepolia.arbiscan.io/tx/0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464) |
| Deployer | `0x3A17eD984f20C50C6927addDAEf633fff40f84D4` |
| USDC (Circle testnet) | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Demo kit | https://milemark-pearl.vercel.app/demo |
| Demo campaign | id `0` · 1-of-1 · 60s window · 3 USDC · create tx [`0x9eb5776f…`](https://sepolia.arbiscan.io/tx/0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4) |
| Event fromBlock | `309949200` (deploy block `309949272`; campaign 0 create block `309949346`) |
| Frozen v2 (do not wire) | [`0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207`](https://sepolia.arbiscan.io/address/0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207) |
| Obsolete v1 (do not use) | `0x72b474DB34268281CD10db655cc1517C33973049` |

v3 **breaks the v2 ABI**. There is no `completeMilestone` on v3 — attestors call `attestMilestone`. Do not point this frontend at v2 or v1.

No judge video is checked into this repo; use `/demo`.

## How it works

1. **Sponsor** approves USDC and calls `createCampaign(beneficiary, attestors, quorum, title, briefURI, deadline, challengeWindow, descriptions, amounts)`. The sum of `amounts` is pulled in that transaction. Require `1 <= quorum <= unique(attestors).length`.
2. **Attestor quorum (N-of-M)** — each listed address may call `attestMilestone(campaignId, index, evidenceURI)` **once** per mile. Completion is **any-order**. Empty evidence is allowed. **First non-empty evidence URI wins.** When `attestationCount >= quorum`, the contract emits `MilestoneAttested` then `MilestoneCompleted` and starts the challenge window.
3. **Challenge window** — for `challengeWindow` seconds after completion, the sponsor or any listed attestor may `dispute(campaignId, index)`. Dispute is sticky (no onchain resolution) and blocks claim for that mile. `challengeWindow == 0` makes the mile claimable in the same timestamp.
4. **Beneficiary** calls `claim(campaignId)` for the sum of completed, undisputed, unclaimed milestones whose window has elapsed. A second claim with nothing new reverts (`NothingToClaim`).
5. **After `block.timestamp > deadline`**, the sponsor calls `reclaim(campaignId)` for USDC still sitting on **incomplete or disputed** miles. Completed, undisputed, unclaimed amounts stay claimable by the beneficiary.

Events: `CampaignCreated`, `MilestoneAttested`, `MilestoneCompleted`, `MilestoneDisputed`, `Claimed`, `Reclaimed`.

No indexer. The UI reads `getCampaign` / `getMilestones` / `getAttestors` / `hasAttestedAll` and builds a timeline from `getContractEvents`.

**USDC:** Arbitrum Sepolia uses Circle testnet USDC (link above). Anvil / unit tests use `MockERC20` (6 decimals, public `mint`).

## Repo map

```
milemark/
├── contracts/                 Foundry (Solidity ^0.8.24)
│   ├── src/MilestoneEscrow.sol
│   ├── src/mocks/MockERC20.sol
│   ├── test/MilestoneEscrow.t.sol    # 44 test_* functions
│   ├── script/Deploy.s.sol
│   └── script/CreateDemo.s.sol
├── web/                       Next.js App Router + wagmi/viem
│   ├── app/                   /, /create, /campaign/[id], /demo, POST /rpc
│   ├── lib/milemark/          pure domain
│   ├── lib/contracts/         barrel ABI + live v3 addresses
│   ├── hooks/use-campaign.ts
│   └── components/{campaign,create,demo}/
├── artifacts/v3-deploy/       bytecode/ABI snapshot of the live create
├── artifacts/v3-web-deploy/   Vercel source tarball notes
├── docs/
├── README.md
└── SUBMISSION.md
```

## Local setup

Needs [Foundry](https://book.getfoundry.sh/getting-started/installation) and Node 20+. **Deploy contracts + UI (Sepolia / Anvil / Vercel):** [`docs/DEPLOY.md`](docs/DEPLOY.md).

```bash
cd contracts && forge test

cd web
cp .env.example .env.local    # already points at live v3
npm install
npm run dev                   # http://localhost:43147
npm run typecheck
```

## Vercel (frontend)

The Next.js app lives in **`web/`**. Production must use **Root Directory = `web`** (or a tarball with `package.json` at the archive root). Deploying the git repo from the Origin root (no `package.json` there) yields a stale or empty Next app — `/demo` 404s even when v3 env vars are set. Full checklist: [`docs/DEPLOY.md`](docs/DEPLOY.md).

Public v3 defaults are in tracked `web/.env.production` (no secrets) and `web/.env.example`. Packaged source for `vercel deploy`: [`artifacts/v3-web-deploy.tgz`](artifacts/v3-web-deploy.tgz). Tarball-only steps: [`artifacts/v3-web-deploy/WEB_DEPLOY.md`](artifacts/v3-web-deploy/WEB_DEPLOY.md).

```bash
cd web
npx vercel link --yes --scope mile-mark --project milemark
npx vercel deploy --prod --yes
```

## Out of scope (intentionally)

Stylus, Permit2, onchain dispute resolution beyond the sticky flag, multi-token, subgraphs, mainnet as the primary chain, HackQuest submission.

## License

MIT. OpenZeppelin Contracts and forge-std keep their upstream licenses under `contracts/lib/`.
