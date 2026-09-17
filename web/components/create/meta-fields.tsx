import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHALLENGE_WINDOW_PRESETS } from "@/lib/templates";

export function MetaFields({
  title,
  briefURI,
  deadlineLocal,
  challengeWindowSec,
  onTitle,
  onBrief,
  onDeadline,
  onChallengeWindow,
}: {
  title: string;
  briefURI: string;
  deadlineLocal: string;
  challengeWindowSec: number;
  onTitle: (value: string) => void;
  onBrief: (value: string) => void;
  onDeadline: (value: string) => void;
  onChallengeWindow: (value: number) => void;
}) {
  const known = CHALLENGE_WINDOW_PRESETS.some(
    (item) => item.seconds === challengeWindowSec,
  );

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
      <div className="grid gap-2">
        <Label htmlFor="deadline">Deadline</Label>
        <Input
          id="deadline"
          type="datetime-local"
          value={deadlineLocal}
          onChange={(e) => onDeadline(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="window">Challenge window</Label>
        <select
          id="window"
          className="h-10 rounded-md border border-line bg-ink px-3 text-sm"
          value={known ? String(challengeWindowSec) : "custom"}
          onChange={(e) => {
            if (e.target.value === "custom") return;
            onChallengeWindow(Number(e.target.value));
          }}
        >
          {CHALLENGE_WINDOW_PRESETS.map((preset) => (
            <option key={preset.seconds} value={preset.seconds}>
              {preset.label}
            </option>
          ))}
          {!known && (
            <option value="custom">{challengeWindowSec}s (custom)</option>
          )}
        </select>
        <p className="text-xs text-muted">
          After quorum, sponsor or any attestor may dispute during this window.
          0 = claimable immediately (tests / lightning demos).
        </p>
      </div>
    </div>
  );
}
