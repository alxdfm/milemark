import { DemoKit } from "@/components/demo/demo-kit";

export const metadata = {
  title: "Demo kit — MileMark",
  description:
    "Three-minute judge script for MileMark v3: create, attest quorum, optional dispute, claim, reclaim.",
};

export default function DemoPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <DemoKit />
    </main>
  );
}
