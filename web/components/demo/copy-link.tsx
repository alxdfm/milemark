"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLink({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-ink px-3 py-2 font-mono text-xs">
        {value || "—"}
      </code>
      <Button type="button" size="sm" variant="secondary" onClick={onCopy}>
        {copied ? "Copied" : label ?? "Copy"}
      </Button>
    </div>
  );
}

export function QrBlock({ value, caption }: { value: string; caption: string }) {
  if (!value) return null;
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(value)}`;
  return (
    <figure className="flex flex-col items-center gap-2 rounded-lg border border-line bg-ink p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={caption} width={180} height={180} className="rounded bg-white p-1" />
      <figcaption className="text-center text-[11px] text-muted">{caption}</figcaption>
    </figure>
  );
}
