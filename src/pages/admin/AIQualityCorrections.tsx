import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIQualityCorrections } from "@/hooks/useAIQuality";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CorrectionRow } from "@/components/admin/CorrectionRow";
import { cn } from "@/lib/utils";
import type { AIQualityCorrection } from "@/lib/aiQualityApi";

const DAY_OPTIONS = [7, 14, 30, 90] as const;

export default function AIQualityCorrections() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialHighConf = searchParams.get("high_conf_only") === "true";

  const [days, setDays] = useState<number>(7);
  const [field, setField] = useState("");
  const [highConfOnly, setHighConfOnly] = useState(initialHighConf);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<AIQualityCorrection[]>([]);

  const query = useAIQualityCorrections({
    days,
    field: field || undefined,
    highConfOnly,
    limit: 50,
    cursor,
  });

  // Reset accumulator when filters change.
  useEffect(() => {
    setAccumulated([]);
    setCursor(undefined);
  }, [days, field, highConfOnly]);

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

  if (user && user.role !== "internal_admin") {
    return <Navigate to="/clinic/dashboard" replace />;
  }

  const nextCursor = query.data?.next_cursor ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          to="/admin/ai-quality"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to AI Quality
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Corrections</h1>
        <p className="text-sm text-muted-foreground">
          Internal — full log of human corrections to AI-extracted fields.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <Label className="text-xs text-muted-foreground">Time range</Label>
          <div className="mt-1 inline-flex rounded-md border border-border overflow-hidden">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors",
                  days === d
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[220px]">
          <Label className="text-xs text-muted-foreground">Field path</Label>
          <div className="relative mt-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder="e.g. clinical.drug_requested"
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            id="hco"
            checked={highConfOnly}
            onCheckedChange={(c) => setHighConfOnly(c === true)}
          />
          <Label htmlFor="hco" className="text-sm cursor-pointer">
            High-confidence only (≥ 0.85)
          </Label>
        </div>
      </div>

      {/* List */}
      {query.isLoading && accumulated.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load corrections: {(query.error as Error)?.message}
        </div>
      ) : accumulated.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No corrections match these filters.
        </p>
      ) : (
        <div className="space-y-2">
          {accumulated.map((c, i) => (
            <CorrectionRow
              key={c.id ?? `${c.referral_id}-${c.field_path}-${c.edited_at}-${i}`}
              correction={c}
            />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => setCursor(nextCursor)}
          >
            {query.isFetching ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
