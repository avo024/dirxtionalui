import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, FileText, AlertTriangle } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIQualityReferral } from "@/hooks/useAIQuality";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/dateUtils";
import { renderFieldValue } from "@/lib/aiQualityFormat";
import type {
  AIQualityCorrection,
  AIQualityReferralDocument,
} from "@/lib/aiQualityApi";

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
    // ICD-10-style arrays render inline via renderFieldValue
    if (isDiagnosisLikeArray(v)) return true;
    return false;
  }
  return typeof v !== "object";
}

export default function AIQualityReferral() {
  const { user } = useAuth();
  const { id } = useParams();
  const { data, isLoading, isError, error } = useAIQualityReferral(id);

  if (user && user.role !== "internal_admin") {
    return <Navigate to="/clinic/dashboard" replace />;
  }

  // Map field_path -> latest correction (multiple edits to same path → keep all)
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/ai-quality"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to AI Quality
        </Link>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load: {(error as Error)?.message ?? "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          to="/admin/ai-quality"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to AI Quality
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          Referral · <span className="font-mono text-lg">{data.referral.id}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Status: <span className="text-foreground">{data.referral.status}</span> · Prompt
          version: <span className="text-foreground">{data.referral.prompt_version || "unknown"}</span>{" "}
          · Last updated: {getRelativeTime(data.referral.updated_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — documents */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Source documents</h2>
            <span className="text-xs text-muted-foreground">
              Doc viewer link refreshes when page reloads
            </span>
          </div>
          {data.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents on this referral.</p>
          ) : (
            data.documents.map((doc) => <DocPreview key={doc.id} doc={doc} />)
          )}
        </section>

        {/* Right — extracted data tree */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground">Extracted data</h2>
          <ExtractedTree
            data={data.extracted_data}
            correctionsByPath={correctionsByPath}
          />
        </section>
      </div>

      {/* Raw JSON */}
      <Collapsible className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/50">
          Raw extraction JSON
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border">
          <pre className="overflow-auto px-5 py-4 text-xs text-foreground bg-muted/30">
            <code>{JSON.stringify(data.extracted_data, null, 2)}</code>
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function DocPreview({ doc }: { doc: AIQualityReferralDocument }) {
  const [errored, setErrored] = useState(false);
  const isPdf = doc.file_type === "application/pdf";
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{doc.doc_type}</span>
          <span className="text-muted-foreground">· {doc.original_filename}</span>
        </div>
      </div>
      <div className="bg-muted/10">
        {!doc.url || errored ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Document temporarily unavailable
          </p>
        ) : isPdf ? (
          <iframe
            src={doc.url}
            title={doc.original_filename}
            className="w-full h-[480px]"
            onError={() => setErrored(true)}
          />
        ) : (
          <embed
            src={doc.url}
            type={doc.file_type || "application/pdf"}
            className="w-full h-[480px]"
            onError={() => setErrored(true)}
          />
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
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No extracted data yet.</p>;
  }
  return (
    <div className="space-y-3">
      {groups.map(([key, value]) => (
        <TreeGroup
          key={key}
          path={key}
          label={key}
          value={value}
          correctionsByPath={correctionsByPath}
        />
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
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2 border-b border-border bg-muted/30 text-sm"
      >
        <span className="font-semibold text-foreground capitalize">
          {label.replace(/_/g, " ")}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="divide-y divide-border">
          {renderNode(path, value, correctionsByPath)}
        </div>
      )}
    </div>
  );
}

function renderNode(
  path: string,
  value: any,
  correctionsByPath: Map<string, AIQualityCorrection[]>,
): React.ReactNode {
  if (isLeaf(value)) {
    return (
      <Leaf path={path} value={value} corrections={correctionsByPath.get(path)} />
    );
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => (
      <div key={i} className="px-4 py-2">
        <p className="text-xs text-muted-foreground mb-1">[{i}]</p>
        <div className="pl-3 border-l border-border">
          {renderNode(`${path}[${i}]`, item, correctionsByPath)}
        </div>
      </div>
    ));
  }
  return Object.entries(value as Record<string, any>).map(([k, v]) => {
    const childPath = `${path}.${k}`;
    if (isLeaf(v)) {
      return (
        <Leaf
          key={childPath}
          path={childPath}
          label={k}
          value={v}
          corrections={correctionsByPath.get(childPath)}
        />
      );
    }
    return (
      <div key={childPath} className="px-4 py-2">
        <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">
          {k.replace(/_/g, " ")}
        </p>
        <div className="pl-3 border-l border-border space-y-0">
          {renderNode(childPath, v, correctionsByPath)}
        </div>
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
  return (
    <div className="px-4 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground capitalize">
            {displayLabel.replace(/_/g, " ")}
          </p>
          <p className="text-sm text-foreground break-words">{renderFieldValue(value)}</p>
        </div>
        {corrections && corrections.length > 0 && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className="text-[10px]">
              Edited {corrections.length}×
            </Badge>
            {latest && <ChangeBadge correction={latest} />}
          </div>
        )}
      </div>
      {latest && (
        <p className="mt-1 text-xs text-muted-foreground">
          was: {renderFieldValue(latest.model_value)} → now:{" "}
          {renderFieldValue(latest.final_value)} · conf{" "}
          {latest.model_confidence !== null && latest.model_confidence !== undefined
            ? latest.model_confidence.toFixed(2)
            : "—"}{" "}
          · {getRelativeTime(latest.edited_at)}
        </p>
      )}
    </div>
  );
}

function ChangeBadge({ correction }: { correction: AIQualityCorrection }) {
  const high = (correction.model_confidence ?? 0) >= 0.85;
  const variantClass = cn(
    "text-[10px]",
    correction.change_type === "added" && "border-success text-success",
    correction.change_type === "cleared" && "border-destructive text-destructive",
    correction.change_type === "edited" && "border-warning text-warning",
  );
  const label =
    correction.change_type === "added"
      ? "Added by human"
      : correction.change_type === "cleared"
      ? "Cleared by human"
      : "Edited";
  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant="outline" className={variantClass}>
        {label}
      </Badge>
      {high && (
        <Badge variant="outline" className="text-[10px] border-warning text-warning">
          <AlertTriangle className="h-3 w-3 mr-0.5" /> high conf
        </Badge>
      )}
    </div>
  );
}
