import { describe, it, expect } from "vitest";
import { resolveNextAction, clinicView, type NextActionInput } from "./nextAction";

const NOW = new Date("2026-09-23T12:00:00.000Z"); // Wednesday

function base(overrides: Partial<NextActionInput>): NextActionInput {
  return { status: null, now: NOW, ...overrides };
}

describe("resolveNextAction — flow-script §3 admin stages", () => {
  it("processing", () => {
    const r = resolveNextAction(base({ status: "processing" }));
    expect(r.stage).toBe("processing");
    expect(r.verb).toBe("Wait for extraction");
    expect(r.question).toBe("Extraction is running.");
    expect(r.waitingOn).toBe("system");
    expect(r.layout).toBe("single");
    expect(r.primary).toBeNull();
    expect(r.secondary).toBe("Re-extract");
    expect(r.tab).toBe("others");
  });

  it("review — PA required (Submit PA primary)", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: null, pa_required: true }));
    expect(r.stage).toBe("review");
    expect(r.verb).toBe("Review extraction");
    expect(r.question).toBe("Does the extraction match the referral, and what is the PA path?");
    expect(r.waitingOn).toBe("us");
    expect(r.layout).toBe("split");
    expect(r.primary).toBe("Submit PA");
    expect(r.secondary).toBe("Reject");
    expect(r.tab).toBe("us");
  });

  it("review — Approve only when no PA required (pa_required false)", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_required: false }));
    expect(r.primary).toBe("Approve");
  });

  it("review — Approve when bridge program (skips PA regardless of pa_required)", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_required: true, is_bridge_program: true }));
    expect(r.primary).toBe("Approve");
    expect(r.stage).toBe("review");
  });

  it("pa_pending", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "pending" }));
    expect(r.stage).toBe("pa_pending");
    expect(r.verb).toBe("File PA on CMM");
    expect(r.question).toBe("File the PA on CoverMyMeds.");
    expect(r.waitingOn).toBe("us");
    expect(r.layout).toBe("split");
    expect(r.primary).toBe("Filed on CoverMyMeds");
    expect(r.secondary).toBe("Reject");
    expect(r.tab).toBe("us");
  });

  it("pa_submitted", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "submitted", pa_submitted_at: "2026-09-20T12:00:00.000Z" }));
    expect(r.stage).toBe("pa_submitted");
    expect(r.verb).toBe("Check CMM for decision");
    expect(r.question).toBe("Has the payer decided?");
    expect(r.waitingOn).toBe("payer");
    expect(r.layout).toBe("single");
    expect(r.primary).toBe("Record decision");
    expect(r.secondary).toBeNull();
  });

  it("pa_approved", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "approved" }));
    expect(r.stage).toBe("pa_approved");
    expect(r.verb).toBe("Verify PA approval");
    expect(r.question).toBe("Verify the approval, then approve to send.");
    expect(r.waitingOn).toBe("us");
    expect(r.layout).toBe("single");
    expect(r.primary).toBe("Approve");
    expect(r.secondary).toBe("Upload letter (then View letter)");
  });

  it("pa_denied", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "denied" }));
    expect(r.stage).toBe("pa_denied");
    expect(r.verb).toBe("Review denial, choose appeal");
    expect(r.question).toBe("Why was it denied, and do we appeal?");
    expect(r.waitingOn).toBe("us");
    expect(r.layout).toBe("split");
    expect(r.primary).toBe("Start appeal");
    expect(r.secondary).toBe("Start bridge enrollment");
  });

  it("appeal, packet not sent (appeal_build)", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "appeal", appeal_started_at: null }));
    expect(r.stage).toBe("appeal_build");
    expect(r.verb).toBe("Build appeal packet");
    expect(r.question).toBe("Build and fax the appeal packet.");
    expect(r.waitingOn).toBe("us");
    expect(r.layout).toBe("split");
    expect(r.primary).toBe("Fax packet");
    expect(r.secondary).toBe("Preview");
  });

  it("appeal, packet sent (appeal_sent)", () => {
    const r = resolveNextAction(base({
      status: "ready_for_review", pa_status: "appeal", appeal_started_at: "2026-09-20T12:00:00.000Z",
    }));
    expect(r.stage).toBe("appeal_sent");
    expect(r.verb).toBe("Check appeal decision");
    expect(r.question).toBe("Has the payer ruled on the appeal?");
    expect(r.waitingOn).toBe("payer");
    expect(r.layout).toBe("single");
    expect(r.primary).toBe("Record outcome (won / level 2 / final)");
    expect(r.secondary).toBeNull();
  });

  it("appeal won", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "appeal", appeal_outcome: "won" }));
    expect(r.stage).toBe("appeal_won");
    expect(r.verb).toBe("Verify PA approval");
    expect(r.question).toBe("Verify the approval, then approve to send.");
    expect(r.waitingOn).toBe("us");
    expect(r.layout).toBe("single");
    expect(r.primary).toBe("Approve");
    expect(r.secondary).toBe("Reject");
  });

  it("appeal level 2 (status closed, appeal_outcome level2)", () => {
    const r = resolveNextAction(base({ status: "closed", pa_status: "appeal", appeal_outcome: "level2" }));
    expect(r.stage).toBe("appeal_level2");
    expect(r.verb).toBeNull();
    expect(r.question).toBe("Level 2 handoff. The insurer works with the clinic directly.");
    expect(r.waitingOn).toBe("clinic");
    expect(r.layout).toBe("single");
    expect(r.primary).toBeNull();
    expect(r.secondary).toBeNull();
  });

  it("appeal final (status closed, appeal_outcome final)", () => {
    const r = resolveNextAction(base({ status: "closed", pa_status: "appeal", appeal_outcome: "final" }));
    expect(r.stage).toBe("appeal_final");
    expect(r.verb).toBe("Offer bridge enrollment");
    expect(r.question).toBe("Appeal exhausted. Bridge program is the remaining option.");
    expect(r.waitingOn).toBe("us");
    expect(r.layout).toBe("single");
    expect(r.primary).toBe("Start bridge enrollment");
    expect(r.secondary).toBeNull();
  });

  it("ready_to_send", () => {
    const r = resolveNextAction(base({ status: "approved_to_send" }));
    expect(r.stage).toBe("ready_to_send");
    expect(r.verb).toBe("Send to pharmacy");
    expect(r.question).toBe("Double-check the packet and send it to the pharmacy.");
    expect(r.waitingOn).toBe("us");
    expect(r.layout).toBe("single");
    expect(r.primary).toBe("Deliver");
    expect(r.secondary).toBe("Return to review");
  });

  it("sent", () => {
    const r = resolveNextAction(base({ status: "sent_to_pharmacy" }));
    expect(r.stage).toBe("sent");
    expect(r.verb).toBe("Monitor delivery");
    expect(r.question).toBe("Delivered. Monitoring.");
    expect(r.waitingOn).toBe("pharmacy");
    expect(r.layout).toBe("single");
    expect(r.primary).toBeNull();
    expect(r.secondary).toBeNull();
  });

  it("rejected", () => {
    const r = resolveNextAction(base({ status: "rejected" }));
    expect(r.stage).toBe("rejected");
    expect(r.verb).toBe("Wait for clinic fix");
    expect(r.question).toBe("Waiting on the clinic to fix and resubmit.");
    expect(r.waitingOn).toBe("clinic");
    expect(r.layout).toBe("single");
    expect(r.primary).toBeNull();
    expect(r.secondary).toBeNull();
  });

  it("closed (no appeal outcome)", () => {
    const r = resolveNextAction(base({ status: "closed" }));
    expect(r.stage).toBe("closed");
    expect(r.verb).toBeNull();
    expect(r.question).toBe("Nothing to do.");
    expect(r.waitingOn).toBeNull();
    expect(r.layout).toBe("single");
    expect(r.primary).toBeNull();
    expect(r.secondary).toBeNull();
  });

  it("bridge referral never enters a PA stage even with pa_status set", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "pending", is_bridge_program: true }));
    expect(r.stage).toBe("review");
    expect(r.stage).not.toBe("pa_pending");
  });
});

describe("resolveNextAction — flow-script §4 enrollment track", () => {
  it("draft, form available (enr_draft)", () => {
    const r = resolveNextAction(base({ status: "closed", enrollment: { status: "draft", hasForm: true } }));
    expect(r.track?.stage).toBe("enr_draft");
    expect(r.track?.verb).toBe("Send form for signature");
    expect(r.track?.question).toBe("Fill the manufacturer form and send it for signature.");
    expect(r.track?.waitingOn).toBe("us");
    expect(r.track?.layout).toBe("split");
    expect(r.track?.primary).toBe("Send for signature");
    expect(r.track?.secondary).toBe("Upload adjusted copy");
  });

  it("draft, no form (enr_draft_noform)", () => {
    const r = resolveNextAction(base({ status: "closed", enrollment: { status: "draft", hasForm: false } }));
    expect(r.track?.stage).toBe("enr_draft_noform");
    expect(r.track?.verb).toBe("Follow program notes");
    expect(r.track?.question).toBe("No manufacturer form. Follow the program notes.");
    expect(r.track?.layout).toBe("single");
    expect(r.track?.primary).toBe("Mark handled");
    expect(r.track?.secondary).toBeNull();
  });

  it("signature-chase clock is 48h from the signature task (flow-script §6)", () => {
    const now = new Date("2026-09-23T12:00:00Z");
    const r = resolveNextAction(base({ status: "ready_for_review", is_bridge_program: true, enrollment: { status: "awaiting_signatures" }, oldestOpenTaskCreatedAt: "2026-09-21T09:00:00Z", now }));
    expect(r.track?.stage).toBe("enr_awaiting");
    expect(r.track?.dueAt?.toISOString()).toBe("2026-09-23T09:00:00.000Z");
  });

  it("awaiting_signatures, not signed (enr_awaiting)", () => {
    const r = resolveNextAction(base({ status: "closed", enrollment: { status: "awaiting_signatures", signatureTaskCompleted: false } }));
    expect(r.track?.stage).toBe("enr_awaiting");
    expect(r.track?.verb).toBe("Chase signature");
    expect(r.track?.question).toBe("Waiting on the clinic to sign.");
    expect(r.track?.waitingOn).toBe("clinic");
    expect(r.track?.primary).toBeNull();
    expect(r.track?.secondary).toBe("Resend request");
  });

  it("awaiting_signatures, signature task completed (enr_signed)", () => {
    const r = resolveNextAction(base({ status: "closed", enrollment: { status: "awaiting_signatures", signatureTaskCompleted: true } }));
    expect(r.track?.stage).toBe("enr_signed");
    expect(r.track?.verb).toBe("Review signed form, fax");
    expect(r.track?.question).toBe("Signed copy is back. Check it and fax.");
    expect(r.track?.waitingOn).toBe("us");
    expect(r.track?.layout).toBe("split");
    expect(r.track?.primary).toBe("Fax enrollment");
  });

  it("sent (enr_sent)", () => {
    const r = resolveNextAction(base({ status: "closed", enrollment: { status: "sent" } }));
    expect(r.track?.stage).toBe("enr_sent");
    expect(r.track?.verb).toBe("Check manufacturer decision");
    expect(r.track?.question).toBe("Waiting on the manufacturer.");
    expect(r.track?.waitingOn).toBe("manufacturer");
    expect(r.track?.primary).toBe("Record outcome");
  });

  it("two-track: PA denied + enrollment draft", () => {
    const r = resolveNextAction(base({
      status: "ready_for_review", pa_status: "denied",
      enrollment: { status: "draft", hasForm: true },
    }));
    expect(r.verb).toBe("Review denial, choose appeal");
    expect(r.track?.verb).toBe("Send form for signature");
  });
});

describe("resolveNextAction — clocks (flow-script §6)", () => {
  it("pa_submitted: dueAt is exactly pa_submitted_at + 72h, not yet overdue", () => {
    const submittedAt = new Date(NOW.getTime() - 71 * 3600_000).toISOString();
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "submitted", pa_submitted_at: submittedAt }));
    expect(r.dueAt?.getTime()).toBe(new Date(submittedAt).getTime() + 72 * 3600_000);
    expect(r.overdue).toBe(false);
    expect(r.tab).toBe("others");
  });

  it("pa_submitted: overdue past 72h flips tab to us and sets overdue true", () => {
    const submittedAt = new Date(NOW.getTime() - 73 * 3600_000).toISOString();
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "submitted", pa_submitted_at: submittedAt }));
    expect(r.overdue).toBe(true);
    expect(r.tab).toBe("us");
  });

  it("appeal_sent: dueAt is appeal_started_at + 72h", () => {
    const startedAt = new Date(NOW.getTime() - 10 * 3600_000).toISOString();
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "appeal", appeal_started_at: startedAt }));
    expect(r.dueAt?.getTime()).toBe(new Date(startedAt).getTime() + 72 * 3600_000);
    expect(r.overdue).toBe(false);
  });
});

describe("resolveNextAction — interrupts (flow-script §5)", () => {
  it("delivery_issue replaces the verb, promotes to primary, tab = us", () => {
    const r = resolveNextAction(base({ status: "sent_to_pharmacy", delivery_issue_at: "2026-09-22T00:00:00.000Z" }));
    expect(r.interrupt?.key).toBe("delivery_issue");
    expect(r.verb).toBe("Fix delivery issue");
    expect(r.primary).toBe("Reset for resend");
    expect(r.secondary).toBeNull(); // sent stage's own primary was null
    expect(r.tab).toBe("us");
  });

  it("insurance_expired replaces the verb and promotes the stage's own primary to secondary", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_required: true, insurance_expired: true }));
    expect(r.interrupt?.key).toBe("insurance_expired");
    expect(r.verb).toBe("Fix expired insurance");
    expect(r.primary).toBe("Fix expired insurance");
    expect(r.secondary).toBe("Submit PA"); // review's own primary, demoted
    expect(r.tab).toBe("us");
  });

  it("inbound_fax interrupt fires when unreadInboundFaxes > 0", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "submitted", unreadInboundFaxes: 1 }));
    expect(r.interrupt?.key).toBe("inbound_fax");
    expect(r.verb).toBe("Review inbound fax");
    expect(r.primary).toBe("Review inbound fax");
    expect(r.tab).toBe("us");
  });

  it("clinic_replied interrupt fires when latestTaskReplyAt is recent", () => {
    const r = resolveNextAction(base({
      status: "rejected", latestTaskReplyAt: new Date(NOW.getTime() - 2 * 3600_000).toISOString(),
    }));
    expect(r.interrupt?.key).toBe("clinic_replied");
    expect(r.verb).toBe("Review clinic reply");
    expect(r.primary).toBe("Review clinic reply");
    expect(r.tab).toBe("us");
  });

  it("extraction_stuck fires after 15 minutes of no update while processing", () => {
    const r = resolveNextAction(base({
      status: "processing", updated_at: new Date(NOW.getTime() - 16 * 60_000).toISOString(),
    }));
    expect(r.interrupt?.key).toBe("extraction_stuck");
    expect(r.verb).toBe("Re-run extraction");
    expect(r.primary).toBe("Re-extract");
    expect(r.tab).toBe("us");
  });

  it("no interrupt when nothing is set", () => {
    const r = resolveNextAction(base({ status: "sent_to_pharmacy" }));
    expect(r.interrupt).toBeNull();
  });
});

describe("clinicView — flow-script §10 (raw values only, no new labels)", () => {
  it("level 2 / final close the referral and carry the appeal outcome for ClinicPABadge", () => {
    const l2 = resolveNextAction({ status: "closed", pa_status: "denied", appeal_outcome: "level2" } as NextActionInput);
    expect(clinicView(l2)).toEqual({ status: "closed", paStatus: "denied", appealOutcome: "level2" });
    const fin = resolveNextAction({ status: "closed", pa_status: "denied", appeal_outcome: "final" } as NextActionInput);
    expect(clinicView(fin)).toEqual({ status: "closed", paStatus: "denied", appealOutcome: "final" });
  });
  it("review", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_required: true }));
    expect(clinicView(r)).toEqual({ status: "ready_for_review", paStatus: null, appealOutcome: null });
  });

  it("pa_submitted", () => {
    const r = resolveNextAction(base({ status: "ready_for_review", pa_status: "submitted" }));
    expect(clinicView(r)).toEqual({ status: "ready_for_review", paStatus: "submitted", appealOutcome: null });
  });

  it("appeal_level2", () => {
    const r = resolveNextAction(base({ status: "closed", pa_status: "denied", appeal_outcome: "level2" }));
    expect(clinicView(r)).toEqual({ status: "closed", paStatus: "denied", appealOutcome: "level2" });
  });

  it("ready_to_send", () => {
    const r = resolveNextAction(base({ status: "approved_to_send" }));
    expect(clinicView(r)).toEqual({ status: "approved_to_send", paStatus: null, appealOutcome: null });
  });

  it("sent", () => {
    const r = resolveNextAction(base({ status: "sent_to_pharmacy" }));
    expect(clinicView(r)).toEqual({ status: "sent_to_pharmacy", paStatus: null, appealOutcome: null });
  });
});
