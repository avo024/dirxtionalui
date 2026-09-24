import { useEffect, useState, useRef } from "react";
import { ClipboardList, Plus, Check, X, FileText, Upload, Loader2, Send, Paperclip, Eye, ChevronDown, Pencil } from "lucide-react";
import { adminApi, type ReferralTask, type TaskDocument } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getRelativeTime, formatDateShort } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

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

  // Inline edit (open tasks only) — instructions + add-only attachments.
  // Reuses `existingDocs` (same referral doc list) so it doesn't refetch.
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editAttachments, setEditAttachments] = useState<TaskDocument[]>([]);
  const [editPickerOpen, setEditPickerOpen] = useState(false);
  const [editAttachUploading, setEditAttachUploading] = useState(false);
  const editAttachFileRef = useRef<HTMLInputElement>(null);

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

  const startEdit = (task: ReferralTask) => {
    setEditingTaskId(task.id);
    setEditDraft(task.instructions);
    setEditAttachments([]);
    setEditPickerOpen(false);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditDraft("");
    setEditAttachments([]);
    setEditPickerOpen(false);
  };

  const openEditPicker = async () => {
    setEditPickerOpen((v) => !v);
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

  const toggleEditExistingDoc = (doc: { id: string; original_filename: string; doc_type: string; uploaded_at?: string | null }) => {
    setEditAttachments((cur) =>
      cur.some((a) => a.id === doc.id)
        ? cur.filter((a) => a.id !== doc.id)
        : [...cur, { id: doc.id, filename: doc.original_filename, doc_type: doc.doc_type }]
    );
  };

  const uploadNewEditAttachment = async (file: File) => {
    setEditAttachUploading(true);
    try {
      const res = await adminApi.uploadAdminDocument(referralId, file, "team_document");
      setEditAttachments((cur) => [...cur, { id: res.id, filename: res.filename, doc_type: res.doc_type }]);
      setExistingDocs((cur) => (cur ? [...cur, { id: res.id, original_filename: res.filename, doc_type: res.doc_type, uploaded_at: new Date().toISOString() }] : cur));
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setEditAttachUploading(false);
      if (editAttachFileRef.current) editAttachFileRef.current.value = "";
    }
  };

  const removeEditAttachment = (id: string) => {
    setEditAttachments((cur) => cur.filter((a) => a.id !== id));
  };

  const saveEdit = async (taskId: string) => {
    if (!editDraft.trim()) return;
    setEditSaving(true);
    try {
      const res = await adminApi.editTask(taskId, {
        instructions: editDraft.trim(),
        add_attachment_document_ids: editAttachments.map((a) => a.id),
      });
      setTasks((cur) => cur.map((t) => (t.id === taskId ? res.task : t)));
      cancelEdit();
      toast({ title: "Task updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
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
      open: ["Open", "bg-warning/[0.16] text-[#92610B]"],
      completed: ["Completed", "bg-success/[0.13] text-success"],
      cancelled: ["Cancelled", "bg-muted-foreground/[0.12] text-muted-foreground"],
    };
    const [label, classes] = map[status] || map.open;
    return <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", classes)}>{label}</span>;
  };

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm p-[var(--density-card-pad)]">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><ClipboardList size={15} /></span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Clinic Tasks</h3>
        <span className="ml-auto flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" onClick={() => setShowForm((v) => !v)}>
            <Plus size={13} />New task
          </button>
        </span>
      </div>

      {showForm && (
        <div className="mb-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What do you need from the clinic? (e.g., “CoverMyMeds faxed the approval to your office — please upload it here.”)"
            className="box-border min-h-[70px] w-full resize-y rounded-md border border-border font-sans text-[13px] text-foreground/90 px-2.5 py-2"
          />

          {/* Attach a document — the form/letter the clinic needs, handed to
              them right on the task card (no digging through Documents). */}
          <div className="mt-2">
            {attachments.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {attachments.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11.5px] text-teal-700">
                    <Paperclip size={11} />
                    <span className="max-w-[180px] truncate">{a.filename}</span>
                    <button type="button" onClick={() => removeAttachment(a.id)} title="Remove attachment"
                      className="inline-flex p-0 text-inherit">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" onClick={openPicker}>
                <Paperclip size={13} />Attach existing document<ChevronDown size={12} />
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" disabled={attachUploading} onClick={() => attachFileRef.current?.click()}>
                {attachUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}Upload new
              </button>
              <input ref={attachFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadNewAttachment(f); }} />
            </div>
            {pickerOpen && (
              <div className="mt-1.5 max-h-40 overflow-y-auto rounded-md border border-border p-1.5">
                {loadingDocs ? (
                  <p className="mx-1.5 my-1 text-xs text-muted-foreground">Loading documents…</p>
                ) : !existingDocs || existingDocs.length === 0 ? (
                  <p className="mx-1.5 my-1 text-xs text-muted-foreground">No documents on this referral yet.</p>
                ) : (
                  existingDocs.map((d) => {
                    const selected = attachments.some((a) => a.id === d.id);
                    return (
                      <button key={d.id} type="button" onClick={() => toggleExistingDoc(d)}
                        className={cn("flex w-full items-start gap-1.5 rounded-sm px-1.5 py-1 text-left font-sans", selected ? "bg-teal-50 text-teal-700" : "bg-transparent text-foreground/90")}>
                        <FileText size={12} className="mt-0.5 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px]">{d.original_filename}</span>
                          <span className={cn("block text-[11px]", selected ? "text-teal-700" : "text-muted-foreground")}>
                            {prettifyDocType(d.doc_type)}
                            {d.uploaded_at ? ` · added ${formatDateShort(d.uploaded_at)}` : ""}
                          </span>
                        </span>
                        {selected && <Check size={12} className="ml-auto mt-0.5 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="mt-2 flex gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-45 disabled:cursor-not-allowed" disabled={creating || !draft.trim()} onClick={create}>
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Send to clinic
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" onClick={() => { setShowForm(false); setDraft(""); setAttachments([]); setPickerOpen(false); }}>Cancel</button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            The clinic gets one email and an unmissable card on this referral. Don't put patient details in the instructions — they can see the chart.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tasks. Use one when you need something from the clinic — a document, missing info — without rejecting the referral.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((t) => {
            const isEditing = editingTaskId === t.id;
            return (
            <div key={t.id} className={cn("rounded-md border border-border px-2.5 py-2", t.status === "cancelled" && "opacity-60")}>
              <div className="flex items-center gap-2">
                {pill(t.status)}
                <span className="text-[11px] text-muted-foreground">
                  {t.created_by} · {t.created_at ? getRelativeTime(t.created_at) : ""}
                </span>
                {t.status === "open" && !isEditing && (
                  <span className="ml-auto inline-flex gap-1.5">
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" title="Edit task" onClick={() => startEdit(t)}><Pencil size={13} /></button>
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" title="Mark complete (after reviewing their response)" onClick={() => complete(t.id)}><Check size={13} /></button>
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" title="Cancel task" onClick={() => cancel(t.id)}><X size={13} /></button>
                  </span>
                )}
              </div>
              {(t.attachments?.length ?? 0) > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {t.attachments.map((a) => (
                    <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11.5px] text-teal-700">
                      <Paperclip size={11} />
                      <span className="max-w-[160px] truncate">{a.filename}</span>
                      <button type="button" onClick={() => viewDoc(a.id)} title="View document"
                        className="inline-flex p-0 text-inherit">
                        <Eye size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {isEditing ? (
                <div className="mt-1.5">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    className="box-border min-h-[70px] w-full resize-y rounded-md border border-border font-sans text-[13px] text-foreground/90 px-2.5 py-2"
                  />

                  {/* Add-only: existing attachments above just display; this only adds new ones. */}
                  <div className="mt-2">
                    {editAttachments.length > 0 && (
                      <div className="mb-1.5 flex flex-wrap gap-1.5">
                        {editAttachments.map((a) => (
                          <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11.5px] text-teal-700">
                            <Paperclip size={11} />
                            <span className="max-w-[180px] truncate">{a.filename}</span>
                            <button type="button" onClick={() => removeEditAttachment(a.id)} title="Remove attachment"
                              className="inline-flex p-0 text-inherit">
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" onClick={openEditPicker}>
                        <Paperclip size={13} />Attach existing document<ChevronDown size={12} />
                      </button>
                      <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" disabled={editAttachUploading} onClick={() => editAttachFileRef.current?.click()}>
                        {editAttachUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}Upload new
                      </button>
                      <input ref={editAttachFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadNewEditAttachment(f); }} />
                    </div>
                    {editPickerOpen && (
                      <div className="mt-1.5 max-h-40 overflow-y-auto rounded-md border border-border p-1.5">
                        {loadingDocs ? (
                          <p className="mx-1.5 my-1 text-xs text-muted-foreground">Loading documents…</p>
                        ) : !existingDocs || existingDocs.length === 0 ? (
                          <p className="mx-1.5 my-1 text-xs text-muted-foreground">No documents on this referral yet.</p>
                        ) : (
                          existingDocs.map((d) => {
                            const alreadyAttached = t.attachments?.some((a) => a.id === d.id);
                            const selected = editAttachments.some((a) => a.id === d.id);
                            return (
                              <button key={d.id} type="button" disabled={alreadyAttached} onClick={() => toggleEditExistingDoc(d)}
                                className={cn(
                                  "flex w-full items-start gap-1.5 rounded-sm px-1.5 py-1 text-left font-sans",
                                  alreadyAttached ? "cursor-default opacity-55" : "cursor-pointer",
                                  selected ? "bg-teal-50 text-teal-700" : "bg-transparent text-foreground/90",
                                )}>
                                <FileText size={12} className="mt-0.5 shrink-0" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12.5px]">{d.original_filename}</span>
                                  <span className={cn("block text-[11px]", selected ? "text-teal-700" : "text-muted-foreground")}>
                                    {alreadyAttached ? "Already attached" : prettifyDocType(d.doc_type)}
                                    {!alreadyAttached && d.uploaded_at ? ` · added ${formatDateShort(d.uploaded_at)}` : ""}
                                  </span>
                                </span>
                                {selected && <Check size={12} className="ml-auto mt-0.5 shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-45 disabled:cursor-not-allowed" disabled={editSaving || !editDraft.trim()} onClick={() => saveEdit(t.id)}>
                      {editSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}Save
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" disabled={editSaving} onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">{t.instructions}</p>
              )}
              {t.clinic_response && (
                <p className="mt-1.5 rounded-md bg-teal-50 px-2.5 py-2 text-[12.5px] leading-relaxed text-teal-700 [overflow-wrap:anywhere]">
                  Clinic: {t.clinic_response}
                </p>
              )}
              {(t.response_documents?.length ?? 0) > 0 && (
                <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                  <FileText size={11} />{t.response_documents.length} document{t.response_documents.length === 1 ? "" : "s"} uploaded by the clinic — see Documents
                </p>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Share a document back to the clinic (appeal outcomes, payer letters).
          Two-step: pick → staged preview → confirm. Never auto-sends. */}
      <div className="mt-3 border-t border-border pt-2.5">
        {!pendingFile ? (
          <div className="flex flex-wrap items-center gap-2">
            <select value={docType} onChange={(e) => setDocType(e.target.value as any)}
              className="rounded-md border border-border bg-white px-2 py-1.5 font-sans text-xs text-foreground/90">
              <option value="team_document">Document for the clinic</option>
              <option value="appeal_document">Appeal document</option>
              <option value="payer_correspondence">Payer correspondence</option>
            </select>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" onClick={() => fileRef.current?.click()}>
              <Upload size={13} />Share with clinic…
            </button>
          </div>
        ) : (
          <div className="rounded-md border border-teal-100 bg-teal-50 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <FileText size={14} className="shrink-0 text-teal-700" />
              <span className="text-[13px] font-semibold text-foreground [overflow-wrap:anywhere]">{pendingFile.name}</span>
              <span className="text-[11.5px] text-muted-foreground">{(pendingFile.size / 1024 / 1024).toFixed(2)} MB</span>
              <button type="button" onClick={() => window.open(URL.createObjectURL(pendingFile), "_blank")}
                className="font-sans text-[11.5px] font-semibold text-teal-700 underline">
                Preview
              </button>
            </div>
            <p className="my-1.5 text-[11.5px] text-teal-700">
              Will be shared as “{docType === "appeal_document" ? "Appeal document" : docType === "payer_correspondence" ? "Payer correspondence" : "Document for the clinic"}” — the clinic sees it under “From your Dirxctional team”.
            </p>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-45 disabled:cursor-not-allowed" disabled={uploading} onClick={confirmShare}>
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}Share with clinic
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-45 disabled:cursor-not-allowed" disabled={uploading} onClick={cancelShare}>Cancel</button>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); }} />
      </div>
    </div>
  );
}
