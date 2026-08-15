import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ChevronDown, ChevronRight, FileText, AlertTriangle, ArrowRight, PenLine, Clock, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIQualityReferral } from "@/hooks/useAIQuality";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReferralStatus } from "@/types";
import { getRelativeTime } from "@/lib/dateUtils";
import { renderFieldValue } from "@/lib/aiQualityFormat";
import type { AIQualityCorrection, AIQualityReferralDocument } from "@/lib/aiQualityApi";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "./aiq.css";

function isDiagnosisLikeArray(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((x) => x !== null && typeof x === "object" && "code" in (x as object))
  );
}

function isLeaf(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x !== "object" || x === null)) return true;
    if (isDiagnosisLikeArray(v)) return true;
    return false;
  }
  return typeof v !== "object";
}

function confFmt(v: number | null | undefined): string {
  return v !== null && v !== undefined ? v.toFixed(2) : "—";
}

export default function AIQualityReferral() {
  const { user } = useAuth();
  const { id } = useParams();
  const { data, isLoading, isError, error } = useAIQualityReferral(id);

  if (user && user.role !== "internal_admin") {
    return <Navigate to="/clinic/dashboard" replace />;
  }

  // Map field_path -> corrections (multiple edits to same path → keep all)
  const correctionsByPath = useMemo(() => {
    const m = new Map<string, AIQualityCorrection[]>();
    for (const c of data?.corrections ?? []) {
      const arr = m.get(c.field_path) ?? [];
      arr.push(c);
      m.set(c.field_path, arr);
    }
    return m;
  }, [data]);

  if (isLoading) {
    return (
      <div className="aiq-page rw-fade">
        <div className="aiq-empty"><Loader2 className="rw-spin" style={{ color: "var(--color-teal)", display: "inline-block" }} size={26} /></div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="aiq-page rw-fade">
        <Link className="aiq-back" to="/admin/ai-quality"><ArrowLeft size={15} />Back to AI Quality</Link>
        <div className="aiq-card aiq-card-pad" style={{ marginTop: 16, borderColor: "color-mix(in srgb, var(--color-error) 30%, transparent)", color: "var(--color-error)" }}>
          Failed to load: {(error as Error)?.message ?? "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div className="aiq-page rw-fade">
      {/* Header */}
      <div className="aiq-ref-head">
        <Link className="aiq-back" to="/admin/ai-quality"><ArrowLeft size={15} />Back</Link>
        <span className="aiq-ref-id">{data.referral.id}</span>
        <StatusBadge status={data.referral.status as ReferralStatus} />
        <div className="aiq-ref-meta">
          <span className="aiq-chip"><span className="k">prompt</span><span className="v">{data.referral.prompt_version || "unknown"}</span></span>
          <span className="aiq-chip"><Clock size={12} style={{ color: "var(--color-stone-400)" }} /><span className="k">updated</span><span>{getRelativeTime(data.referral.updated_at)}</span></span>
        </div>
      </div>

      <div className="aiq-ref-2col">
        {/* Left — source documents */}
        <div className="aiq-card aiq-card-pad">
          <div className="aiq-sec-head"><div><h2>Source documents</h2><p className="aiq-sec-sub">{data.documents.length} {data.documents.length === 1 ? "file" : "files"} in this referral</p></div></div>
          {data.documents.length === 0 ? (
            <p className="aiq-empty">No documents on this referral.</p>
          ) : (
            data.documents.map((doc) => <DocPreview key={doc.id} doc={doc} />)
          )}
        </div>

        {/* Right — extracted data tree */}
        <div className="aiq-card aiq-card-pad">
          <div className="aiq-sec-head">
            <div><h2>Extracted data</h2><p className="aiq-sec-sub">Per-field values, model confidence, and reviewer corrections. Amber = high-confidence edit.</p></div>
          </div>
          <ExtractedTree data={data.extracted_data} correctionsByPath={correctionsByPath} />
        </div>
      </div>

      {/* Raw JSON */}
      <RawJson data={data.extracted_data} />
    </div>
  );
}

function DocPreview({ doc }: { doc: AIQualityReferralDocument }) {
  const [errored, setErrored] = useState(false);
  const isPdf = doc.file_type === "application/pdf";
  return (
    <div className="aiq-doc" style={{ display: "block", padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border-default)", background: "var(--bg-muted)" }}>
        <FileText size={15} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-primary)" }}>{doc.doc_type}</span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>· {doc.original_filename}</span>
      </div>
      <div>
        {!doc.url || errored ? (
          <p className="aiq-empty">Document temporarily unavailable</p>
        ) : isPdf ? (
          <iframe src={doc.url} title={doc.original_filename} style={{ width: "100%", height: 460, border: 0 }} onError={() => setErrored(true)} />
        ) : (
          <embed src={doc.url} type={doc.file_type || "application/pdf"} style={{ width: "100%", height: 460 }} onError={() => setErrored(true)} />
        )}
      </div>
    </div>
  );
}

function ExtractedTree({
  data,
  correctionsByPath,
}: {
  data: Record<string, any>;
  correctionsByPath: Map<string, AIQualityCorrection[]>;
}) {
  const groups = Object.entries(data || {});
  if (groups.length === 0) return <p className="aiq-empty">No extracted data yet.</p>;
  return (
    <div className="aiq-tree">
      {groups.map(([key, value]) => (
        <TreeGroup key={key} path={key} label={key} value={value} correctionsByPath={correctionsByPath} />
      ))}
    </div>
  );
}

function TreeGroup({
  path,
  label,
  value,
  correctionsByPath,
}: {
  path: string;
  label: string;
  value: any;
  correctionsByPath: Map<string, AIQualityCorrection[]>;
}) {
  const [open, setOpen] = useState(true);
  const count = value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).length : 1;
  return (
    <div className="aiq-tnode">
      <button className="aiq-tbranch-btn" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown size={14} style={{ color: "var(--color-stone-400)" }} /> : <ChevronRight size={14} style={{ color: "var(--color-stone-400)" }} />}
        <span className="aiq-tkey">{label}</span>
        <span className="aiq-tbranch-count">{count} {count === 1 ? "field" : "fields"}</span>
      </button>
      {open && <div className="aiq-tchildren">{renderNode(path, value, correctionsByPath)}</div>}
    </div>
  );
}

function renderNode(
  path: string,
  value: any,
  correctionsByPath: Map<string, AIQualityCorrection[]>,
): React.ReactNode {
  if (isLeaf(value)) {
    return <Leaf path={path} value={value} corrections={correctionsByPath.get(path)} />;
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => (
      <div key={i} style={{ padding: "4px 0" }}>
        <div className="aiq-tbranch-count" style={{ padding: "2px 6px" }}>[{i}]</div>
        <div className="aiq-tchildren">{renderNode(`${path}[${i}]`, item, correctionsByPath)}</div>
      </div>
    ));
  }
  return Object.entries(value as Record<string, any>).map(([k, v]) => {
    const childPath = `${path}.${k}`;
    if (isLeaf(v)) {
      return <Leaf key={childPath} path={childPath} label={k} value={v} corrections={correctionsByPath.get(childPath)} />;
    }
    return (
      <div key={childPath} style={{ padding: "4px 0" }}>
        <div className="aiq-tkey" style={{ padding: "6px 6px 2px" }}>{k}</div>
        <div className="aiq-tchildren">{renderNode(childPath, v, correctionsByPath)}</div>
      </div>
    );
  });
}

function Leaf({
  path,
  label,
  value,
  corrections,
}: {
  path: string;
  label?: string;
  value: any;
  corrections?: AIQualityCorrection[];
}) {
  const displayLabel = label || path.split(".").pop() || path;
  const latest = corrections?.[corrections.length - 1];
  const edited = !!(corrections && corrections.length);
  const high = (latest?.model_confidence ?? 0) >= 0.85;
  return (
    <div className={`aiq-tleaf${edited ? " edited" : ""}`}>
      <div className="aiq-tleaf-main">
        <div className="aiq-tleaf-top">
          <span className="aiq-tkey">{displayLabel}</span>
          <span className="aiq-tval">{renderFieldValue(value)}</span>
        </div>
        {latest && (
          <div className="aiq-tcorr">
            <PenLine size={12} style={{ color: "var(--color-stone-400)" }} />
            was <span className="aiq-was">{renderFieldValue(latest.model_value)}</span>
            <ArrowRight size={11} />
            now <span className="aiq-now">{renderFieldValue(latest.final_value)}</span>
            <span style={{ color: "var(--color-stone-300)" }}>·</span>
            <span>conf {confFmt(latest.model_confidence)}</span>
            <span style={{ color: "var(--color-stone-300)" }}>·</span>
            <span>{getRelativeTime(latest.edited_at)}</span>
            {corrections!.length > 1 && <span style={{ color: "var(--text-muted)" }}>· edited {corrections!.length}×</span>}
            {high && <span className="aiq-conf-badge"><AlertTriangle size={10} />high conf</span>}
          </div>
        )}
      </div>
      {latest && <span className={`aiq-tconf${high ? " high" : ""}`}>conf {confFmt(latest.model_confidence)}</span>}
    </div>
  );
}

function RawJson({ data }: { data: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="aiq-card aiq-card-pad aiq-raw">
      <button className="aiq-raw-btn" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown size={15} style={{ color: "var(--color-stone-400)" }} /> : <ChevronRight size={15} style={{ color: "var(--color-stone-400)" }} />}
        Raw extracted JSON
        <span style={{ marginLeft: 8, fontSize: "var(--text-xs)", fontWeight: 400, color: "var(--text-muted)" }}>extracted_data payload</span>
      </button>
      {open && <pre className="aiq-raw-pre">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
