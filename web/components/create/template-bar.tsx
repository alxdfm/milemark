import { CAMPAIGN_TEMPLATES } from "@/lib/templates";
import { Button } from "@/components/ui/button";

export function TemplateBar({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {CAMPAIGN_TEMPLATES.map((template) => (
          <Button
            key={template.id}
            type="button"
            size="sm"
            variant="secondary"
            title={template.summary}
            onClick={() => onSelect(template.id)}
          >
            {template.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted">
        Templates fill v3 fields: attestors, quorum, challenge window, deadline,
        and USDC miles. Hover a button for the summary. Default is the 60s judge
        demo — that is not live campaign 0.
      </p>
    </div>
  );
}
