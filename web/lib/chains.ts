import { defineChain } from "viem";
import { USDC_DECIMALS as DOMAIN_USDC_DECIMALS } from "@/lib/milemark";

export {
  CIRCLE_USDC_ARB_SEPOLIA,
  DEMO_CAMPAIGN_ID,
  ESCROW_ADDRESS,
  ESCROW_FROM_BLOCK,
  LIVE_ESCROW_V2,
  OBSOLETE_ESCROW_V1,
  USDC_ADDRESS,
  isEscrowConfigured,
} from "@/lib/contracts";
export { ZERO_ADDRESS } from "@/lib/milemark";

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

export const USDC_DECIMALS = DOMAIN_USDC_DECIMALS;

export function explorerTx(hash: `0x${string}`) {
  const base = milemarkChain.blockExplorers?.default?.url;
  return base ? `${base}/tx/${hash}` : undefined;
}

export function explorerAddress(address: `0x${string}`) {
  const base = milemarkChain.blockExplorers?.default?.url;
  return base ? `${base}/address/${address}` : undefined;
}
