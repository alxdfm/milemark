import { claimReason } from "@/lib/milemark";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClaimButton } from "./claim-button";

export function ClaimCard({
  campaignId,
  claimable,
  connected,
  isBeneficiary,
  onSettled,
}: {
  campaignId: bigint;
  claimable: bigint;
  connected: boolean;
  isBeneficiary: boolean;
  onSettled: () => void;
}) {
  const reason = claimReason({ connected, isBeneficiary, claimable });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {reason && <p className="text-xs text-muted">{reason}</p>}
        <ClaimButton
          campaignId={campaignId}
          amount={claimable}
          disabled={!isBeneficiary}
          onSettled={onSettled}
        />
      </CardContent>
    </Card>
  );
}
