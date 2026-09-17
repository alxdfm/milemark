# Demo (judges)

Walkthrough for the live **v3** escrow on Arbitrum Sepolia.

| Item | Value |
|---|---|
| App | https://milemark-pearl.vercel.app |
| Demo kit | https://milemark-pearl.vercel.app/demo |
| Create | https://milemark-pearl.vercel.app/create |
| Featured campaign | https://milemark-pearl.vercel.app/campaign/0 |
| Escrow v3 | [`0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC`](https://sepolia.arbiscan.io/address/0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC) |
| Deploy tx | [`0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464`](https://sepolia.arbiscan.io/tx/0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464) |
| Campaign 0 create tx | [`0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4`](https://sepolia.arbiscan.io/tx/0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4) (block `309949346`) |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` ([Circle faucet](https://faucet.circle.com/)) |
| Frozen v2 (do not wire) | `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207` |
| Obsolete v1 | `0x72b474DB34268281CD10db655cc1517C33973049` |

No recorded demo video is in this repository. The in-app kit **is** the script.

## What is already onchain (campaign `0`)

Verified by `getCampaign(0)` / `getMilestones` / `getAttestors` (2026-09-17):

| Field | Live value |
|---|---|
| Title | `MM v3 Demo Quorum` |
| Brief | `https://example.com/v3-demo` |
| Sponsor, beneficiary, attestor | `0x3A17eD984f20C50C6927addDAEf633fff40f84D4` (same address, 1-of-1) |
| Quorum | 1 |
| Challenge window | 60 seconds |
| Miles | (0) `Attest mile` **1 USDC**; (1) `Claimable after window` **2 USDC** |
| Total locked | 3 USDC |
| Deadline | ~2026-10-01 20:07 UTC |

This is **not** the create-form “Judge demo (2-of-3, 60s)” template and **not** the default output of `script/CreateDemo.s.sol`.

At audit time neither mile was completed. State may change if someone attests/claims/reclaims — read the campaign page, not this table, for live flags.

## Wallet roles cheat-sheet

### Path A — use featured id `0` (fastest, one wallet)

If you control the deployer `0x3A17…84D4`:

| Seat | Who |
|---|---|
| Sponsor | that wallet (`reclaim` after deadline) |
| Attestor | same wallet (`attestMilestone` once per mile) |
| Beneficiary | same wallet (`claim` after the 60s window) |

Quorum 1 means the first attest completes the mile. Then wait 60s (or dispute yourself).

If you **do not** control that key, treat id `0` as a **read-only** exhibit (title, quorum, window, activity) and use Path B.

### Path B — create a new campaign (2-of-3)

Need four addresses you can switch in the wallet (they may repeat if you accept a weaker demo):

| Role | Writes |
|---|---|
| Sponsor | `approve` + `createCampaign`, optional `dispute`, `reclaim` after deadline |
| Attestor A / B (/ C) | `attestMilestone` once per mile; optional `dispute` |
| Beneficiary | `claim` |

`1 <= quorum <= unique attestors`. Sponsor may also be an attestor or the beneficiary; the contract allows overlap.

Need **Arbitrum Sepolia ETH** (gas) and **Circle testnet USDC**.

## 3-minute script

1. Open https://milemark-pearl.vercel.app/demo . Confirm the header chip says **Arbitrum Sepolia**. Connect the sponsor.
2. **Either** open https://milemark-pearl.vercel.app/campaign/0 (Path A) **or** https://milemark-pearl.vercel.app/create and pick **Judge demo (2-of-3, 60s)**. Fill beneficiary + attestors. Quorum 2, window 60s. **Approve**, then **Create**. Copy `/campaign/{id}`.
3. **Attest.** Switch to attestor A. Attest milestone **2** first (any-order) with `ipfs://…` or `https://…`. Switch to attestor B (Path B) and attest the same mile (empty evidence is fine). First non-empty URI sticks. Activity shows `MilestoneAttested` then `MilestoneCompleted`. On Path A a single attest hits quorum.
4. **Window.** Claim stays blocked for 60s. Wait until the mile is claimable, **or** connect sponsor / an attestor and **Dispute** (blocks claim; sponsor reclaims after the deadline).
5. Switch to the **beneficiary**. **Claim**. A second claim reverts (`NothingToClaim`). Leave a mile incomplete if you want to show **Reclaim** after the deadline.

`challengeWindow = 0` skips step 4 (claimable in the same timestamp as quorum). Use that for lightning tests.

What to click (campaign page): evidence field → **Attest / Mark complete** → optional **Dispute** → **Claim N USDC** → later **Reclaim N USDC**. Role chips show **you** on the seats the connected wallet holds.

## Cast-only (new campaign)

Replace addresses. `DEADLINE` is unix seconds **strictly in the future**. Example: quorum `2`, window `60`. This does **not** modify id `0`.

```bash
cast send $USDC "approve(address,uint256)" $ESCROW 10000000 --private-key $SPONSOR --rpc-url $RPC
cast send $ESCROW "createCampaign(address,address[],uint8,string,string,uint64,uint64,string[],uint256[])" \
  $BENEFICIARY "[$ATTESTOR,$ATTESTOR2]" 2 "Demo" "ipfs://brief" $DEADLINE 60 \
  '["Ship demo","Write docs"]' '[4000000,6000000]' \
  --private-key $SPONSOR --rpc-url $RPC

# attest mile index 1 (second mile) — any-order
cast send $ESCROW "attestMilestone(uint256,uint256,string)" $ID 1 "ipfs://evidence" \
  --private-key $ATTESTOR --rpc-url $RPC
cast send $ESCROW "attestMilestone(uint256,uint256,string)" $ID 1 "" \
  --private-key $ATTESTOR2 --rpc-url $RPC

# optional, during the 60s window
cast send $ESCROW "dispute(uint256,uint256)" $ID 1 --private-key $SPONSOR --rpc-url $RPC

# after window, if not disputed
cast send $ESCROW "claim(uint256)" $ID --private-key $BENEFICIARY --rpc-url $RPC

# after deadline
cast send $ESCROW "reclaim(uint256)" $ID --private-key $SPONSOR --rpc-url $RPC
```

v3 has **no** `completeMilestone`. Always `attestMilestone`.

## Local Anvil

See [`DEPLOY.md`](./DEPLOY.md) “Full local demo”. Override `NEXT_PUBLIC_ESCROW_ADDRESS` and `NEXT_PUBLIC_USDC_ADDRESS` after `forge script`. Optional `script/CreateDemo.s.sol` for a local id `0`.
