import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Loader2, AlertTriangle, FileText, CheckCircle2, PencilLine,
  ChevronsUpDown, ChevronUp, ChevronDown, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIQualityOverview, useAIQualityCorrections } from "@/hooks/useAIQuality";
import { getRelativeTime } from "@/lib/dateUtils";
import { CorrectionRow } from "@/components/admin/CorrectionRow";
import { FilterToolbar } from "@/components/patterns/FilterToolbar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AIQualityFieldRow } from "@/lib/aiQualityApi";

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
function confFmt(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(2);
}
function acceptClass(v: number | null): string {
  if (v === null || v === undefined) return "text-muted-foreground";
  if (v >= 0.9) return "text-success";
  if (v >= 0.7) return "text-warning";
  return "text-destructive";
}

const STAT_TONE: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-[#92610B]",
  teal: "bg-teal-600/10 text-teal-700",
};

export default function AIQuality() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [formType, setFormType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("edit_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const overview = useAIQualityOverview({ month, formType: formType || undefined });
  const feed = useAIQualityCorrections({ month, limit: 20 });

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
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const SortTh = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => {
    const active = sortKey === k;
    const Caret = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
    return (
      <TableHead className={right ? "text-right" : undefined}>
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className={cn("inline-flex items-center gap-1 hover:text-foreground", right && "flex-row-reverse")}
        >
          {children}
          <Caret width={13} height={13} strokeWidth={1.75} className={active ? "text-foreground" : "opacity-50"} />
        </button>
      </TableHead>
    );
  };

  const totals = overview.data?.totals;
  const formTypes = overview.data?.by_form_type ?? [];
  const watchList = (overview.data?.top_problem_fields ?? []).filter((f) => f.high_conf_wrong_count > 0);

  const stats = [
    { key: "extractions", label: "Extractions", tone: "primary", icon: FileText, value: String(totals?.extractions ?? 0), sub: "in window" },
    { key: "acceptance", label: "Acceptance rate", tone: "success", icon: CheckCircle2, value: pct(totals?.acceptance_rate ?? null), sub: "no human edits" },
    { key: "hcw", label: "High-confidence-but-edited", tone: "warning", icon: AlertTriangle, value: String(totals?.high_conf_wrong ?? 0), sub: "model was confident AND wrong" },
    { key: "corrections", label: "Corrections logged", tone: "teal", icon: PencilLine, value: String(totals?.corrections ?? 0), sub: "across all fields" },
  ];

  return (
    <div className="rw-page rw-fade">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-semibold serif text-foreground">AI Extraction Quality</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Internal — track how often the AI extraction needs human correction. Used to iterate on the extraction prompt.
          </p>
        </div>
        <FilterToolbar
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
            {
              options: ["All form types", ...formTypes.map((f) => f.form_type)],
              value: formType || "All form types",
              onChange: (v) => setFormType(v === "All form types" ? "" : v),
              width: "200px",
            },
          ]}
        />
      </div>

      {overview.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 width={26} height={26} strokeWidth={1.75} className="animate-spin text-primary" /></div>
      ) : overview.isError ? (
        <div className="bg-card border border-destructive/30 rounded-lg p-[var(--density-card-pad)] text-sm text-destructive">
          Failed to load AI quality metrics: {(overview.error as Error)?.message}
        </div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {stats.map((s) => (
              <div key={s.key} className={cn("bg-card border rounded-lg p-3.5", s.tone === "warning" ? "border-warning/30" : "border-border")}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", STAT_TONE[s.tone])}>
                    <s.icon width={16} height={16} strokeWidth={1.75} />
                  </span>
                </div>
                <p className="text-2xl font-semibold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Watch list */}
          {watchList.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)] mb-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    Watch list <AlertTriangle width={16} height={16} strokeWidth={1.75} className="text-warning" />
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Fields the model was confident about (≥ 0.85) but reviewers still corrected.</p>
                </div>
                <Link className="inline-flex items-center gap-1 text-sm font-medium text-primary shrink-0" to="/admin/ai-quality/corrections?high_conf_only=true">
                  View high-conf corrections <ArrowRight width={14} height={14} strokeWidth={1.75} />
                </Link>
              </div>
              <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                {watchList.slice(0, 8).map((f) => (
                  <Link
                    key={f.field_path}
                    className="rounded-md border border-border bg-background px-3 py-2.5 no-underline hover:bg-muted/50 transition-colors"
                    to={`/admin/ai-quality/corrections?high_conf_only=true&field=${encodeURIComponent(f.field_path)}`}
                  >
                    <div className="text-sm font-semibold text-foreground truncate">{f.field_path}</div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-lg font-semibold text-warning">{f.high_conf_wrong_count}</span>
                      <span className="text-xs text-muted-foreground">high-conf edits</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{f.edit_count} total edits</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Per-field accuracy table */}
          <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)] mb-4">
            <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Per-field accuracy</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Every extracted field, ranked. Amber flags confident-but-wrong counts.</p>
              </div>
              <FilterToolbar search={search} onSearch={setSearch} searchPlaceholder="Filter by field path…" />
            </div>
            {sortedFields.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No corrections logged yet. Once admins or clinic users edit AI-extracted fields, you'll see them here.
              </p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortTh k="field_path">Field path</SortTh>
                      <SortTh k="edit_count" right>Edits</SortTh>
                      <SortTh k="high_conf_wrong_count" right>High-conf wrong</SortTh>
                      <SortTh k="acceptance_rate" right>Acceptance</SortTh>
                      <SortTh k="avg_model_confidence" right>Avg conf</SortTh>
                      <SortTh k="last_edited_at">Last edited</SortTh>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFields.map((row) => (
                      <TableRow key={row.field_path}>
                        <TableCell>
                          <Link className="font-semibold text-primary" to={`/admin/ai-quality/corrections?field=${encodeURIComponent(row.field_path)}`}>
                            {row.field_path}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{row.edit_count}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn("inline-flex items-center gap-1 justify-end", row.high_conf_wrong_count === 0 ? "text-muted-foreground" : "text-warning font-semibold")}>
                            {row.high_conf_wrong_count > 0 && <AlertTriangle width={11} height={11} strokeWidth={1.75} />}{row.high_conf_wrong_count}
                          </span>
                        </TableCell>
                        <TableCell className={cn("text-right font-semibold", acceptClass(row.acceptance_rate))}>{pct(row.acceptance_rate)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-muted-foreground">{confFmt(row.avg_model_confidence)}</span>
                            {row.avg_model_confidence !== null && (
                              <span className="inline-block h-1.5 w-10 rounded-full bg-muted overflow-hidden">
                                <span className="block h-full bg-primary" style={{ width: `${row.avg_model_confidence * 100}%` }} />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.last_edited_at ? getRelativeTime(row.last_edited_at) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Form-type rollup */}
          {formTypes.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)] mb-4">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground">By form type</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Correction load per document type.</p>
              </div>
              <div className="rounded-lg border border-border overflow-hidden max-w-lg">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Form type</TableHead><TableHead className="text-right">Edits</TableHead><TableHead className="text-right">Edited referrals</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {formTypes.map((f) => (
                      <TableRow key={f.form_type}>
                        <TableCell className="font-semibold text-foreground">{f.form_type}</TableCell>
                        <TableCell className="text-right">{f.edits}</TableCell>
                        <TableCell className="text-right">{f.edited_referrals}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Recent corrections */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-[var(--density-card-pad)] pt-[var(--density-card-pad)] pb-3">
              <h2 className="text-sm font-semibold text-foreground">Recent corrections</h2>
              <Link className="inline-flex items-center gap-1 text-sm font-medium text-primary" to="/admin/ai-quality/corrections">View all <ArrowRight width={14} height={14} strokeWidth={1.75} /></Link>
            </div>
            {feed.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 width={22} height={22} strokeWidth={1.75} className="animate-spin text-muted-foreground" /></div>
            ) : feed.data && feed.data.items.length > 0 ? (
              <div>
                {feed.data.items.map((c, i) => (
                  <CorrectionRow key={c.id ?? `${c.referral_id}-${c.field_path}-${i}`} correction={c} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No corrections in {monthOptions().find((m) => m.value === month)?.label ?? "this month"}.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
