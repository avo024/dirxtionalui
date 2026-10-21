import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "@/doc-card.css";

/**
 * DocCard — a paper-sheet thumbnail for a document: faint placeholder drawing per
 * document type, a corner tag with the type in the owning stage colour, and the
 * file extension + page count as small mono text below (md only).
 * Sizes: md 56x72, sm 40x52. States: default / hover / selected / processing / failed / new.
 */
export type DocCardType = "referral" | "card" | "chart" | "pa_letter" | "appeal" | "fax" | "enrollment" | "other";
export type DocCardState = "default" | "hover" | "selected" | "processing" | "failed" | "new";

const TAG: Record<DocCardType, { text: string; holder: "clinic" | "payer" | "dx" | "pharm" | "done" }> = {
  referral: { text: "REF", holder: "clinic" },
  card: { text: "CARD", holder: "clinic" },
  chart: { text: "CHART", holder: "clinic" },
  pa_letter: { text: "PA", holder: "payer" },
  appeal: { text: "APPEAL", holder: "payer" },
  fax: { text: "FAX", holder: "dx" },
  enrollment: { text: "ENROLL", holder: "pharm" },
  other: { text: "DOC", holder: "done" },
};

/**
 * Real `doc_type` / delivery `kind` value -> DocCard type. Never throws on an unknown value.
 * (Admin/clinic doc_types: referral_form, insurance_front|back (+ insurance_card_*), chart_notes,
 * pa_approval_letter, generated_referral_pdf(_sent), enrollment*, appeal packets, inbound faxes.)
 */
export function docCardType(docType?: string | null): DocCardType {
  const t = String(docType || "").toLowerCase();
  if (!t) return "other";
  if (t === "referral_form" || t === "referral_packet" || t === "packet" || t.startsWith("generated_referral_pdf")) return "referral";
  if (t.startsWith("insurance")) return "card";
  if (t === "chart_notes") return "chart";
  if (t === "pa_approval_letter" || t === "pa_letter") return "pa_letter";
  if (t.startsWith("appeal")) return "appeal";
  if (t === "fax" || t === "inbound_fax") return "fax";
  if (t.startsWith("enrollment")) return "enrollment";
  return "other";
}

/** The packet we sent (as opposed to the clinic's original referral form). */
export function docIsSent(docType?: string | null): boolean {
  const t = String(docType || "").toLowerCase();
  return t === "generated_referral_pdf_sent" || t === "referral_packet";
}

/** pa_letter outcome comes from the referral's pa_status, not the doc_type. */
export function docOutcome(paStatus?: string | null): "approved" | "denied" | null {
  return paStatus === "approved" ? "approved" : paStatus === "denied" ? "denied" : null;
}

/** mime type or filename -> "pdf" | "jpg" | "tif" | "png" (or undefined). */
export function docExt(fileType?: string | null, filename?: string | null): string | undefined {
  const m = String(fileType || "").toLowerCase();
  if (m.includes("pdf")) return "pdf";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("tif")) return "tif";
  if (m.includes("png")) return "png";
  const ext = String(filename || "").split(".").pop()?.toLowerCase();
  if (!ext || ext === String(filename || "").toLowerCase()) return undefined;
  return ext === "jpeg" ? "jpg" : ext === "tiff" ? "tif" : ext;
}

/** Placeholder drawings on a 56x72 sheet (scaled to the card size). Faint stone bars. */
function Drawing({ type, outcome }: { type: DocCardType; outcome?: "approved" | "denied" | null }): ReactNode {
  const a = "var(--dc-bar)";
  const b = "var(--dc-bar-2)";
  switch (type) {
    case "referral":
      return (
        <>
          <rect x="9" y="9" width="24" height="3" rx="1.5" fill={b} />
          <rect x="9" y="15" width="38" height="2" rx="1" fill={a} />
          <rect x="9" y="22" width="38" height="26" rx="2" fill="none" stroke={b} strokeWidth="1.2" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x="12" y={26 + i * 6} width="8" height="2" rx="1" fill={a} />
              <rect x="24" y={26 + i * 6} width="19" height="2" rx="1" fill={b} />
            </g>
          ))}
          <rect x="9" y="54" width="22" height="2" rx="1" fill={a} />
        </>
      );
    case "card":
      return (
        <>
          <rect x="8" y="12" width="40" height="26" rx="3" fill={a} />
          <rect x="8" y="22" width="40" height="5" fill={b} />
          <rect x="12" y="31" width="14" height="2" rx="1" fill="#fff" opacity=".8" />
          <rect x="12" y="15" width="9" height="4" rx="1" fill="#fff" opacity=".7" />
          <rect x="9" y="46" width="30" height="2" rx="1" fill={a} />
          <rect x="9" y="52" width="22" height="2" rx="1" fill={a} />
        </>
      );
    case "chart":
      return (
        <>
          <rect x="9" y="9" width="22" height="3" rx="1.5" fill={b} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x="9" y={17 + i * 6} width={i % 3 === 2 ? 26 : 38} height="2" rx="1" fill={a} />
          ))}
        </>
      );
    case "pa_letter":
      return (
        <>
          <rect x="9" y="9" width="9" height="9" rx="2" fill={b} />
          <rect x="22" y="10" width="22" height="2" rx="1" fill={a} />
          <rect x="22" y="15" width="15" height="2" rx="1" fill={a} />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x="9" y={26 + i * 6} width={i === 3 ? 24 : 38} height="2" rx="1" fill={a} />
          ))}
          {outcome === "approved" && <path d="M10 53.5l3.2 3.2 6-6.4" fill="none" stroke="var(--st-payer-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          {outcome === "denied" && <path d="M11 51l8 8 M19 51l-8 8" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />}
          {!outcome && <rect x="9" y="54" width="18" height="2" rx="1" fill={b} />}
        </>
      );
    case "appeal":
      return (
        <>
          <rect x="13" y="6" width="38" height="52" rx="3" fill="none" stroke={b} strokeWidth="1.2" />
          <rect x="9" y="9" width="24" height="3" rx="1.5" fill={b} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x="9" y={17 + i * 6} width={i === 6 ? 20 : 38} height="2" rx="1" fill={a} />
          ))}
        </>
      );
    case "fax":
      return (
        <>
          <rect x="9" y="8" width="38" height="2" rx="1" fill={b} strokeDasharray="3 2" />
          <rect x="9" y="12" width="26" height="2" rx="1" fill={a} />
          <rect x="9" y="19" width="10" height="9" rx="2" fill="var(--st-dx-ink)" opacity=".75" />
          <rect x="23" y="20" width="24" height="2" rx="1" fill={a} />
          <rect x="23" y="25" width="16" height="2" rx="1" fill={a} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="9" y={35 + i * 6} width={i === 4 ? 22 : 38} height="2" rx="1" fill={a} />
          ))}
        </>
      );
    case "enrollment":
      return (
        <>
          <rect x="9" y="9" width="26" height="3" rx="1.5" fill={b} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x="9" y={17 + i * 9} width="38" height="6" rx="1.5" fill="none" stroke={b} strokeWidth="1.1" />
          ))}
          <path d="M10 54c3-6 5 3 8-2s4 3 7-1 4 2 7-1" fill="none" stroke="var(--st-pharm-ink)" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
        </>
      );
    default:
      return (
        <>
          <rect x="9" y="9" width="22" height="3" rx="1.5" fill={b} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x="9" y={18 + i * 6} width={i === 2 ? 24 : 38} height="2" rx="1" fill={a} />
          ))}
        </>
      );
  }
}

export interface DocCardProps {
  type: DocCardType;
  size?: "md" | "sm";
  state?: DocCardState;
  /** pa_letter only: draws a check (approved) or an x (denied). */
  outcome?: "approved" | "denied" | null;
  /** Shows "SENT" in the tag (the packet we sent, not the clinic's original). */
  sent?: boolean;
  ext?: string;
  /** Only where known (inbound faxes carry page_count); omitted otherwise, never guessed. */
  pages?: number | null;
  /** Show the "pdf · 2 pages" mono line under the sheet. Default: md only. */
  meta?: boolean;
  /** Announce the thumbnail; otherwise it is decorative (the row beside it carries the text). */
  label?: string;
  className?: string;
}

export function DocCard({ type, size = "md", state = "default", outcome, sent, ext, pages, meta, label, className }: DocCardProps) {
  const tag = TAG[type] ?? TAG.other;
  const showMeta = (meta ?? size === "md") && (ext || pages);
  const metaText = [ext, pages ? `${pages} page${pages === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ");
  return (
    <span
      className={cn("dc", className)}
      data-size={size}
      data-state={state}
      data-t={tag.holder}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <span className="dc-sheet">
        <svg viewBox="0 0 56 72" preserveAspectRatio="none" focusable="false"><Drawing type={type} outcome={outcome} /></svg>
        <span className="dc-tag">{sent ? "SENT" : tag.text}</span>
        {state === "failed" && <span className="dc-x" />}
        {state === "new" && <span className="dc-new" />}
      </span>
      {showMeta ? <span className="dc-meta">{metaText}</span> : null}
    </span>
  );
}
