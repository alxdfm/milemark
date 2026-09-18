import {
  CIRCLE_USDC_ARB_SEPOLIA,
  LIVE_ESCROW_V3,
  USDC_ADDRESS,
} from "@/lib/contracts";
import { sameAddress, type Address } from "@/lib/milemark";

/** Campaign 0 on live v3 was created at this block. fromBlock after it empties the timeline. */
export const LIVE_V3_CAMPAIGN_0_CREATE_BLOCK = 309949346n;

const CANONICAL_FROM_BLOCK = 309949200n;

export type ConfigWarning = {
  id: string;
  title: string;
  body: string;
};

/** Soft, non-blocking copy when the configured getLogs start looks wrong for Sepolia v3. */
export function fromBlockWarning(input: {
  chainId: number;
  escrow: Address;
  fromBlock: bigint;
}): ConfigWarning | null {
  if (input.chainId !== 421614) return null;
  if (input.fromBlock === 0n) {
    return {
      id: "fromblock-zero",
      title: "fromBlock is 0",
      body: `Some Arbitrum Sepolia RPCs reject fromBlock 0 or huge log ranges. Canonical start for this v3 escrow is ${CANONICAL_FROM_BLOCK.toString()} (deploy 309949272). Set NEXT_PUBLIC_ESCROW_FROM_BLOCK and rebuild.`,
    };
  }
  if (
    sameAddress(input.escrow, LIVE_ESCROW_V3) &&
    input.fromBlock > LIVE_V3_CAMPAIGN_0_CREATE_BLOCK
  ) {
    return {
      id: "fromblock-late",
      title: "fromBlock is after CampaignCreated",
      body: `NEXT_PUBLIC_ESCROW_FROM_BLOCK=${input.fromBlock.toString()} is after live campaign 0 (block ${LIVE_V3_CAMPAIGN_0_CREATE_BLOCK.toString()}). Activity will look empty. Use ${CANONICAL_FROM_BLOCK.toString()}.`,
    };
  }
  return null;
}

export function usdcMismatchWarning(
  onchainUsdc: Address | undefined,
  configured: Address = USDC_ADDRESS,
): ConfigWarning | null {
  if (!onchainUsdc) return null;
  if (sameAddress(onchainUsdc, configured)) return null;
  return {
    id: "usdc-mismatch",
    title: "USDC address mismatch",
    body: `escrow.usdc() is ${onchainUsdc} but NEXT_PUBLIC_USDC_ADDRESS is ${configured}. Approvals will hit the wrong token. Circle testnet USDC is ${CIRCLE_USDC_ARB_SEPOLIA}.`,
  };
}

export function walletChainWarning(input: {
  connected: boolean;
  walletChainId: number | undefined;
  expectedChainId: number;
  expectedName: string;
}): ConfigWarning | null {
  if (!input.connected || input.walletChainId === undefined) return null;
  if (input.walletChainId === input.expectedChainId) return null;
  return {
    id: "wrong-chain",
    title: `Wallet is not on ${input.expectedName}`,
    body: `Connected chain id ${input.walletChainId}. This app is wired to ${input.expectedName} (${input.expectedChainId}). Switch in the header to send writes to the live escrow.`,
  };
}
