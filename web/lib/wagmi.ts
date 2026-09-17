import { createConfig, http, injected } from "wagmi";
import { anvil, arbitrumSepolia } from "./chains";

const upstreamSepolia =
  process.env.NEXT_PUBLIC_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";

const sepoliaRpc =
  process.env.NEXT_PUBLIC_CHAIN_ID === "31337"
    ? "https://sepolia-rollup.arbitrum.io/rpc"
    : typeof window === "undefined"
      ? upstreamSepolia
      : "/rpc";

const anvilRpc =
  process.env.NEXT_PUBLIC_CHAIN_ID === "31337"
    ? (process.env.NEXT_PUBLIC_RPC ?? "http://127.0.0.1:8545")
    : "http://127.0.0.1:8545";

export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia, anvil],
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: http(sepoliaRpc, { timeout: 20_000 }),
    [anvil.id]: http(anvilRpc, { timeout: 20_000 }),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
