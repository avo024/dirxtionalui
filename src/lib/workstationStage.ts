/**
 * Workstation stage brain — ONE source of truth for "what does this referral
 * need right now", expressed as which summary cards open on load.
 *
 * From the stage map (Appeal Engine arc, Alex 2026-08-14): each stage = the
 * decision being made there = the cards that decision needs. The action cards
 * (appeal outcomes, appeal packet, clinic tasks) manage their own visibility
 * and are never collapsed — this brain governs the six static info cards.
 * Manual clicks always win after load; this only sets the table.
 */

export type WorkstationCardKey =
  | "patient"
  | "insurance"
  | "medication"
  | "pa"
  | "clinical"
  | "prescriber";

export const ALL_WORKSTATION_CARDS: WorkstationCardKey[] = [
  "patient", "insurance", "medication", "pa", "clinical", "prescriber",
];

export interface WorkstationInput {
  status: string | null | undefined;       // referral status
  paStatus: string | null | undefined;     // pa_status
  paRequired?: boolean | null;
  insuranceExpired?: boolean | null;       // interrupt: expired coverage opens Insurance
  isBridgeProgram?: boolean | null;
}

export interface WorkstationPlan {
  stage: string;                            // debug/telemetry label
  open: WorkstationCardKey[];
}

export function computeWorkstationPlan(r: WorkstationInput): WorkstationPlan {
  const open = new Set<WorkstationCardKey>();
  let stage = "unknown";

  const s = r.status || "";
  const pa = r.paStatus || "";

  if (s === "processing") {
    stage = "processing";
    open.add("medication");                 // "what's being requested" while AI runs
  } else if (s === "rejected") {
    stage = "rejected";                     // waiting on clinic — all folded, strip explains
  } else if (s === "closed") {
    stage = "closed";                       // nothing to do (bridge stays a button)
  } else if (s === "sent_to_pharmacy") {
    stage = "sent";                         // monitor only; delivery issue = unwrapped area
  } else if (s === "approved_to_send") {
    stage = "ready_to_send";                // the action bar IS the decision
  } else if (pa === "appeal") {
    stage = "appeal";                       // packet/outcome cards dominate, info folds
  } else if (pa === "denied") {
    stage = "pa_denied";
    open.add("pa");                         // denial reason = context for the appeal fork
  } else if (pa === "pending" || pa === "submitted" || pa === "approved") {
    stage = `pa_${pa}`;
    open.add("pa");                         // file it / record decision / verify approval
  } else if (s === "ready_for_review") {
    // Fresh review: verify what's being requested and why, then decide the
    // PA path — review flows straight into the PA decision (Alex's rule).
    stage = "review";
    open.add("medication");
    open.add("clinical");
    open.add("pa");
  }

  // Interrupts stack — expired insurance needs eyes regardless of stage.
  if (r.insuranceExpired) open.add("insurance");

  // Bridge referrals have no PA work — never auto-open the PA card.
  if (r.isBridgeProgram) open.delete("pa");

  return { stage, open: Array.from(open) };
}
