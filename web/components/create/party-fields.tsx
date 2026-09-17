import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_ATTESTORS } from "@/lib/milemark";

export function PartyFields({
  beneficiary,
  attestors,
  quorum,
  connectedAddress,
  onBeneficiary,
  onAttestors,
  onQuorum,
}: {
  beneficiary: string;
  attestors: string[];
  quorum: number;
  connectedAddress?: `0x${string}`;
  onBeneficiary: (value: string) => void;
  onAttestors: (value: string[]) => void;
  onQuorum: (value: number) => void;
}) {
  const uniqueCount = attestors.map((item) => item.trim()).filter(Boolean).length;

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="beneficiary">Beneficiary</Label>
        <Input
          id="beneficiary"
          placeholder="0x…"
          value={beneficiary}
          onChange={(e) => onBeneficiary(e.target.value)}
          spellCheck={false}
        />
        {connectedAddress && (
          <button
            type="button"
            className="justify-self-start text-xs text-accent hover:underline"
            onClick={() => onBeneficiary(connectedAddress)}
          >
            Use my wallet
          </button>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <Label>Attestors (N-of-M quorum)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={attestors.length >= MAX_ATTESTORS}
            onClick={() => onAttestors([...attestors, ""])}
          >
            <Plus /> Add
          </Button>
        </div>
        {attestors.map((attestor, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="0x… attestor"
              value={attestor}
              onChange={(e) =>
                onAttestors(
                  attestors.map((item, j) => (j === index ? e.target.value : item)),
                )
              }
              spellCheck={false}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={attestors.length === 1}
              onClick={() =>
                onAttestors(attestors.filter((_, j) => j !== index))
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        {connectedAddress && (
          <button
            type="button"
            className="justify-self-start text-xs text-accent hover:underline"
            onClick={() => {
              const next = [...attestors];
              next[0] = connectedAddress;
              onAttestors(next);
            }}
          >
            Set first attestor to my wallet
          </button>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="quorum">Quorum</Label>
        <Input
          id="quorum"
          type="number"
          min={1}
          max={Math.max(uniqueCount, 1)}
          value={quorum}
          onChange={(e) => onQuorum(Number(e.target.value))}
        />
        <p className="text-xs text-muted">
          Milestone completes when {quorum} of {Math.max(uniqueCount, 1)} unique
          attestors attest. 1-of-n matches v2 behaviour.
        </p>
      </div>
    </div>
  );
}
