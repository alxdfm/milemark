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

type Row = { description: string; amount: string };

const emptyRow = (): Row => ({ description: "", amount: "" });

export function CreateCampaignForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [beneficiary, setBeneficiary] = useState("");
  const [attestor, setAttestor] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { description: "Ship public demo", amount: "100" },
    { description: "Pass review / audit notes", amount: "250" },
    { description: "Handoff + docs", amount: "150" },
  ]);
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
    return { descriptions, amounts, total };
  }, [rows]);

  const needsApproval = (allowance ?? 0n) < parsed.total;
  const waiting = isPending || receipt.isLoading;

  useEffect(() => {
    if (!receipt.isSuccess || !receipt.data) return;
    if (action === "approve") {
      void refetchAllowance();
      setAction(null);
      reset();
      return;
    }
    if (action === "create") {
      const logs = parseEventLogs({
        abi: milestoneEscrowAbi,
        logs: receipt.data.logs,
        eventName: "CampaignCreated",
      });
      const id = logs[0]?.args.campaignId;
      if (id !== undefined) {
        router.replace(`/campaign/${id.toString()}`);
      }
    }
  }, [receipt.isSuccess, receipt.data, action, refetchAllowance, reset, router]);

  function validate(): { beneficiary: Address; attestor: Address } | null {
    setLocalError(null);
    reset();
    if (!isEscrowConfigured) {
      setLocalError("Set NEXT_PUBLIC_ESCROW_ADDRESS in web/.env.local first.");
      return null;
    }
    if (!isAddress(beneficiary) || !isAddress(attestor)) {
      setLocalError("Beneficiary and attestor must be valid addresses.");
      return null;
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
        setLocalError(`Milestone ${i + 1} needs a USDC amount greater than 0.`);
        return null;
      }
    }
    return { beneficiary, attestor };
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
      args: [ok.beneficiary, ok.attestor, parsed.descriptions, parsed.amounts],
    });
  }

  const displayError = localError ?? (error ? friendlyError(error) : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lock a campaign</CardTitle>
        <CardDescription>
          You are the sponsor. USDC is pulled in this transaction after you
          approve the total. The attestor can complete milestones in any order;
          the beneficiary claims released amounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!isConnected && (
          <p className="rounded-md border border-line bg-ink px-3 py-2 text-sm text-muted">
            Connect a wallet on the configured chain to approve USDC and create
            the campaign.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="beneficiary">Beneficiary</Label>
            <Input
              id="beneficiary"
              placeholder="0x… receives released USDC"
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
          <div className="grid gap-2">
            <Label htmlFor="attestor">Attestor</Label>
            <Input
              id="attestor"
              placeholder="0x… marks milestones complete"
              value={attestor}
              onChange={(e) => setAttestor(e.target.value)}
              spellCheck={false}
            />
            {address && (
              <button
                type="button"
                className="justify-self-start text-xs text-accent hover:underline"
                onClick={() => setAttestor(address)}
              >
                Use my wallet
              </button>
            )}
          </div>
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
              <Plus />
              Add
            </Button>
          </div>
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_6.5rem_2.5rem] items-center gap-2"
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
                aria-label="Remove milestone"
                disabled={rows.length === 1}
                onClick={() =>
                  setRows((prev) => prev.filter((_, j) => j !== i))
                }
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
            {balance < parsed.total
              ? " — not enough to fund this campaign."
              : ""}
          </p>
        )}

        {displayError && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {displayError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {needsApproval ? (
            <Button
              type="button"
              onClick={onApprove}
              disabled={!isConnected || waiting || parsed.total === 0n}
            >
              {waiting && action === "approve"
                ? "Confirm approve in wallet…"
                : `Approve ${formatUsdc(parsed.total)} USDC`}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onCreate}
              disabled={!isConnected || waiting || parsed.total === 0n}
            >
              {waiting && action === "create"
                ? "Locking USDC…"
                : "Create campaign"}
            </Button>
          )}
          {needsApproval && (
            <p className="text-xs text-muted">
              After approve confirms, the button switches to Create campaign.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
