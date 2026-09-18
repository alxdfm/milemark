# Deploy and ops

This is the **canonical** newcomer guide for deploying MileMark contracts and the Next.js UI. Other notes (`README.md`, `artifacts/**`) point here.

Live product addresses and ABI semantics: [`ARCHITECTURE.md`](./ARCHITECTURE.md). Judge script: [`DEMO.md`](./DEMO.md). Frontend map: [`APP.md`](./APP.md). Gaps closed by this pass: [`AUDIT-DEPLOY.md`](./AUDIT-DEPLOY.md).

Do **not** invent addresses or transaction hashes. Values below were checked against this repo and Arbitrum Sepolia on 2026-09-18.

## Current production (do not “redeploy v3” by accident)

v3 is **already live** at `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC`. Broadcasting `script/Deploy.s.sol` again creates a **new** address (v3 ABI, `campaignCount == 0`). Only do that if you intend to replace the frontend pointer.

| Item | Value |
|---|---|
| Network | Arbitrum Sepolia (chain id `421614`) |
| Frontend | https://milemark-pearl.vercel.app (must include [`/demo`](https://milemark-pearl.vercel.app/demo)) |
| Escrow v3 | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` |
| Deploy tx | `0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464` |
| Deployer | `0x3A17eD984f20C50C6927addDAEf633fff40f84D4` |
| Deploy block | `309949272` |
| UI `fromBlock` (canonical) | `309949200` |
| Demo campaign | id `0` (1-of-1, **not** the 2-of-3 create template) |
| Demo create tx | `0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4` |
| Demo create block | `309949346` |
| USDC (Circle testnet) | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Frozen v2 (do not wire) | `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207` |
| Obsolete v1 (do not wire) | `0x72b474DB34268281CD10db655cc1517C33973049` |

Bytecode / ABI snapshot of that create: `artifacts/v3-deploy/` (`abi.json`, `bytecode.txt`, `MilestoneEscrow.json`). Low-level `cast send --create` / `forge create` recipes: [`artifacts/v3-deploy/DEPLOY.md`](../artifacts/v3-deploy/DEPLOY.md). Vercel tarball notes: [`artifacts/v3-web-deploy/WEB_DEPLOY.md`](../artifacts/v3-web-deploy/WEB_DEPLOY.md).

**Do not** set `NEXT_PUBLIC_ESCROW_FROM_BLOCK=309949351` for this escrow. Campaign 0’s `CampaignCreated` is at `309949346`; that higher start skips the create event and the activity timeline looks empty.

---

## Prerequisites

| Need | Why | Notes |
|---|---|---|
| [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`) | Tests, deploy scripts, post-deploy checks | `foundry.toml`: solc `0.8.24`, optimizer `200`, `via_ir`, EVM Cancun |
| Node **20+** and npm | `web/` Next.js 16 app | Dev server: `http://localhost:43147` |
| Python 3 | ABI export (`scripts/export-abi.py`) after Solidity changes | stdlib only |
| Wallet with a **testnet** private key | Broadcast deploys / `CreateDemo` | Never commit `PRIVATE_KEY`. Anvil account 0 is a **public** test key |
| Arbitrum Sepolia ETH | Gas | Bridge from Ethereum Sepolia: https://bridge.arbitrum.io/ |
| Circle testnet USDC on Arbitrum Sepolia | Campaign funding | https://faucet.circle.com/ — token `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Optional Arbiscan API key | `forge script --verify` | `ARBISCAN_API_KEY` in `contracts/.env`. Deploy still succeeds if verify fails |

Quality gates (run before any broadcast you care about):

```bash
cd contracts && forge test
cd web && npm install && npm run typecheck && npm run build
```

`contracts/test/MilestoneEscrow.t.sol` defines **44** `test_*` functions.

---

## Config files (where they live)

| File | Tracked? | Used by |
|---|---|---|
| `contracts/.env.example` | yes | Template. Copy to `contracts/.env` |
| `contracts/.env` | **no** (gitignored) | Foundry auto-loads this when you run `forge` from `contracts/` |
| `web/.env.example` | yes | Template + comments. Copy to `web/.env.local` for local overrides |
| `web/.env.local` | **no** | Next.js local overrides (dev and build on your machine) |
| `web/.env.production` | yes (public `NEXT_PUBLIC_*` only) | `next build` / `next start` defaults; tarball deploys |
| `web/lib/contracts/addresses.ts` + `web/lib/chains.ts` | yes | Compile-time **fallbacks** if an env var is unset |
| Vercel project env | dashboard | Overrides during the Vercel build. `NEXT_PUBLIC_*` are baked in at **build** time — changing them requires a **rebuild** |

There are **no** server-only secrets. `POST /rpc` uses the same `NEXT_PUBLIC_RPC` as the client. Do not put `PRIVATE_KEY` in any `web/` env file.

**Resolution** (later sources win for Next): hardcoded fallbacks ← `web/.env.production` ← `web/.env.local` / process env (Vercel dashboard).

---

## Full config reference

### Contracts (`contracts/.env` — Foundry)

`script/Deploy.s.sol` and `script/CreateDemo.s.sol` read these via `vm.env*` / `vm.envOr`. Names must match exactly.

| Variable | Meaning | Example | Local Anvil | Sepolia deploy | Sepolia `CreateDemo` |
|---|---|---|---|---|---|
| `PRIVATE_KEY` | Broadcaster key (hex, with or without `0x`) | Anvil 0: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | **required** | **required** | **required** |
| `USDC_ADDRESS` | Token passed to `MilestoneEscrow` constructor | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | omit if `DEPLOY_MOCK_USDC=true` | **required** (Circle USDC) | n/a (script uses `escrow.usdc()`) |
| `DEPLOY_MOCK_USDC` | If `true`, deploy `MockERC20` (6 decimals, public `mint`) instead of using `USDC_ADDRESS` | `true` | **required `true`** | `false` / unset | n/a |
| `ARB_SEPOLIA_RPC_URL` | Sepolia JSON-RPC. Also interpolated in `foundry.toml` `[rpc_endpoints]` | `https://sepolia-rollup.arbitrum.io/rpc` | n/a (use `--rpc-url http://127.0.0.1:8545`) | recommended | recommended |
| `ARBISCAN_API_KEY` | Sourcify/Arbiscan verify (`foundry.toml` `[etherscan]`) | (secret) | unused | optional (`--verify`) | unused |
| `ESCROW_ADDRESS` | Already-deployed v3 escrow for `CreateDemo.s.sol` | live `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` | **required** after local deploy | unused by `Deploy.s.sol` | **required** |
| `BENEFICIARY` | Campaign beneficiary | defaults to the sponsor | optional | n/a | optional |
| `ATTESTOR` | First attestor | defaults to the sponsor | optional | n/a | optional |
| `ATTESTOR_2` | Second attestor; if set and ≠ `ATTESTOR`, default quorum becomes `2` | a second address | optional | n/a | optional |
| `QUORUM` | `uint8`; must satisfy `1 <= quorum <= unique attestors` | `1` or `2` | optional (default 1, or 2 if `ATTESTOR_2`) | n/a | optional |
| `CHALLENGE_WINDOW` | Seconds after quorum before claim | `60` | optional (default `60`) | n/a | optional |
| `DEADLINE_SECONDS` | Deadline offset from `block.timestamp` | `604800` (7 days) | optional (default `7 days`) | n/a | optional |

`CreateDemo.s.sol` **hardcodes** amounts `4e6 + 6e6` (10 USDC, 6 decimals), title `MileMark v3 demo`, brief `https://github.com/callydus/milemark`, and two mile descriptions. That is **not** live campaign `0` (1-of-1, 3 USDC, title `MM v3 Demo Quorum`). The sponsor must hold **≥ 10 USDC** of `escrow.usdc()`; the script `approve`s the total.

### Frontend (`NEXT_PUBLIC_*`)

All public (inlined into the client bundle). Same names for local, Sepolia, and Vercel.

| Variable | Meaning | Current Sepolia example | Anvil | Required? |
|---|---|---|---|---|
| `NEXT_PUBLIC_RPC` | Upstream JSON-RPC. Browser on Sepolia talks to same-origin `POST /rpc`, which proxies here. Anvil talks to this URL **directly** | `https://sepolia-rollup.arbitrum.io/rpc` | `http://127.0.0.1:8545` | Optional on Sepolia (fallback is that public URL). **Set** for Anvil |
| `NEXT_PUBLIC_CHAIN_ID` | `421614` = Arbitrum Sepolia. `31337` selects the Anvil chain object and skips the `/rpc` proxy | `421614` | `31337` | Optional on Sepolia (fallback `421614`). **Set `31337`** for Anvil |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | MilestoneEscrow **v3**. v1/v2 addresses make `isEscrowConfigured` false | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` | address printed by `Deploy.s.sol` | Optional on Sepolia (fallback `LIVE_ESCROW_V3`). **Set** after a new deploy / Anvil |
| `NEXT_PUBLIC_USDC_ADDRESS` | Token the **create form** approves. Must equal `escrow.usdc()` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | `MockERC20` address | Optional on Sepolia (fallback Circle USDC). **Set** for Anvil |
| `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` | Featured id for `/`, `/demo` “Open live campaign” | `0` | `0` after first local `CreateDemo` | Optional (fallback `"0"`). **Set** if you create a new featured campaign |
| `NEXT_PUBLIC_ESCROW_FROM_BLOCK` | `getLogs` start for the activity timeline | `309949200` | `0` is OK on Anvil | Optional on current v3 (fallback `309949200`). **Set** after a **new** escrow deploy |

No other `process.env` keys exist in `web/` besides these six.

---

## 1. Contract deploy

Constructor is `MilestoneEscrow(address usdc_)`. Zero USDC reverts `ZeroAddress`. The contract is not upgradeable; every broadcast is a **new** address.

### 1a. Local Anvil (full demo)

Terminal A:

```bash
anvil
```

Terminal B:

```bash
cd contracts
cp .env.example .env   # then set PRIVATE_KEY + DEPLOY_MOCK_USDC=true
# Foundry auto-loads contracts/.env from this directory.

export PATH="$PATH:$HOME/.foundry/bin"
DEPLOY_MOCK_USDC=true \
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Copy the printed `MockERC20 (local USDC):` and `MilestoneEscrow v3:` addresses.

Mint test USDC to Anvil account 0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`):

```bash
cast send $USDC "mint(address,uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 10000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Import Anvil account 0 into the wallet. Those keys are **public** — never use them on a real network.

### 1b. Arbitrum Sepolia (only if replacing live v3)

1. Fund the deployer with Sepolia ETH (gas) and, if you will run `CreateDemo`, ≥ 10 Circle testnet USDC.
2. `cd contracts && cp .env.example .env` and set `PRIVATE_KEY` (never commit) plus `USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`. Leave `DEPLOY_MOCK_USDC` unset/false.
3. Broadcast:

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url ${ARB_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc} \
  --broadcast --chain 421614
```

Add `--verify` only if `ARBISCAN_API_KEY` is set. Verify failure does not undo the create.

Equivalent `forge create` / bytecode recipes: [`artifacts/v3-deploy/DEPLOY.md`](../artifacts/v3-deploy/DEPLOY.md). `--constructor-args` takes the **USDC address**, not the padded ABI word.

### 1c. Validations after deploy (`cast`)

Use the new address as `$ESCROW` and the RPC you broadcast to as `$RPC`.

```bash
# Chain must be 421614 on Sepolia (31337 on Anvil).
cast chain-id --rpc-url $RPC

# Bytecode present (not 0x).
cast code $ESCROW --rpc-url $RPC

# Token must be the USDC you passed to the constructor.
cast call $ESCROW "usdc()(address)" --rpc-url $RPC
# Sepolia expected: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

cast call $ESCROW "campaignCount()(uint256)" --rpc-url $RPC
# Fresh deploy: 0. Live v3 (2026-09-18): 1

cast call $ESCROW "MAX_ATTESTORS()(uint256)" --rpc-url $RPC
# 32

# Record the deploy block from the create receipt (needed for fromBlock).
cast receipt $DEPLOY_TX --rpc-url $RPC | grep -E 'blockNumber|contractAddress'
```

If `usdc()` is not Circle USDC on Sepolia, the UI will approve the wrong token (or the right UI token against the wrong escrow). Re-deploy or fix `NEXT_PUBLIC_USDC_ADDRESS` to match `usdc()`.

---

## 2. Demo campaign + choosing `fromBlock`

### Live id `0` (already onchain)

Featured production campaign is **id `0`**: 1-of-1, 60s window, 3 USDC, title `MM v3 Demo Quorum`. It was **not** created by `CreateDemo.s.sol` (that script’s defaults are 4+6 USDC and title `MileMark v3 demo`). Running the script against live v3 mints the **next** id (currently `1` if `campaignCount` is still `1`).

Verify id `0`:

```bash
cast call $ESCROW "getCampaign(uint256)" 0 --rpc-url $RPC
cast call $ESCROW "getAttestors(uint256)(address[])" 0 --rpc-url $RPC
```

Unknown ids revert `CampaignNotFound` (the UI shows “Could not load campaign” with that error).

### Create a new demo (`CreateDemo.s.sol`)

```bash
cd contracts
ESCROW_ADDRESS=0x<new-or-live-escrow> \
PRIVATE_KEY=$PRIVATE_KEY \
CHALLENGE_WINDOW=60 \
forge script script/CreateDemo.s.sol \
  --rpc-url ${ARB_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc} \
  --broadcast --chain 421614
```

The script prints `Demo campaign id:`. That value is `campaignCount` **before** the increment (first campaign on a new escrow is `0`). Confirm:

```bash
cast call $ESCROW "campaignCount()(uint256)" --rpc-url $RPC
# featured id = campaignCount - 1
```

Optional: `BENEFICIARY`, `ATTESTOR`, `ATTESTOR_2`, `QUORUM`. If `QUORUM` exceeds unique attestors, the tx reverts `InvalidQuorum`. If `ATTESTOR_2` is unset, you get a 1-of-1 with the sponsor as attestor.

### How to pick `NEXT_PUBLIC_ESCROW_FROM_BLOCK`

1. Read the **escrow deploy** block from the create receipt (`cast receipt $DEPLOY_TX`).
2. Read the **featured campaign** create block from that campaign’s tx receipt (or from `CampaignCreated` logs).
3. Set `fromBlock` to a round number **≤ both**, a few hundred blocks before the deploy. Canonical for **this** v3 address: **`309949200`** (deploy `309949272`, campaign 0 `309949346`).
4. After a **new** escrow, do **not** keep `309949200` forever — a start too far behind `latest` can make `eth_getLogs` fail on some providers. A few hundred to a few thousand blocks before the new deploy is enough.
5. Confirm logs exist:

```bash
cast logs --from-block $FROM --to-block latest \
  --address $ESCROW \
  "CampaignCreated(uint256,address,address,uint256,uint64,uint8,uint64)" \
  --rpc-url $RPC
```

If this prints nothing, `fromBlock` is **after** `CampaignCreated` (the timeline will say “No events indexed from this escrow yet” even though `getCampaign` works). That is the `309949351` footgun for live campaign 0.

Some providers reject `fromBlock 0` or huge ranges. The UI still defaults to `309949200` for current v3. Anvil may use `0`.

---

## 3. ABI sync (after Solidity that the UI must match)

```bash
cd contracts && forge build
python3 ../scripts/export-abi.py
```

That rewrites `web/lib/contracts/abi.ts` from `contracts/out/MilestoneEscrow.sol/MilestoneEscrow.json`. Do not hand-edit the escrow ABI. Commit the generated file with the Solidity change. The script also embeds a small `erc20Abi` (`approve`, `allowance`, `balanceOf`, `decimals`, `symbol`).

Skip this step if you only redeploy **unchanged** v3 bytecode (new address, same ABI).

Also update `LIVE_ESCROW_V3` in `web/lib/contracts/addresses.ts` when the **current** Sepolia pointer changes (that constant is the fallback if env is unset, and the v1/v2 guards live next to it).

---

## 4. Frontend — local

```bash
cd web
cp .env.example .env.local   # already Sepolia v3; override for Anvil
npm install
npm run dev          # http://localhost:43147
npm run typecheck
npm run build
```

Anvil `.env.local` (replace addresses from the forge printout):

```
NEXT_PUBLIC_RPC=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_DEMO_CAMPAIGN_ID=0
NEXT_PUBLIC_ESCROW_FROM_BLOCK=0
```

`next dev` must be restarted after env changes. Header chip should read **Anvil** or **Arbitrum Sepolia** accordingly.

---

## 5. Frontend — Vercel production

The Next app lives in **`web/`**. The **monorepo root has no `package.json`**. `web/vercel.json` only sets `"framework": "nextjs"`; it does **not** fix a wrong Root Directory.

| Deploy shape | Root Directory / archive root | Result |
|---|---|---|
| Git connected to this repo | Vercel **Root Directory = `web`** | `/`, `/create`, `/campaign/[id]`, `/demo`, `POST /rpc` all exist |
| Tarball / CLI upload of the **`web/` folder** | `package.json` at the **archive root** | Same |
| Git Root Directory left as **repo root** | looks for `package.json` at `/` | Build fails or a different app; **`/demo` 404s** |

Install / build (inside `web/`): `npm install` / `npm run build`. Framework preset: Next.js.

### Git-connected project

1. Vercel → Project → Settings → General → **Root Directory = `web`**.
2. Connect Origin `callydus/milemark` `main` (or this branch).
3. Set Production env to the table in [Full config reference](#full-config-reference) (or rely on tracked `web/.env.production` + code fallbacks, which already match live v3).
4. Deploy. Confirm `https://<host>/demo` is **200**, not a Next 404.

### Tarball / CLI (no git Root Directory)

Packaged source: [`artifacts/v3-web-deploy.tgz`](../artifacts/v3-web-deploy.tgz). Steps: [`artifacts/v3-web-deploy/WEB_DEPLOY.md`](../artifacts/v3-web-deploy/WEB_DEPLOY.md).

```bash
mkdir -p /tmp/milemark-web && tar -xzf artifacts/v3-web-deploy.tgz -C /tmp/milemark-web
cd /tmp/milemark-web   # package.json must be here
npx vercel link --yes --scope mile-mark --project milemark
npx vercel deploy --prod --yes
```

After a **new** contract: set `NEXT_PUBLIC_ESCROW_ADDRESS`, `NEXT_PUBLIC_USDC_ADDRESS` (must match `usdc()`), `NEXT_PUBLIC_ESCROW_FROM_BLOCK` (see §2), `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` (a real id on **that** escrow), then **redeploy** so `NEXT_PUBLIC_*` recompile.

Local check that `/demo` is in the build: `cd web && npm run build` then confirm `.next/server/app/demo.html` or `.next/server/app/demo/` exists.

---

## Smoke / validation checklist

Faucet: deployer/sponsor needs **ETH + USDC** on Arbitrum Sepolia before create/attest/claim.

### Onchain (replace `$RPC` / `$ESCROW`)

- [ ] `cast chain-id` → `421614`
- [ ] `cast call $ESCROW "usdc()(address)"` → Circle USDC
- [ ] `cast call $ESCROW "campaignCount()(uint256)"` → `≥ 1` if you expect a demo id
- [ ] `cast call $ESCROW "getCampaign(uint256)" $ID` succeeds (featured production: `0`)
- [ ] `cast logs --from-block $FROM ... CampaignCreated` includes the featured campaign’s create block

### Frontend (production host or `http://localhost:43147`)

| URL | Expect |
|---|---|
| `/` | Landing; header chip **Arbitrum Sepolia**; no amber “Escrow address is not set” banner |
| `/create` | Form; default template **Judge demo (2-of-3, 60s)** — this is **not** live id 0 |
| `/demo` | **HTTP 200** judge kit (a 404 means wrong Vercel root / tarball) |
| `/campaign/0` | Loads featured campaign (or your new id). Activity shows **Campaign created** if `fromBlock` is correct |
| `POST /rpc` | JSON-RPC proxy. `GET /rpc` is **405** (no GET handler) |

Example proxy check:

```bash
curl -sS https://milemark-pearl.vercel.app/rpc \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# result 0x66eee = 421614
```

Wallet: connect, switch if the header shows **Switch to Arbitrum Sepolia**. Reads still use `milemarkChain`; writes follow the wallet chain.

---

## Common failure modes

| What you did | What you see | Fix |
|---|---|---|
| Vercel Root Directory = repo root, or tarball of the monorepo | **`/demo` 404**; other app routes missing | Root Directory `web/` **or** archive whose root **is** `web/package.json` |
| `NEXT_PUBLIC_ESCROW_FROM_BLOCK` after `CampaignCreated` (e.g. `309949351` on live v3) | Campaign page loads, activity **“No events indexed from this escrow yet.”** | Set `fromBlock` ≤ create block (canonical live: `309949200`); rebuild |
| `fromBlock` 0 / huge range on a strict RPC | Timeline **error** (RPC message), not empty | Raise `fromBlock` to just before deploy, still ≤ create block |
| Env still pointing at v1 or v2 | Amber **ConfigBanner**; campaign page “Escrow not configured”; writes disabled (`isEscrowConfigured` false) | Use v3 address `0xC5A623…DCC` (or your new v3) |
| Escrow unset / zero address | Same banner | Set `NEXT_PUBLIC_ESCROW_ADDRESS` |
| New escrow, `DEMO_CAMPAIGN_ID=0`, but you never created a campaign | `/campaign/0` → **Could not load campaign** / `CampaignNotFound` | Run `CreateDemo` (or create in the UI) and point the demo id at the printed id |
| ABI drift (UI ABI ≠ bytecode), or random contract | **Could not load campaign** / decode errors | `forge build` + `python3 scripts/export-abi.py`; confirm you did not wire v2 |
| `NEXT_PUBLIC_USDC_ADDRESS` ≠ `escrow.usdc()` | Approve succeeds on the UI token; `createCampaign` reverts (`ERC20InsufficientAllowance` / transfer-from fail) | Set USDC env to `cast call $ESCROW "usdc()(address)"` |
| Wallet on Ethereum / Arb One / etc. | Header **Switch to Arbitrum Sepolia**; writes fail or go to the wrong chain | Click switch (`ConnectWallet`) |
| `NEXT_PUBLIC_CHAIN_ID=31337` while RPC is Sepolia (or the reverse) | Header says **Anvil** but requests hit the wrong node; empty/error reads | Align chain id + RPC |
| Missing / invalid quorum on create | UI: “Quorum must be an integer ≥ 1” / “cannot exceed unique attestors”. Chain: `InvalidQuorum` | `1 <= quorum <= unique(attestors)` after duplicate-skip; max 32 attestors |
| Empty attestors / zero addresses / zero amounts / past deadline | UI validation on `/create`; chain custom errors (`EmptyAttestors`, `ZeroAddress`, `ZeroAmount`, `DeadlineInPast`) | See [`ARCHITECTURE.md`](./ARCHITECTURE.md) custom errors |
| `CreateDemo` with fewer than 10 USDC | ERC-20 balance/allowance revert | Circle faucet (Sepolia) or `MockERC20.mint` (Anvil) |
| Broadcast `Deploy.s.sol` “again” expecting the same address | New empty escrow; old campaigns invisible | Keep the live pointer, or update env + `fromBlock` + demo id together |
| Changed Vercel env but no rebuild | UI still on old address / fromBlock (`NEXT_PUBLIC_*` are compile-time) | Redeploy |
| `GET /rpc` | HTTP **405** | Use **POST** JSON-RPC |

Friendly wallet copy for many custom errors lives in `web/lib/milemark/errors.ts`.

---

## Quality gates (repeat)

```bash
cd contracts && forge test
cd web && npm install && npm run typecheck && npm run build
```
