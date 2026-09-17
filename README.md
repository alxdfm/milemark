# MileMark

Onchain milestone escrow for the **Arbitrum Open House Singapore Online Buildathon**. **v3** ABI.

Sponsors lock USDC into a titled campaign with ordered milestones, an **N-of-M attestor quorum**, a per-campaign **challenge window**, and a deadline. Listed attestors vote; the mile completes at quorum. After the window (or immediately if it is 0) the beneficiary claims released USDC. The sponsor or any attestor may dispute during the window. After the deadline the sponsor reclaims incomplete or disputed miles.

## Problem

Builder grants, hackathon prizes, and small retainers still settle on trust or a human escrow agent. Invoices lag the work. A missed milestone either blocks the next payment or dumps the whole purse. MileMark makes the split explicit on Arbitrum: funds sit in the contract until a quorum of attestors says a mile is done — and unfinished or disputed miles can return to the sponsor when time is up.

## How it works

1. **Sponsor** approves USDC and calls `createCampaign(beneficiary, attestors, quorum, title, briefURI, deadline, challengeWindow, descriptions, amounts)`. The sum of `amounts` is pulled in that transaction. Require `1 <= quorum <= unique(attestors).length`.
2. **Attestor quorum (N-of-M)** — each address in `attestors` may call `attestMilestone(campaignId, index, evidenceURI)` **once** per mile. Completion is **any-order**. Empty evidence is allowed. **First non-empty evidence URI wins.** When `attestationCount >= quorum`, the contract emits `MilestoneCompleted` and starts the challenge window.
3. **Challenge window** — for `challengeWindow` seconds after completion, the sponsor or any listed attestor may `dispute(campaignId, index)`. Dispute is sticky (no onchain resolution) and blocks claim for that mile. `challengeWindow == 0` makes the mile claimable in the same timestamp (tests / lightning demos).
4. **Beneficiary** calls `claim(campaignId)` and receives the sum of completed, undisputed, unclaimed milestones whose window has elapsed. A second claim with nothing new reverts (`NothingToClaim`).
5. **After `block.timestamp > deadline`**, the sponsor calls `reclaim(campaignId)` and receives USDC still sitting on **incomplete or disputed** miles. Completed, undisputed, unclaimed amounts stay claimable by the beneficiary. Emit `Reclaimed`.

Events: `CampaignCreated`, `MilestoneAttested`, `MilestoneCompleted`, `MilestoneDisputed`, `Claimed`, `Reclaimed`.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for layers and invariants. Judge walkthrough: [`docs/DEMO.md`](docs/DEMO.md) and the in-app kit at `/demo`.

```
milemark/
├── contracts/                 Foundry (Solidity ^0.8.24)
│   ├── src/MilestoneEscrow.sol
│   ├── src/mocks/MockERC20.sol
│   ├── test/MilestoneEscrow.t.sol
│   ├── script/Deploy.s.sol
│   └── script/CreateDemo.s.sol
├── web/                       Next.js App Router + wagmi/viem
│   ├── app/                   home, /create, /campaign/[id], /demo
│   ├── lib/milemark/          pure domain (parse, roles, lifecycle, USDC, validation)
│   ├── lib/contracts/         barrel ABI + live v3 addresses
│   ├── hooks/use-campaign.ts
│   └── components/{campaign,create,demo}/
├── docs/ARCHITECTURE.md
├── docs/DEMO.md
├── README.md
└── SUBMISSION.md
```

No indexer. The UI reads `getCampaign` / `getMilestones` / `getAttestors` / `hasAttestedAll` and renders a timeline from `getContractEvents` on the escrow.

**USDC**

| Network | Token |
|---|---|
| Arbitrum Sepolia | Circle testnet USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` ([Circle docs](https://developers.circle.com/stablecoins/usdc-on-test-networks)) |
| Anvil / unit tests | `MockERC20` (6 decimals, public `mint`) |

## Deployed address

v3 **breaks the v2 ABI**. Do not point this frontend at v2 or v1.

| Item | Value |
|---|---|
| Network | Arbitrum Sepolia (421614) |
| MilestoneEscrow v3 | [`0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC`](https://sepolia.arbiscan.io/address/0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC) |
| Deploy tx | [`0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464`](https://sepolia.arbiscan.io/tx/0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464) |
| Deployer | `0x3A17eD984f20C50C6927addDAEf633fff40f84D4` |
| Frozen v2 (do not wire) | [`0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207`](https://sepolia.arbiscan.io/address/0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207) |
| Obsolete v1 (do not use) | `0x72b474DB34268281CD10db655cc1517C33973049` |
| USDC (Circle testnet) | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Demo kit | `/demo` |
| Demo campaign | id `0` · create tx [`0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4`](https://sepolia.arbiscan.io/tx/0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4) |
| Event fromBlock | `309949200` (exact deploy block `309949272`) |
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

`web/.env.example` points at the live v3 Sepolia escrow `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC`. Copy it to `.env.local`, then override RPC / chain / addresses for Anvil.

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

Copy the printed `MockERC20` and `MilestoneEscrow v3` addresses into `web/.env.local`:

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

Optional local demo campaign (1-of-1, 60s window by default):

```bash
ESCROW_ADDRESS=0x... \
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
CHALLENGE_WINDOW=60 \
forge script script/CreateDemo.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

## Deploy to Arbitrum Sepolia

v3 is **already live** at `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC`. Do not point the UI at the frozen v2 address. Only rebroadcast if you intend a new contract.

1. Get Sepolia ETH on Arbitrum ([bridge](https://bridge.arbitrum.io/) or a faucet) and Circle testnet USDC ([Circle faucet](https://faucet.circle.com/)).
2. Copy `contracts/.env.example` → `contracts/.env` and set `PRIVATE_KEY` (do not commit it) and `USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`.
3. Broadcast a **new** address only if you mean to replace v3:

```bash
cd contracts
source .env
forge script script/Deploy.s.sol \
  --rpc-url ${ARB_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc} \
  --broadcast --verify
```

4. The live Sepolia values in this README / `web/.env.example` / `LIVE_ESCROW_V3` are already wired (`NEXT_PUBLIC_CHAIN_ID=421614`, `NEXT_PUBLIC_ESCROW_FROM_BLOCK=309949200`). Update them only if you redeploy.
5. A demo campaign (id `0`) already exists on v3. To create another:

```bash
ESCROW_ADDRESS=0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC \
ATTESTOR_2=0x... \
QUORUM=2 \
CHALLENGE_WINDOW=60 \
forge script script/CreateDemo.s.sol \
  --rpc-url ${ARB_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc} \
  --broadcast
```

Regenerate the frontend ABI after any Solidity change (`web/lib/contracts/abi.ts`):

```bash
cd contracts && forge build
python3 ../scripts/export-abi.py
```

## Demo script for judges

See [`docs/DEMO.md`](docs/DEMO.md) and the in-app kit at **`/demo`** (QR + copyable URLs + role cheat-sheet).

1. Open `/demo`. Connect the **sponsor** wallet.
2. **Create** — template **Judge demo (2-of-3, 60s)**. Set beneficiary and attestors. Approve, then create. Share `/campaign/{id}`.
3. Two attestors attest the same mile (any-order). First non-empty evidence wins.
4. Wait out the 60s window **or** dispute.
5. **Beneficiary claims**. After the deadline, **sponsor reclaims** incomplete or disputed miles.

## Out of scope (intentionally)

Stylus, Permit2, onchain dispute resolution beyond the sticky flag, multi-token, subgraphs, mainnet as the primary chain, HackQuest submission. Robinhood / extra distribution surfaces are a future stretch only.

## License

MIT. OpenZeppelin Contracts and forge-std keep their upstream licenses under `contracts/lib/`.
