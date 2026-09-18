# MileMark v3 deploy (Arbitrum Sepolia)

**This snapshot is historical.** v3 is **already live** — do not treat the commands below as “the current address still needs creating” unless you intend a **new** contract.

Canonical newcomer guide (prerequisites, `cast` checks, fromBlock, Vercel, failure modes): [`docs/DEPLOY.md`](../../docs/DEPLOY.md).

| Item | Value |
|---|---|
| Live v3 | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` |
| Deploy tx | `0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464` |
| Deploy block | `309949272` |
| Deployer | `0x3A17eD984f20C50C6927addDAEf633fff40f84D4` |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| UI fromBlock | `309949200` |
| Demo campaign id `0` | create tx `0x9eb5776fabb0519e52df8171bf59077898db7124596032b797aced5fef62b4e4` (block `309949346`) |
| Production UI | https://milemark-pearl.vercel.app |
| Frozen v2 (do not reuse) | `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207` |
| Obsolete v1 | `0x72b474DB34268281CD10db655cc1517C33973049` |

Constructor ABI encoding (`cast abi-encode "constructor(address)" 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`):

```
0x00000000000000000000000075faf114eafb1bdbe2f0316df893fd58ce46aa4d
```

`--constructor-args` takes the **address**. Use the padded word only with `--encoded-constructor-args`.

## From this folder (cast / bytecode)

```bash
cast send --rpc-url ${ARB_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc} \
  --private-key $PRIVATE_KEY \
  --create "$(cat bytecode.txt)$(cast abi-encode "constructor(address)" 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d | sed 's/^0x//')"
```

## From `contracts/` (preferred)

```bash
USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d \
PRIVATE_KEY=$PRIVATE_KEY \
forge script script/Deploy.s.sol \
  --rpc-url ${ARB_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc} \
  --broadcast --chain 421614
```

```bash
forge create src/MilestoneEscrow.sol:MilestoneEscrow \
  --rpc-url ${ARB_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc} \
  --private-key $PRIVATE_KEY \
  --broadcast --chain 421614 \
  --constructor-args 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

After a **new** create, point the UI at the new address and set `NEXT_PUBLIC_ESCROW_FROM_BLOCK` to a block **≤** that create (a few hundred before the deploy block is enough). Do not use `309949351` as fromBlock for **this** v3 address — campaign 0 was created at `309949346`.
