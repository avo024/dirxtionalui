import { useEffect, useState, useRef } from "react";
import { ClipboardList, Plus, Check, X, FileText, Upload, Loader2, Send, Paperclip, Eye, ChevronDown } from "lucide-react";
import { adminApi, type ReferralTask, type TaskDocument } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getRelativeTime, formatDateShort } from "@/lib/dateUtils";

// Mirrors AppealPacketCard's prettifyDocType — humanize a doc_type token
// ("chart_notes" -> "Chart Notes") for the existing-document picker.
const prettifyDocType = (t?: string | null) => (t || "document").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Admin tasks panel — "we need something from the clinic on this referral"
 * (not a rejection). Creating a task emails the clinic once; their reply
 * (text and/or uploads) pings the team once; an admin confirms completion
 * here. Also hosts the admin document upload (appeal outcomes, payer
 * letters) — those docs appear to the clinic as "From your Dirxctional team".
 */
export function ReferralTasksCard({ referralId, adminFirstName, onShared }: {
  referralId: string;
  adminFirstName?: string | null;
  onShared?: () => void | Promise<void>;
}) {
  const [tasks, setTasks] = useState<ReferralTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<"appeal_document" | "payer_correspondence" | "team_document">("team_document");
  const fileRef = useRef<HTMLInputElement>(null);

  // Attach-a-document-to-the-task (at creation): pick from the referral's
  // existing documents, or upload a new one right there. Either way it lands
  // in `attachments` and gets sent as attachment_document_ids on create.
  const [attachments, setAttachments] = useState<TaskDocument[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [existingDocs, setExistingDocs] = useState<{ id: string; original_filename: string; doc_type: string; uploaded_at?: string | null }[] | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [attachUploading, setAttachUploading] = useState(false);
  const attachFileRef = useRef<HTMLInputElement>(null);

  const actor = (adminFirstName || "").trim() || "Dirxctional team";

  const load = async () => {
    try {
      const res = await adminApi.getTasks(referralId);
      setTasks(res.items || []);
    } catch { /* panel just stays empty */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [referralId]);

  const create = async () => {
    if (!draft.trim()) return;
    setCreating(true);
    try {
      await adminApi.createTask(referralId, {
        instructions: draft.trim(),
        created_by: actor,
        attachment_document_ids: attachments.map((a) => a.id),
      });
      setDraft(""); setShowForm(false); setAttachments([]); setPickerOpen(false);
      toast({
        title: "Task sent to the clinic",
        description: attachments.length
          ? `They've been emailed — the ${attachments.length === 1 ? "document is" : "documents are"} attached right on the task.`
          : "They've been emailed — replies and uploads land here.",
      });
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const openPicker = async () => {
    setPickerOpen((v) => !v);
    if (!existingDocs) {
      setLoadingDocs(true);
      try {
        const res = await adminApi.getReferralDocuments(referralId);
        setExistingDocs(res.items || []);
      } catch {
        setExistingDocs([]);
      } finally {
        setLoadingDocs(false);
      }
    }
  };

  const toggleExistingDoc = (doc: { id: string; original_filename: string; doc_type: string; uploaded_at?: string | null }) => {
    setAttachments((cur) =>
      cur.some((a) => a.id === doc.id)
        ? cur.filter((a) => a.id !== doc.id)
        : [...cur, { id: doc.id, filename: doc.original_filename, doc_type: doc.doc_type }]
    );
  };

  const uploadNewAttachment = async (file: File) => {
    setAttachUploading(true);
    try {
      const res = await adminApi.uploadAdminDocument(referralId, file, "team_document");
      setAttachments((cur) => [...cur, { id: res.id, filename: res.filename, doc_type: res.doc_type }]);
      // Keep the existing-docs list in sync so it doesn't look missing if reopened.
      setExistingDocs((cur) => (cur ? [...cur, { id: res.id, original_filename: res.filename, doc_type: res.doc_type, uploaded_at: new Date().toISOString() }] : cur));
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setAttachUploading(false);
      if (attachFileRef.current) attachFileRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((cur) => cur.filter((a) => a.id !== id));
  };

  const viewDoc = async (docId: string) => {
    try {
      const res = await adminApi.getDocumentUrl(docId);
      window.open(res.url, "_blank");
    } catch (e: any) {
      toast({ title: "Couldn't open document", description: e.message, variant: "destructive" });
    }
  };

  const complete = async (taskId: string) => {
    try {
      await adminApi.completeTask(taskId, actor);
      toast({ title: "Task completed" });
      await load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const cancel = async (taskId: string) => {
    try {
      await adminApi.cancelTask(taskId);
      toast({ title: "Task cancelled" });
      await load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  // Sharing is clinic-visible PHI — never auto-send on file pick. The file
  // stages first (name, size, preview) and only "Share with clinic" sends.
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const confirmShare = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      await adminApi.uploadAdminDocument(referralId, pendingFile, docType);
      toast({ title: "Document shared", description: "The clinic sees it under “From your Dirxctional team”." });
      setPendingFile(null);
      await onShared?.();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const cancelShare = () => {
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const pill = (status: string) => {
    const map: Record<string, [string, string]> = {
      open: ["Open", "color-mix(in srgb, var(--color-warning) 16%, transparent)"],
      completed: ["Completed", "color-mix(in srgb, var(--color-success) 13%, transparent)"],
      cancelled: ["Cancelled", "color-mix(in srgb, var(--text-muted) 12%, transparent)"],
    };
    const [label, bg] = map[status] || map.open;
    const fg = status === "open" ? "#92610B" : status === "completed" ? "var(--color-success)" : "var(--text-muted)";
    return <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 9999, background: bg, color: fg }}>{label}</span>;
  };

  return (
    <div className="arr-card">
      <div className="arr-card-head">
        <span className="hi"><ClipboardList size={15} /></span>
        <h3>Clinic Tasks</h3>
        <span className="he" style={{ marginLeft: "auto" }}>
          <button className="rw-btn outline sm" onClick={() => setShowForm((v) => !v)}>
            <Plus size={13} />New task
          </button>
        </span>
      </div>

      {showForm && (
        <div style={{ marginBottom: 12 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What do you need from the clinic? (e.g., “CoverMyMeds faxed the approval to your office — please upload it here.”)"
            style={{ width: "100%", boxSizing: "border-box", font: "inherit", fontSize: 13, color: "var(--text-body)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "8px 10px", minHeight: 70, resize: "vertical" }}
          />

          {/* Attach a document — the form/letter the clinic needs, handed to
              them right on the task card (no digging through Documents). */}
          <div style={{ marginTop: 8 }}>
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                {attachments.map((a) => (
                  <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, padding: "3px 8px", borderRadius: 9999, background: "var(--color-teal-50)", color: "var(--color-teal-700)" }}>
                    <Paperclip size={11} />
                    <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.filename}</span>
                    <button type="button" onClick={() => removeAttachment(a.id)} title="Remove attachment"
                      style={{ display: "inline-flex", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="rw-btn outline sm" onClick={openPicker}>
                <Paperclip size={13} />Attach existing document<ChevronDown size={12} />
              </button>
              <button type="button" className="rw-btn outline sm" disabled={attachUploading} onClick={() => attachFileRef.current?.click()}>
                {attachUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}Upload new
              </button>
              <input ref={attachFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadNewAttachment(f); }} />
            </div>
            {pickerOpen && (
              <div style={{ marginTop: 6, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: 6, maxHeight: 160, overflowY: "auto" }}>
                {loadingDocs ? (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 6px" }}>Loading documents…</p>
                ) : !existingDocs || existingDocs.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 6px" }}>No documents on this referral yet.</p>
                ) : (
                  existingDocs.map((d) => {
                    const selected = attachments.some((a) => a.id === d.id);
                    return (
                      <button key={d.id} type="button" onClick={() => toggleExistingDoc(d)}
                        style={{ display: "flex", alignItems: "flex-start", gap: 6, width: "100%", textAlign: "left", font: "inherit", padding: "5px 6px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", background: selected ? "var(--color-teal-50)" : "transparent", color: selected ? "var(--color-teal-700)" : "var(--text-body)" }}>
                        <FileText size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: "block", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.original_filename}</span>
                          <span style={{ display: "block", fontSize: 11, color: selected ? "var(--color-teal-700)" : "var(--text-muted)" }}>
                            {prettifyDocType(d.doc_type)}
                            {d.uploaded_at ? ` · added ${formatDateShort(d.uploaded_at)}` : ""}
                          </span>
                        </span>
                        {selected && <Check size={12} style={{ marginLeft: "auto", flexShrink: 0, marginTop: 2 }} />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="rw-btn primary sm" disabled={creating || !draft.trim()} onClick={create}>
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Send to clinic
            </button>
            <button className="rw-btn outline sm" onClick={() => { setShowForm(false); setDraft(""); setAttachments([]); setPickerOpen(false); }}>Cancel</button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>
            The clinic gets one email and an unmissable card on this referral. Don't put patient details in the instructions — they can see the chart.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No tasks. Use one when you need something from the clinic — a document, missing info — without rejecting the referral.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map((t) => (
            <div key={t.id} style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "9px 11px", opacity: t.status === "cancelled" ? 0.6 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {pill(t.status)}
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {t.created_by} · {t.created_at ? getRelativeTime(t.created_at) : ""}
                </span>
                {t.status === "open" && (
                  <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
                    <button className="rw-btn outline sm" title="Mark complete (after reviewing their response)" onClick={() => complete(t.id)}><Check size={13} /></button>
                    <button className="rw-btn outline sm" title="Cancel task" onClick={() => cancel(t.id)}><X size={13} /></button>
                  </span>
                )}
              </div>
              {(t.attachments?.length ?? 0) > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 0" }}>
                  {t.attachments.map((a) => (
                    <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, padding: "3px 8px", borderRadius: 9999, background: "var(--color-teal-50)", color: "var(--color-teal-700)" }}>
                      <Paperclip size={11} />
                      <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.filename}</span>
                      <button type="button" onClick={() => viewDoc(a.id)} title="View document"
                        style={{ display: "inline-flex", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
                        <Eye size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 13, color: "var(--text-body)", margin: "6px 0 0", lineHeight: 1.5, overflowWrap: "anywhere" }}>{t.instructions}</p>
              {t.clinic_response && (
                <p style={{ fontSize: 12.5, margin: "6px 0 0", padding: "7px 9px", borderRadius: "var(--radius-md)", background: "var(--color-teal-50)", color: "var(--color-teal-700)", lineHeight: 1.5, overflowWrap: "anywhere" }}>
                  Clinic: {t.clinic_response}
                </p>
              )}
              {(t.response_documents?.length ?? 0) > 0 && (
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "5px 0 0", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <FileText size={11} />{t.response_documents.length} document{t.response_documents.length === 1 ? "" : "s"} uploaded by the clinic — see Documents
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Share a document back to the clinic (appeal outcomes, payer letters).
          Two-step: pick → staged preview → confirm. Never auto-sends. */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border-default)" }}>
        {!pendingFile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select value={docType} onChange={(e) => setDocType(e.target.value as any)}
              style={{ font: "inherit", fontSize: 12, color: "var(--text-body)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "6px 8px", background: "#fff" }}>
              <option value="team_document">Document for the clinic</option>
              <option value="appeal_document">Appeal document</option>
              <option value="payer_correspondence">Payer correspondence</option>
            </select>
            <button className="rw-btn outline sm" onClick={() => fileRef.current?.click()}>
              <Upload size={13} />Share with clinic…
            </button>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--color-teal-100)", background: "var(--color-teal-50)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <FileText size={14} style={{ color: "var(--color-teal-700)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflowWrap: "anywhere" }}>{pendingFile.name}</span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{(pendingFile.size / 1024 / 1024).toFixed(2)} MB</span>
              <button type="button" onClick={() => window.open(URL.createObjectURL(pendingFile), "_blank")}
                style={{ font: "inherit", fontSize: 11.5, fontWeight: 600, color: "var(--color-teal-700)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Preview
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--color-teal-700)", margin: "6px 0 8px" }}>
              Will be shared as “{docType === "appeal_document" ? "Appeal document" : docType === "payer_correspondence" ? "Payer correspondence" : "Document for the clinic"}” — the clinic sees it under “From your Dirxctional team”.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="rw-btn primary sm" disabled={uploading} onClick={confirmShare}>
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}Share with clinic
              </button>
              <button className="rw-btn outline sm" disabled={uploading} onClick={cancelShare}>Cancel</button>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); }} />
      </div>
    </div>
  );
}
