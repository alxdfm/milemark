# MileMark

Onchain milestone escrow for the **Arbitrum Open House Singapore Online Buildathon**.

Sponsors lock USDC into a campaign with ordered milestones. An attestor marks work complete. The beneficiary claims released USDC. One contract, three roles, no oracle, no DAO, no Stylus.

## Problem

Builder grants, hackathon prizes, and small retainers still settle on trust or a human escrow agent. Invoices lag the work. A missed milestone either blocks the next payment or dumps the whole purse. MileMark makes the split explicit on Arbitrum: funds sit in the contract until an attestor says a mile is done.

## How it works

1. **Sponsor** approves USDC and calls `createCampaign(beneficiary, attestor, descriptions, amounts)`. The sum of `amounts` is pulled in that transaction.
2. **Attestor** calls `completeMilestone(campaignId, index)`. Completion is **any-order** — index `2` may complete before index `0`. Descriptions stay ordered for humans; the contract does not force sequence so an independent workstream is not blocked.
3. **Beneficiary** calls `claim(campaignId)` and receives the sum of completed, unclaimed milestones. A second claim with nothing new reverts (`NothingToClaim`).

Events: `CampaignCreated`, `MilestoneCompleted`, `Claimed`.

## Architecture

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
│   ├── lib/abi.ts             committed ABI from `forge build`
│   └── lib/chains.ts          Arbitrum Sepolia (421614)
├── README.md
└── SUBMISSION.md
```

No indexer. The UI reads `getCampaign` / `getMilestones` directly.

**USDC**

| Network | Token |
|---|---|
| Arbitrum Sepolia | Circle testnet USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` ([Circle docs](https://developers.circle.com/stablecoins/usdc-on-test-networks)) |
| Anvil / unit tests | `MockERC20` (6 decimals, public `mint`) |

## Deployed address (TODO)

| Item | Value |
|---|---|
| Network | Arbitrum Sepolia (421614) |
| MilestoneEscrow | **TODO — not deployed yet** |
| Demo video | **TODO** |
| Explorer | https://sepolia.arbiscan.io |

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

Until `NEXT_PUBLIC_ESCROW_ADDRESS` is set, the app is browsable and writes stay disabled.

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
5. Paste the address into this README’s TODO table before submission.

Regenerate the frontend ABI after any Solidity change:

```bash
cd contracts && forge build
python3 ../scripts/export-abi.py
```

## Demo script for judges (5 minutes)

1. Open the app (Sepolia deploy or the Anvil flow above). Connect the **sponsor** wallet.
2. **Create** — beneficiary = wallet B, attestor = wallet C (or the same wallet if you are walking through alone). Two milestones, e.g. `50` + `50` USDC. Approve, then create. Note the campaign id.
3. Switch to the **attestor**. Open `/campaign/{id}`. Mark milestone 2 complete first (any-order). Mark milestone 1.
4. Switch to the **beneficiary**. **Claim**. Wallet USDC increases by the released total. Claim again — it reverts.
5. Optional: from a fourth wallet, try **Mark complete** — `NotAttestor`.

Cast-only version of the same flow (replace addresses):

```bash
# approve + create (sponsor)
cast send $USDC "approve(address,uint256)" $ESCROW 100000000 --private-key $SPONSOR --rpc-url $RPC
cast send $ESCROW "createCampaign(address,address,string[],uint256[])" \
  $BENEFICIARY $ATTESTOR '["Ship demo","Write docs"]' '[40000000,60000000]' \
  --private-key $SPONSOR --rpc-url $RPC

# attest (any order) + claim
cast send $ESCROW "completeMilestone(uint256,uint256)" 0 1 --private-key $ATTESTOR --rpc-url $RPC
cast send $ESCROW "claim(uint256)" 0 --private-key $BENEFICIARY --rpc-url $RPC
```

## Out of scope (intentionally)

Stylus, mainnet as the primary chain, oracles, governance, Merkle distributions, subgraphs.

## License

MIT. OpenZeppelin Contracts and forge-std keep their upstream licenses under `contracts/lib/`.
