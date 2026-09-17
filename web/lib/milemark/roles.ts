import { sameAddress } from "./address";
import type { CampaignView } from "./types";

export type CampaignRoles = {
  connected: boolean;
  isSponsor: boolean;
  isBeneficiary: boolean;
  isAttestor: boolean;
};

export function resolveRoles(
  account: string | null | undefined,
  campaign: Pick<CampaignView, "sponsor" | "beneficiary">,
  attestors: readonly string[],
): CampaignRoles {
  const connected = Boolean(account);
  return {
    connected,
    isSponsor: sameAddress(account, campaign.sponsor),
    isBeneficiary: sameAddress(account, campaign.beneficiary),
    isAttestor:
      !!account && attestors.some((attestor) => sameAddress(account, attestor)),
  };
}
