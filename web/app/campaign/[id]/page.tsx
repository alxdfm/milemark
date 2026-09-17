import { CampaignStatus } from "@/components/campaign-status";

export const metadata = {
  title: "Campaign — MileMark",
};

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <CampaignStatus campaignId={id} />
    </main>
  );
}
