import { useEffect, useRef, useState } from "react";
import { Pill, Send, Eye, CheckCircle2, AlertTriangle, ShieldAlert, Ban, Loader2, Check, FileText, Upload } from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  adminApi,
  type EnrollmentResponse,
  type EnrollmentProgram,
  type EnrollmentDraft,
  type ReferralTask,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
// arr-card styling lives with the admin review page; this card only renders there.
import "@/pages/admin/admin-referral-review.css";

const humanizeToken = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Mirrors the backend's _consent_signers_sentence — plain-language "who signs". */
function consentSigners(events: EnrollmentProgram["consent_events"]): { sentence: string | null; count: number } {
  const labels: Record<string, string> = { patient: "the patient", prescriber: "the prescriber" };
  const seen: string[] = [];
  for (const ev of events || []) {
    const signer = (ev as any)?.signer;
    const label = labels[signer];
    if (label && !seen.includes(label)) seen.push(label);
  }
  if (seen.length === 0) return { sentence: null, count: 0 };
  if (seen.length === 1) return { sentence: seen[0], count: 1 };
  if (seen.length === 2) return { sentence: seen.join(" and "), count: 2 };
  return { sentence: seen.slice(0, -1).join(", ") + `, and ${seen[seen.length - 1]}`, count: seen.length };
}

function bridgeOfferLine(program: EnrollmentProgram): string {
  if (program.bridge_kind === "free_drug") {
    return `Free medication for the patient${program.bridge_terms ? ` — ${program.bridge_terms}` : ""}`;
  }
  if (program.bridge_kind === "cost_share") {
    return `Reduced cost for the patient${program.bridge_terms ? ` — ${program.bridge_terms}` : ""}`;
  }
  return program.notes || "No additional details on file.";
}

interface SentSummary {
  programName: string;
  submittedAt: string | null;
  assistanceEndsOn: string | null;
  faxStatus?: string | null;
}

/**
 * Manufacturer assistance enrollment builder — lets a (non-technical) admin
 * enroll a denied-referral patient into a manufacturer bridge program: check
 * eligibility, fill the form, route it for signatures (or straight to
 * submit for deferred-consent programs), and fax/mark it submitted. Mirrors
 * AppealPacketCard's draft/autosave/preview/send lifecycle closely — same
 * card chrome, same flush-before-actions discipline.
 */
export function EnrollmentCard({ referralId, paStatus, status, onChanged }: {
  referralId: string;
  paStatus: string | null;
  status: string | null;
  onChanged?: () => void | Promise<void>;
}) {
  const paEligible = paStatus === "denied" || paStatus === "appeal" || status === "closed";

  const [loading, setLoading] = useState(paEligible);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [programs, setPrograms] = useState<EnrollmentProgram[]>([]);
  const [draft, setDraft] = useState<EnrollmentDraft | null>(null);
  const [resolvedFieldValues, setResolvedFieldValues] = useState<Record<string, string>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [optionalBlankFields, setOptionalBlankFields] = useState<string[]>([]);
  const [formFillable, setFormFillable] = useState(true);
  const [sentSummary, setSentSummary] = useState<SentSummary | null>(null);

  // Editable builder state (only meaningful once a draft exists).
  const [programId, setProgramId] = useState<string | null>(null);
  const [formFile, setFormFile] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [commercialConfirmed, setCommercialConfirmed] = useState(false);
  const [faxNumber, setFaxNumber] = useState("");
  const [assistanceEndsOn, setAssistanceEndsOn] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutosaveRef = useRef(true);

  const [startingProgramId, setStartingProgramId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Admin's own edited copy of the form, in place of the auto-fill.
  const [uploadingAdjusted, setUploadingAdjusted] = useState(false);
  const [removeAdjustedConfirmOpen, setRemoveAdjustedConfirmOpen] = useState(false);
  const [removingAdjusted, setRemovingAdjusted] = useState(false);
  const adjustedFileRef = useRef<HTMLInputElement>(null);

  const [sendSigConfirmOpen, setSendSigConfirmOpen] = useState(false);
  const [sendingForSig, setSendingForSig] = useState(false);

  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [markSubmittedConfirmOpen, setMarkSubmittedConfirmOpen] = useState(false);
  const [markingSubmitted, setMarkingSubmitted] = useState(false);

  // Awaiting-signatures: the linked clinic task + which upload is the signed copy.
  const [signatureTask, setSignatureTask] = useState<ReferralTask | null>(null);
  const [selectedSignedDocId, setSelectedSignedDocId] = useState<string | null>(null);

  const applyResponse = (data: EnrollmentResponse) => {
    skipAutosaveRef.current = true;
    setPrograms(data.programs || []);
    setResolvedFieldValues(data.field_values || {});
    setMissingFields(data.missing_fields || []);
    setOptionalBlankFields(data.optional_blank_fields || []);
    setFormFillable(data.form_fillable !== false);
    setDraft(data.draft);
    if (data.draft) {
      setProgramId(data.draft.program_id);
      setFormFile(data.draft.form_file);
      setFieldValues(data.draft.field_values || {});
      setCommercialConfirmed(!!data.draft.commercial_confirmed);
      setFaxNumber(data.draft.fax_number || "");
      setAssistanceEndsOn(data.draft.assistance_ends_on ? String(data.draft.assistance_ends_on).slice(0, 10) : "");
    } else {
      setProgramId(null);
      setFormFile("");
      setFieldValues({});
      setCommercialConfirmed(false);
      setFaxNumber("");
      setAssistanceEndsOn("");
    }
    setTimeout(() => { skipAutosaveRef.current = false; }, 0);
  };

  const fetchEnrollment = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await adminApi.getEnrollment(referralId);
      applyResponse(data);
    } catch (err: any) {
      console.error("enrollment load failed", err);
      setLoadError(err.message || "Couldn't load assistance programs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSentSummary(null);
    setSelectedSignedDocId(null);
    if (paEligible) {
      fetchEnrollment();
    } else {
      setLoading(false);
      setPrograms([]);
      setDraft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralId, paEligible]);

  // Load the linked clinic task once a draft is awaiting signatures, so the
  // "which upload is the signed form?" picker has something to show.
  useEffect(() => {
    if (draft?.status === "awaiting_signatures" && draft.signature_task_id) {
      adminApi.getTasks(referralId)
        .then((res) => {
          const t = (res.items || []).find((x) => x.id === draft.signature_task_id);
          setSignatureTask(t || null);
        })
        .catch(() => setSignatureTask(null));
    } else {
      setSignatureTask(null);
    }
  }, [referralId, draft?.status, draft?.signature_task_id]);

  const saveDraft = async (overrides?: Partial<{
    programId: string; formFile: string; fieldValues: Record<string, string>;
    commercialConfirmed: boolean; faxNumber: string; assistanceEndsOn: string;
  }>) => {
    const pid = overrides?.programId ?? programId;
    const ff = overrides?.formFile ?? formFile;
    if (!pid || !ff) return;
    setSaving(true);
    try {
      const resp = await adminApi.saveEnrollment(referralId, {
        program_id: pid,
        form_file: ff,
        field_values: overrides?.fieldValues ?? fieldValues,
        commercial_confirmed: overrides?.commercialConfirmed ?? commercialConfirmed,
        fax_number: (overrides?.faxNumber ?? faxNumber) || null,
        assistance_ends_on: (overrides?.assistanceEndsOn ?? assistanceEndsOn) || null,
      });
      applyResponse(resp);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err: any) {
      console.error("enrollment save failed", err);
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
    // Only a status='draft' row is safe to autosave into — PUTting while
    // awaiting_signatures would silently start a second, unrelated draft.
    if (draft?.status === "draft") await saveDraft();
  };

  // Debounced autosave while the builder is open on a live draft.
  useEffect(() => {
    if (!draft || draft.status !== "draft" || skipAutosaveRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { saveDraft(); }, 900);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldValues, commercialConfirmed, faxNumber, assistanceEndsOn, formFile, draft?.status]);

  const updateField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  // Switching forms changes which PDF gets filled — flush right away instead
  // of waiting on the debounce.
  const handleFormFileChange = (v: string) => {
    setFormFile(v);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    saveDraft({ formFile: v });
  };

  const startEnrollment = async (program: EnrollmentProgram) => {
    const defaultFile = program.form_files.find((f) => f.calibrated)?.file || program.form_files[0]?.file;
    if (!defaultFile) {
      toast({ title: "No form on file", description: "This program doesn't have a form configured yet.", variant: "destructive" });
      return;
    }
    setStartingProgramId(program.id);
    try {
      const resp = await adminApi.saveEnrollment(referralId, {
        program_id: program.id,
        form_file: defaultFile,
        field_values: {},
        commercial_confirmed: false,
      });
      applyResponse(resp);
    } catch (err: any) {
      console.error("enrollment start failed", err);
      toast({ title: "Couldn't start enrollment", description: err.message, variant: "destructive" });
    } finally {
      setStartingProgramId(null);
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      await flushSave();
      const blob = await adminApi.previewEnrollmentPdf(referralId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      toast({ title: "Couldn't build the preview", description: err.message, variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUploadAdjusted = async (file: File) => {
    setUploadingAdjusted(true);
    try {
      const resp = await adminApi.uploadAdjustedEnrollment(referralId, file);
      applyResponse(resp);
      toast({ title: "Using your uploaded copy" });
    } catch (err: any) {
      toast({ title: "Couldn't upload your copy", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAdjusted(false);
      if (adjustedFileRef.current) adjustedFileRef.current.value = "";
    }
  };

  const handleRemoveAdjusted = async () => {
    setRemovingAdjusted(true);
    try {
      const resp = await adminApi.removeAdjustedEnrollment(referralId);
      applyResponse(resp);
      toast({ title: "Removed — back to the auto-filled form" });
      setRemoveAdjustedConfirmOpen(false);
    } catch (err: any) {
      toast({ title: "Couldn't remove your copy", description: err.message, variant: "destructive" });
    } finally {
      setRemovingAdjusted(false);
    }
  };

  const handleSendForSignatures = async () => {
    setSendingForSig(true);
    try {
      await flushSave();
      await adminApi.sendEnrollmentForSignatures(referralId);
      toast({ title: "Sent to the clinic for signatures" });
      setSendSigConfirmOpen(false);
      await fetchEnrollment();
      await onChanged?.();
    } catch (err: any) {
      console.error("enrollment send-for-signatures failed", err);
      toast({ title: "Couldn't send for signatures", description: err.message, variant: "destructive" });
    } finally {
      setSendingForSig(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await flushSave();
      const resp = await adminApi.submitEnrollment(referralId, {
        signed_document_id: selectedSignedDocId || undefined,
        fax_number: faxNumber || undefined,
        assistance_ends_on: assistanceEndsOn || undefined,
      });
      toast({ title: "Enrollment faxed", description: `${resp.page_count} page${resp.page_count === 1 ? "" : "s"} sent.` });
      setSentSummary({
        programName: currentProgram?.program_name || "the program",
        submittedAt: resp.submitted_at,
        assistanceEndsOn: assistanceEndsOn || null,
      });
      setSubmitConfirmOpen(false);
      await onChanged?.();
    } catch (err: any) {
      console.error("enrollment submit failed", err);
      toast({ title: "Fax failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkSubmitted = async () => {
    setMarkingSubmitted(true);
    try {
      // Flush any pending autosave first — a debounced PUT landing after the
      // draft flips to sent would create a stray new draft and reopen the builder.
      await flushSave();
      const resp = await adminApi.markEnrollmentSubmitted(referralId, { assistance_ends_on: assistanceEndsOn || undefined });
      toast({ title: "Marked as submitted" });
      setSentSummary({
        programName: currentProgram?.program_name || "the program",
        submittedAt: resp.submitted_at,
        assistanceEndsOn: assistanceEndsOn || null,
      });
      setMarkSubmittedConfirmOpen(false);
      await onChanged?.();
    } catch (err: any) {
      console.error("enrollment mark-submitted failed", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setMarkingSubmitted(false);
    }
  };

  const openFreshOfferView = async () => {
    setSentSummary(null);
    await fetchEnrollment();
  };

  if (!paEligible) return null;
  if (loading) {
    return (
      <div className="arr-card">
        <div className="arr-card-head"><span className="hi"><Pill size={15} /></span><h3>Manufacturer Assistance</h3></div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="arr-card">
        <div className="arr-card-head"><span className="hi"><Pill size={15} /></span><h3>Manufacturer Assistance</h3></div>
        <p className="text-sm" style={{ color: "var(--color-error)", margin: "0 0 8px" }}>{loadError}</p>
        <button className="rw-btn outline sm" onClick={fetchEnrollment}>Try again</button>
      </div>
    );
  }
  if (programs.length === 0) return null;

  const currentProgram = programs.find((p) => p.id === programId) || null;
  const warnings = currentProgram?.eligibility_warnings || [];
  const stateExcludedWarning = warnings.find((w) => w.code === "state_excluded");
  const remsWarning = warnings.find((w) => w.code === "rems");
  const otherWarnings = warnings.filter((w) => w.code !== "state_excluded" && w.code !== "rems");
  const blocking = !!stateExcludedWarning;
  const canFinalize = commercialConfirmed && !blocking;

  const { sentence: signersSentence, count: signerCount } = currentProgram
    ? consentSigners(currentProgram.consent_events)
    : { sentence: null, count: 0 };
  const needsSignatures = !!signersSentence;
  const signVerb = signerCount === 1 ? "needs" : "need";

  const faxReadOnly = !!(currentProgram?.routing_mode === "fax_to_program" && currentProgram?.submission_fax);
  const destinationLabel = faxReadOnly
    ? currentProgram!.submission_fax!
    : (faxNumber ? `+1 ${faxNumber}` : "the specialty pharmacy's fax number");

  // Fill-in-the-blanks: server-computed missing tokens, plus anything Mari
  // already answered so it stays editable (never disappears mid-draft).
  const blankCandidates = new Set<string>(missingFields);
  Object.keys(fieldValues).forEach((k) => { if ((fieldValues[k] || "").trim()) blankCandidates.add(k); });
  const blanks = Array.from(blankCandidates);
  const optionalBlanks = optionalBlankFields.filter((k) => !blankCandidates.has(k));
  const prefilledEntries = Object.entries(resolvedFieldValues).filter(([k, v]) => !!v && !blankCandidates.has(k));

  return (
    <div className="arr-card">
      <div className="arr-card-head">
        <span className="hi"><Pill size={15} /></span>
        <h3>Manufacturer Assistance</h3>
        {draft?.status === "draft" && saving && (
          <span className="he" style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Loader2 size={11} className="animate-spin" />Saving…
          </span>
        )}
        {draft?.status === "draft" && !saving && (
          <span className="he" style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "var(--color-success)", display: "inline-flex", alignItems: "center", gap: 4, opacity: savedFlash ? 1 : 0, transition: "opacity .4s" }}>
            <Check size={11} />Saved
          </span>
        )}
      </div>

      {sentSummary ? (
        // ── State D: sent ──
        <div style={{ border: "1px solid color-mix(in srgb, var(--color-success) 35%, transparent)", background: "color-mix(in srgb, var(--color-success) 8%, transparent)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <CheckCircle2 size={15} style={{ color: "var(--color-success)" }} />
            <span className="text-sm" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              Enrolled — sent to {sentSummary.programName}{sentSummary.submittedAt ? ` ${formatDateShort(sentSummary.submittedAt)}` : ""}
            </span>
          </div>
          {sentSummary.assistanceEndsOn && (
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "6px 0 0" }}>
              Assistance runs out {formatDateShort(sentSummary.assistanceEndsOn)}
            </p>
          )}
          {sentSummary.faxStatus && (
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Fax status: {sentSummary.faxStatus}
            </p>
          )}
          <button
            type="button"
            onClick={openFreshOfferView}
            style={{ marginTop: 8, font: "inherit", fontSize: 12.5, color: "var(--color-teal-700)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Enroll in another program
          </button>
        </div>
      ) : !draft ? (
        // ── State A: collapsed offer(s) ──
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {programs.map((program) => (
            <div
              key={program.id}
              style={{
                border: "1px solid var(--color-teal-100)", background: "var(--color-teal-50)",
                borderRadius: "var(--radius-md)", padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                <span className="text-sm" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  💊 Manufacturer assistance available — {program.program_name}
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-body)", margin: "6px 0 0", lineHeight: 1.5 }}>
                {bridgeOfferLine(program)}
              </p>
              {program.appeal_linkage && (
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-warning)", margin: "6px 0 0" }}>
                  ⚠ Requires an appeal on file — {program.appeal_linkage}
                </p>
              )}
              {program.bridge_kind !== "none" && (
                <button
                  className="rw-btn primary sm"
                  style={{ marginTop: 10 }}
                  disabled={startingProgramId === program.id}
                  onClick={() => startEnrollment(program)}
                >
                  {startingProgramId === program.id ? <Loader2 size={13} className="animate-spin" /> : <Pill size={13} />}Start enrollment
                </button>
              )}
            </div>
          ))}
        </div>
      ) : draft.status === "awaiting_signatures" ? (
        // ── State C: awaiting signatures ──
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
            <p className="text-sm" style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              Waiting on the clinic{draft.updated_at ? ` — task sent ${formatDateShort(draft.updated_at)}` : ""}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {signersSentence ? `${signersSentence} ${signVerb} to sign the form.` : "Waiting on the clinic to return the signed form."}
            </p>
          </div>

          {signatureTask && (signatureTask.response_documents?.length ?? 0) > 0 ? (
            <div>
              <p className="arr-sub" style={{ margin: "0 0 8px" }}>Which upload is the signed form?</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {signatureTask.response_documents.map((doc) => (
                  <label key={doc.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="enroll-signed-doc"
                      checked={selectedSignedDocId === doc.id}
                      onChange={() => setSelectedSignedDocId(doc.id)}
                    />
                    <FileText size={13} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                    {doc.filename}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No uploads from the clinic yet.</p>
          )}

          {!canFinalize && (
            <p style={{ fontSize: 12, color: "var(--color-error)", margin: 0 }}>
              {blocking ? stateExcludedWarning!.message : "Confirm commercial insurance above before submitting."}
            </p>
          )}

          <SubmitSection
            faxReadOnly={faxReadOnly}
            currentProgram={currentProgram}
            faxNumber={faxNumber}
            setFaxNumber={setFaxNumber}
            assistanceEndsOn={assistanceEndsOn}
            setAssistanceEndsOn={setAssistanceEndsOn}
            previewLoading={previewLoading}
            onPreview={handlePreview}
            submitDisabled={!canFinalize || !selectedSignedDocId || submitting || (!faxReadOnly && !faxNumber.trim())}
            onSubmitClick={() => setSubmitConfirmOpen(true)}
            onMarkSubmittedClick={() => setMarkSubmittedConfirmOpen(true)}
          />
        </div>
      ) : (
        // ── State B: builder open (draft.status === 'draft') ──
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 1. Check eligibility */}
          <div>
            <p className="arr-sub" style={{ margin: "0 0 10px" }}>Check eligibility</p>
            <EligibilitySection
              otherWarnings={otherWarnings} stateExcludedWarning={stateExcludedWarning} remsWarning={remsWarning}
              commercialConfirmed={commercialConfirmed} setCommercialConfirmed={setCommercialConfirmed}
            />
          </div>

          {/* 2. The form */}
          <div>
            <p className="arr-sub" style={{ margin: "0 0 10px" }}>The form</p>
            {currentProgram && currentProgram.form_files.length > 1 && (
              <RadioGroup value={formFile} onValueChange={handleFormFileChange} className="mb-3">
                {currentProgram.form_files.map((f) => (
                  <div key={f.file} className="flex items-center gap-2">
                    <RadioGroupItem value={f.file} id={`enroll-form-${f.file}`} disabled={!f.calibrated} />
                    <Label htmlFor={`enroll-form-${f.file}`} className="text-sm font-normal">
                      {f.label || f.file}
                      {!f.calibrated && <span style={{ color: "var(--text-muted)" }}> — not ready yet — needs calibration</span>}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {prefilledEntries.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "0 0 6px" }}>Already filled in from the referral:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {prefilledEntries.map(([k, v]) => (
                    <span key={k} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 9999, background: "var(--color-stone-100, #f2f2f2)", color: "var(--text-body)" }}>
                      {humanizeToken(k)}: {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {blanks.length > 0 && (
              <div style={{
                background: "color-mix(in srgb, var(--color-warning) 7%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)",
                borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 12,
              }}>
                <p className="arr-sub" style={{ margin: "0 0 2px", color: "var(--color-warning)" }}>Still blank</p>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "0 0 10px" }}>
                  Anything left empty prints as ______ on the form. Fill them here — they save with the draft.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {blanks.map((k) => (
                    <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <Label className="text-xs text-muted-foreground">{humanizeToken(k)}</Label>
                      <Input value={fieldValues[k] || ""} onChange={(e) => updateField(k, e.target.value)} className="h-8 text-sm" />
                    </div>
                  ))}
                </div>
                {optionalBlanks.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>
                      Optional on this form — fine to leave blank
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, opacity: 0.85 }}>
                      {optionalBlanks.map((k) => (
                        <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <Label className="text-xs text-muted-foreground">{humanizeToken(k)} (optional)</Label>
                          <Input value={fieldValues[k] || ""} onChange={(e) => updateField(k, e.target.value)} className="h-8 text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!formFillable && (
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                This form isn&apos;t set up for auto-fill yet — preview will show it blank. You can still send it to the clinic as an attachment.
              </p>
            )}

            <button className="rw-btn outline sm" disabled={previewLoading} onClick={handlePreview}>
              {previewLoading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}Preview the filled form
            </button>

            {draft?.adjusted_document ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <FileText size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: "var(--text-body)" }}>
                  Using your uploaded copy: {draft.adjusted_document.filename}
                  {draft.adjusted_document.uploaded_at ? ` · ${formatDateShort(draft.adjusted_document.uploaded_at)}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setRemoveAdjustedConfirmOpen(true)}
                  style={{ font: "inherit", fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <button className="rw-btn outline sm" disabled={uploadingAdjusted} onClick={() => adjustedFileRef.current?.click()}>
                  {uploadingAdjusted ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}Upload adjusted copy
                </button>
                <input
                  ref={adjustedFileRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadAdjusted(f); }}
                />
              </div>
            )}
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
              Downloaded the form and fixed something in the PDF? Upload your copy — it's what gets sent for signatures and faxed.
            </p>
          </div>

          {/* 3. Signatures */}
          <div>
            <p className="arr-sub" style={{ margin: "0 0 10px" }}>Signatures</p>
            {needsSignatures ? (
              <>
                <p className="text-sm" style={{ color: "var(--text-body)", margin: "0 0 10px" }}>
                  {signersSentence} {signVerb} to sign.
                </p>
                <button className="rw-btn primary sm" disabled={!canFinalize} onClick={() => setSendSigConfirmOpen(true)}>
                  <Send size={13} />Send to clinic for signatures
                </button>
                {!canFinalize && (
                  <p style={{ fontSize: 11.5, color: "var(--color-error)", margin: "6px 0 0" }}>
                    {blocking ? stateExcludedWarning!.message : "Confirm commercial insurance above first."}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No signatures needed — the program confirms consent with the patient directly.
              </p>
            )}
          </div>

          {/* 4. Submit — only offered directly here when no signatures are needed */}
          {!needsSignatures && (
            <div>
              <p className="arr-sub" style={{ margin: "0 0 10px" }}>Submit</p>
              <SubmitSection
                faxReadOnly={faxReadOnly}
                currentProgram={currentProgram}
                faxNumber={faxNumber}
                setFaxNumber={setFaxNumber}
                assistanceEndsOn={assistanceEndsOn}
                setAssistanceEndsOn={setAssistanceEndsOn}
                previewLoading={previewLoading}
                onPreview={handlePreview}
                submitDisabled={!canFinalize || submitting || (!faxReadOnly && !faxNumber.trim())}
                onSubmitClick={() => setSubmitConfirmOpen(true)}
                onMarkSubmittedClick={() => setMarkSubmittedConfirmOpen(true)}
              />
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={sendSigConfirmOpen}
        onOpenChange={setSendSigConfirmOpen}
        title="Send to clinic for signatures?"
        description={`${signersSentence ? `${signersSentence} will be asked to sign the ${currentProgram?.program_name || "enrollment"} form.` : "The clinic will be asked to return a signed copy."} They'll get one email with the filled form attached.`}
        confirmLabel={sendingForSig ? "Sending…" : "Send for signatures"}
        onConfirm={handleSendForSignatures}
      />

      <ConfirmModal
        open={submitConfirmOpen}
        onOpenChange={setSubmitConfirmOpen}
        title="Fax the enrollment?"
        description={`Fax the enrollment to ${destinationLabel}?`}
        confirmLabel={submitting ? "Faxing…" : "Submit"}
        onConfirm={handleSubmit}
      />

      <ConfirmModal
        open={markSubmittedConfirmOpen}
        onOpenChange={setMarkSubmittedConfirmOpen}
        title="Mark as submitted?"
        description="Use this when you enrolled the patient through the manufacturer's portal, e-prescribe, or another way outside our fax pipeline."
        confirmLabel={markingSubmitted ? "Saving…" : "Mark as submitted"}
        onConfirm={handleMarkSubmitted}
      />

      <ConfirmModal
        open={removeAdjustedConfirmOpen}
        onOpenChange={setRemoveAdjustedConfirmOpen}
        title="Remove your uploaded copy?"
        description="This switches back to the auto-filled form. Your uploaded file stays on file for the record."
        confirmLabel={removingAdjusted ? "Removing…" : "Remove"}
        onConfirm={handleRemoveAdjusted}
      />
    </div>
  );
}

function EligibilitySection({ otherWarnings, stateExcludedWarning, remsWarning, commercialConfirmed, setCommercialConfirmed }: {
  otherWarnings: { code: string; message: string }[];
  stateExcludedWarning?: { code: string; message: string };
  remsWarning?: { code: string; message: string };
  commercialConfirmed: boolean;
  setCommercialConfirmed: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {stateExcludedWarning && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, border: "1px solid color-mix(in srgb, var(--color-error) 40%, transparent)", background: "color-mix(in srgb, var(--color-error) 8%, transparent)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
          <Ban size={14} style={{ color: "var(--color-error)", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: "var(--color-error)", fontWeight: 600 }}>{stateExcludedWarning.message}</span>
        </div>
      )}
      {remsWarning && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, border: "1px solid color-mix(in srgb, var(--color-teal-700) 35%, transparent)", background: "var(--color-teal-50)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
          <ShieldAlert size={14} style={{ color: "var(--color-teal-700)", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: "var(--color-teal-700)", fontWeight: 600 }}>{remsWarning.message}</span>
        </div>
      )}
      {otherWarnings.map((w) => (
        <div key={w.code} style={{ display: "flex", alignItems: "flex-start", gap: 8, border: "1px solid color-mix(in srgb, var(--color-warning) 35%, transparent)", background: "color-mix(in srgb, var(--color-warning) 8%, transparent)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
          <AlertTriangle size={14} style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: "var(--color-warning)" }}>{w.message}</span>
        </div>
      ))}
      <div className="flex items-start gap-2">
        <Checkbox id="enroll-commercial" checked={commercialConfirmed} onCheckedChange={(v) => setCommercialConfirmed(!!v)} />
        <Label htmlFor="enroll-commercial" className="text-sm font-normal" style={{ lineHeight: 1.4 }}>
          I've confirmed this patient has commercial insurance (not Medicare/Medicaid)
        </Label>
      </div>
    </div>
  );
}

function SubmitSection({
  faxReadOnly, currentProgram, faxNumber, setFaxNumber, assistanceEndsOn, setAssistanceEndsOn,
  previewLoading, onPreview, submitDisabled, onSubmitClick, onMarkSubmittedClick,
}: {
  faxReadOnly: boolean;
  currentProgram: EnrollmentProgram | null;
  faxNumber: string;
  setFaxNumber: (v: string) => void;
  assistanceEndsOn: string;
  setAssistanceEndsOn: (v: string) => void;
  previewLoading: boolean;
  onPreview: () => void;
  submitDisabled: boolean;
  onSubmitClick: () => void;
  onMarkSubmittedClick: () => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <Label className="text-xs text-muted-foreground">
          {faxReadOnly ? `${currentProgram?.program_name || "Program"}'s fax number` : "Specialty pharmacy's fax number"}
        </Label>
        {faxReadOnly ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "6px 10px", background: "var(--color-stone-50, #f7f5f2)" }}>
            {currentProgram?.submission_fax}
          </div>
        ) : (
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
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
        <Label className="text-xs text-muted-foreground">When does the assistance run out? (if known)</Label>
        <Input type="date" value={assistanceEndsOn} onChange={(e) => setAssistanceEndsOn(e.target.value)} className="h-8 text-sm" style={{ maxWidth: 200 }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="rw-btn outline sm" disabled={previewLoading} onClick={onPreview}>
          {previewLoading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}Preview
        </button>
        <button className="rw-btn primary sm" disabled={submitDisabled} onClick={onSubmitClick}>
          <Send size={13} />Submit
        </button>
      </div>
      <button
        type="button"
        onClick={onMarkSubmittedClick}
        style={{ marginTop: 10, font: "inherit", fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
      >
        I submitted it another way
      </button>
    </div>
  );
}
