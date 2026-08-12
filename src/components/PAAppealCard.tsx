import { useState } from "react";
import { AlertTriangle, Scale, CheckCircle2 } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

/**
 * Level-1 appeal controls for the admin referral review screen.
 * Renders only when the PA is denied (Start appeal) or in appeal (URGENT
 * banner + the three outcomes). Appeals won rejoin the normal pipeline —
 * the team records the new approval on the PA card, then Approve → Send.
 */
export function PAAppealCard({ referral, referralId, onChanged }: {
  referral: any;
  referralId: string;
  onChanged: () => void | Promise<void>;
}) {
  const [confirm, setConfirm] = useState<null | "start" | "won" | "level2" | "final">(null);
  const [busy, setBusy] = useState(false);

  const paStatus = referral?.pa_status;
  if (referral?.is_bridge_program || (paStatus !== "denied" && paStatus !== "appeal")) return null;

  const overdue = !!referral?.appeal_followup_due;
  const startedAt = referral?.appeal_started_at;
  const hoursLeft = startedAt
    ? Math.max(0, Math.floor((new Date(startedAt).getTime() + 72 * 3600_000 - Date.now()) / 3600_000))
    : null;

  const run = async (action: "start" | "won" | "level2" | "final") => {
    setBusy(true);
    try {
      if (action === "start") {
        await adminApi.startAppeal(referralId);
        toast({ title: "Appeal started", description: "Filed as urgent — the payer owes an expedited decision. 72h follow-up clock is running." });
      } else {
        await adminApi.recordAppealOutcome(referralId, action);
        if (action === "won") {
          toast({ title: "Appeal won 🎉", description: "PA is approved. Record the new approval number/letter on the PA card, then Approve → Send as normal." });
        } else if (action === "level2") {
          toast({ title: "Handed off to Level 2", description: "The clinic has been emailed — the insurer works with them directly from here." });
        } else {
          toast({ title: "Recorded as final", description: "The clinic has been emailed that this decision is final (bridge/cash options)." });
        }
      }
      await onChanged();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <div className="arr-card" style={paStatus === "appeal" ? { borderColor: "color-mix(in srgb, var(--color-error) 45%, transparent)" } : undefined}>
      <div className="arr-card-head">
        <span className="hi"><Scale size={15} /></span>
        <h3>PA Appeal</h3>
        {paStatus === "appeal" && (
          <span className="he" style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 9999, background: "color-mix(in srgb, var(--color-error) 14%, transparent)", color: "var(--color-error)" }}>
              <AlertTriangle size={11} />URGENT
            </span>
            {overdue ? (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 9999, background: "color-mix(in srgb, var(--color-error) 14%, transparent)", color: "var(--color-error)" }}>
                FOLLOW-UP DUE
              </span>
            ) : hoursLeft !== null && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 9999, background: "var(--color-teal-50)", color: "var(--color-teal-700)" }}>
                check in {hoursLeft}h
              </span>
            )}
          </span>
        )}
      </div>

      {paStatus === "denied" && (
        <>
          <p className="text-sm" style={{ color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.5 }}>
            The PA was denied. A level-1 appeal goes back to the insurer as
            expedited — most first appeals are worth filing.
          </p>
          <button className="rw-btn primary sm" disabled={busy} onClick={() => setConfirm("start")}>
            <Scale size={14} />Start appeal
          </button>
        </>
      )}

      {paStatus === "appeal" && (
        <>
          <p className="text-sm" style={{ color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.5 }}>
            Level-1 appeal in progress with the insurer. Record the outcome when it lands:
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="rw-btn success sm" disabled={busy} onClick={() => setConfirm("won")}>
              <CheckCircle2 size={14} />Appeal won
            </button>
            <button className="rw-btn outline sm" disabled={busy} onClick={() => setConfirm("level2")}>
              Lost — hand off (Level 2)
            </button>
            <button className="rw-btn outline sm" disabled={busy} onClick={() => setConfirm("final")}
              title="For single-appeal drugs (e.g. some topicals) — no level 2 exists">
              Lost — final (no level 2)
            </button>
          </div>
        </>
      )}

      <ConfirmModal
        open={confirm !== null}
        onOpenChange={(o: boolean) => { if (!o) setConfirm(null); }}
        title={
          confirm === "start" ? "File a level-1 appeal?"
            : confirm === "won" ? "Record appeal as won?"
            : confirm === "level2" ? "Hand off to Level 2?"
            : "Record decision as final?"
        }
        description={
          confirm === "start" ? "This marks the referral urgent with a 72-hour follow-up clock and moves it to the First Appeal tab."
            : confirm === "won" ? "PA becomes approved. You'll then record the new approval number/letter on the PA card before sending."
            : confirm === "level2" ? "The clinic will be emailed that the insurer now works with their office directly, and this leaves the appeal tab."
            : "For drugs with no second appeal level. The clinic will be emailed that the payer's decision is final, with bridge/cash as remaining options."
        }
        confirmLabel={confirm === "start" ? "Start appeal" : confirm === "won" ? "Appeal won" : "Confirm"}
        variant={confirm === "won" ? "success" : undefined}
        onConfirm={() => confirm && run(confirm)}
      />
    </div>
  );
}
