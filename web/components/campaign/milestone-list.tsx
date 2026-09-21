import { cn } from "@/lib/utils";
import {
  DISPUTE_WHO,
  canDispute,
  disputeReason,
  formatChallengeRemaining,
  formatUsdc,
  isChallengeOpen,
  milestoneStatus,
  showDisputeControls,
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

export function MilestoneList({
  campaignId,
  milestones,
  quorum,
  challengeWindow,
  nowSec,
  isAttestor,
  isSponsor,
  connected,
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
  connected: boolean;
  attestedFlags: readonly boolean[];
  onSettled: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
        <CardDescription>
          Any-order · quorum {quorum} · first non-empty evidence wins. {DISPUTE_WHO}
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
          const challenging = isChallengeOpen(milestone, challengeWindow, nowSec);
          const showDispute = showDisputeControls(milestone);
          const allowed = canDispute(
            milestone,
            challengeWindow,
            nowSec,
            isSponsor,
            isAttestor,
          );
          const reason = showDispute
            ? disputeReason({
                connected,
                isSponsor,
                isAttestor,
                completed: milestone.completed,
                disputed: milestone.disputed,
                claimed: milestone.claimed,
                reclaimed: milestone.reclaimed,
                windowOpen: challenging,
              })
            : null;
          const endsAt = milestone.completedAt + challengeWindow;

          return (
            <div
              key={index}
              className={cn(
                "flex flex-col gap-2 border-b border-line py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between",
                status === "disputed" &&
                  "-mx-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 last:border",
                status === "challenging" &&
                  "-mx-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 last:border",
              )}
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
                  <p className="text-xs text-amber-200">
                    {formatChallengeRemaining(endsAt, nowSec)} — claim blocked until
                    the window closes (or if disputed).
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
                    showAttestorHint={!isAttestor}
                    onSettled={onSettled}
                  />
                ) : null}
                {showDispute ? (
                  <DisputeButton
                    campaignId={campaignId}
                    index={index}
                    disabled={!allowed}
                    reason={reason}
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
