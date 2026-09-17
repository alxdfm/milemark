"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { milemarkChain } from "@/lib/chains";
import { shortAddress } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function ConnectWallet() {
  const { address, isConnected, chainId, status } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
  const wrongChain = isConnected && chainId !== milemarkChain.id;

  if (!isConnected) {
    return (
      <Button
        onClick={() => injected && connect({ connector: injected })}
        disabled={!injected || isPending || status === "connecting"}
        size="sm"
      >
        {isPending || status === "connecting" ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  if (wrongChain) {
    return (
      <Button
        variant="danger"
        size="sm"
        onClick={() => switchChain({ chainId: milemarkChain.id })}
        disabled={isSwitching}
      >
        {isSwitching ? "Switching…" : `Switch to ${milemarkChain.name}`}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden font-mono text-xs text-muted sm:inline">
        {shortAddress(address!)}
      </span>
      <Button variant="secondary" size="sm" onClick={() => disconnect()}>
        Disconnect
      </Button>
    </div>
  );
}
