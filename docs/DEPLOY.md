# Deploy and ops

Canonical ops guide. Live addresses: [`ARCHITECTURE.md`](./ARCHITECTURE.md). ABI export and local UI: also summarized in the root [`README.md`](../README.md).

## Current production (do not “redeploy v3” by accident)

v3 is **already live** on Arbitrum Sepolia at `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC`. Broadcasting `Deploy.s.sol` again creates a **new** address (v3 ABI, empty `campaignCount`). Only do that if you intend to replace the frontend pointer.

| Item | Value |
|---|---|
| Frontend | https://milemark-pearl.vercel.app |
| Escrow v3 | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` |
| Deploy tx | `0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464` |
| Deploy block | `309949272` |
| UI `fromBlock` | `309949200` |
| Demo campaign create block | `309949346` (id `0`) |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Frozen v2 | `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207` |
| Obsolete v1 | `0x72b474DB34268281CD10db655cc1517C33973049` |

Bytecode / ABI snapshot used for that create: `artifacts/v3-deploy/` (`abi.json`, `bytecode.txt`, `MilestoneEscrow.json`). Recipe details remain in [`artifacts/v3-deploy/DEPLOY.md`](../artifacts/v3-deploy/DEPLOY.md).

## Frontend env (`NEXT_PUBLIC_*`)

Committed template: `web/.env.example`. Copy to `web/.env.local` for local overrides.

`web/.gitignore` ignores `.env*` except `.env.example`. There is **no** tracked `web/.env.production`. Vercel project env must be set in the dashboard (or you rely on the **compile-time defaults** in `web/lib/contracts/addresses.ts` / `web/lib/chains.ts`, which already match Sepolia v3).

| Variable | Sepolia (current) | Anvil |
|---|---|---|
| `NEXT_PUBLIC_RPC` | `https://sepolia-rollup.arbitrum.io/rpc` | `http://127.0.0.1:8545` |
| `NEXT_PUBLIC_CHAIN_ID` | `421614` | `31337` |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` | mock deploy address |
| `NEXT_PUBLIC_USDC_ADDRESS` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | `MockERC20` address |
| `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` | `0` | `0` after `CreateDemo` |
| `NEXT_PUBLIC_ESCROW_FROM_BLOCK` | `309949200` | `0` is OK on Anvil |

Notes:

- All of these are **public** (inlined into the client bundle). Do not put `PRIVATE_KEY` here.
- `POST /rpc` uses the same `NEXT_PUBLIC_RPC` on the server. There is no separate `RPC_URL`.
- `isEscrowConfigured` is false if the escrow is unset, v1, or v2 — the UI banners and disables reads/writes.
- **Do not** set `fromBlock` to `309949351`: campaign 0’s `CampaignCreated` is at `309949346`, so the activity feed would miss it.

Contracts deploy env (uncommitted): `contracts/.env.example` → `contracts/.env` with `PRIVATE_KEY`, `USDC_ADDRESS`, optional `ARB_SEPOLIA_RPC_URL`, `ARBISCAN_API_KEY`, `DEPLOY_MOCK_USDC`.

## Vercel (this is how `/demo` stays a real route)

The Next app lives in **`web/`**. The **monorepo root has no `package.json`**.

| Deploy shape | Root Directory / archive root | Result |
|---|---|---|
| Git connected to this repo | Vercel **Root Directory = `web`** | `/`, `/create`, `/campaign/[id]`, `/demo`, `POST /rpc` all exist |
| Tarball / CLI upload of the `web/` folder | `package.json` at the **archive root** | Same |
| Git Root Directory left as repo root | looks for `package.json` at `/` | Build fails or a different app; **`/demo` 404s** |

There is no `vercel.json` in the repo. Framework preset: Next.js. Install/build: `npm install` / `npm run build` inside `web/`.

After a contract redeploy, set `NEXT_PUBLIC_ESCROW_ADDRESS` and bump `NEXT_PUBLIC_ESCROW_FROM_BLOCK` to a block **≤** the new create (a few hundred before the deploy block is fine). Point `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` at a real id on **that** escrow.

## Local UI

Needs Node 20+.

```bash
cd web
cp .env.example .env.local   # already Sepolia v3; override for Anvil
npm install
npm run dev          # http://localhost:43147
npm run typecheck
npm run build
```

## Contracts — test and (re)deploy

Needs [Foundry](https://book.getfoundry.sh/getting-started/installation). `foundry.toml`: solc `0.8.24`, optimizer 200, `via_ir`, EVM Cancun.

```bash
cd contracts
forge test
```

`contracts/test/MilestoneEscrow.t.sol` defines **44** `test_*` functions (create, quorum, evidence, claim, reclaim, window, dispute, max 32 attestors).

### Full local demo (Anvil)

Terminal A: `anvil`

Terminal B:

```bash
cd contracts
export PATH="$PATH:$HOME/.foundry/bin"
DEPLOY_MOCK_USDC=true \
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Copy printed `MockERC20` and `MilestoneEscrow v3` into `web/.env.local` (`NEXT_PUBLIC_CHAIN_ID=31337`, `NEXT_PUBLIC_RPC=http://127.0.0.1:8545`). Mint, then `cd web && npm run dev`.

```bash
cast send $USDC "mint(address,uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 10000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Import Anvil account 0 into the wallet. Those keys are **public test keys** — never use them on a real network.

Optional local demo campaign:

```bash
ESCROW_ADDRESS=0x... \
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
CHALLENGE_WINDOW=60 \
forge script script/CreateDemo.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

On **Sepolia**, the same script creates a **new** id (live `campaignCount` is already `1`). It does not recreate id `0`. Defaults differ from live id 0 (see [`DEMO.md`](./DEMO.md)).

### Broadcast a new Sepolia escrow (only if replacing v3)

1. Sepolia ETH on Arbitrum ([bridge](https://bridge.arbitrum.io/)) and Circle testnet USDC ([faucet](https://faucet.circle.com/)).
2. `contracts/.env` with `PRIVATE_KEY` (never commit) and `USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`.
3. `forge script script/Deploy.s.sol --rpc-url ${ARB_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc} --broadcast --verify --chain 421614`
4. Update `LIVE_ESCROW_V3`, `web/.env.example`, Vercel env, and `fromBlock`.

`forge create` / `cast send --create` recipes: `artifacts/v3-deploy/DEPLOY.md`. Constructor arg is the USDC address.

## ABI sync

After any Solidity change that ships to the UI:

```bash
cd contracts && forge build
python3 ../scripts/export-abi.py
```

That rewrites `web/lib/contracts/abi.ts` from `contracts/out/MilestoneEscrow.sol/MilestoneEscrow.json`. Do not hand-edit the escrow ABI. Commit the generated file with the Solidity change.

`scripts/export-abi.py` also embeds a small `erc20Abi` (`approve`, `allowance`, `balanceOf`, `decimals`, `symbol`).

## Quality gates

```bash
cd contracts && forge test
cd web && npm install && npm run typecheck && npm run build
```
