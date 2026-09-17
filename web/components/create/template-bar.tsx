import { CAMPAIGN_TEMPLATES } from "@/lib/templates";
import { Button } from "@/components/ui/button";

export function TemplateBar({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CAMPAIGN_TEMPLATES.map((template) => (
        <Button
          key={template.id}
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onSelect(template.id)}
        >
          {template.label}
        </Button>
      ))}
    </div>
  );
}
