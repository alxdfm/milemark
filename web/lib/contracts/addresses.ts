import {
  ZERO_ADDRESS,
  isHexAddress,
  sameAddress,
  type Address,
} from "@/lib/milemark";

/** Frozen v2 MilestoneEscrow on Arbitrum Sepolia. ABI-incompatible with v3 — do not wire. */
export const LIVE_ESCROW_V2 =
  "0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207" as const satisfies Address;

/** Live v3 MilestoneEscrow on Arbitrum Sepolia. ABI-incompatible with v2 — new address. */
export const LIVE_ESCROW_V3 =
  "0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC" as const satisfies Address;

/** v3 deploy tx on Arbitrum Sepolia. */
export const LIVE_ESCROW_V3_DEPLOY_TX =
  "0xf78262e4818c087d472c12ab7c9f3b02c316ef879bcb93ef8e9992692410e464" as const;

/** Obsolete v1 — ABI-incompatible. Never wire the UI here. */
export const OBSOLETE_ESCROW_V1 =
  "0x72b474DB34268281CD10db655cc1517C33973049" as const satisfies Address;

/** Circle testnet USDC on Arbitrum Sepolia. */
export const CIRCLE_USDC_ARB_SEPOLIA =
  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const satisfies Address;

/** Featured live demo campaign on the v3 escrow (set after CreateDemo). */
export const DEMO_CAMPAIGN_ID = (
  process.env.NEXT_PUBLIC_DEMO_CAMPAIGN_ID ?? "0"
).trim();

function readAddress(raw: string | undefined, fallback: Address): Address {
  const value = (raw ?? "").trim();
  return isHexAddress(value) ? value : fallback;
}

const defaultEscrow: Address =
  LIVE_ESCROW_V3 !== ZERO_ADDRESS ? LIVE_ESCROW_V3 : ZERO_ADDRESS;

export const ESCROW_ADDRESS = readAddress(
  process.env.NEXT_PUBLIC_ESCROW_ADDRESS,
  defaultEscrow,
);

export const USDC_ADDRESS = readAddress(
  process.env.NEXT_PUBLIC_USDC_ADDRESS,
  CIRCLE_USDC_ARB_SEPOLIA,
);

/** Start of getLogs range. Arb Sepolia RPCs reject fromBlock 0. */
export const ESCROW_FROM_BLOCK = BigInt(
  process.env.NEXT_PUBLIC_ESCROW_FROM_BLOCK ?? "309949200",
);

export const isEscrowConfigured =
  ESCROW_ADDRESS !== ZERO_ADDRESS &&
  !sameAddress(ESCROW_ADDRESS, OBSOLETE_ESCROW_V1) &&
  !sameAddress(ESCROW_ADDRESS, LIVE_ESCROW_V2);
