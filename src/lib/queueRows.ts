/**
 * Row -> resolver-input -> queue-row mapping for the admin queue (Phase 3).
 *
 * One place to wire a referral row (as `adminApi.getReferrals` returns it)
 * into the next-action resolver, and one place to turn the resolved
 * `NextAction` into what `QueueRow` renders. Fields the backend does not
 * return yet (flow-script §14 #2: signature-task status, unread inbound fax
 * count, latest task reply, oldest-open-task created_at) are simply omitted
 * here — `NextActionInput` already treats them as optional — so wiring them
 * up later is a one-line change in `toNextActionInput`.
 */

import { format } from "date-fns";
import { stageLabelForQueue, type NextAction, type NextActionInput } from "@/lib/nextAction";

export function toNextActionInput(row: any, now?: Date): NextActionInput {
  return {
    status: row.status,
    pa_status: row.pa_status,
    pa_required: row.pa_required,
    is_bridge_program: row.is_bridge_program,
    insurance_expired: row.insurance_expired,
    delivery_issue_at: row.delivery_issue_at,
    pa_submitted_at: row.pa_submitted_at,
    appeal_started_at: row.appeal_started_at,
    appeal_outcome: row.appeal_outcome,
    open_task_count: row.open_task_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // Not returned by the backend today (flow-script §14 #2) — omitted:
    // enrollment, openTasks, latestTaskReplyAt, unreadInboundFaxes,
    // oldestOpenTaskCreatedAt, latestInboundFaxAt.
    now,
  };
}

export interface QueueRowData {
  id: string;
  verb: string;
  due?: string;
  urgency?: "overdue" | "attention";
  patient: string;
  drug: string;
  bridge: boolean;
  clinic?: string;
  stage: string;
  stageTone?: "teal";
  signal?: string;
  extra?: { verb: string; due?: string; signal?: string };
  assignee: null;
  next: NextAction;
  raw: any;
}

/** Weekday + h:mm a, e.g. "Thu 2:14 PM" — flow-script §2 row examples. */
function formatDueAt(d: Date | null): string | undefined {
  if (!d) return undefined;
  return format(d, "EEE h:mm a");
}

export function toQueueRow(row: any, next: NextAction): QueueRowData {
  const isEnrollmentLed = false; // referral stage always leads the row (nextAction.ts comment); reserved for a future symmetric swap
  return {
    id: row.id,
    verb: next.verb ?? "",
    due: formatDueAt(next.dueAt),
    urgency: next.overdue ? "overdue" : next.interrupt ? "attention" : undefined,
    patient: row.patient_name,
    drug: row.drug || row.drug_requested || "—",
    bridge: !!row.is_bridge_program,
    clinic: row.clinic_name,
    stage: stageLabelForQueue(next.stage),
    stageTone: isEnrollmentLed ? "teal" : undefined,
    signal: next.signals.join(" · "),
    extra: next.track
      ? {
          verb: next.track.verb ?? "",
          due: formatDueAt(next.track.dueAt),
          signal: undefined,
        }
      : undefined,
    assignee: null,
    next,
    raw: row,
  };
}
