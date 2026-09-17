import { reclaimReason } from "@/lib/milemark";
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
  onSettled,
}: {
  campaignId: bigint;
  reclaimable: bigint;
  deadline: bigint;
  connected: boolean;
  isSponsor: boolean;
  onSettled: () => void;
}) {
  const reason = reclaimReason({
    connected,
    isSponsor,
    reclaimable,
    deadline,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reclaim</CardTitle>
        <CardDescription>
          After the deadline, the sponsor reclaims USDC still locked in incomplete
          milestones. Completed-but-unclaimed amounts stay for the beneficiary.
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
