import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Check, ChevronDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAIQualityCorrections } from "@/hooks/useAIQuality";
import { CorrectionRow } from "@/components/admin/CorrectionRow";
import { FilterToolbar } from "@/components/patterns/FilterToolbar";
import { Button } from "@/components/ui/button";
import { dismissCorrection, restoreCorrection, type AIQualityCorrection } from "@/lib/aiQualityApi";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/patterns/PageContainer";

function monthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "long", year: "numeric" });
    opts.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: i === 0 ? `${label} · this month` : label });
  }
  return opts;
}

export default function AIQualityCorrections() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialHighConf = searchParams.get("high_conf_only") === "true";
  const initialField = searchParams.get("field") ?? "";
  const queryClient = useQueryClient();

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [field, setField] = useState(initialField);
  const [highConfOnly, setHighConfOnly] = useState(initialHighConf);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<AIQualityCorrection[]>([]);

  const query = useAIQualityCorrections({
    month,
    field: field || undefined,
    highConfOnly,
    limit: 50,
    cursor,
  });

  // Reset accumulator when filters change.
  useEffect(() => {
    setAccumulated([]);
    setCursor(undefined);
  }, [month, field, highConfOnly]);

  // Append new page when query data lands.
  useEffect(() => {
    if (query.data?.items) {
      setAccumulated((prev) => {
        const ids = new Set(prev.map((c, i) => c.id ?? `${c.referral_id}-${c.field_path}-${c.edited_at}-${i}`));
        const next = query.data!.items.filter(
          (c, i) => !ids.has(c.id ?? `${c.referral_id}-${c.field_path}-${c.edited_at}-${i}`),
        );
        return [...prev, ...next];
      });
    }
  }, [query.data]);

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  function applyDismissedState(id: string, dismissedAt: string | null) {
    setAccumulated((prev) => prev.map((c) => (c.id === id ? { ...c, dismissed_at: dismissedAt } : c)));
  }

  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissCorrection(id),
    onMutate: (id) => setPendingIds((prev) => new Set(prev).add(id)),
    onSuccess: (_res, id) => {
      applyDismissedState(id, new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ["ai-quality"] });
    },
    onSettled: (_res, _err, id) =>
      setPendingIds((prev) => { const next = new Set(prev); next.delete(id); return next; }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreCorrection(id),
    onMutate: (id) => setPendingIds((prev) => new Set(prev).add(id)),
    onSuccess: (_res, id) => {
      applyDismissedState(id, null);
      queryClient.invalidateQueries({ queryKey: ["ai-quality"] });
    },
    onSettled: (_res, _err, id) =>
      setPendingIds((prev) => { const next = new Set(prev); next.delete(id); return next; }),
  });

  if (user && user.role !== "internal_admin") {
    return <Navigate to="/clinic/dashboard" replace />;
  }

  const nextCursor = query.data?.next_cursor ?? null;

  return (
    <PageContainer className="max-w-4xl">
      {/* Header */}
      <div className="mb-5">
        <Link className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3" to="/admin/ai-quality">
          <ArrowLeft width={15} height={15} strokeWidth={1.75} />Back to overview
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Corrections feed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every reviewer edit, newest first. The amber tint marks edits the model was confident about (≥ 0.85).
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)] mb-4">
        <FilterToolbar
          search={field}
          onSearch={setField}
          searchPlaceholder="Filter by field path…"
          selects={[
            {
              options: monthOptions().map((m) => m.label),
              value: monthOptions().find((m) => m.value === month)?.label,
              onChange: (label) => {
                const m = monthOptions().find((o) => o.label === label);
                if (m) setMonth(m.value);
              },
              width: "200px",
            },
          ]}
          trailing={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setHighConfOnly((v) => !v)}
                className="inline-flex items-center gap-2 text-sm text-foreground"
              >
                <span className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  highConfOnly ? "bg-primary border-primary text-primary-foreground" : "border-input",
                )}>
                  {highConfOnly && <Check width={12} height={12} strokeWidth={2} />}
                </span>
                High-confidence only (≥ 0.85)
              </button>
              <span className="text-xs text-muted-foreground">{accumulated.length} loaded</span>
            </div>
          }
        />
      </div>

      {/* List */}
      {query.isLoading && accumulated.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 width={26} height={26} strokeWidth={1.75} className="animate-spin text-primary" /></div>
      ) : query.isError ? (
        <div className="bg-card border border-destructive/30 rounded-lg p-[var(--density-card-pad)] text-sm text-destructive">
          Failed to load corrections: {(query.error as Error)?.message}
        </div>
      ) : accumulated.length === 0 ? (
        <div className="bg-card border border-border rounded-lg py-8 text-center text-sm text-muted-foreground">No corrections match these filters.</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {accumulated.map((c, i) => (
            <CorrectionRow
              key={c.id ?? `${c.referral_id}-${c.field_path}-${c.edited_at}-${i}`}
              correction={c}
              dismissable
              busy={!!c.id && pendingIds.has(c.id)}
              onDismiss={(id) => dismissMutation.mutate(id)}
              onRestore={(id) => restoreMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" disabled={query.isFetching} onClick={() => setCursor(nextCursor)}>
            <ChevronDown width={15} height={15} strokeWidth={1.75} />{query.isFetching ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
