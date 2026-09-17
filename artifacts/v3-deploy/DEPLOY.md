# MileMark v3 deploy (Arbitrum Sepolia)

USDC: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`  
Do not reuse v2 `0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207`.

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
