import {
  reclaimReason,
  reclaimableMiles,
  type Milestone,
} from "@/lib/milemark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReclaimButton } from "./reclaim-button";

export function ReclaimCard({
  campaignId,
  reclaimable,
  deadline,
  connected,
  isSponsor,
  milestones,
  nowSec,
  onSettled,
}: {
  campaignId: bigint;
  reclaimable: bigint;
  deadline: bigint;
  connected: boolean;
  isSponsor: boolean;
  milestones: readonly Milestone[];
  nowSec: number;
  onSettled: () => void;
}) {
  // O contrato só libera reclaim em `block.timestamp > deadline`. O relógio
  // local cruza essa linha antes do próximo read voltar com o valor novo.
  const pending = reclaimableMiles(milestones);
  const syncing =
    BigInt(nowSec) > deadline && pending.length > 0 && reclaimable === 0n;
  const reason = reclaimReason({
    connected,
    isSponsor,
    reclaimable,
    deadline,
    syncing,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reclaim</CardTitle>
        <CardDescription>
          After the deadline, the sponsor reclaims USDC still locked in incomplete
          or disputed milestones. Completed, undisputed, unclaimed amounts stay
          for the beneficiary (after the challenge window).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {reason && <p className="text-xs text-muted">{reason}</p>}
        <ReclaimButton
          campaignId={campaignId}
          amount={reclaimable}
          disabled={!isSponsor || reclaimable === 0n}
          onSettled={onSettled}
        />
      </CardContent>
    </Card>
  );
}
