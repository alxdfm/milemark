import { CreateCampaignForm } from "@/components/create-campaign-form";

export const metadata = {
  title: "Create campaign — MileMark",
};

export default function CreatePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
        New campaign
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        Fund ordered milestones
      </h1>
      <p className="mt-2 mb-8 max-w-2xl text-sm leading-6 text-muted">
        Start from a template or fill the form. Attestors are a 1-of-n set.
        Evidence is attached later, when someone marks a mile complete — not at
        create. Documented in{" "}
        <code className="font-mono text-foreground">MilestoneEscrow.sol</code>.
      </p>
      <CreateCampaignForm />
    </main>
  );
}
