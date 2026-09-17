import { formatUsdc, milestoneStatus, type Milestone } from "@/lib/milemark";
import { linkLabel, publicHref } from "@/lib/links";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompleteButton } from "./complete-button";

export function MilestoneList({
  campaignId,
  milestones,
  isAttestor,
  onSettled,
}: {
  campaignId: bigint;
  milestones: readonly Milestone[];
  isAttestor: boolean;
  onSettled: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
        <CardDescription>Any-order completion · evidence optional</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {milestones.map((milestone, index) => {
          const evidenceHref = publicHref(milestone.evidenceURI);
          const status = milestoneStatus(milestone);
          return (
            <div
              key={index}
              className="flex flex-col gap-2 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-xs text-muted">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="font-medium">{milestone.description}</p>
                <p className="text-xs text-muted">
                  {formatUsdc(milestone.amount)} USDC · {status}
                </p>
                {milestone.evidenceURI ? (
                  evidenceHref ? (
                    <a
                      className="text-xs text-accent hover:underline"
                      href={evidenceHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {linkLabel(milestone.evidenceURI)}
                    </a>
                  ) : (
                    <span
                      className="text-xs text-muted"
                      title={milestone.evidenceURI}
                    >
                      evidence URI (not browser-openable)
                    </span>
                  )
                ) : null}
              </div>
              <CompleteButton
                campaignId={campaignId}
                index={index}
                disabled={!isAttestor || milestone.completed || milestone.reclaimed}
                showAttestorHint={
                  !isAttestor && !milestone.completed && !milestone.reclaimed
                }
                onSettled={onSettled}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
