/**
 * Next-action resolver — UI v2 Phase 2.
 *
 * Pure function: referral (+ enrollment) facts in, one next action out. The
 * queue row, the stage header, and the clinic status mapping all read from
 * this. Source of truth for every string here is
 * `docs/engineering/design/flow-script.md` §3–§6, §10 (clinic-api repo) —
 * every label, question, verb, primary/secondary and card name below is
 * copied verbatim from those tables. Do not invent wording; if the script
 * changes, this file changes with it.
 *
 * No React, no I/O, no `fetch`. `workstationStage.ts` (card-opening plan) is
 * untouched and unrelated — this resolver drives the queue row and stage
 * header, that one drives which cards the workstation pre-opens.
 */

import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────

export type Stage =
  | "processing"
  | "review"
  | "pa_pending"
  | "pa_submitted"
  | "pa_approved"
  | "pa_denied"
  | "appeal_build"
  | "appeal_sent"
  | "appeal_won"
  | "appeal_level2"
  | "appeal_final"
  | "ready_to_send"
  | "sent"
  | "rejected"
  | "closed";

export type EnrollmentStage =
  | "enr_draft"
  | "enr_draft_noform"
  | "enr_awaiting"
  | "enr_signed"
  | "enr_sent"
  | "enr_closed";

export type WaitingOn = "us" | "payer" | "clinic" | "manufacturer" | "pharmacy" | "system" | null;

export type InterruptKey =
  | "insurance_expired"
  | "delivery_issue"
  | "clinic_replied"
  | "inbound_fax"
  | "extraction_stuck";

export interface NextActionInterrupt {
  key: InterruptKey;
  verb: string;
}

export interface EnrollmentTrack {
  stage: EnrollmentStage;
  verb: string | null;
  question: string;
  waitingOn: WaitingOn;
  dueAt: Date | null;
  layout: "split" | "single";
  cards: string[];
  primary: string | null;
  secondary: string | null;
}

export interface NextAction {
  stage: Stage;
  label: string;
  question: string;
  verb: string | null;
  waitingOn: WaitingOn;
  dueAt: Date | null;
  overdue: boolean;
  layout: "split" | "single";
  cards: string[];
  defaultDocument: string | null;
  primary: string | null;
  secondary: string | null;
  more: string[];
  interrupt: NextActionInterrupt | null;
  signals: string[];
  tab: "us" | "others";
  track?: EnrollmentTrack | null;
}

export interface NextActionEnrollmentInput {
  status: "draft" | "awaiting_signatures" | "sent" | "closed";
  hasForm?: boolean;
  signatureTaskCompleted?: boolean;
}

export interface NextActionInput {
  // ── Referral fields (mirror admin.py / AdminReferralsList / AdminReferralReview) ──
  status: string | null | undefined;
  pa_status?: string | null;
  pa_required?: boolean | null;
  is_bridge_program?: boolean | null;
  insurance_expired?: boolean | null;
  delivery_issue_at?: string | null;
  pa_submitted_at?: string | null;
  appeal_started_at?: string | null;
  appeal_outcome?: "won" | "level2" | "final" | null;
  open_task_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;

  // ── Enrollment track ──
  enrollment?: NextActionEnrollmentInput | null;

  // ── Cross-cutting inputs ──
  openTasks?: number | null;
  latestTaskReplyAt?: string | null;
  unreadInboundFaxes?: number | null;

  // backend Phase 2 addition (flow-script §14 #2, #3): the admin referral
  // list query does not yet return these — they exist server-side as joins
  // on `referral_tasks` / inbound faxes but are not surfaced in the API
  // response today. Wired up as optional so the resolver is ready the day
  // the backend adds them.
  /** created_at of the oldest still-open task on this referral (flow-script §6 clinic-task clock). */
  oldestOpenTaskCreatedAt?: string | null;
  /** created_at of the latest inbound fax linked to this referral, for the "Fax received Xm ago" signal. */
  latestInboundFaxAt?: string | null;

  /** Injected for tests; defaults to `new Date()`. */
  now?: Date;
}

// ── Time helpers ───────────────────────────────────────────────────

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return result;
}

/** Compact relative-time string matching flow-script §2 row examples ("2d ago", "3h ago", "40m ago"). */
function compactAgo(dateStr: string, now: Date): string {
  const ms = now.getTime() - new Date(dateStr).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** "Thu 9:41 AM" — matches the due-time examples in flow-script §2/§3. */
function formatDue(date: Date): string {
  return format(date, "EEE h:mm a");
}

// ── Interrupts (flow-script §5) ───────────────────────────────────

const INTERRUPT_FIX_PRIMARY: Record<InterruptKey, string> = {
  delivery_issue: "Reset for resend",
  insurance_expired: "Fix expired insurance",
  inbound_fax: "Review inbound fax",
  clinic_replied: "Review clinic reply",
  extraction_stuck: "Re-extract",
};

const INTERRUPT_VERB: Record<InterruptKey, string> = {
  delivery_issue: "Fix delivery issue",
  insurance_expired: "Fix expired insurance",
  inbound_fax: "Review inbound fax",
  clinic_replied: "Review clinic reply",
  extraction_stuck: "Re-run extraction",
};

function detectInterrupt(input: NextActionInput, stage: Stage, now: Date): NextActionInterrupt | null {
  // Priority order per flow-script §5, as directed: delivery_issue,
  // insurance_expired, inbound_fax, clinic_replied, extraction_stuck.
  if (input.delivery_issue_at) return { key: "delivery_issue", verb: INTERRUPT_VERB.delivery_issue };
  if (input.insurance_expired) return { key: "insurance_expired", verb: INTERRUPT_VERB.insurance_expired };
  if ((input.unreadInboundFaxes ?? 0) > 0) return { key: "inbound_fax", verb: INTERRUPT_VERB.inbound_fax };
  if (input.latestTaskReplyAt) {
    const age = now.getTime() - new Date(input.latestTaskReplyAt).getTime();
    if (age >= 0 && age <= 7 * DAY_MS) return { key: "clinic_replied", verb: INTERRUPT_VERB.clinic_replied };
  }
  if (stage === "processing" && input.updated_at) {
    const age = now.getTime() - new Date(input.updated_at).getTime();
    if (age > 15 * 60_000) return { key: "extraction_stuck", verb: INTERRUPT_VERB.extraction_stuck };
  }
  return null;
}

// ── Stage config (flow-script §3) ─────────────────────────────────

interface StageConfig {
  question: string;
  verb: string | null;
  waitingOn: WaitingOn;
  layout: "split" | "single";
  cards: string[];
  defaultDocument: string | null;
  primary: string | null;
  secondary: string | null;
  more: string[];
}

function stageConfigFor(stage: Stage, input: NextActionInput): StageConfig {
  switch (stage) {
    case "processing":
      return {
        question: "Extraction is running.",
        verb: "Wait for extraction",
        waitingOn: "system",
        layout: "single",
        cards: ["Medication"],
        defaultDocument: "Referral",
        primary: null,
        secondary: "Re-extract",
        more: ["Archive"],
      };
    case "review": {
      const noPaRequired = !!input.is_bridge_program || !input.pa_required;
      const cards = ["Medication", "Clinical", "Patient", "PA path"];
      if (input.insurance_expired) cards.push("Insurance");
      return {
        question: "Does the extraction match the referral, and what is the PA path?",
        verb: "Review extraction",
        waitingOn: "us",
        layout: "split",
        cards,
        defaultDocument: "Referral form",
        primary: noPaRequired ? "Approve" : "Submit PA",
        secondary: "Reject",
        more: ["Re-extract", "Archive"],
      };
    }
    case "pa_pending":
      return {
        question: "File the PA on CoverMyMeds.",
        verb: "File PA on CMM",
        waitingOn: "us",
        layout: "split",
        cards: ["CMM worksheet (copyable fields in CMM order)", "Insurance"],
        defaultDocument: "Referral form",
        primary: "Filed on CoverMyMeds",
        secondary: "Reject",
        more: ["Open CoverMyMeds", "Archive"],
      };
    case "pa_submitted":
      return {
        question: "Has the payer decided?",
        verb: "Check CMM for decision",
        waitingOn: "payer",
        layout: "single",
        cards: ["PA"],
        defaultDocument: "Referral",
        primary: "Record decision",
        secondary: null,
        more: ["Archive"],
      };
    case "pa_approved":
      return {
        question: "Verify the approval, then approve to send.",
        verb: "Verify PA approval",
        waitingOn: "us",
        layout: "single",
        cards: ["PA (number, dates, letter on file)", "Medication"],
        defaultDocument: "PA approval letter if uploaded",
        primary: "Approve",
        secondary: "Upload letter (then View letter)",
        more: ["Reject", "Replace letter", "Delete letter", "Archive"],
      };
    case "pa_denied":
      return {
        question: "Why was it denied, and do we appeal?",
        verb: "Review denial, choose appeal",
        waitingOn: "us",
        layout: "split",
        cards: ["PA (denial reason)", "Appeal fork"],
        defaultDocument: "Denial letter (inbound fax if linked)",
        primary: "Start appeal",
        secondary: "Start bridge enrollment",
        more: ["Archive"],
      };
    case "appeal_build":
      return {
        question: "Build and fax the appeal packet.",
        verb: "Build appeal packet",
        waitingOn: "us",
        layout: "split",
        cards: ["Appeal packet builder", "Appeal outcomes"],
        defaultDocument: "Denial letter, then letter preview",
        primary: "Fax packet",
        secondary: "Preview",
        more: ["Archive"],
      };
    case "appeal_sent":
      return {
        question: "Has the payer ruled on the appeal?",
        verb: "Check appeal decision",
        waitingOn: "payer",
        layout: "single",
        cards: ["Appeal outcomes", "Packet (sent)"],
        defaultDocument: "Sent packet",
        primary: "Record outcome (won / level 2 / final)",
        secondary: null,
        more: ["Resend packet", "Archive"],
      };
    case "appeal_won":
      return {
        question: "Verify the approval, then approve to send.",
        verb: "Verify PA approval",
        waitingOn: "us",
        layout: "single",
        cards: ["PA", "Medication"],
        defaultDocument: "Approval letter",
        primary: "Approve",
        secondary: "Reject",
        more: ["Archive"],
      };
    case "appeal_level2":
      return {
        question: "Level 2 handoff. The insurer works with the clinic directly.",
        verb: null,
        waitingOn: "clinic",
        layout: "single",
        cards: ["Appeal outcomes"],
        defaultDocument: null,
        primary: null,
        secondary: null,
        more: ["Archive"],
      };
    case "appeal_final":
      return {
        question: "Appeal exhausted. Bridge program is the remaining option.",
        verb: "Offer bridge enrollment",
        waitingOn: "us",
        layout: "single",
        cards: ["Appeal outcomes", "Enrollment"],
        defaultDocument: null,
        primary: "Start bridge enrollment",
        secondary: null,
        more: ["Archive"],
      };
    case "ready_to_send":
      return {
        question: "Double-check the packet and send it to the pharmacy.",
        verb: "Send to pharmacy",
        waitingOn: "us",
        layout: "single",
        cards: [
          "Delivery summary (pharmacy, packet contents)",
          "PA summary (number, expiration, letter)",
          "Medication",
        ],
        defaultDocument: "Packet preview",
        primary: "Deliver",
        secondary: "Return to review",
        more: ["Preview PDF", "Archive"],
      };
    case "sent":
      return {
        question: "Delivered. Monitoring.",
        verb: "Monitor delivery",
        waitingOn: "pharmacy",
        layout: "single",
        cards: ["Delivery summary", "PA summary"],
        defaultDocument: "Sent packet",
        primary: null,
        secondary: null,
        more: ["Reset for resend", "Archive"],
      };
    case "rejected":
      return {
        question: "Waiting on the clinic to fix and resubmit.",
        verb: "Wait for clinic fix",
        waitingOn: "clinic",
        layout: "single",
        cards: ["Rejection reason", "Tasks"],
        defaultDocument: null,
        primary: null,
        secondary: null,
        more: ["Return to review", "Archive"],
      };
    case "closed":
    default:
      return {
        question: "Nothing to do.",
        verb: null,
        waitingOn: null,
        layout: "single",
        cards: ["Status strip", "Enrollment button"],
        defaultDocument: null,
        primary: null,
        secondary: null,
        more: ["Archive"],
      };
  }
}

// ── Stage detection (flow-script §3, bridge rule §3 footer) ──────

function detectStage(input: NextActionInput): Stage {
  const s = input.status || "";
  const pa = input.pa_status || "";
  const bridge = !!input.is_bridge_program;

  if (s === "processing" || s === "uploaded") return "processing";
  if (s === "rejected") return "rejected";
  if (s === "closed") {
    // Backend only closes a referral via the appeal-outcome endpoint today
    // (flow-script §14) — level2/final get their own stage even though the
    // underlying status is "closed".
    if (input.appeal_outcome === "level2") return "appeal_level2";
    if (input.appeal_outcome === "final") return "appeal_final";
    return "closed";
  }
  if (s === "sent_to_pharmacy") return "sent";
  if (s === "approved_to_send") return "ready_to_send";

  // Bridge referrals skip every PA stage.
  if (!bridge) {
    if (pa === "appeal") {
      if (input.appeal_outcome === "won") return "appeal_won";
      return input.appeal_started_at ? "appeal_sent" : "appeal_build";
    }
    if (pa === "denied") return "pa_denied";
    if (pa === "approved") return "pa_approved";
    if (pa === "submitted") return "pa_submitted";
    if (pa === "pending") return "pa_pending";
  }

  if (s === "ready_for_review") return "review";

  // No table row covers this combination (e.g. missing/unexpected status).
  // Fall back to "processing" as the least-wrong default — guessed, flag for Alex.
  return "processing";
}

// ── Enrollment track (flow-script §4) ─────────────────────────────

function detectEnrollmentStage(enrollment: NextActionEnrollmentInput): EnrollmentStage {
  if (enrollment.status === "draft") {
    return enrollment.hasForm === false ? "enr_draft_noform" : "enr_draft";
  }
  if (enrollment.status === "awaiting_signatures") {
    return enrollment.signatureTaskCompleted ? "enr_signed" : "enr_awaiting";
  }
  if (enrollment.status === "sent") return "enr_sent";
  return "enr_closed";
}

function enrollmentTrackConfig(stage: EnrollmentStage): Omit<EnrollmentTrack, "stage" | "dueAt"> {
  switch (stage) {
    case "enr_draft":
      return {
        question: "Fill the manufacturer form and send it for signature.",
        verb: "Send form for signature",
        waitingOn: "us",
        layout: "split",
        cards: ["Enrollment (filled preview, optional fields, adjusted copy)"],
        primary: "Send for signature",
        secondary: "Upload adjusted copy",
      };
    case "enr_draft_noform":
      return {
        question: "No manufacturer form. Follow the program notes.",
        verb: "Follow program notes",
        waitingOn: "us",
        layout: "single",
        cards: ["Enrollment (plain notes)"],
        primary: "Mark handled",
        secondary: null,
      };
    case "enr_awaiting":
      return {
        question: "Waiting on the clinic to sign.",
        verb: "Chase signature",
        waitingOn: "clinic",
        layout: "single",
        cards: ["Enrollment", "Tasks"],
        primary: null,
        secondary: "Resend request",
      };
    case "enr_signed":
      return {
        question: "Signed copy is back. Check it and fax.",
        verb: "Review signed form, fax",
        waitingOn: "us",
        layout: "split",
        cards: ["Enrollment"],
        primary: "Fax enrollment",
        secondary: "Upload adjusted copy",
      };
    case "enr_sent":
      return {
        question: "Waiting on the manufacturer.",
        verb: "Check manufacturer decision",
        waitingOn: "manufacturer",
        layout: "single",
        cards: ["Enrollment (sent record)"],
        primary: "Record outcome",
        secondary: null,
      };
    case "enr_closed":
    default:
      return {
        question: "",
        verb: null,
        waitingOn: null,
        layout: "single",
        cards: ["Enrollment"],
        primary: null,
        secondary: null,
      };
  }
}

function buildTrack(input: NextActionInput, now: Date): EnrollmentTrack | null {
  if (!input.enrollment) return null;
  const stage = detectEnrollmentStage(input.enrollment);
  const cfg = enrollmentTrackConfig(stage);

  // flow-script §6: the clinic-task clock (2 business days from the oldest
  // open task) is the only clock defined today for enr_awaiting — the
  // proposed 3-day "signature chase" clock is unconfirmed by Mari (§6, §12
  // Q3), so it is not implemented. Guessed — flag for Alex.
  let dueAt: Date | null = null;
  if (stage === "enr_awaiting" && input.oldestOpenTaskCreatedAt) {
    dueAt = addBusinessDays(new Date(input.oldestOpenTaskCreatedAt), 2);
  }

  return { stage, dueAt, ...cfg };
}

// ── Public helpers ─────────────────────────────────────────────────

const STAGE_LABELS: Record<Stage, string> = {
  processing: "Processing",
  review: "Review",
  pa_pending: "PA pending",
  pa_submitted: "PA submitted",
  pa_approved: "PA approved",
  pa_denied: "PA denied",
  appeal_build: "Appeal",
  appeal_sent: "Appeal",
  appeal_won: "PA approved",
  appeal_level2: "Level 2",
  appeal_final: "Appeal final",
  ready_to_send: "Ready to send",
  sent: "Sent",
  rejected: "Rejected",
  closed: "Closed",
};

export function stageLabelForQueue(stage: Stage | EnrollmentStage): string {
  if (stage in STAGE_LABELS) return STAGE_LABELS[stage as Stage];
  return "Enrollment";
}

export function groupKey(next: NextAction): string {
  return next.verb ?? "Other";
}

export function ballKey(next: NextAction): "Payer" | "Clinic" | "Manufacturer" | "Pharmacy" | "System" | null {
  switch (next.waitingOn) {
    case "payer": return "Payer";
    case "clinic": return "Clinic";
    case "manufacturer": return "Manufacturer";
    case "pharmacy": return "Pharmacy";
    case "system": return "System";
    default: return null;
  }
}

/**
 * flow-script §10 — clinic-facing statuses do not change. This returns the
 * raw `status` / `pa_status` values the existing StatusBadge / ClinicPABadge
 * already render; it never invents a new label.
 *
 * Known gap: appeal_level2 and appeal_final both collapse to
 * `paStatus: "appeal"` here because the two-field return shape has no slot
 * for `appeal_outcome`, which is what ClinicPABadge actually uses to tell
 * "PA In Appeal" apart from "PA Level 2" / "PA Final" (see
 * `ClinicPABadge status={pa_status} appealOutcome={appeal_outcome}` in
 * AdminReferralsList.tsx). Flagged for Alex — see final report.
 */
export function clinicView(next: NextAction): { status: string; paStatus: string | null; appealOutcome: "won" | "level2" | "final" | null } {
  switch (next.stage) {
    case "processing":
      return { status: "processing", paStatus: null, appealOutcome: null };
    case "review":
      return { status: "ready_for_review", paStatus: null, appealOutcome: null };
    case "pa_pending":
      return { status: "ready_for_review", paStatus: "pending", appealOutcome: null };
    case "pa_submitted":
      return { status: "ready_for_review", paStatus: "submitted", appealOutcome: null };
    case "pa_approved":
    case "appeal_won":
      return { status: "ready_for_review", paStatus: "approved", appealOutcome: null };
    case "pa_denied":
      return { status: "ready_for_review", paStatus: "denied", appealOutcome: null };
    case "appeal_build":
    case "appeal_sent":
      return { status: "ready_for_review", paStatus: "appeal", appealOutcome: null };
    // flow-script §10: level 2 / final close the referral; ClinicPABadge shows "PA Level 2" / "PA Final" via appealOutcome
    case "appeal_level2":
      return { status: "closed", paStatus: "denied", appealOutcome: "level2" };
    case "appeal_final":
      return { status: "closed", paStatus: "denied", appealOutcome: "final" };
    case "ready_to_send":
      return { status: "approved_to_send", paStatus: null, appealOutcome: null };
    case "sent":
      return { status: "sent_to_pharmacy", paStatus: null, appealOutcome: null };
    case "rejected":
      return { status: "rejected", paStatus: null, appealOutcome: null };
    case "closed":
    default:
      return { status: "closed", paStatus: null, appealOutcome: null };
  }
}

// ── Signals (row line 2) ──────────────────────────────────────────

function buildSignals(
  stage: Stage,
  input: NextActionInput,
  dueAt: Date | null,
  interrupt: NextActionInterrupt | null,
  now: Date,
): string[] {
  const signals: string[] = [];

  if (stage === "pa_submitted" && input.pa_submitted_at) {
    signals.push(`PA submitted ${compactAgo(input.pa_submitted_at, now)}`);
    if (dueAt) signals.push(`due ${formatDue(dueAt)}`);
  } else if ((stage === "appeal_sent") && input.appeal_started_at) {
    signals.push(`Appeal packet sent ${compactAgo(input.appeal_started_at, now)}`);
    if (dueAt) signals.push(`due ${formatDue(dueAt)}`);
  } else if (stage === "review" && input.created_at) {
    signals.push(`Uploaded ${compactAgo(input.created_at, now)}`);
  } else if (stage === "rejected" && (input.updated_at || input.created_at)) {
    signals.push(`Rejected ${compactAgo((input.updated_at || input.created_at) as string, now)}`);
  }

  if (interrupt) {
    switch (interrupt.key) {
      case "insurance_expired":
        signals.push("Insurance expired");
        break;
      case "delivery_issue":
        signals.push("Delivery issue");
        break;
      case "inbound_fax":
        signals.push(
          input.latestInboundFaxAt ? `Fax received ${compactAgo(input.latestInboundFaxAt, now)}` : "Fax received",
        );
        break;
      case "clinic_replied":
        signals.push(
          input.latestTaskReplyAt ? `Clinic replied ${compactAgo(input.latestTaskReplyAt, now)}` : "Clinic replied",
        );
        break;
      case "extraction_stuck":
        signals.push("Extraction stuck");
        break;
    }
  }

  return signals;
}

// ── Main resolver ───────────────────────────────────────────────────

export function resolveNextAction(input: NextActionInput): NextAction {
  const now = input.now ?? new Date();
  const stage = detectStage(input);
  const cfg = stageConfigFor(stage, input);

  // Clocks (flow-script §6).
  let dueAt: Date | null = null;
  if (stage === "pa_submitted" && input.pa_submitted_at) {
    dueAt = new Date(new Date(input.pa_submitted_at).getTime() + 72 * HOUR_MS);
  } else if (stage === "appeal_sent" && input.appeal_started_at) {
    dueAt = new Date(new Date(input.appeal_started_at).getTime() + 72 * HOUR_MS);
  } else if (stage === "rejected" && input.oldestOpenTaskCreatedAt) {
    dueAt = addBusinessDays(new Date(input.oldestOpenTaskCreatedAt), 2);
  }

  const overdue = dueAt !== null && dueAt.getTime() < now.getTime();

  const interrupt = detectInterrupt(input, stage, now);

  let verb = cfg.verb;
  let primary = cfg.primary;
  let secondary = cfg.secondary;
  if (interrupt) {
    verb = interrupt.verb;
    primary = INTERRUPT_FIX_PRIMARY[interrupt.key];
    secondary = cfg.primary;
  }

  const track = buildTrack(input, now);

  let result: NextAction = {
    stage,
    label: stageLabelForQueue(stage),
    question: cfg.question,
    verb,
    waitingOn: cfg.waitingOn,
    dueAt,
    overdue,
    layout: cfg.layout,
    cards: cfg.cards,
    defaultDocument: cfg.defaultDocument,
    primary,
    secondary,
    more: cfg.more,
    interrupt,
    signals: buildSignals(stage, input, dueAt, interrupt, now),
    tab: cfg.waitingOn === "us" || !!interrupt || overdue ? "us" : "others",
    track: null,
  };

  // "+1" mechanic (flow-script §2, §4): when both the referral stage and the
  // enrollment track are ours to act on, the row shows the earlier-due verb
  // and exposes the other as `track` ("+1"). The referral stage's Stage type
  // has no enrollment member, so — rather than force enrollment stage keys
  // into the Stage type to support a full swap — the referral stage always
  // leads the row (`stage`/`label`/`question` never become enrollment
  // values); when the track is strictly earlier-due than the referral
  // stage's own clock, its verb/primary takes the row's action-bar slot
  // while `stage`/`label`/`question` stay the referral's. Ties (both null,
  // or equal) keep the referral stage's own verb in the lead. This covers
  // the two-track test in flow-script §4 (both null dueAt ⇒ referral verb
  // leads, enrollment verb is the "+1"); the fully symmetric swap (where the
  // header itself flips to the enrollment question) is not implemented —
  // flagged for Alex.
  if (track && track.verb) {
    const stageOwnsIt = result.waitingOn === "us" && !!result.verb && !interrupt;
    const trackOwnsIt = track.waitingOn === "us" && !!track.verb;
    if (stageOwnsIt && trackOwnsIt && track.dueAt && (!result.dueAt || track.dueAt.getTime() < result.dueAt.getTime())) {
      result = { ...result, verb: track.verb, primary: track.primary, track };
    } else {
      result = { ...result, track };
    }
  }

  return result;
}
