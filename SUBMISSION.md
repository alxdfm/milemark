# MileMark v2 — submission notes

Onchain milestone escrow. **v2 ABI** on Arbitrum Sepolia. This file is the project one-pager, not a third-party filing checklist.

## What to review

- `contracts/` Foundry project: `MilestoneEscrow.sol`, unit tests, `Deploy.s.sol`
- `web/` Next.js App Router: home, create (templates), campaign-by-id (roles, timeline, reclaim, evidence)
- Clean Architecture: domain in `web/lib/milemark/`, ABI/addresses in `web/lib/contracts/`, presentational splits under `web/components/campaign/` and `web/components/create/`
- Docs: `README.md`, `docs/ARCHITECTURE.md`, `docs/DEMO.md`

## Quality gates

```bash
cd contracts && forge test
cd web && npm install && npm run typecheck && npm run build
```

## Live v2 (do not break ABI)

| Item | Value |
|---|---|
| Network | Arbitrum Sepolia (421614) |
| MilestoneEscrow v2 | `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207` |
| Deploy tx | https://sepolia.arbiscan.io/tx/0x38bf2071c5cb577c75f86a559b1461a812f103a814113121e7b9360eb4e9965a |
| Featured demo | `/campaign/2` |
| Original v2 demo | `/campaign/0` · title `MileMark v2 demo` |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Obsolete v1 (do not use) | `0x72b474DB34268281CD10db655cc1517C33973049` |

## Out of scope

Stylus, Permit2, dispute windows, multi-token, subgraphs, mainnet as the primary chain.
