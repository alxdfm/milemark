"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/contracts";
import {
  ESCROW_ADDRESS,
  ESCROW_FROM_BLOCK,
  isEscrowConfigured,
  milemarkChain,
  USDC_ADDRESS,
} from "@/lib/chains";
import {
  fromBlockWarning,
  usdcMismatchWarning,
  walletChainWarning,
  type ConfigWarning,
} from "@/lib/config-guardrails";
import { isHexAddress, type Address } from "@/lib/milemark";

export function useConfigWarnings(): ConfigWarning[] {
  const { isConnected, chainId } = useAccount();
  const usdcQuery = useReadContract({
    address: ESCROW_ADDRESS,
    abi: milestoneEscrowAbi,
    functionName: "usdc",
    chainId: milemarkChain.id,
    query: { enabled: isEscrowConfigured },
  });

  return useMemo(() => {
    const warnings: ConfigWarning[] = [];
    const chain = walletChainWarning({
      connected: isConnected,
      walletChainId: chainId,
      expectedChainId: milemarkChain.id,
      expectedName: milemarkChain.name,
    });
    if (chain) warnings.push(chain);

    const onchain =
      typeof usdcQuery.data === "string" && isHexAddress(usdcQuery.data)
        ? (usdcQuery.data as Address)
        : undefined;
    const usdc = usdcMismatchWarning(onchain, USDC_ADDRESS);
    if (usdc) warnings.push(usdc);

    const fromBlock = fromBlockWarning({
      chainId: milemarkChain.id,
      escrow: ESCROW_ADDRESS,
      fromBlock: ESCROW_FROM_BLOCK,
    });
    if (fromBlock) warnings.push(fromBlock);

    return warnings;
  }, [isConnected, chainId, usdcQuery.data]);
}
