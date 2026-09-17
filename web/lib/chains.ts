import { defineChain } from "viem";

const rpc =
  process.env.NEXT_PUBLIC_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 421614);

/** Arbitrum Sepolia — primary target for the buildathon. */
export const arbitrumSepolia = defineChain({
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [rpc] },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://sepolia.arbiscan.io",
    },
  },
  testnet: true,
});

/** Local Anvil — set NEXT_PUBLIC_CHAIN_ID=31337 for the local demo. */
export const anvil = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC ?? "http://127.0.0.1:8545"] },
  },
  testnet: true,
});

export const milemarkChain = chainId === 31337 ? anvil : arbitrumSepolia;

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  ZERO_ADDRESS) as `0x${string}`;

/** Circle testnet USDC on Arbitrum Sepolia. Override for MockERC20 on Anvil. */
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d") as `0x${string}`;

export const USDC_DECIMALS = 6;

export const isEscrowConfigured = ESCROW_ADDRESS !== ZERO_ADDRESS;

export function explorerTx(hash: `0x${string}`) {
  const base = milemarkChain.blockExplorers?.default?.url;
  return base ? `${base}/tx/${hash}` : undefined;
}

export function explorerAddress(address: `0x${string}`) {
  const base = milemarkChain.blockExplorers?.default?.url;
  return base ? `${base}/address/${address}` : undefined;
}
