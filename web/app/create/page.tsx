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
        Fund work by the mile
      </h1>
      <p className="mt-2 mb-8 max-w-2xl text-sm leading-6 text-muted">
        Lock USDC against clear deliverables. Any listed attestor can mark miles
        done (even out of order). After the deadline, you can reclaim what was
        never completed.
      </p>
      <CreateCampaignForm />
    </main>
  );
}
