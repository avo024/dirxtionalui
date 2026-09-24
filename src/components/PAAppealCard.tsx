import { useState } from "react";
import { AlertTriangle, Scale, CheckCircle2 } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

/**
 * Level-1 appeal controls for the admin referral workstation.
 * Renders only when the PA is denied (Start appeal) or in appeal (URGENT
 * banner + the three outcomes). Appeals won rejoin the normal pipeline —
 * the team records the new approval on the PA card, then Approve → Send.
 */
export function PAAppealCard({ referral, referralId, onChanged, hideActions }: {
  referral: any;
  referralId: string;
  onChanged: () => void | Promise<void>;
  /** Hides the card's own outcome/start buttons — the workstation drives
   *  those from the ActionBar instead (flow-script §7/§9). Status text and
   *  banners still render. */
  hideActions?: boolean;
}) {
  const [confirm, setConfirm] = useState<null | "start" | "won" | "level2" | "final">(null);
  const [busy, setBusy] = useState(false);

  const paStatus = referral?.pa_status;
  if (referral?.is_bridge_program || (paStatus !== "denied" && paStatus !== "appeal")) return null;

  // Terminal outcomes: the appeal already ENDED in a level-2 handoff or a
  // final denial — never re-offer "Start appeal"; this referral is out of
  // our hands (record a PA approval on the PA card if the clinic later
  // reports a level-2 win).
  const terminal = paStatus === "denied" && (referral?.appeal_outcome === "level2" || referral?.appeal_outcome === "final");
  if (terminal) {
    const isLevel2 = referral.appeal_outcome === "level2";
    return (
      <Card className="bg-muted-foreground/5 p-[var(--density-card-pad)]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary">
            <Scale width={15} height={15} strokeWidth={1.75} />
          </span>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">PA Appeal</h3>
          <span className="ml-auto inline-flex items-center rounded-full bg-muted-foreground/12 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            {isLevel2 ? "LEVEL 2 — HANDED OFF" : "FINAL — NO FURTHER APPEAL"}
          </span>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          {isLevel2
            ? "The level-1 appeal was lost and this moved to Level 2 — the insurer works with the clinic directly now. Nothing for us to do here; the clinic was emailed. If they report a level-2 win, record the approval on the PA card. Archive this referral when done."
            : "The appeal was lost and this drug has no second appeal level — the payer's decision is final. The clinic was emailed with bridge/cash options. Archive this referral when done."}
        </p>
      </Card>
    );
  }

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
    <Card className={cn("p-[var(--density-card-pad)]", paStatus === "appeal" && "border-destructive/45")}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary">
          <Scale width={15} height={15} strokeWidth={1.75} />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">PA Appeal</h3>
        {paStatus === "appeal" && (
          <span className="ml-auto inline-flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/14 px-2.5 py-1 text-[11px] font-bold text-destructive">
              <AlertTriangle width={11} height={11} />URGENT
            </span>
            {overdue ? (
              <span className="rounded-full bg-destructive/14 px-2.5 py-1 text-[11px] font-bold text-destructive">
                FOLLOW-UP DUE
              </span>
            ) : hoursLeft !== null && (
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
                check in {hoursLeft}h
              </span>
            )}
          </span>
        )}
      </div>

      {paStatus === "denied" && (
        <>
          <p className="mb-2.5 mt-2.5 text-sm leading-relaxed text-muted-foreground">
            The PA was denied. A level-1 appeal goes back to the insurer as
            expedited — most first appeals are worth filing.
          </p>
          {!hideActions && (
            <Button size="sm" disabled={busy} onClick={() => setConfirm("start")}>
              <Scale width={14} height={14} strokeWidth={1.75} />Start appeal
            </Button>
          )}
        </>
      )}

      {paStatus === "appeal" && (
        <>
          <p className="mb-2.5 mt-2.5 text-sm leading-relaxed text-muted-foreground">
            Level-1 appeal in progress with the insurer. Record the outcome when it lands:
          </p>
          {!hideActions && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" disabled={busy} onClick={() => setConfirm("won")}>
                <CheckCircle2 width={14} height={14} strokeWidth={1.75} />Appeal won
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm("level2")}>
                Lost — hand off (Level 2)
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirm("final")}
                title="For single-appeal drugs (e.g. some topicals) — no level 2 exists"
              >
                Lost — final (no level 2)
              </Button>
            </div>
          )}
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
    </Card>
  );
}
