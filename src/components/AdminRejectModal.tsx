import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Search, X, ArrowRightLeft, CircleX, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Canonical keys — MUST match the clinic FixPanel + backend ──
// Document checklist → missing_fields.missing_documents (clinic MISSING_DOC_LABELS keys).
export const REJECT_DOC_OPTIONS = [
  { key: "referral_form", label: "Referral form / prescription" },
  { key: "insurance_front", label: "Insurance card — front" },
  { key: "insurance_back", label: "Insurance card — back" },
  { key: "chart_notes", label: "Chart notes" },
  { key: "prior_auth", label: "Prior authorization form" },
  { key: "demographics", label: "Patient demographics" },
];
// Flaggable fields → missing_fields.flagged_fields (clinic field paths so the ⚠ lands).
export const FLAGGABLE_FIELDS = [
  { path: "patient.dob", label: "Patient — Date of birth" },
  { path: "patient.phone", label: "Patient — Phone" },
  { path: "patient.email", label: "Patient — Email" },
  { path: "patient.address", label: "Patient — Address" },
  { path: "insurance.primary_member_id", label: "Insurance — Member ID" },
  { path: "insurance.primary_insurance_name", label: "Insurance — Plan name" },
  { path: "provider.npi", label: "Prescriber — NPI" },
  { path: "provider.dea_number", label: "Prescriber — DEA #" },
  { path: "clinical.diagnosis_icd10", label: "Clinical — Diagnosis ICD-10" },
  { path: "clinical.drug_requested", label: "Clinical — Drug requested" },
  { path: "clinical.dosing", label: "Clinical — Dose/strength" },
  { path: "clinical.quantity", label: "Clinical — Quantity" },
];

export interface RejectPayload {
  reason: string;
  missing_documents: string[];
  flagged_fields: string[];
}

export function AdminRejectModal({
  open, onOpenChange, onConfirm, defaultFlagged = [], submitting = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (p: RejectPayload) => void;
  defaultFlagged?: string[];
  submitting?: boolean;
}) {
  const [reason, setReason] = useState("");
  const [docs, setDocs] = useState<Set<string>>(new Set());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) {
      setReason(""); setDocs(new Set()); setFlagged(new Set(defaultFlagged)); setQ("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleDoc = (k: string) => setDocs((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleField = (p: string) => setFlagged((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  const matches = useMemo(() => FLAGGABLE_FIELDS.filter((f) =>
    f.label.toLowerCase().includes(q.toLowerCase()) || f.path.toLowerCase().includes(q.toLowerCase())), [q]);

  const canSubmit = reason.trim().length > 0 && !submitting;
  const submit = () => {
    if (!canSubmit) return;
    onConfirm({ reason: reason.trim(), missing_documents: [...docs], flagged_fields: [...flagged] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive"><CircleX className="h-5 w-5" />Reject referral</DialogTitle>
          <DialogDescription>
            Structured rejection — the clinic gets a precise recovery checklist, not a paragraph to parse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* 1 — reason */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Reason for rejection <span className="text-destructive">*</span></p>
            <p className="text-xs text-muted-foreground mb-2">Shown verbatim to the clinic. Be specific about what blocks approval.</p>
            <Textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Insurance card on file has expired. Upload a current copy of the front and back, then resubmit." />
          </div>

          {/* 2 — doc checklist */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-foreground">What's missing — documents</p>
              <span className="text-xs text-muted-foreground">{docs.size} ticked</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Tick the documents the clinic still needs. These become its recovery checklist.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REJECT_DOC_OPTIONS.map((d) => {
                const on = docs.has(d.key);
                return (
                  <button key={d.key} type="button" onClick={() => toggleDoc(d.key)}
                    className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      on ? "border-primary/40 bg-primary/[0.04] text-foreground" : "border-border hover:bg-secondary/50 text-muted-foreground")}>
                    <span className={cn("h-4 w-4 rounded border flex items-center justify-center shrink-0",
                      on ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 — flag fields */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-foreground">Flag fields to fix</p>
              <span className="text-xs text-muted-foreground">{flagged.size} flagged</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Pick extracted fields needing correction. The clinic sees a ⚠ on that exact field.</p>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-sm" placeholder="Search fields…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="max-h-44 overflow-y-auto rounded-md border border-border divide-y divide-border/60">
              {matches.length === 0 && <div className="px-3 py-4 text-center text-sm text-muted-foreground">No fields match “{q}”.</div>}
              {matches.map((f) => {
                const on = flagged.has(f.path);
                return (
                  <button key={f.path} type="button" onClick={() => toggleField(f.path)}
                    className={cn("flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors", on ? "bg-primary/[0.04]" : "hover:bg-secondary/40")}>
                    <span className={cn("h-4 w-4 rounded border flex items-center justify-center shrink-0",
                      on ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1 text-foreground">{f.label}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{f.path}</span>
                  </button>
                );
              })}
            </div>
            {flagged.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[...flagged].map((p) => {
                  const f = FLAGGABLE_FIELDS.find((x) => x.path === p);
                  return (
                    <span key={p} className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full pl-2.5 pr-1 py-0.5">
                      {f ? f.label : p}
                      <button onClick={() => toggleField(p)} className="p-0.5 rounded-full hover:bg-background" aria-label="Remove"><X className="h-3 w-3" /></button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border mt-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-auto"><ArrowRightLeft className="h-3.5 w-3.5" />Populates the clinic's Fix panel</span>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" disabled={!canSubmit} onClick={submit}>
            {submitting ? <span className="mr-1.5 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <CircleX className="h-4 w-4 mr-1.5" />}
            Reject &amp; notify clinic
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
