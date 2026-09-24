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
import { cn } from "@/lib/utils";

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
      <div className="rw-page rw-fade flex justify-center py-16">
        <Loader2 width={26} height={26} strokeWidth={1.75} className="animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rw-page rw-fade">
        <Link className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" to="/admin/ai-quality">
          <ArrowLeft width={15} height={15} strokeWidth={1.75} />Back to AI Quality
        </Link>
        <div className="bg-card border border-destructive/30 rounded-lg p-[var(--density-card-pad)] mt-4 text-sm text-destructive">
          Failed to load: {(error as Error)?.message ?? "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div className="rw-page rw-fade">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <Link className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" to="/admin/ai-quality">
          <ArrowLeft width={15} height={15} strokeWidth={1.75} />Back
        </Link>
        <span className="font-mono text-xs text-muted-foreground">{data.referral.id}</span>
        <StatusBadge status={data.referral.status as ReferralStatus} />
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>prompt <span className="font-mono text-foreground">{data.referral.prompt_version || "unknown"}</span></span>
          <span className="inline-flex items-center gap-1"><Clock width={12} height={12} strokeWidth={1.75} />updated {getRelativeTime(data.referral.updated_at)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left — source documents */}
        <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)]">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">Source documents</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{data.documents.length} {data.documents.length === 1 ? "file" : "files"} in this referral</p>
          </div>
          {data.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No documents on this referral.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.documents.map((doc) => <DocPreview key={doc.id} doc={doc} />)}
            </div>
          )}
        </div>

        {/* Right — extracted data tree */}
        <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)]">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">Extracted data</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Per-field values, model confidence, and reviewer corrections. Amber = high-confidence edit.</p>
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
    <div className="rounded-md border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted">
        <FileText width={15} height={15} strokeWidth={1.75} className="text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{doc.doc_type}</span>
        <span className="text-xs text-muted-foreground">· {doc.original_filename}</span>
      </div>
      <div>
        {!doc.url || errored ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Document temporarily unavailable</p>
        ) : isPdf ? (
          <iframe src={doc.url} title={doc.original_filename} className="w-full h-[460px] border-0" onError={() => setErrored(true)} />
        ) : (
          <embed src={doc.url} type={doc.file_type || "application/pdf"} className="w-full h-[460px]" onError={() => setErrored(true)} />
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
  if (groups.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No extracted data yet.</p>;
  return (
    <div className="flex flex-col gap-1.5">
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
    <div className="rounded-md border border-border overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2 bg-muted text-left">
        {open ? <ChevronDown width={14} height={14} strokeWidth={1.75} className="text-muted-foreground" /> : <ChevronRight width={14} height={14} strokeWidth={1.75} className="text-muted-foreground" />}
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="ml-auto text-xs text-muted-foreground">{count} {count === 1 ? "field" : "fields"}</span>
      </button>
      {open && <div className="p-2 flex flex-col gap-1">{renderNode(path, value, correctionsByPath)}</div>}
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
      <div key={i} className="py-1">
        <div className="text-xs text-muted-foreground px-1.5 py-0.5">[{i}]</div>
        <div className="pl-2 flex flex-col gap-1">{renderNode(`${path}[${i}]`, item, correctionsByPath)}</div>
      </div>
    ));
  }
  return Object.entries(value as Record<string, any>).map(([k, v]) => {
    const childPath = `${path}.${k}`;
    if (isLeaf(v)) {
      return <Leaf key={childPath} path={childPath} label={k} value={v} corrections={correctionsByPath.get(childPath)} />;
    }
    return (
      <div key={childPath} className="py-1">
        <div className="text-sm font-semibold text-foreground px-1.5 py-0.5">{k}</div>
        <div className="pl-2 flex flex-col gap-1">{renderNode(childPath, v, correctionsByPath)}</div>
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
    <div className={cn("flex items-start justify-between gap-3 rounded-md px-2 py-1.5", edited && "bg-warning/8")}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{displayLabel}</span>
          <span className="text-sm font-semibold text-foreground">{renderFieldValue(value)}</span>
        </div>
        {latest && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground mt-0.5">
            <PenLine width={12} height={12} strokeWidth={1.75} className="text-muted-foreground" />
            was <span className="line-through">{renderFieldValue(latest.model_value)}</span>
            <ArrowRight width={11} height={11} strokeWidth={1.75} />
            now <span className="font-semibold text-foreground">{renderFieldValue(latest.final_value)}</span>
            <span>·</span>
            <span>conf {confFmt(latest.model_confidence)}</span>
            <span>·</span>
            <span>{getRelativeTime(latest.edited_at)}</span>
            {corrections!.length > 1 && <span>· edited {corrections!.length}×</span>}
            {high && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-[#92610B] px-1.5 py-0.5 text-[10px] font-bold">
                <AlertTriangle width={10} height={10} strokeWidth={1.75} />high conf
              </span>
            )}
          </div>
        )}
      </div>
      {latest && (
        <span className={cn("shrink-0 text-xs font-medium", high ? "text-warning" : "text-muted-foreground")}>conf {confFmt(latest.model_confidence)}</span>
      )}
    </div>
  );
}

function RawJson({ data }: { data: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)] mt-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        {open ? <ChevronDown width={15} height={15} strokeWidth={1.75} className="text-muted-foreground" /> : <ChevronRight width={15} height={15} strokeWidth={1.75} className="text-muted-foreground" />}
        Raw extracted JSON
        <span className="text-xs font-normal text-muted-foreground">extracted_data payload</span>
      </button>
      {open && <pre className="mt-3 rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-[400px]">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
