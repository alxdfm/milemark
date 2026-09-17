# Demo

Walkthrough for the live **v3** escrow on Arbitrum Sepolia. Shareable UI kit: [`/demo`](/demo). Featured campaign: **id `0`**.

| Item | Value |
|---|---|
| Escrow v3 | [`0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC`](https://sepolia.arbiscan.io/address/0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC) |
| Deploy tx | [`0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464`](https://sepolia.arbiscan.io/tx/0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464) |
| Demo campaign | [`/campaign/0`](/campaign/0) · create tx [`0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4`](https://sepolia.arbiscan.io/tx/0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4) |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Frozen v2 (do not wire) | `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207` |
| Obsolete v1 | `0x72b474DB34268281CD10db655cc1517C33973049` |

## 3-minute judge script

1. Open `/demo`. Confirm Arbitrum Sepolia. Connect the **sponsor**.
2. **Create** — template **Judge demo (2-of-3, 60s)**. Set beneficiary + two or three attestors. Quorum 2, challenge window 60 seconds. Approve, then create. Copy `/campaign/{id}`.
3. Switch to **attestor A**. Attest milestone 2 first (any-order) with evidence (`ipfs://` or `https://`). Switch to **attestor B** and attest the same mile (empty evidence is fine). First non-empty URI sticks. Activity shows `MilestoneAttested` then `MilestoneCompleted`.
4. **Window** — either wait 60s until claimable, or connect sponsor / an attestor and **Dispute** (blocks claim; reclaim after deadline).
5. Switch to the **beneficiary**. **Claim**. A second claim reverts (`NothingToClaim`).
6. Leave a mile incomplete. After the deadline, sponsor **Reclaim**. Attesting a reclaimed mile reverts.

`challengeWindow = 0` skips step 4 (claimable in the same timestamp as quorum). Use that for lightning tests.

## Role cheat-sheet

| Role | Writes |
|---|---|
| Sponsor | `createCampaign`, `dispute`, `reclaim` |
| Attestor | `attestMilestone` (once per mile), `dispute` |
| Beneficiary | `claim` |

## Cast-only

Replace addresses. `DEADLINE` is unix seconds in the future. Quorum `2`, window `60`.

```bash
cast send $USDC "approve(address,uint256)" $ESCROW 10000000 --private-key $SPONSOR --rpc-url $RPC
cast send $ESCROW "createCampaign(address,address[],uint8,string,string,uint64,uint64,string[],uint256[])" \
  $BENEFICIARY "[$ATTESTOR,$ATTESTOR2]" 2 "Demo" "ipfs://brief" $DEADLINE 60 \
  '["Ship demo","Write docs"]' '[4000000,6000000]' \
  --private-key $SPONSOR --rpc-url $RPC

cast send $ESCROW "attestMilestone(uint256,uint256,string)" 0 1 "ipfs://evidence" \
  --private-key $ATTESTOR --rpc-url $RPC
cast send $ESCROW "attestMilestone(uint256,uint256,string)" 0 1 "" \
  --private-key $ATTESTOR2 --rpc-url $RPC

# optional, during the 60s window
cast send $ESCROW "dispute(uint256,uint256)" 0 1 --private-key $SPONSOR --rpc-url $RPC

# after window, if not disputed
cast send $ESCROW "claim(uint256)" 0 --private-key $BENEFICIARY --rpc-url $RPC

# after deadline
cast send $ESCROW "reclaim(uint256)" 0 --private-key $SPONSOR --rpc-url $RPC
```

## Local Anvil

See the README “Full local demo” section. Override `NEXT_PUBLIC_ESCROW_ADDRESS` and `NEXT_PUBLIC_USDC_ADDRESS` after `forge script`. Optionally `CREATE_DEMO` via `script/CreateDemo.s.sol`.
