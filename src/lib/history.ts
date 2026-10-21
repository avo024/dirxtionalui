/**
 * History timeline model (direction A: stage sections).
 *
 * Pure data: takes the clinic history rows `{ event_type, actor_type, metadata, created_at }`
 * plus the referral record and returns the stage sections the timeline renders.
 *
 *  - Labels are the clinic-facing EVENT_LABELS (moved here from ReferralDetail, unchanged).
 *  - VISIBLE_EVENTS stays the allowlist: an event type that isn't labelled is invisible.
 *  - The "Now" section comes from the REFERRAL (resolveNextAction stage), never from the last event.
 *  - "Appeal" only ghosts as an upcoming section after a `pa_denied` event.
 */
import { differenceInCalendarDays, format } from "date-fns";
import { resolveNextAction, type Stage } from "@/lib/nextAction";
import { toNextActionInput } from "@/lib/queueRows";

export const EVENT_LABELS: Record<string, string> = {
  referral_created: "Referral submitted", referral_finalized: "Documents submitted for processing",
  document_uploaded: "Document uploaded", ai_extraction_completed: "AI extraction completed",
  ai_extraction_completed_auto: "AI extraction completed",
  referral_approved: "Referral approved by admin", referral_rejected: "Referral needs attention",
  referral_rejectd: "Referral needs attention", referral_resubmitted: "Referral resubmitted by clinic",
  referral_edited_by_clinic: "Clinic corrected referral details", pharmacy_reassigned: "Pharmacy reassigned",
  delivery_completed: "Sent to pharmacy", sent_to_pharmacy: "Sent to pharmacy", delivery_failed: "Pharmacy delivery failed",
  delivery_issue_reported: "Delivery issue reported — team alerted",
  pa_submitted: "Prior authorization submitted", pa_approved: "Prior authorization approved",
  pa_denied: "Prior authorization denied", pa_processing: "Prior authorization in processing",
  pa_appeal_started: "Appeal filed with the insurer", pa_appeal_won: "Appeal won — PA approved",
  pa_appeal_level2: "Appeal moved to Level 2 (insurer will contact your office)",
  pa_appeal_final: "Appeal decision final",
  task_created: "Dirxctional requested something from your office",
  task_completed: "Request from Dirxctional completed",
  referral_archived: "Referral archived", referral_unarchived: "Referral restored",
};

// History is an ALLOWLIST of human milestones — compliance/telemetry events
// (document_accessed, validation passes, internal edits, eligibility checks…)
// live in the audit log, not the clinic's timeline. New audit event types are
// invisible here until deliberately added with a label.
export const VISIBLE_EVENTS = new Set(Object.keys(EVENT_LABELS));

export function eventLabel(t: string): string {
  return EVENT_LABELS[t] || t.replace(/_/g, " ").replace(/\b\w/, (c) => c.toUpperCase());
}

export type HistoryStageKey = "intake" | "review" | "pa" | "appeal" | "delivery" | "closed";

/** Canonical order of the sections. */
export const STAGE_ORDER: HistoryStageKey[] = ["intake", "review", "pa", "appeal", "delivery", "closed"];

export type HistoryHolder = "clinic" | "dx" | "payer" | "appeal" | "pharm" | "done";

export const STAGE_META: Record<HistoryStageKey, { name: string; holder: HistoryHolder }> = {
  intake: { name: "Intake", holder: "clinic" },
  review: { name: "Review", holder: "dx" },
  pa: { name: "Prior authorization", holder: "payer" },
  appeal: { name: "Appeal", holder: "appeal" },
  delivery: { name: "Delivery", holder: "pharm" },
  closed: { name: "Closed", holder: "done" },
};

/** event_type -> [stage, icon]. `null` stage = inherits the stage of the event before it. */
const EVENT_MAP: Record<string, [HistoryStageKey | null, string]> = {
  referral_created: ["intake", "created"],
  referral_finalized: ["intake", "finalized"],
  document_uploaded: ["intake", "upload"],
  referral_edited_by_clinic: ["intake", "edit"],
  referral_resubmitted: ["intake", "resubmitted"],
  referral_rejected: ["intake", "rejected"],
  referral_rejectd: ["review", "rejected"], // legacy typo variant
  ai_extraction_completed: ["review", "extracted"],
  ai_extraction_completed_auto: ["review", "extracted"],
  referral_approved: ["review", "approved"],
  pa_submitted: ["pa", "pa-submitted"],
  pa_processing: ["pa", "pa-processing"],
  pa_approved: ["pa", "pa-approved"],
  pa_denied: ["pa", "pa-denied"],
  pa_appeal_started: ["appeal", "appeal"],
  pa_appeal_level2: ["appeal", "appeal-level2"],
  pa_appeal_won: ["appeal", "appeal-won"],
  pa_appeal_final: ["appeal", "appeal-final"],
  sent_to_pharmacy: ["delivery", "sent-to-pharmacy"],
  delivery_completed: ["delivery", "delivered"],
  delivery_failed: ["delivery", "delivery-failed"],
  delivery_issue_reported: ["delivery", "delivery-issue"],
  pharmacy_reassigned: ["delivery", "pharmacy"],
  task_created: [null, "request"],
  task_completed: [null, "request-done"],
  referral_archived: ["closed", "archived"],
  referral_unarchived: ["closed", "restored"],
};

export interface HistoryRow {
  event_type: string;
  actor_type?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface HistoryEvent {
  type: string;
  stage: HistoryStageKey;
  icon: string;
  label: string;
  /** metadata.filename (uploads) / metadata.reason (needs attention). */
  detail?: string;
  /** "Your office" | "Dirxctional" | "Automatic" — from actor_type, never a person's name. */
  who?: string;
  at: string;
}

export type SectionState = "past" | "current" | "future";

export interface HistorySection {
  key: HistoryStageKey;
  name: string;
  holder: HistoryHolder;
  state: SectionState;
  events: HistoryEvent[];
}

export function actorLabel(actorType?: string | null): string | undefined {
  switch (actorType) {
    case "clinic_user": return "Your office";
    case "admin":
    case "internal_admin": return "Dirxctional";
    case "system": return "Automatic";
    default: return undefined;
  }
}

/** Referral -> the section it is in right now (from the record, not the events). */
export function currentSectionKey(referral: any): HistoryStageKey | null {
  if (!referral) return null;
  // Archiving sets archived_at and leaves status untouched (draft / needs-attention only).
  if (referral.archived_at) return "closed";
  const stage: Stage = resolveNextAction(toNextActionInput(referral)).stage;
  switch (stage) {
    case "rejected":
      return "intake";
    case "processing":
    case "review":
      return "review";
    case "pa_pending":
    case "pa_submitted":
    case "pa_approved":
    case "pa_denied":
      return "pa";
    case "appeal_build":
    case "appeal_sent":
    case "appeal_won":
    case "appeal_level2":
    case "appeal_final":
      return "appeal";
    case "ready_to_send":
    case "sent":
      return "delivery";
    case "closed":
      return "closed";
    default:
      return null;
  }
}

const rank = (k: HistoryStageKey) => STAGE_ORDER.indexOf(k);

export function groupHistory(rows: HistoryRow[] | null | undefined, referral?: any): HistorySection[] {
  const sorted = (rows || [])
    .filter((r) => VISIBLE_EVENTS.has(r.event_type))
    .map((r, i) => ({ r, i }))
    .sort((a, b) => new Date(a.r.created_at).getTime() - new Date(b.r.created_at).getTime() || a.i - b.i)
    .map((x) => x.r);

  const byStage = new Map<HistoryStageKey, HistoryEvent[]>();
  let prev: HistoryStageKey = "review";
  for (const r of sorted) {
    const [mapped, icon] = EVENT_MAP[r.event_type] ?? [null, "circle"];
    const stage = mapped ?? prev;
    prev = stage;
    const meta = r.metadata || {};
    let detail: string | undefined;
    if (r.event_type === "document_uploaded" && meta.filename) detail = String(meta.filename);
    else if ((r.event_type === "referral_rejected" || r.event_type === "referral_rejectd") && meta.reason) detail = String(meta.reason);
    const ev: HistoryEvent = {
      type: r.event_type, stage, icon, label: eventLabel(r.event_type), detail,
      who: actorLabel(r.actor_type), at: r.created_at,
    };
    if (!byStage.has(stage)) byStage.set(stage, []);
    byStage.get(stage)!.push(ev);
  }

  const current = currentSectionKey(referral);
  const hadDenial = sorted.some((r) => r.event_type === "pa_denied");
  // A closed referral (appeal level 2 / final hand-off) has nothing upcoming.
  const parked = !!referral && referral.status === "closed";
  const skipsPA = !!referral && (referral.pa_required === false || !!referral.is_bridge_program);

  const out: HistorySection[] = [];
  for (const key of STAGE_ORDER) {
    const events = byStage.get(key) || [];
    const isCurrent = current === key;
    const isFuture = !parked && current !== null && rank(key) > rank(current) && events.length === 0;
    if (isCurrent) {
      out.push({ key, ...STAGE_META[key], state: "current", events });
    } else if (events.length > 0) {
      out.push({ key, ...STAGE_META[key], state: "past", events });
    } else if (isFuture) {
      if (key === "closed") continue; // closing isn't promised
      if (key === "appeal" && !hadDenial) continue; // appeal only ghosts after a denial
      if (key === "pa" && skipsPA) continue;
      out.push({ key, ...STAGE_META[key], state: "future", events });
    }
  }
  return out;
}

/** "Oct 4 – Oct 7 · 3 days · 2 events" (parts drop out when they don't apply). */
export function sectionSpan(s: HistorySection): string {
  if (s.events.length === 0) return "";
  const first = new Date(s.events[0].at);
  const last = new Date(s.events[s.events.length - 1].at);
  const f = format(first, "MMM d");
  const l = format(last, "MMM d");
  const days = Math.max(0, differenceInCalendarDays(last, first));
  const parts = [f === l ? f : `${f} – ${l}`];
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  parts.push(`${s.events.length} event${s.events.length === 1 ? "" : "s"}`);
  return parts.join(" · ");
}
