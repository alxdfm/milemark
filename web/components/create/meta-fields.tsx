import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MetaFields({
  title,
  briefURI,
  deadlineLocal,
  onTitle,
  onBrief,
  onDeadline,
}: {
  title: string;
  briefURI: string;
  deadlineLocal: string;
  onTitle: (value: string) => void;
  onBrief: (value: string) => void;
  onDeadline: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="brief">Brief URI (optional)</Label>
        <Input
          id="brief"
          placeholder="https://… or ipfs://"
          value={briefURI}
          onChange={(e) => onBrief(e.target.value)}
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="deadline">Deadline</Label>
        <Input
          id="deadline"
          type="datetime-local"
          value={deadlineLocal}
          onChange={(e) => onDeadline(e.target.value)}
        />
      </div>
    </div>
  );
}
