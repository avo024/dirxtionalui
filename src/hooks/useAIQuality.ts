import { useQuery } from "@tanstack/react-query";
import {
  getOverview,
  getCorrections,
  getReferralQuality,
  type AIQualityOverview,
  type AIQualityCorrectionsResponse,
  type AIQualityReferralDetail,
} from "@/lib/aiQualityApi";

/**
 * IMPORTANT: PHI hygiene
 * staleTime: 0 + gcTime: 0 ensures react-query drops the response from memory
 * as soon as the component unmounts. No service worker / IndexedDB caching.
 */
const phiSafeOptions = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always" as const,
  retry: 1,
};

export function useAIQualityOverview(args: { month?: string; days?: number; formType?: string }) {
  const { month, days, formType } = args;
  return useQuery<AIQualityOverview>({
    queryKey: ["ai-quality", "overview", month ?? "", days ?? "", formType ?? ""],
    queryFn: () => getOverview({ month, days, formType }),
    ...phiSafeOptions,
    refetchOnWindowFocus: true,
  });
}

export function useAIQualityCorrections(args: {
  month?: string;
  days?: number;
  field?: string;
  highConfOnly?: boolean;
  limit?: number;
  cursor?: string;
}) {
  return useQuery<AIQualityCorrectionsResponse>({
    queryKey: [
      "ai-quality",
      "corrections",
      args.month ?? "",
      args.days ?? "",
      args.field ?? "",
      !!args.highConfOnly,
      args.limit ?? 50,
      args.cursor ?? "",
    ],
    queryFn: () => getCorrections(args),
    ...phiSafeOptions,
  });
}

export function useAIQualityReferral(id: string | undefined) {
  return useQuery<AIQualityReferralDetail>({
    queryKey: ["ai-quality", "referral", id],
    queryFn: () => getReferralQuality(id as string),
    enabled: !!id,
    ...phiSafeOptions,
  });
}
