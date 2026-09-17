"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CampaignLookup() {
  const [id, setId] = useState("");
  const router = useRouter();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = id.trim();
    if (!trimmed) return;
    router.push(`/campaign/${trimmed}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full gap-2">
      <Input
        inputMode="numeric"
        placeholder="Campaign id (0, 1, 2…)"
        value={id}
        onChange={(e) => setId(e.target.value)}
        aria-label="Campaign id"
      />
      <Button type="submit" variant="secondary">
        Open
      </Button>
    </form>
  );
}
