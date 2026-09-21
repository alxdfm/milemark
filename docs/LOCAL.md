# Local development (Arbitrum Sepolia + frontend)

Canonical runbook for running the **Next.js UI on your machine** against the **live MilestoneEscrow v3 on Arbitrum Sepolia**. Deploy / Vercel / Anvil broadcasts: [`DEPLOY.md`](./DEPLOY.md). Frontend map: [`APP.md`](./APP.md). Judge script: [`DEMO.md`](./DEMO.md). Makefile: [`AUTOMATION.md`](./AUTOMATION.md).

**Default path:** local UI → same-origin `POST /rpc` → public Sepolia rollup RPC → live v3 escrow. You do **not** redeploy the contract to develop the frontend.

Verified end-to-end on **2026-09-20** (Foundry `cast` + `npm run dev` on port `43147`).

---

## What you get

| Piece | Where it runs | Address / URL |
|---|---|---|
| MilestoneEscrow **v3** | Arbitrum Sepolia (`421614`) | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` |
| Circle testnet USDC | Arbitrum Sepolia | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Featured demo campaign | onchain id `0` | title `MM v3 Demo Quorum` (1-of-1 smoke) |
| Live 2-of-3 campaign | onchain id `1` | title `MileMark Featured 2-of-3` (not the featured id) |
| Next.js UI | your laptop | `http://localhost:43147` |
| JSON-RPC proxy | Next route `POST /rpc` | forwards to `NEXT_PUBLIC_RPC` |

Do **not** point this UI at frozen v2 (`0xdECB21…`) or obsolete v1 (`0x72b474…`) — `isEscrowConfigured` goes false and the amber config banner appears.

---

## Prerequisites

| Need | Why | Notes |
|---|---|---|
| Node **20+** and npm | `web/` Next.js 16 app | Dev port is fixed at **43147** (`next dev --port 43147`) |
| Optional: [Foundry](https://book.getfoundry.sh/getting-started/installation) (`cast`) | Smoke checks against Sepolia | Put `$HOME/.foundry/bin` on `PATH` |
| Browser wallet (MetaMask, Rabby, …) | Writes (create / attest / claim) | Must support Arbitrum Sepolia |
| Arbitrum Sepolia ETH + Circle USDC | Only for **writes** | Bridge ETH; [Circle faucet](https://faucet.circle.com/) for USDC |

Reads (landing, `/demo`, `/campaign/0`, activity timeline) work **without** a wallet. Writes need a funded testnet account.

---

## Quick start (Sepolia + local UI)

From the **repo root**:

```bash
# 1. Env — already points at live v3 (gitignored after copy)
cp web/.env.example web/.env.local

# 2. Install + run
make web-install          # or: cd web && npm ci
make web-dev              # or: cd web && npm run dev
```

Open **http://localhost:43147**.

Expected on first paint:

- Header chip: **Arbitrum Sepolia**
- No amber “Escrow address is not set” / v1 / v2 banner
- `/demo` is HTTP **200** (not a Next 404)
- `/campaign/0` loads (client-side) the live smoke campaign

Restart `next dev` after any change to `web/.env.local`.

### Equivalent without Make

```bash
cd web
cp .env.example .env.local
npm ci                    # or npm install
npm run dev               # http://localhost:43147
```

---

## Environment (`web/.env.local`)

Copy of `web/.env.example`. All keys are **public** (`NEXT_PUBLIC_*`); never put `PRIVATE_KEY` here. Full matrix and Anvil overrides: [`DEPLOY.md`](./DEPLOY.md#full-config-reference).

### Sepolia local (default — use this)

```
NEXT_PUBLIC_RPC=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_ESCROW_ADDRESS=0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC
NEXT_PUBLIC_DEMO_CAMPAIGN_ID=0
NEXT_PUBLIC_ESCROW_FROM_BLOCK=309949200
NEXT_PUBLIC_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

| Variable | Must match |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `421614` |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | live v3 above |
| `NEXT_PUBLIC_USDC_ADDRESS` | `escrow.usdc()` (Circle address above) |
| `NEXT_PUBLIC_ESCROW_FROM_BLOCK` | `309949200` (≤ deploy block `309949272` and campaign-0 create `309949346`) |
| `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` | a real id on that escrow (`0` = smoke, `1` = the unwired 2-of-3) |
| `NEXT_PUBLIC_RPC` | a working Arbitrum Sepolia JSON-RPC |

**Resolution** (later wins): hardcoded fallbacks in `web/lib/contracts/addresses.ts` / `web/lib/chains.ts` ← `web/.env.production` ← `web/.env.local`.

### How the browser reaches the chain

On Sepolia (`CHAIN_ID=421614`), the browser does **not** call the public RPC directly. Wagmi talks to same-origin **`POST /rpc`**, and the Next server proxies to `NEXT_PUBLIC_RPC`. That is intentional (public rollup RPC egress from browsers is flaky / rate-limited).

On Anvil (`CHAIN_ID=31337`), the browser talks to `NEXT_PUBLIC_RPC` directly and skips the proxy. Anvil setup: [`DEPLOY.md` §1a + §4](./DEPLOY.md).

---

## Verify the live contract (optional, Foundry)

```bash
export PATH="$PATH:$HOME/.foundry/bin"
ESCROW=0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC
RPC=https://sepolia-rollup.arbitrum.io/rpc

cast chain-id --rpc-url $RPC
# → 421614

cast call $ESCROW "usdc()(address)" --rpc-url $RPC
# → 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

cast call $ESCROW "campaignCount()(uint256)" --rpc-url $RPC
# → ≥ 1 (was 2 on 2026-09-20)

make check-live
# prints usdc() + campaignCount for LIVE_ESCROW
```

Campaign `0` title (via calldata + decode, or UI): **`MM v3 Demo Quorum`**.

---

## Smoke checklist (prove the stack works)

Run these with `npm run dev` already listening on `43147`.

### Pages

```bash
BASE=http://localhost:43147
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/demo"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/create"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/campaign/0"
# all → 200
```

In the HTML / UI:

| Signal | Expect |
|---|---|
| Header chip | **Arbitrum Sepolia** |
| Config banner | absent for live v3 env |
| `/demo` | judge kit, link to escrow on Arbiscan |
| `/campaign/0` | loads after client fetch (SSR may briefly show “Loading campaign 0”) |

### RPC proxy (same path the UI uses)

```bash
BASE=http://localhost:43147

# Chain id
curl -sS "$BASE/rpc" -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# → {"result":"0x66eee"}   (= 421614)

# campaignCount()
curl -sS "$BASE/rpc" -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"eth_call","params":[{"to":"0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC","data":"'"$(cast sig 'campaignCount()')"'"},"latest"]}'
# → result ends in ...0002 (or current count)

# getCampaign(0) — title appears as ASCII in the hex
curl -sS "$BASE/rpc" -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"eth_call","params":[{"to":"0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC","data":"'"$(cast calldata 'getCampaign(uint256)' 0)"'"},"latest"]}'
# hex contains "MM v3 Demo Quorum"
```

`GET /rpc` is **405** — only `POST` with a JSON-RPC body.

### Timeline / fromBlock

With `NEXT_PUBLIC_ESCROW_FROM_BLOCK=309949200`, `eth_getLogs` for `CampaignCreated` on the escrow should include at least campaign 0’s create block `309949346` (tx `0x9eb5776f…`). If the activity panel says “No events indexed…”, `fromBlock` is too high (classic footgun: `309949351`).

---

## Using the app with a wallet

1. Open `http://localhost:43147`.
2. Connect wallet → if the header says **Switch to Arbitrum Sepolia**, click it.
3. **Reads** still use `milemarkChain` / `/rpc` even before connect.
4. **Writes** follow the wallet chain — wrong network fails or lands elsewhere.
5. For create/attest/claim: fund the account with Sepolia ETH (gas) and Circle USDC as needed.
6. Judge walkthrough: [`DEMO.md`](./DEMO.md) or in-app `/demo`.

---

## Quality gates (optional before you push)

```bash
make gates
# = forge test + web typecheck + web production build
```

Or piecewise: `make test`, `make web-typecheck`, `make web-build`.

---

## Anvil (fully local chain)

Only if you need a private chain (no Sepolia RPC, no faucet). Summary:

1. `make anvil` (terminal A).
2. `make deploy-local` (MockERC20 + escrow).
3. Mint Mock USDC; set `web/.env.local` to `CHAIN_ID=31337` and the printed addresses (`fromBlock=0`).
4. Restart `make web-dev` — header chip **Anvil**.

Full commands: [`DEPLOY.md` §1a / §4](./DEPLOY.md).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Port free but nothing loads | `next dev` not running / aborted | `cd web && npm run dev` (or `make web-dev`) in a lasting terminal |
| Amber config banner | Escrow unset / v1 / v2 | Set `NEXT_PUBLIC_ESCROW_ADDRESS` to live v3 |
| Header says Anvil but you wanted Sepolia | `CHAIN_ID=31337` in `.env.local` | Use `421614` and restart |
| `/campaign/0` “Could not load” | Wrong escrow / id missing | Confirm `campaignCount` and id on **this** escrow |
| Activity empty | `fromBlock` after `CampaignCreated` | Use `309949200` for live v3 |
| `POST /rpc` → `429 Too Many Requests` | Public RPC rate limit | Retry; or set `NEXT_PUBLIC_RPC` to another Sepolia endpoint |
| Writes fail / switch network | Wallet not on `421614` | Use header switch |
| Approve then create reverts | UI USDC ≠ `escrow.usdc()` | Align `NEXT_PUBLIC_USDC_ADDRESS` |
| `/demo` 404 in **production** only | Vercel Root Directory ≠ `web/` | See [`DEPLOY.md` §5](./DEPLOY.md) — not a local-dev issue |

---

## Verified snapshot (2026-09-20)

| Check | Result |
|---|---|
| `cast chain-id` | `421614` |
| `escrow.usdc()` | Circle `0x75faf114…AA4d` |
| `campaignCount` | `2` |
| `getCampaign(0)` via local `/rpc` | title `MM v3 Demo Quorum` |
| `CampaignCreated` logs from `309949200` | ≥ 2 (incl. block `309949346`) |
| `GET /`, `/demo`, `/create`, `/campaign/0` | HTTP 200 |
| `POST /rpc` `eth_chainId` | `0x66eee` |
| `web/.env.local` | Sepolia v3 defaults from `.env.example` |

Production UI remains https://milemark-pearl.vercel.app — local env mirrors the same onchain pointer.
