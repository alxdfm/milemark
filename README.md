# MileMark

Onchain milestone escrow for the **Arbitrum Open House Singapore Online Buildathon**. **v2** ABI.

Sponsors lock USDC into a titled campaign with ordered milestones, a 1-of-n attestor set, and a deadline. Any listed attestor marks work complete (optional evidence URI). The beneficiary claims released USDC. After the deadline the sponsor reclaims amounts still locked on incomplete miles.

## Problem

Builder grants, hackathon prizes, and small retainers still settle on trust or a human escrow agent. Invoices lag the work. A missed milestone either blocks the next payment or dumps the whole purse. MileMark makes the split explicit on Arbitrum: funds sit in the contract until an attestor says a mile is done — and unfinished miles can return to the sponsor when time is up.

## How it works

1. **Sponsor** approves USDC and calls `createCampaign(beneficiary, attestors, title, briefURI, deadline, descriptions, amounts)`. The sum of `amounts` is pulled in that transaction.
2. **Attestor set (1-of-n)** — any address in `attestors` may call `completeMilestone(campaignId, index, evidenceURI)`. Completion is **any-order**. Empty evidence is allowed.
3. **Beneficiary** calls `claim(campaignId)` and receives the sum of completed, unclaimed milestones. A second claim with nothing new reverts (`NothingToClaim`).
4. **After `block.timestamp > deadline`**, the sponsor calls `reclaim(campaignId)` and receives USDC still sitting on **incomplete** miles. Completed-but-unclaimed amounts stay claimable by the beneficiary. Emit `Reclaimed`.

Events: `CampaignCreated`, `MilestoneCompleted`, `Claimed`, `Reclaimed`.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for layers and ABI freeze notes. Judge walkthrough: [`docs/DEMO.md`](docs/DEMO.md).

```
milemark/
├── contracts/                 Foundry (Solidity ^0.8.24)
│   ├── src/MilestoneEscrow.sol
│   ├── src/mocks/MockERC20.sol
│   ├── test/MilestoneEscrow.t.sol
│   ├── script/Deploy.s.sol
│   └── foundry.toml
├── web/                       Next.js App Router + wagmi/viem
│   ├── app/                   home, /create, /campaign/[id]
│   ├── lib/milemark/          pure domain (parse, roles, USDC, validation)
│   ├── lib/contracts/         barrel ABI + live v2 addresses
│   ├── hooks/use-campaign.ts
│   └── components/{campaign,create}/
├── docs/ARCHITECTURE.md
├── docs/DEMO.md
├── README.md
└── SUBMISSION.md
```

No indexer. The UI reads `getCampaign` / `getMilestones` / `getAttestors` and renders a timeline from `getContractEvents` on the escrow.

**USDC**

| Network | Token |
|---|---|
| Arbitrum Sepolia | Circle testnet USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` ([Circle docs](https://developers.circle.com/stablecoins/usdc-on-test-networks)) |
| Anvil / unit tests | `MockERC20` (6 decimals, public `mint`) |

## Deployed address

v2 **breaks the v1 ABI**. Do not point this frontend at the v1 address.

| Item | Value |
|---|---|
| Network | Arbitrum Sepolia (421614) |
| MilestoneEscrow v2 | [`0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207`](https://sepolia.arbiscan.io/address/0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207) |
| Deploy tx | [`0x38bf2071c5cb577c75f86a559b1461a812f103a814113121e7b9360eb4e9965a`](https://sepolia.arbiscan.io/tx/0x38bf2071c5cb577c75f86a559b1461a812f103a814113121e7b9360eb4e9965a) |
| Demo campaign | featured id `2` · original v2 demo id `0` · title `MileMark v2 demo` · create tx [`0x90e97513c290a5d94e11c9355e0c7264954e682c46b6fd014b5972f2b1d57b4a`](https://sepolia.arbiscan.io/tx/0x90e97513c290a5d94e11c9355e0c7264954e682c46b6fd014b5972f2b1d57b4a) |
| USDC (Circle testnet) | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Explorer | https://sepolia.arbiscan.io/address/0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207 |
| Obsolete v1 (do not use) | `0x72b474DB34268281CD10db655cc1517C33973049` |
| Demo video | **TODO** |

## Local setup

Needs [Foundry](https://book.getfoundry.sh/getting-started/installation) and Node 20+.

### Contracts

```bash
cd contracts
forge test
```

### Frontend (UI only)

```bash
cd web
cp .env.example .env.local
npm install
npm run dev          # http://localhost:43147
npm run typecheck
```

`web/.env.example` points at the live v2 Sepolia escrow. Copy it to `.env.local`, then override RPC / chain / addresses for Anvil.

### Full local demo (Anvil)

Terminal A:

```bash
anvil
```

Terminal B — deploy mock USDC + escrow with Anvil account 0:

```bash
cd contracts
export PATH="$PATH:$HOME/.foundry/bin"
DEPLOY_MOCK_USDC=true \
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Copy the printed `MockERC20` and `MilestoneEscrow` addresses into `web/.env.local`:

```
NEXT_PUBLIC_RPC=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
```

Mint demo USDC to the sponsor (Anvil account 0), then run the web app:

```bash
cast send $USDC "mint(address,uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 10000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

cd web && npm run dev
```

Import Anvil account 0 into MetaMask (or use Rabby), add network **Anvil** (chain id 31337, RPC `http://127.0.0.1:8545`). Those keys are public test keys — never use them on a real network.

## Deploy to Arbitrum Sepolia

v2 needs a **new** broadcast. Do not point the UI at the v1 address.

1. Get Sepolia ETH on Arbitrum ([bridge](https://bridge.arbitrum.io/) or a faucet) and Circle testnet USDC ([Circle faucet](https://faucet.circle.com/)).
2. Copy `contracts/.env.example` → `contracts/.env` and set `PRIVATE_KEY` (do not commit it) and `USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`.
3. Broadcast:

```bash
cd contracts
source .env
forge script script/Deploy.s.sol \
  --rpc-url ${ARB_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc} \
  --broadcast --verify
```

4. Put the printed escrow address in `web/.env.local` as `NEXT_PUBLIC_ESCROW_ADDRESS`, keep `NEXT_PUBLIC_CHAIN_ID=421614`, restart `npm run dev`.
5. The v2 Sepolia address in this README is already live; only update the table if you redeploy.

Regenerate the frontend ABI after any Solidity change (`web/lib/contracts/abi.ts`):

```bash
cd contracts && forge build
python3 ../scripts/export-abi.py
```

## Demo script for judges

See [`docs/DEMO.md`](docs/DEMO.md). Featured UI path: `/campaign/2`.

1. Open the app (live v2 Sepolia or the Anvil flow). Connect the **sponsor** wallet.
2. **Create** — use a template (Hackathon / Retainer / Grant). Set beneficiary, one or two attestors, a short deadline if you will demo reclaim. Approve is disabled when wallet USDC is below the total. Approve, then create. Note the campaign id and share the `/campaign/{id}` link. Each tx links out to Arbiscan.
3. Switch to an **attestor**. Mark milestone 2 complete first (any-order) with an evidence URI (ipfs or https). Mark milestone 1 with empty evidence.
4. Switch to the **beneficiary**. **Claim**. Wallet USDC increases. Claim again — it reverts.
5. After the deadline (Anvil: `cast rpc evm_increaseTime 2592000 && cast rpc evm_mine`, or wait): connect the **sponsor** and **Reclaim** remaining incomplete miles. Completing a reclaimed mile reverts.

Cast-only version (replace addresses; `DEADLINE` is unix seconds in the future):

```bash
cast send $USDC "approve(address,uint256)" $ESCROW 100000000 --private-key $SPONSOR --rpc-url $RPC
cast send $ESCROW "createCampaign(address,address[],string,string,uint64,string[],uint256[])" \
  $BENEFICIARY "[$ATTESTOR]" "Demo" "ipfs://brief" $DEADLINE \
  '["Ship demo","Write docs"]' '[40000000,60000000]' \
  --private-key $SPONSOR --rpc-url $RPC

cast send $ESCROW "completeMilestone(uint256,uint256,string)" 0 1 "ipfs://evidence" \
  --private-key $ATTESTOR --rpc-url $RPC
cast send $ESCROW "claim(uint256)" 0 --private-key $BENEFICIARY --rpc-url $RPC

# after deadline
cast send $ESCROW "reclaim(uint256)" 0 --private-key $SPONSOR --rpc-url $RPC
```

## Out of scope (intentionally)

Stylus, Permit2, dispute windows, multi-token, subgraphs, mainnet as the primary chain. Robinhood / extra distribution surfaces are a future stretch only.

## License

MIT. OpenZeppelin Contracts and forge-std keep their upstream licenses under `contracts/lib/`.
