import {
  canDispute,
  formatUsdc,
  isChallengeOpen,
  milestoneStatus,
  type Milestone,
} from "@/lib/milemark";
import { linkLabel, publicHref } from "@/lib/links";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompleteButton } from "./complete-button";
import { DisputeButton } from "./dispute-button";

function windowLabel(completedAt: bigint, challengeWindow: bigint, nowSec: number): string {
  const ends = Number(completedAt + challengeWindow);
  const delta = ends - nowSec;
  if (delta <= 0) return "window closed";
  if (delta < 60) return `${delta}s to dispute`;
  if (delta < 3600) return `${Math.ceil(delta / 60)}m to dispute`;
  return `${Math.ceil(delta / 3600)}h to dispute`;
}

export function MilestoneList({
  campaignId,
  milestones,
  quorum,
  challengeWindow,
  nowSec,
  isAttestor,
  isSponsor,
  attestedFlags,
  onSettled,
}: {
  campaignId: bigint;
  milestones: readonly Milestone[];
  quorum: number;
  challengeWindow: bigint;
  nowSec: number;
  isAttestor: boolean;
  isSponsor: boolean;
  attestedFlags: readonly boolean[];
  onSettled: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
        <CardDescription>
          Any-order · quorum {quorum} · first non-empty evidence wins
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {milestones.map((milestone, index) => {
          const evidenceHref = publicHref(milestone.evidenceURI);
          const status = milestoneStatus(milestone, challengeWindow, nowSec);
          const alreadyAttested = Boolean(attestedFlags[index]);
          const attestDisabled =
            !isAttestor ||
            milestone.completed ||
            milestone.reclaimed ||
            alreadyAttested;
          const showDispute = canDispute(
            milestone,
            challengeWindow,
            nowSec,
            isSponsor,
            isAttestor,
          );
          const challenging = isChallengeOpen(milestone, challengeWindow, nowSec);

          return (
            <div
              key={index}
              className="flex flex-col gap-2 border-b border-line py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p className="font-mono text-xs text-muted">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="font-medium">{milestone.description}</p>
                <p className="text-xs text-muted">
                  {formatUsdc(milestone.amount)} USDC · {status}
                  {" · "}
                  {milestone.attestationCount}/{quorum} attested
                </p>
                {challenging ? (
                  <p className="text-xs text-accent">
                    {windowLabel(milestone.completedAt, challengeWindow, nowSec)}
                  </p>
                ) : null}
                {milestone.disputed ? (
                  <p className="text-xs text-red-300">
                    Disputed — not claimable. Sponsor may reclaim after the deadline.
                  </p>
                ) : null}
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
              <div className="flex w-full max-w-xs flex-col items-stretch gap-2 sm:items-end">
                {!milestone.completed && !milestone.reclaimed ? (
                  <CompleteButton
                    campaignId={campaignId}
                    index={index}
                    quorum={quorum}
                    attestationCount={milestone.attestationCount}
                    disabled={attestDisabled}
                    alreadyAttested={alreadyAttested}
                    showAttestorHint={
                      !isAttestor && !milestone.completed && !milestone.reclaimed
                    }
                    onSettled={onSettled}
                  />
                ) : null}
                {showDispute ? (
                  <DisputeButton
                    campaignId={campaignId}
                    index={index}
                    onSettled={onSettled}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
