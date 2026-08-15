import { useEffect, useRef, useState } from "react";
import { FileText, Send, Eye, CheckCircle2, AlertTriangle, Loader2, Check } from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmModal } from "@/components/ConfirmModal";
import { adminApi, type AppealPacketResponse, type AppealPacketFieldDef, type AppealPacketDocument, type AppealPacketLetter } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
// arr-card styling lives with the admin review page; this card only renders there.
import "@/pages/admin/admin-referral-review.css";

const INDICATION_LABELS: Record<string, string> = {
  PSO: "Plaque psoriasis",
  PSA: "Psoriatic arthritis",
  HS: "Hidradenitis suppurativa",
  AD: "Atopic dermatitis",
  PN: "Prurigo nodularis",
  AA: "Alopecia areata",
  CHE: "Chronic hand eczema",
  BP: "Bullous pemphigoid",
  CSU: "Chronic urticaria",
};

const LETTER_KIND_LABELS: Record<string, string> = {
  appeal: "Appeal letter",
  lmn: "Medical necessity letter",
  appeal_lmn: "Appeal + medical necessity letter",
};

const prettifyDocType = (t?: string | null) => (t || "document").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Fill-in-the-blanks: every letter field that can end up empty gets a plain-
// language inline input right in the builder — Mari never hunts for where a
// blank lives. Fields with dedicated sections above are excluded.
const BLANK_FIELD_LABELS: Record<string, { label: string; hint?: string; textarea?: boolean }> = {
  payer_address: { label: "Insurance company's mailing address", hint: "It's printed on the denial letter, near the appeals instructions." },
  tb_attestation: { label: "TB screening statement", hint: "Example: Tuberculosis was ruled out by a negative QuantiFERON test on July 1, 2026.", textarea: true },
  plan_name: { label: "Insurance plan name" },
  member_id: { label: "Member ID" },
  group_number: { label: "Group number" },
  patient_name: { label: "Patient's name" },
  patient_dob: { label: "Patient's date of birth" },
  patient_address: { label: "Patient's address" },
  practice_name: { label: "Practice name" },
  practice_address: { label: "Practice address" },
  provider_name: { label: "Doctor's name" },
  provider_npi: { label: "Doctor's NPI" },
  provider_specialty: { label: "Doctor's specialty" },
  provider_phone: { label: "Office phone" },
  provider_fax: { label: "Office fax" },
  drug_name: { label: "Drug name" },
  drug_generic: { label: "Drug's generic name" },
  dose_frequency: { label: "Dose and frequency" },
  diagnosis: { label: "Diagnosis" },
  icd10: { label: "ICD-10 code" },
};
// Handled by their own sections, or harmless when empty — never shown as blanks.
const BLANK_EXCLUDED = new Set([
  "denial_reason", "denial_date", "case_reference", "treatment_history",
  "clinical_justification", "letter_date", "appeals_department", "severity_insert",
]);
const humanizeToken = (t: string) => t.replace(/_/g, " ");

type PacketKind = "appeal" | "appeal_lmn";

interface FormSnapshot {
  kind: PacketKind;
  indication: string | null;
  field_values: Record<string, string>;
  included_document_ids: string[];
  fax_number: string;
  is_expedited: boolean;
}

/**
 * Appeal packet builder — lets a (non-technical) PA specialist assemble and
 * fax a level-1 appeal packet: denial info, clinical picture, which
 * documents to include, and where to send it. Renders only while a level-1
 * appeal is open (pa_status === 'appeal'). Sits below PAAppealCard, which
 * owns the appeal outcome (won/level2/final) — this card only owns getting
 * the packet built and faxed.
 */
export function AppealPacketCard({ referralId, paStatus, appealStartedAt, onChanged }: {
  referralId: string;
  paStatus: string | null;
  appealStartedAt: string | null;
  onChanged?: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Server-derived shape (updated on every GET/PUT response).
  const [packetId, setPacketId] = useState<string | null>(null);
  const [severityFields, setSeverityFields] = useState<AppealPacketFieldDef[]>([]);
  const [indicationOptions, setIndicationOptions] = useState<string[]>([]);
  const [documents, setDocuments] = useState<AppealPacketDocument[]>([]);
  const resolvedFieldsRef = useRef<Record<string, string>>({}); // prefill hints from GET only

  // Editable form state.
  const [kind, setKind] = useState<PacketKind>("appeal");
  const [indication, setIndication] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [includedDocIds, setIncludedDocIds] = useState<string[]>([]);
  const [faxNumber, setFaxNumber] = useState("");
  const [isExpedited, setIsExpedited] = useState(true);

  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutosaveRef = useRef(true);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLetters, setPreviewLetters] = useState<AppealPacketLetter[]>([]);
  const [activePreviewKind, setActivePreviewKind] = useState<string>("");

  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [markSubmittedConfirmOpen, setMarkSubmittedConfirmOpen] = useState(false);
  const [markingSubmitted, setMarkingSubmitted] = useState(false);

  const populateForm = (data: AppealPacketResponse) => {
    skipAutosaveRef.current = true;
    const p = data.packet;
    resolvedFieldsRef.current = data.fields || {};
    setPacketId(p.id);
    setSeverityFields(data.severity_fields || []);
    setIndicationOptions(data.indication_options || []);
    setDocuments(data.documents || []);

    setKind(p.kind === "appeal_lmn" ? "appeal_lmn" : "appeal");
    const initialIndication = p.indication ?? (data.indication_options?.length === 1 ? data.indication_options[0] : null);
    setIndication(initialIndication);

    const fields = data.fields || {};
    const pv = p.field_values || {};
    const fixedKeys = ["denial_reason", "denial_date", "case_reference", "treatment_history", "clinical_justification"];
    const merged: Record<string, string> = {};
    for (const key of fixedKeys) merged[key] = pv[key] ?? fields[key] ?? "";
    for (const f of data.severity_fields || []) merged[f.key] = pv[f.key] ?? fields[f.key] ?? "";
    // Keep every other saved value too (fill-in-the-blanks answers must
    // survive leave-and-return, not just the named sections above).
    for (const k of Object.keys(pv)) if (!(k in merged)) merged[k] = pv[k] ?? "";
    setFieldValues(merged);
    setMissingFields(data.missing_fields || []);

    setIncludedDocIds(p.included_document_ids || []);
    setFaxNumber(p.fax_number || "");
    setIsExpedited(p.is_expedited ?? true);

    // Let the state settle before re-enabling the autosave watcher — the
    // load itself must never trigger a save.
    setTimeout(() => { skipAutosaveRef.current = false; }, 0);
  };

  const fetchPacket = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await adminApi.getAppealPacket(referralId);
      populateForm(data);
      setBuilderOpen(data.packet.id !== null); // reopen straight into a draft already in progress
    } catch (err: any) {
      console.error("appeal packet load failed", err);
      setLoadError(err.message || "Couldn't load the appeal packet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setJustSubmitted(false);
    fetchPacket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralId]);

  const applyServerMeta = (resp: AppealPacketResponse) => {
    setPacketId(resp.packet.id);
    setSeverityFields(resp.severity_fields || []);
    setIndicationOptions(resp.indication_options || []);
    setDocuments(resp.documents || []);
    setMissingFields(resp.missing_fields || []);
  };

  const saveDraft = async (overrides?: Partial<FormSnapshot>) => {
    const body = {
      kind: overrides?.kind ?? kind,
      indication: overrides?.indication ?? indication,
      field_values: overrides?.field_values ?? fieldValues,
      included_document_ids: overrides?.included_document_ids ?? includedDocIds,
      fax_number: (overrides?.fax_number ?? faxNumber) || null,
      is_expedited: overrides?.is_expedited ?? isExpedited,
    };
    setSaving(true);
    try {
      const resp = await adminApi.saveAppealPacket(referralId, body);
      applyServerMeta(resp);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err: any) {
      console.error("appeal packet save failed", err);
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const flushSave = async () => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    await saveDraft();
  };

  // Debounced autosave on any field change while the builder is open.
  useEffect(() => {
    if (!builderOpen || skipAutosaveRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { saveDraft(); }, 900);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, indication, fieldValues, includedDocIds, faxNumber, isExpedited, builderOpen]);

  const updateField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  // Indication change re-derives severity_fields server-side — flush right
  // away instead of waiting on the debounce so the new fields show up fast.
  const handleIndicationChange = (v: string) => {
    setIndication(v);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    saveDraft({ indication: v });
  };

  const toggleDoc = (docId: string, checked: boolean) => {
    setIncludedDocIds((prev) => (checked ? [...prev, docId] : prev.filter((id) => id !== docId)));
  };

  const openFreshBuilder = async () => {
    setJustSubmitted(false);
    await fetchPacket();
    setBuilderOpen(true);
  };

  const [packetPreviewLoading, setPacketPreviewLoading] = useState(false);
  const handlePacketPdfPreview = async () => {
    setPacketPreviewLoading(true);
    try {
      await flushSave();
      const blob = await adminApi.previewAppealPacketPdf(referralId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      // Give the new tab time to grab the blob before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      toast({ title: "Couldn't build the packet preview", description: err.message, variant: "destructive" });
    } finally {
      setPacketPreviewLoading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      await flushSave();
      const resp = await adminApi.previewAppealPacket(referralId, { field_values: fieldValues, indication: indication ?? undefined, kind });
      setPreviewLetters(resp.letters || []);
      setActivePreviewKind(resp.letters?.[0]?.kind || "");
      setPreviewOpen(true);
    } catch (err: any) {
      console.error("appeal packet preview failed", err);
      toast({ title: "Couldn't build preview", description: err.message, variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await flushSave();
      const resp = await adminApi.sendAppealPacket(referralId, faxNumber);
      toast({ title: "Appeal packet faxed", description: `${resp.page_count} page${resp.page_count === 1 ? "" : "s"} sent to ${faxNumber}.` });
      if (resp.skipped_documents?.length) {
        toast({ title: "Some documents were skipped", description: resp.skipped_documents.join(", "), variant: "destructive" });
      }
      setJustSubmitted(true);
      setBuilderOpen(false);
      setSendConfirmOpen(false);
      await onChanged?.();
    } catch (err: any) {
      console.error("appeal packet send failed", err);
      toast({ title: "Fax failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleMarkSubmitted = async () => {
    setMarkingSubmitted(true);
    try {
      // Flush any pending autosave first — a debounced PUT landing after the
      // draft flips to sent would create a stray new draft and reopen the builder.
      await flushSave();
      await adminApi.markAppealPacketSubmitted(referralId);
      toast({ title: "Marked as submitted", description: "The 72-hour follow-up clock is running." });
      setJustSubmitted(true);
      setBuilderOpen(false);
      setMarkSubmittedConfirmOpen(false);
      await onChanged?.();
    } catch (err: any) {
      console.error("appeal packet mark-submitted failed", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setMarkingSubmitted(false);
    }
  };

  if (paStatus !== "appeal") return null;

  const activeLetter = previewLetters.find((l) => l.kind === activePreviewKind) || previewLetters[0];

  return (
    <div className="arr-card">
      <div className="arr-card-head">
        <span className="hi"><FileText size={15} /></span>
        <h3>Appeal Packet</h3>
        {saving && (
          <span className="he" style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Loader2 size={11} className="animate-spin" />Saving…
          </span>
        )}
        {!saving && (
          <span className="he" style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "var(--color-success)", display: "inline-flex", alignItems: "center", gap: 4, opacity: savedFlash ? 1 : 0, transition: "opacity .4s" }}>
            <Check size={11} />Saved
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : loadError ? (
        <div>
          <p className="text-sm" style={{ color: "var(--color-error)", margin: "0 0 8px" }}>{loadError}</p>
          <button className="rw-btn outline sm" onClick={fetchPacket}>Try again</button>
        </div>
      ) : justSubmitted || (packetId === null && !!appealStartedAt && !builderOpen) ? (
        // ── State A: sent packet exists ──
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <CheckCircle2 size={15} style={{ color: "var(--color-success)" }} />
          <span className="text-sm" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            Appeal packet submitted — follow-up clock running
          </span>
          <button
            type="button"
            onClick={openFreshBuilder}
            style={{ marginLeft: "auto", font: "inherit", fontSize: 12.5, color: "var(--color-teal-700)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Build another packet
          </button>
        </div>
      ) : !builderOpen ? (
        // ── State B: no draft, not submitted ──
        <div style={{ border: "1px solid color-mix(in srgb, var(--color-warning) 40%, transparent)", background: "color-mix(in srgb, var(--color-warning) 8%, transparent)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={15} style={{ color: "var(--color-warning)" }} />
            <span className="text-sm" style={{ fontWeight: 700, color: "var(--text-primary)" }}>Appeal packet not sent yet</span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)", margin: "6px 0 10px", lineHeight: 1.5 }}>
            The 72-hour follow-up clock starts when the packet goes to the insurance company.
          </p>
          <button className="rw-btn primary sm" onClick={() => setBuilderOpen(true)}>
            <FileText size={13} />Build appeal packet
          </button>
        </div>
      ) : (
        // ── State C: builder open ──
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 1. The denial */}
          <div>
            <p className="arr-sub" style={{ margin: "0 0 10px" }}>The denial</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              <Label className="text-xs text-muted-foreground">What reason did the insurance company give? (copy it word-for-word from the denial letter)</Label>
              <Textarea rows={3} value={fieldValues.denial_reason || ""} onChange={(e) => updateField("denial_reason", e.target.value)} className="text-sm" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Label className="text-xs text-muted-foreground">Date on the denial letter</Label>
                <Input type="date" value={fieldValues.denial_date || ""} onChange={(e) => updateField("denial_date", e.target.value)} className="h-8 text-sm" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Label className="text-xs text-muted-foreground">Case or reference number</Label>
                <Input value={fieldValues.case_reference || ""} onChange={(e) => updateField("case_reference", e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* 2. The clinical picture */}
          <div>
            <p className="arr-sub" style={{ margin: "0 0 10px" }}>The clinical picture</p>
            {indicationOptions.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                <Label className="text-xs text-muted-foreground">Which condition is this for?</Label>
                <Select value={indication || ""} onValueChange={handleIndicationChange}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {indicationOptions.map((code) => (
                      <SelectItem key={code} value={code}>{INDICATION_LABELS[code] || code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {severityFields.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {severityFields.map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <Input value={fieldValues[f.key] || ""} onChange={(e) => updateField(f.key, e.target.value)} className="h-8 text-sm" />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              <Label className="text-xs text-muted-foreground">What has the patient already tried, and why did each stop? (include dates)</Label>
              <Textarea rows={3} value={fieldValues.treatment_history || ""} onChange={(e) => updateField("treatment_history", e.target.value)} className="text-sm" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Label className="text-xs text-muted-foreground">Why does this patient need this drug?</Label>
              <Textarea rows={3} value={fieldValues.clinical_justification || ""} onChange={(e) => updateField("clinical_justification", e.target.value)} className="text-sm" />
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                Answer only the denial reason above — extra information can trigger another denial.
              </p>
            </div>
          </div>

          {/* 2.5 Letter details — anything the letter can't pull from the
              referral. A field STAYS editable after it's filled (typos must
              be fixable), so the list is "ever-blank for this draft", not
              "currently blank". */}
          {(() => {
            const severityKeys = new Set(severityFields.map((f) => f.key));
            const candidates = new Set<string>();
            missingFields.forEach((k) => {
              if (!BLANK_EXCLUDED.has(k) && !severityKeys.has(k)) candidates.add(k);
            });
            // Fields Mari already answered (saved in the draft) stay visible.
            Object.keys(fieldValues).forEach((k) => {
              if (BLANK_FIELD_LABELS[k] && !severityKeys.has(k) && (fieldValues[k] || "").trim()) candidates.add(k);
            });
            const blanks = Array.from(candidates);
            if (blanks.length === 0) return null;
            const emptyCount = blanks.filter((k) => !(fieldValues[k] || "").trim()).length;
            const warn = emptyCount > 0;
            return (
              <div style={{
                background: warn ? "color-mix(in srgb, var(--color-warning) 7%, transparent)" : "var(--color-stone-50, transparent)",
                border: `1px solid ${warn ? "color-mix(in srgb, var(--color-warning) 30%, transparent)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-md)", padding: "12px 14px",
              }}>
                <p className="arr-sub" style={{ margin: "0 0 2px", color: warn ? "var(--color-warning)" : "var(--text-muted)" }}>
                  {warn ? "Letter details — some are still blank" : "Letter details you added"}
                </p>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "0 0 10px" }}>
                  {warn
                    ? "Anything left empty prints as ______ in the letter. Fill them here — they save with the draft."
                    : "These save with the draft — edit any of them anytime before sending."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {blanks.map((k) => {
                    const def = BLANK_FIELD_LABELS[k] || { label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
                    return (
                      <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <Label className="text-xs text-muted-foreground">{def.label}</Label>
                        {def.textarea ? (
                          <Textarea rows={2} value={fieldValues[k] || ""} onChange={(e) => updateField(k, e.target.value)} className="text-sm" placeholder={def.hint} />
                        ) : (
                          <Input value={fieldValues[k] || ""} onChange={(e) => updateField(k, e.target.value)} className="h-8 text-sm" />
                        )}
                        {def.hint && !def.textarea && (
                          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{def.hint}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 3. What goes in the packet */}
          <div>
            <p className="arr-sub" style={{ margin: "0 0 10px" }}>What goes in the packet</p>
            <RadioGroup value={kind} onValueChange={(v) => setKind(v as PacketKind)} className="mb-3">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="appeal" id="packet-kind-appeal" />
                <Label htmlFor="packet-kind-appeal" className="text-sm font-normal">Appeal letter</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="appeal_lmn" id="packet-kind-appeal-lmn" />
                <Label htmlFor="packet-kind-appeal-lmn" className="text-sm font-normal">Appeal letter + medical necessity letter</Label>
              </div>
            </RadioGroup>
            {/* Mari's rule of thumb (2026-08-14): the letter choice follows the
                denial reason — encode the judgment so it travels to PA hire #2. */}
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
              Which one? If the denial says the drug is <b>not on their formulary</b>, lean on the
              medical necessity letter. For <b>step-therapy or missing-documentation</b> denials, the
              appeal letter answers it directly. When unsure, send both.
              {(fieldValues.denial_reason || "").toLowerCase().includes("formulary") && kind === "appeal" && (
                <span style={{ display: "block", marginTop: 4, color: "var(--color-warning)", fontWeight: 600 }}>
                  This denial mentions the formulary — consider including the medical necessity letter.
                </span>
              )}
            </p>
            {documents.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 6 }}>
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`packet-doc-${doc.id}`}
                      checked={includedDocIds.includes(doc.id)}
                      onCheckedChange={(checked) => toggleDoc(doc.id, !!checked)}
                    />
                    <Label htmlFor={`packet-doc-${doc.id}`} className="text-sm font-normal" style={{ minWidth: 0, flex: 1 }}>
                      {doc.filename}
                      <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>
                        {prettifyDocType(doc.doc_type)}
                        {doc.uploaded_at ? ` · added ${formatDateShort(doc.uploaded_at)}` : ""}
                      </span>
                    </Label>
                    <button
                      type="button"
                      title="Peek at this document"
                      onClick={async () => {
                        try {
                          const res = await adminApi.getDocumentUrl(doc.id);
                          if (res?.url) window.open(res.url, "_blank", "noopener");
                        } catch (err: any) {
                          toast({ title: "Couldn't open document", description: err.message, variant: "destructive" });
                        }
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-teal)", padding: 2, flexShrink: 0 }}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
              Only PDFs can be faxed — other files will be skipped.
            </p>
          </div>

          {/* 4. Send it */}
          <div>
            <p className="arr-sub" style={{ margin: "0 0 10px" }}>Send it</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              <Label className="text-xs text-muted-foreground">Insurance company's fax number</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: "var(--text-muted)",
                  border: "1px solid hsl(var(--border))", borderRight: "none",
                  borderRadius: "6px 0 0 6px", padding: "0 8px", height: 32,
                  display: "inline-flex", alignItems: "center",
                  background: "var(--color-stone-50, hsl(var(--muted)))",
                }}>+1</span>
                <Input
                  value={faxNumber}
                  onChange={(e) => setFaxNumber(e.target.value)}
                  className="h-8 text-sm"
                  style={{ borderRadius: "0 6px 6px 0" }}
                  placeholder="(555) 555-5555"
                />
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                It's printed on the denial letter. Any format works — we add the +1 and clean it up automatically.
              </p>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Switch checked={isExpedited} onCheckedChange={setIsExpedited} id="packet-expedited" />
              <div>
                <Label htmlFor="packet-expedited" className="text-sm font-normal">Expedited (72-hour) review</Label>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Asks the insurance company to answer within 72 hours.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="rw-btn outline sm" disabled={previewLoading} onClick={handlePreview}>
                {previewLoading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}Preview letter
              </button>
              <button className="rw-btn outline sm" disabled={packetPreviewLoading} onClick={handlePacketPdfPreview} title="Cover page + letters + attached documents, merged — exactly what the payer's fax prints">
                {packetPreviewLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}Preview whole packet
              </button>
              <button className="rw-btn primary sm" disabled={sending || !faxNumber.trim()} onClick={() => setSendConfirmOpen(true)}>
                <Send size={13} />Fax the packet
              </button>
            </div>
            <button
              type="button"
              onClick={() => setMarkSubmittedConfirmOpen(true)}
              style={{ marginTop: 10, font: "inherit", fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              I submitted it another way
            </button>
          </div>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {previewLetters.length > 1 ? (
            <Tabs value={activePreviewKind} onValueChange={setActivePreviewKind}>
              <TabsList className="w-full mb-3">
                {previewLetters.map((l) => (
                  <TabsTrigger key={l.kind} value={l.kind} className="flex-1">
                    {LETTER_KIND_LABELS[l.kind] || l.kind}
                  </TabsTrigger>
                ))}
              </TabsList>
              {previewLetters.map((l) => (
                <TabsContent key={l.kind} value={l.kind}>
                  <PreviewLetterBody letter={l} />
                </TabsContent>
              ))}
            </Tabs>
          ) : activeLetter ? (
            <PreviewLetterBody letter={activeLetter} />
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No letter to preview.</p>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        title="Fax the appeal packet?"
        description={(() => {
          const severityKeys = new Set(severityFields.map((f) => f.key));
          const blanks = missingFields.filter(
            (k) => !BLANK_EXCLUDED.has(k) && !severityKeys.has(k) && !(fieldValues[k] || "").trim()
          );
          const base = `Fax the appeal packet to ${faxNumber}? This starts the 72-hour follow-up clock.`;
          if (blanks.length === 0) return base;
          const names = blanks.map((k) => (BLANK_FIELD_LABELS[k]?.label || k.replace(/_/g, " "))).slice(0, 4).join(", ");
          return `${base}\n\n⚠ The letter still has ${blanks.length} blank${blanks.length === 1 ? "" : "s"} (${names}${blanks.length > 4 ? "…" : ""}) — they'll print as ______.`;
        })()}
        confirmLabel={sending ? "Faxing…" : "Fax the packet"}
        onConfirm={handleSend}
      />

      <ConfirmModal
        open={markSubmittedConfirmOpen}
        onOpenChange={setMarkSubmittedConfirmOpen}
        title="Mark as submitted?"
        description="Use this when you sent the appeal through the insurance company's website or another way. The follow-up clock starts now."
        confirmLabel={markingSubmitted ? "Saving…" : "Mark as submitted"}
        onConfirm={handleMarkSubmitted}
      />
    </div>
  );
}

function PreviewLetterBody({ letter }: { letter: AppealPacketLetter }) {
  return (
    <div>
      {letter.missing_tokens?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {letter.missing_tokens.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 9999,
                background: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
                color: "var(--color-warning)",
              }}
            >
              Still blank: {humanizeToken(t)}
            </span>
          ))}
        </div>
      )}
      <pre
        style={{
          maxHeight: "55vh", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
          fontFamily: "var(--font-editorial), Georgia, serif", fontSize: 13.5, lineHeight: 1.6,
          padding: 14, borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)",
          background: "var(--color-stone-100, #f7f5f2)", margin: 0,
        }}
      >
        {letter.text}
      </pre>
    </div>
  );
}
