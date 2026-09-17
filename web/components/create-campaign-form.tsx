"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseEventLogs } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi, milestoneEscrowAbi } from "@/lib/contracts";
import { ESCROW_ADDRESS, USDC_ADDRESS, isEscrowConfigured } from "@/lib/chains";
import { parseMilestoneRows, validateCreateCampaign } from "@/lib/milemark";
import {
  CAMPAIGN_TEMPLATES,
  deadlineDaysFromNow,
  type MilestoneDraft,
} from "@/lib/templates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TemplateBar } from "./create/template-bar";
import { MetaFields } from "./create/meta-fields";
import { PartyFields } from "./create/party-fields";
import { MilestoneFields } from "./create/milestone-fields";
import { FundActions } from "./create/fund-actions";

export function CreateCampaignForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const initial = CAMPAIGN_TEMPLATES[0];
  const [title, setTitle] = useState(initial.title);
  const [briefURI, setBriefURI] = useState(initial.briefURI);
  const [deadlineLocal, setDeadlineLocal] = useState(() =>
    deadlineDaysFromNow(initial.days),
  );
  const [beneficiary, setBeneficiary] = useState("");
  const [attestors, setAttestors] = useState<string[]>(() =>
    Array.from({ length: initial.attestorSlots }, () => ""),
  );
  const [quorum, setQuorum] = useState(initial.quorum);
  const [challengeWindowSec, setChallengeWindowSec] = useState(
    initial.challengeWindowSec,
  );
  const [rows, setRows] = useState<MilestoneDraft[]>(() =>
    initial.rows.map((row) => ({ ...row })),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "create" | null>(null);
  const [settledAction, setSettledAction] = useState<"approve" | "create" | null>(
    null,
  );

  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ESCROW_ADDRESS] : undefined,
    query: { enabled: Boolean(address) && isEscrowConfigured },
  });

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const parsed = useMemo(() => parseMilestoneRows(rows), [rows]);
  const needsApproval = (allowance ?? 0n) < parsed.total;
  const insufficient = balance !== undefined && parsed.total > 0n && balance < parsed.total;
  const waiting = isPending || receipt.isLoading;

  useEffect(() => {
    if (!receipt.isSuccess || !receipt.data || !hash) return;
    if (action === "approve") {
      setSettledAction("approve");
      void refetchAllowance();
      setAction(null);
      return;
    }
    if (action === "create") {
      setSettledAction("create");
      try {
        const logs = parseEventLogs({
          abi: milestoneEscrowAbi,
          logs: receipt.data.logs,
          eventName: "CampaignCreated",
        });
        const id = logs[0]?.args?.campaignId;
        if (id !== undefined) router.replace(`/campaign/${id.toString()}`);
      } catch {
        /* ignore parse miss */
      }
    }
  }, [receipt.isSuccess, receipt.data, hash, action, refetchAllowance, router]);

  function applyTemplate(id: string) {
    const template = CAMPAIGN_TEMPLATES.find((item) => item.id === id);
    if (!template) return;
    setTitle(template.title);
    setBriefURI(template.briefURI);
    setRows(template.rows.map((row) => ({ ...row })));
    setDeadlineLocal(deadlineDaysFromNow(template.days));
    setQuorum(template.quorum);
    setChallengeWindowSec(template.challengeWindowSec);
    setAttestors(Array.from({ length: template.attestorSlots }, () => ""));
  }

  function validated() {
    setLocalError(null);
    reset();
    const result = validateCreateCampaign({
      title,
      briefURI,
      deadlineLocal,
      beneficiary,
      attestors,
      quorum,
      challengeWindowSec,
      rows,
      escrowConfigured: isEscrowConfigured,
    });
    if (!result.ok) {
      setLocalError(result.error);
      return null;
    }
    return result.value;
  }

  function onApprove() {
    if (!validated()) return;
    if (insufficient) {
      setLocalError("Not enough USDC in this wallet to fund the campaign.");
      return;
    }
    setAction("approve");
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [ESCROW_ADDRESS, parsed.total],
    });
  }

  function onCreate() {
    const ok = validated();
    if (!ok) return;
    if (insufficient) {
      setLocalError("Not enough USDC in this wallet to fund the campaign.");
      return;
    }
    setAction("create");
    writeContract({
      address: ESCROW_ADDRESS,
      abi: milestoneEscrowAbi,
      functionName: "createCampaign",
      args: [
        ok.beneficiary,
        ok.attestors,
        ok.quorum,
        ok.title,
        ok.briefURI,
        BigInt(ok.deadlineSec),
        BigInt(ok.challengeWindowSec),
        ok.descriptions,
        ok.amounts,
      ],
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lock a campaign</CardTitle>
        <CardDescription>
          v3: N-of-M attestor quorum and a per-campaign challenge window. Approve
          USDC then create.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <TemplateBar onSelect={applyTemplate} />

        {!isConnected && (
          <p className="rounded-md border border-line bg-ink px-3 py-2 text-sm text-muted">
            Connect a wallet on Arbitrum Sepolia to approve and create.
          </p>
        )}

        <MetaFields
          title={title}
          briefURI={briefURI}
          deadlineLocal={deadlineLocal}
          challengeWindowSec={challengeWindowSec}
          onTitle={setTitle}
          onBrief={setBriefURI}
          onDeadline={setDeadlineLocal}
          onChallengeWindow={setChallengeWindowSec}
        />

        <PartyFields
          beneficiary={beneficiary}
          attestors={attestors}
          quorum={quorum}
          connectedAddress={address}
          onBeneficiary={setBeneficiary}
          onAttestors={setAttestors}
          onQuorum={setQuorum}
        />

        <MilestoneFields rows={rows} onRows={setRows} />

        {localError && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {localError}
          </p>
        )}

        <FundActions
          isConnected={isConnected}
          needsApproval={needsApproval}
          waiting={waiting}
          action={action}
          settledAction={settledAction}
          total={parsed.total}
          balance={balance}
          insufficient={insufficient}
          hash={hash}
          error={error}
          isPending={isPending}
          isConfirming={receipt.isLoading}
          isSuccess={receipt.isSuccess}
          onApprove={onApprove}
          onCreate={onCreate}
        />
      </CardContent>
    </Card>
  );
}
