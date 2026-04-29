import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2, AlertTriangle, Search, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIQualityOverview, useAIQualityCorrections } from "@/hooks/useAIQuality";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/dateUtils";
import { CorrectionRow } from "@/components/admin/CorrectionRow";
import type { AIQualityFieldRow } from "@/lib/aiQualityApi";

const DAY_OPTIONS = [7, 14, 30, 90] as const;

type SortKey =
  | "field_path"
  | "edit_count"
  | "high_conf_wrong_count"
  | "acceptance_rate"
  | "avg_model_confidence"
  | "last_edited_at";

function pct(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v * 100)}%`;
}

export default function AIQuality() {
  const { user } = useAuth();
  const [days, setDays] = useState<number>(7);
  const [formType, setFormType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("edit_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const overview = useAIQualityOverview(days, formType || undefined);
  const feed = useAIQualityCorrections({ days, limit: 20 });

  // Defensive client-side role gate (AdminLayout already enforces this).
  if (user && user.role !== "internal_admin") {
    return <Navigate to="/clinic/dashboard" replace />;
  }

  const sortedFields = useMemo<AIQualityFieldRow[]>(() => {
    const rows = overview.data?.fields ?? [];
    const filtered = search
      ? rows.filter((r) => r.field_path.toLowerCase().includes(search.toLowerCase()))
      : rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [overview.data, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const totals = overview.data?.totals;
  const formTypes = overview.data?.by_form_type ?? [];
  const watchList = (overview.data?.top_problem_fields ?? []).filter(
    (f) => f.high_conf_wrong_count > 0,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Extraction Quality</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Internal — track how often the AI extraction needs human correction. Used to
            iterate on the extraction prompt.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-card overflow-hidden">
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
          <Select
            value={formType || "all"}
            onValueChange={(v) => setFormType(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All form types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All form types</SelectItem>
              {formTypes.map((f) => (
                <SelectItem key={f.form_type} value={f.form_type}>
                  {f.form_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {overview.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : overview.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load AI quality metrics: {(overview.error as Error)?.message}
        </div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              label="Extractions"
              value={String(totals?.extractions ?? 0)}
              caption="in window"
            />
            <StatTile
              label="Acceptance rate"
              value={pct(totals?.acceptance_rate ?? null)}
              caption="no human edits"
            />
            <StatTile
              label="High-confidence-but-edited"
              value={String(totals?.high_conf_wrong ?? 0)}
              caption="model was confident AND wrong"
              warning={(totals?.high_conf_wrong ?? 0) > 0}
            />
            <StatTile
              label="Corrections logged"
              value={String(totals?.corrections ?? 0)}
              caption="across all fields"
            />
          </div>

          {/* Watch list */}
          {watchList.length > 0 && (
            <div className="rounded-xl border-l-4 border-l-warning border border-border bg-warning/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="font-semibold text-foreground">Watch list</p>
                  <p className="text-sm text-muted-foreground">
                    These fields had high model confidence but still needed correction:
                  </p>
                  <ul className="text-sm text-foreground space-y-1">
                    {watchList.slice(0, 5).map((f) => (
                      <li key={f.field_path}>
                        <code className="text-xs">{f.field_path}</code> —{" "}
                        {f.high_conf_wrong_count} high-conf wrong, {f.edit_count} total edits
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/admin/ai-quality/corrections?high_conf_only=true"
                    className="inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Review corrections →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Per-field accuracy table */}
          <section className="rounded-xl border border-border bg-card p-5 card-shadow">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-semibold text-foreground">Per-field accuracy</h2>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by field path…"
                  className="pl-8 w-[260px]"
                />
              </div>
            </div>
            {sortedFields.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No corrections logged yet. Once admins or clinic users edit AI-extracted
                fields, you'll see them here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Field" k="field_path" {...{ sortKey, sortDir, toggleSort }} />
                    <SortableHead label="Edits" k="edit_count" {...{ sortKey, sortDir, toggleSort }} />
                    <SortableHead label="High-conf wrong" k="high_conf_wrong_count" {...{ sortKey, sortDir, toggleSort }} />
                    <SortableHead label="Acceptance rate" k="acceptance_rate" {...{ sortKey, sortDir, toggleSort }} />
                    <SortableHead label="Avg model confidence" k="avg_model_confidence" {...{ sortKey, sortDir, toggleSort }} />
                    <SortableHead label="Last edited" k="last_edited_at" {...{ sortKey, sortDir, toggleSort }} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFields.map((row) => (
                    <TableRow key={row.field_path}>
                      <TableCell><code className="text-xs">{row.field_path}</code></TableCell>
                      <TableCell>{row.edit_count}</TableCell>
                      <TableCell className={row.high_conf_wrong_count > 0 ? "text-warning font-medium" : ""}>
                        {row.high_conf_wrong_count}
                      </TableCell>
                      <TableCell>{pct(row.acceptance_rate)}</TableCell>
                      <TableCell>
                        {row.avg_model_confidence !== null
                          ? row.avg_model_confidence.toFixed(3)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.last_edited_at ? getRelativeTime(row.last_edited_at) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          {/* Form-type rollup */}
          {formTypes.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5 card-shadow">
              <h2 className="font-semibold text-foreground mb-4">By form type</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form type</TableHead>
                    <TableHead>Edits</TableHead>
                    <TableHead>Edited referrals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formTypes.map((f) => (
                    <TableRow key={f.form_type}>
                      <TableCell>{f.form_type}</TableCell>
                      <TableCell>{f.edits}</TableCell>
                      <TableCell>{f.edited_referrals}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}

          {/* Recent corrections */}
          <section className="rounded-xl border border-border bg-card p-5 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Recent corrections</h2>
              <Link
                to="/admin/ai-quality/corrections"
                className="text-sm text-primary hover:underline"
              >
                See all →
              </Link>
            </div>
            {feed.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : feed.data && feed.data.items.length > 0 ? (
              <div className="space-y-2">
                {feed.data.items.map((c, i) => (
                  <CorrectionRow key={c.id ?? `${c.referral_id}-${c.field_path}-${i}`} correction={c} />
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No corrections in the last {days} days.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  caption,
  warning,
}: {
  label: string;
  value: string;
  caption: string;
  warning?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 card-shadow",
        warning && "border-warning/40 bg-warning/5",
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-3xl font-bold mt-2", warning ? "text-warning" : "text-foreground")}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{caption}</p>
    </div>
  );
}

function SortableHead({
  label,
  k,
  sortKey,
  sortDir,
  toggleSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  toggleSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-7 px-2 text-xs font-medium text-muted-foreground"
        onClick={() => toggleSort(k)}
      >
        {label}
        <ArrowUpDown className={cn("ml-1 h-3 w-3", active ? "text-foreground" : "opacity-50")} />
        {active && <span className="ml-0.5 text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </Button>
    </TableHead>
  );
}
