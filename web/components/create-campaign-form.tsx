"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isAddress, parseEventLogs, parseUnits, type Address } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi, milestoneEscrowAbi } from "@/lib/abi";
import {
  ESCROW_ADDRESS,
  USDC_ADDRESS,
  USDC_DECIMALS,
  isEscrowConfigured,
} from "@/lib/chains";
import { friendlyError, formatUsdc } from "@/lib/format";
import {
  CAMPAIGN_TEMPLATES,
  deadlineDaysFromNow,
  type MilestoneDraft,
} from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

const emptyRow = (): MilestoneDraft => ({ description: "", amount: "" });

export function CreateCampaignForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [title, setTitle] = useState("MileMark campaign");
  const [briefURI, setBriefURI] = useState("");
  const [deadlineLocal, setDeadlineLocal] = useState(() => deadlineDaysFromNow(14));
  const [beneficiary, setBeneficiary] = useState("");
  const [attestors, setAttestors] = useState<string[]>([""]);
  const [rows, setRows] = useState<MilestoneDraft[]>(() =>
    CAMPAIGN_TEMPLATES[0].rows.map((r) => ({ ...r })),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "create" | null>(null);

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

  const parsed = useMemo(() => {
    const descriptions = rows.map((r) => r.description.trim());
    const amounts: bigint[] = [];
    for (const row of rows) {
      const trimmed = row.amount.trim();
      if (!trimmed) {
        amounts.push(0n);
        continue;
      }
      try {
        amounts.push(parseUnits(trimmed, USDC_DECIMALS));
      } catch {
        amounts.push(-1n);
      }
    }
    const total = amounts.reduce((s, a) => (a > 0n ? s + a : s), 0n);
    const deadlineSec = Math.floor(new Date(deadlineLocal).getTime() / 1000);
    return { descriptions, amounts, total, deadlineSec };
  }, [rows, deadlineLocal]);

  const needsApproval = (allowance ?? 0n) < parsed.total;
  const waiting = isPending || receipt.isLoading;

  useEffect(() => {
    if (!receipt.isSuccess || !receipt.data || !hash) return;
    if (action === "approve") {
      void refetchAllowance();
      setAction(null);
      return;
    }
    if (action === "create") {
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
    const t = CAMPAIGN_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTitle(t.title);
    setBriefURI(t.briefURI);
    setRows(t.rows.map((r) => ({ ...r })));
    setDeadlineLocal(deadlineDaysFromNow(t.days));
  }

  function validate(): {
    beneficiary: Address;
    attestors: Address[];
  } | null {
    setLocalError(null);
    reset();
    if (!isEscrowConfigured) {
      setLocalError("Set NEXT_PUBLIC_ESCROW_ADDRESS in web/.env.local first.");
      return null;
    }
    if (!title.trim()) {
      setLocalError("Title is required.");
      return null;
    }
    if (!Number.isFinite(parsed.deadlineSec) || parsed.deadlineSec <= Math.floor(Date.now() / 1000)) {
      setLocalError("Deadline must be in the future.");
      return null;
    }
    if (!isAddress(beneficiary)) {
      setLocalError("Beneficiary must be a valid address.");
      return null;
    }
    const cleaned = attestors.map((a) => a.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      setLocalError("Add at least one attestor.");
      return null;
    }
    for (const a of cleaned) {
      if (!isAddress(a)) {
        setLocalError(`Invalid attestor: ${a}`);
        return null;
      }
    }
    if (rows.length === 0) {
      setLocalError("Add at least one milestone.");
      return null;
    }
    for (let i = 0; i < rows.length; i++) {
      if (!parsed.descriptions[i]) {
        setLocalError(`Milestone ${i + 1} needs a description.`);
        return null;
      }
      if (parsed.amounts[i] <= 0n) {
        setLocalError(`Milestone ${i + 1} needs a USDC amount > 0.`);
        return null;
      }
    }
    return { beneficiary: beneficiary as Address, attestors: cleaned as Address[] };
  }

  function onApprove() {
    if (!validate()) return;
    setAction("approve");
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [ESCROW_ADDRESS, parsed.total],
    });
  }

  function onCreate() {
    const ok = validate();
    if (!ok) return;
    setAction("create");
    writeContract({
      address: ESCROW_ADDRESS,
      abi: milestoneEscrowAbi,
      functionName: "createCampaign",
      args: [
        ok.beneficiary,
        ok.attestors,
        title.trim(),
        briefURI.trim(),
        BigInt(parsed.deadlineSec),
        parsed.descriptions,
        parsed.amounts,
      ],
    });
  }

  const displayError = localError ?? (error ? friendlyError(error) : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lock a campaign</CardTitle>
        <CardDescription>
          v2: title, brief, deadline, 1-of-n attestors. Approve USDC then create.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          {CAMPAIGN_TEMPLATES.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => applyTemplate(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {!isConnected && (
          <p className="rounded-md border border-line bg-ink px-3 py-2 text-sm text-muted">
            Connect a wallet on Arbitrum Sepolia to approve and create.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="brief">Brief URI (optional)</Label>
            <Input
              id="brief"
              placeholder="https://… or ipfs://"
              value={briefURI}
              onChange={(e) => setBriefURI(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadlineLocal}
              onChange={(e) => setDeadlineLocal(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="beneficiary">Beneficiary</Label>
            <Input
              id="beneficiary"
              placeholder="0x…"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              spellCheck={false}
            />
            {address && (
              <button
                type="button"
                className="justify-self-start text-xs text-accent hover:underline"
                onClick={() => setBeneficiary(address)}
              >
                Use my wallet
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <Label>Attestors (1-of-n)</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAttestors((a) => [...a, ""])}
            >
              <Plus /> Add
            </Button>
          </div>
          {attestors.map((a, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="0x… attestor"
                value={a}
                onChange={(e) =>
                  setAttestors((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                }
                spellCheck={false}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={attestors.length === 1}
                onClick={() => setAttestors((prev) => prev.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          {address && (
            <button
              type="button"
              className="justify-self-start text-xs text-accent hover:underline"
              onClick={() => setAttestors((prev) => {
                const next = [...prev];
                next[0] = address;
                return next;
              })}
            >
              Set first attestor to my wallet
            </button>
          )}
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <Label>Milestones</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRows((r) => [...r, emptyRow()])}
            >
              <Plus /> Add
            </Button>
          </div>
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[2.5rem_1fr_7rem_2.5rem] items-center gap-2"
            >
              <span className="font-mono text-xs text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Input
                placeholder="What gets delivered"
                value={row.description}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, j) =>
                      j === i ? { ...r, description: e.target.value } : r,
                    ),
                  )
                }
              />
              <Input
                inputMode="decimal"
                placeholder="USDC"
                value={row.amount}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, j) =>
                      j === i ? { ...r, amount: e.target.value } : r,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={rows.length === 1}
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-line bg-ink px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted">Total locked</span>
          <span className="font-mono text-lg text-accent">
            {formatUsdc(parsed.total)} USDC
          </span>
        </div>

        {address && balance !== undefined && (
          <p className="text-xs text-muted">
            Wallet balance: {formatUsdc(balance)} USDC
            {balance < parsed.total ? " — not enough to fund this campaign." : ""}
          </p>
        )}

        {displayError && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {displayError}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {needsApproval ? (
            <Button
              type="button"
              onClick={onApprove}
              disabled={!isConnected || waiting || parsed.total === 0n}
              className="sm:flex-1"
            >
              {waiting && action === "approve"
                ? "Confirm in wallet…"
                : `Approve ${formatUsdc(parsed.total)} USDC`}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onCreate}
              disabled={!isConnected || waiting || parsed.total === 0n}
              className="sm:flex-1"
            >
              {waiting && action === "create" ? "Locking USDC…" : "Create campaign"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
