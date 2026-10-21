import { describe, it, expect } from "vitest";
import { groupHistory, sectionSpan, actorLabel, currentSectionKey, type HistoryRow } from "./history";

const row = (event_type: string, at: string, extra: Partial<HistoryRow> = {}): HistoryRow => ({
  event_type, created_at: at, actor_type: "system", metadata: {}, ...extra,
});
const keys = (s: ReturnType<typeof groupHistory>) => s.map((x) => `${x.key}:${x.state}`);

describe("groupHistory", () => {
  it("rejected -> resubmitted stays one Intake section", () => {
    const rows = [
      row("referral_created", "2026-10-03T14:00:00Z", { actor_type: "clinic_user" }),
      row("referral_finalized", "2026-10-03T14:01:00Z", { actor_type: "clinic_user" }),
      row("referral_rejected", "2026-10-04T15:00:00Z", { actor_type: "admin", metadata: { reason: "Card missing" } }),
      row("referral_edited_by_clinic", "2026-10-05T15:00:00Z", { actor_type: "clinic_user" }),
      row("referral_resubmitted", "2026-10-05T15:05:00Z", { actor_type: "clinic_user" }),
    ];
    const out = groupHistory(rows, { status: "ready_for_review", pa_status: null, pa_required: true });
    const intake = out.filter((s) => s.key === "intake");
    expect(intake).toHaveLength(1);
    expect(intake[0].events.map((e) => e.type)).toEqual([
      "referral_created", "referral_finalized", "referral_rejected", "referral_edited_by_clinic", "referral_resubmitted",
    ]);
    expect(intake[0].state).toBe("past");
    expect(intake[0].events[2].detail).toBe("Card missing");
    expect(sectionSpan(intake[0])).toMatch(/ · 2 days · 5 events$/);
  });

  it("level-2 appeal: Appeal is the current section, PA is past, nothing upcoming (hand-off)", () => {
    const rows = [
      row("referral_created", "2026-10-01T10:00:00Z"),
      row("pa_submitted", "2026-10-02T10:00:00Z"),
      row("pa_denied", "2026-10-04T10:00:00Z"),
      row("pa_appeal_started", "2026-10-05T10:00:00Z"),
      row("pa_appeal_level2", "2026-10-08T10:00:00Z"),
    ];
    const out = groupHistory(rows, { status: "closed", appeal_outcome: "level2", pa_status: "denied", pa_required: true });
    expect(keys(out)).toEqual(["intake:past", "pa:past", "appeal:current"]);
    const appeal = out.find((s) => s.key === "appeal")!;
    expect(appeal.events.map((e) => e.label)).toEqual([
      "Appeal filed with the insurer",
      "Appeal moved to Level 2 (insurer will contact your office)",
    ]);
  });

  it("appeal only ghosts after a pa_denied, and delivery ghosts ahead of the current stage", () => {
    const base = [row("referral_created", "2026-10-01T10:00:00Z"), row("pa_submitted", "2026-10-02T10:00:00Z")];
    const noDenial = groupHistory(base, { status: "ready_for_review", pa_status: "submitted", pa_required: true });
    expect(keys(noDenial)).toEqual(["intake:past", "pa:current", "delivery:future"]);
    const denied = groupHistory([...base, row("pa_denied", "2026-10-03T10:00:00Z")], {
      status: "ready_for_review", pa_status: "denied", pa_required: true,
    });
    // denied but not yet appealing: PA is current, Appeal + Delivery are upcoming
    expect(keys(denied)).toEqual(["intake:past", "pa:current", "appeal:future", "delivery:future"]);
  });

  it("archived -> Closed section (archived_at leaves status untouched)", () => {
    const rows = [
      row("referral_created", "2026-10-01T10:00:00Z", { actor_type: "clinic_user" }),
      row("referral_archived", "2026-10-02T10:00:00Z", { actor_type: "clinic_user" }),
    ];
    const out = groupHistory(rows, { status: "uploaded", archived_at: "2026-10-02T10:00:00Z" });
    expect(keys(out)).toEqual(["intake:past", "closed:current"]);
    expect(out[1].events[0].label).toBe("Referral archived");
    expect(out[1].events[0].icon).toBe("archived");
  });

  it("a referral in review with only referral_created shows Review as Now (stage from status, not events)", () => {
    const out = groupHistory([row("referral_created", "2026-10-01T10:00:00Z", { actor_type: "clinic_user" })], {
      status: "ready_for_review", pa_status: null, pa_required: true,
    });
    expect(keys(out)).toEqual(["intake:past", "review:current", "pa:future", "delivery:future"]);
    expect(out.find((s) => s.key === "review")!.events).toHaveLength(0);
  });

  it("current section follows the referral, not the last event", () => {
    // last event is a delivery event but the referral record says it is back in review
    const out = groupHistory(
      [row("referral_created", "2026-10-01T10:00:00Z"), row("sent_to_pharmacy", "2026-10-02T10:00:00Z")],
      { status: "ready_for_review", pa_required: false },
    );
    expect(out.find((s) => s.state === "current")!.key).toBe("review");
  });

  it("bridge / no-PA referrals never ghost Prior authorization", () => {
    const out = groupHistory([row("referral_created", "2026-10-01T10:00:00Z")], { status: "ready_for_review", is_bridge_program: true });
    expect(out.map((s) => s.key)).not.toContain("pa");
  });

  it("keeps the VISIBLE_EVENTS allowlist and never exposes unlabelled events", () => {
    const out = groupHistory(
      [row("referral_created", "2026-10-01T10:00:00Z"), row("document_accessed", "2026-10-01T10:01:00Z"), row("admin_edit", "2026-10-01T10:02:00Z")],
      { status: "uploaded" },
    );
    expect(out.flatMap((s) => s.events.map((e) => e.type))).toEqual(["referral_created"]);
  });

  it("maps the special cases: _auto, typo variant, pharmacy_reassigned, tasks inherit the stage before them", () => {
    const rows = [
      row("referral_created", "2026-10-01T10:00:00Z"),
      row("ai_extraction_completed_auto", "2026-10-01T10:05:00Z"),
      row("referral_rejectd", "2026-10-01T11:00:00Z"),
      row("pa_submitted", "2026-10-02T10:00:00Z"),
      row("task_created", "2026-10-02T11:00:00Z"),
      row("task_completed", "2026-10-03T11:00:00Z"),
      row("pharmacy_reassigned", "2026-10-04T11:00:00Z"),
    ];
    const out = groupHistory(rows, { status: "approved_to_send", pa_status: "approved" });
    const stageOf = (t: string) => out.find((s) => s.events.some((e) => e.type === t))!.key;
    expect(stageOf("ai_extraction_completed_auto")).toBe("review");
    expect(stageOf("referral_rejectd")).toBe("intake"); // same as referral_rejected: the clinic holds a Needs-Attention referral
    expect(stageOf("task_created")).toBe("pa");
    expect(stageOf("task_completed")).toBe("pa");
    expect(stageOf("pharmacy_reassigned")).toBe("delivery");
    expect(out.find((s) => s.state === "current")!.key).toBe("delivery");
  });

  it("clinic viewer sees roles from actor_type, never names; filename is the upload detail", () => {
    expect(actorLabel("clinic_user")).toBe("Your office");
    expect(actorLabel("admin")).toBe("Dirxctional");
    expect(actorLabel("internal_admin")).toBe("Dirxctional");
    expect(actorLabel("system")).toBe("Automatic");
    expect(actorLabel(undefined)).toBeUndefined();
    const out = groupHistory(
      [row("document_uploaded", "2026-10-01T10:00:00Z", { actor_type: "clinic_user", metadata: { filename: "card.pdf" } })],
      { status: "uploaded" },
    );
    expect(out[0].events[0]).toMatchObject({ label: "Document uploaded", detail: "card.pdf", who: "Your office" });
  });

  it("currentSectionKey maps statuses", () => {
    expect(currentSectionKey({ status: "processing" })).toBe("review");
    expect(currentSectionKey({ status: "rejected" })).toBe("intake");
    expect(currentSectionKey({ status: "sent_to_pharmacy" })).toBe("delivery");
    expect(currentSectionKey(null)).toBeNull();
  });
});
