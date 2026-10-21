import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { formatDateShort } from "@/lib/dateUtils";
import type { PriorPa } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  ready_for_review: "Needs review",
  approved: "Ready to send",
  approved_to_send: "Ready to send",
  sent_to_pharmacy: "Sent",
  rejected: "Rejected",
  closed: "Closed",
};

function statusLabel(status: string | null): string {
  if (!status) return "";
  return STATUS_LABELS[status] || status.replace(/_/g, " ");
}

/**
 * "PA already on file" — explains WHY a referral shows "No PA required": the
 * patient already has an approved PA for the same drug and dose from an
 * earlier referral. Also shown when the team overrode that and marked this
 * referral as needing a new PA, so the existing approval stays visible.
 */
export function PriorPaCard({
  priorPa,
  paRequired,
  onViewReferral,
  onViewLetter,
}: {
  priorPa: PriorPa;
  /** True when the team overrode the continuation and asked for a new PA. */
  paRequired: boolean;
  onViewReferral: (referralId: string) => void;
  onViewLetter: (documentId: string) => void;
}) {
  const drugLine = [priorPa.drug_name, priorPa.dosage].filter(Boolean).join(" ");
  const approvedLine = priorPa.approved_at
    ? `Approved ${formatDateShort(priorPa.approved_at)}${priorPa.approved_by ? ` by ${priorPa.approved_by}` : ""}`
    : priorPa.approved_by
      ? `Approved by ${priorPa.approved_by}`
      : "Approved";
  const validLine = priorPa.pa_expiration_date
    ? `Valid through ${formatDateShort(priorPa.pa_expiration_date)}`
    : "No expiration recorded";
  const fromLine = [
    `From referral #${priorPa.referral_short}`,
    priorPa.referral_created_at ? formatDateShort(priorPa.referral_created_at) : null,
    statusLabel(priorPa.referral_status) || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)]" data-testid="prior-pa-card">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon name="file-check" size={16} />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">PA already on file</h3>
      </div>
      <p className="mb-2 text-sm text-muted-foreground">
        {paRequired
          ? "A PA is on file, but the team marked this referral as needing a new one."
          : "No new PA needed — same drug and dose as an approved PA."}
      </p>
      <div className="space-y-0.5 text-sm text-foreground">
        {drugLine && <div className="font-semibold">{drugLine}</div>}
        <div>{approvedLine}</div>
        <div>{validLine}</div>
        <div className="text-muted-foreground">{fromLine}</div>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-[12px]"
          onClick={() => onViewReferral(priorPa.referral_id)}
        >
          View referral
        </Button>
        {priorPa.letter_document_id && (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-[12px]"
            onClick={() => onViewLetter(priorPa.letter_document_id as string)}
          >
            View PA letter
          </Button>
        )}
      </div>
    </div>
  );
}
