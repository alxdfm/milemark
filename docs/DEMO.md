# Demo

Walkthrough for the live **v2** escrow on Arbitrum Sepolia. Featured UI demo: [`/campaign/2`](https://sepolia.arbiscan.io/address/0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207).

Contract: [`0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207`](https://sepolia.arbiscan.io/address/0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207)  
USDC: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`  
Do not use obsolete v1 `0x72b474DB34268281CD10db655cc1517C33973049`.

## UI (Sepolia)

1. Open the app. Confirm the header shows **Arbitrum Sepolia**. Connect the **sponsor** wallet.
2. **Create** — pick a template (Hackathon / Retainer / Grant). Set beneficiary, one or two attestors, a short deadline if you will demo reclaim. If wallet USDC is below the total, **Approve is disabled**.
3. Approve, then create. Each tx shows an Arbiscan link. Note the campaign id and share `/campaign/{id}`.
4. Switch to an **attestor**. Mark milestone 2 complete first (any-order) with an evidence URI (`ipfs://` or `https://`). Mark milestone 1 with empty evidence.
5. Switch to the **beneficiary**. **Claim**. Wallet USDC increases. Claim again — it reverts (`NothingToClaim`).
6. After the deadline: connect the **sponsor** and **Reclaim** remaining incomplete miles. Completing a reclaimed mile reverts.

## Cast-only

Replace addresses; `DEADLINE` is unix seconds in the future.

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

## Local Anvil

See the README “Full local demo” section. Override `NEXT_PUBLIC_ESCROW_ADDRESS` and `NEXT_PUBLIC_USDC_ADDRESS` after `forge script`.
