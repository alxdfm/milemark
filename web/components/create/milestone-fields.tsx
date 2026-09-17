import { Plus, Trash2 } from "lucide-react";
import type { MilestoneDraft } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyRow = (): MilestoneDraft => ({ description: "", amount: "" });

export function MilestoneFields({
  rows,
  onRows,
}: {
  rows: MilestoneDraft[];
  onRows: (rows: MilestoneDraft[]) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <Label>Milestones</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRows([...rows, emptyRow()])}
        >
          <Plus /> Add
        </Button>
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-[2.5rem_1fr_7rem_2.5rem] items-center gap-2"
        >
          <span className="font-mono text-xs text-muted">
            {String(index + 1).padStart(2, "0")}
          </span>
          <Input
            placeholder="What gets delivered"
            value={row.description}
            onChange={(e) =>
              onRows(
                rows.map((item, j) =>
                  j === index ? { ...item, description: e.target.value } : item,
                ),
              )
            }
          />
          <Input
            inputMode="decimal"
            placeholder="USDC"
            value={row.amount}
            onChange={(e) =>
              onRows(
                rows.map((item, j) =>
                  j === index ? { ...item, amount: e.target.value } : item,
                ),
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={rows.length === 1}
            onClick={() => onRows(rows.filter((_, j) => j !== index))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}
