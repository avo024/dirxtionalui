import { useEffect, useState, useRef } from "react";
import { ClipboardList, Plus, Check, X, FileText, Upload, Loader2 } from "lucide-react";
import { adminApi, type ReferralTask } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getRelativeTime } from "@/lib/dateUtils";

/**
 * Admin tasks panel — "we need something from the clinic on this referral"
 * (not a rejection). Creating a task emails the clinic once; their reply
 * (text and/or uploads) pings the team once; an admin confirms completion
 * here. Also hosts the admin document upload (appeal outcomes, payer
 * letters) — those docs appear to the clinic as "From your Dirxctional team".
 */
export function ReferralTasksCard({ referralId, adminFirstName }: {
  referralId: string;
  adminFirstName?: string | null;
}) {
  const [tasks, setTasks] = useState<ReferralTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<"appeal_document" | "payer_correspondence" | "team_document">("team_document");
  const fileRef = useRef<HTMLInputElement>(null);

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
      await adminApi.createTask(referralId, { instructions: draft.trim(), created_by: actor });
      setDraft(""); setShowForm(false);
      toast({ title: "Task sent to the clinic", description: "They've been emailed — replies and uploads land here." });
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setCreating(false); }
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
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="rw-btn primary sm" disabled={creating || !draft.trim()} onClick={create}>
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Send to clinic
            </button>
            <button className="rw-btn outline sm" onClick={() => { setShowForm(false); setDraft(""); }}>Cancel</button>
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
              <p style={{ fontSize: 13, color: "var(--text-body)", margin: "6px 0 0", lineHeight: 1.5 }}>{t.instructions}</p>
              {t.clinic_response && (
                <p style={{ fontSize: 12.5, margin: "6px 0 0", padding: "7px 9px", borderRadius: "var(--radius-md)", background: "var(--color-teal-50)", color: "var(--color-teal-700)", lineHeight: 1.5 }}>
                  Clinic: {t.clinic_response}
                </p>
              )}
              {(t.document_count ?? 0) > 0 && (
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "5px 0 0", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <FileText size={11} />{t.document_count} document{t.document_count === 1 ? "" : "s"} uploaded — see Documents
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
