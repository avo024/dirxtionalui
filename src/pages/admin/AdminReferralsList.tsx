import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, MoreHorizontal, RotateCcw, Search, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { underlineTabsListClass, underlineTabsTriggerClass } from "@/components/patterns/underlineTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { QueueList } from "@/components/patterns/QueueList";
import { QueueRow } from "@/components/patterns/QueueRow";
import { FilterToolbar } from "@/components/patterns/FilterToolbar";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { resolveNextAction, ballKey, groupKey, stageLabelForQueue, type NextAction } from "@/lib/nextAction";
import { toNextActionInput, toQueueRow, type QueueRowData } from "@/lib/queueRows";

type Tab = "us" | "others" | "all";
type GroupBy = "action" | "stage" | "clinic" | "none";

// flow-script stage order, used both for "Group by: Stage" ordering and the
// stage filter dropdown on the work tabs (Alex, phase 3b follow-up).
const STAGE_ORDER = [
  "Review",
  "PA pending",
  "PA submitted",
  "PA approved",
  "PA denied",
  "Appeal",
  "Level 2",
  "Appeal final",
  "Enrollment",
  "Ready to send",
  "Sent",
  "Rejected",
  "Closed",
  "Processing",
] as const;

const STAGE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "Any stage" },
  ...STAGE_ORDER.map((s) => ({ value: s, label: s })),
];

/** flow-script stage order first, unknown labels alphabetically after. */
function orderStageGroups(groups: Group[]): Group[] {
  return [...groups].sort((a, b) => {
    const ai = STAGE_ORDER.indexOf(a.key as (typeof STAGE_ORDER)[number]);
    const bi = STAGE_ORDER.indexOf(b.key as (typeof STAGE_ORDER)[number]);
    if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

const PAGE_SIZE = 25;

// Existing admin statuses (mockData.ReferralStatus), used for the status
// dropdown. "Any status" is the default — on the work tabs it filters within
// the tab; on All it's a plain equality filter passed nowhere server-side
// (the All query is month/archived-scoped only, status filters client-side).
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "Any status" },
  { value: "uploaded", label: "Uploaded" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_review", label: "Needs review" },
  { value: "approved_to_send", label: "Ready to send" },
  { value: "sent_to_pharmacy", label: "Sent" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

const BALL_ORDER = ["Payer", "Clinic", "Manufacturer", "Pharmacy", "System"] as const;

function monthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "long", year: "numeric" });
    opts.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: i === 0 ? `${label} · this month` : label });
  }
  opts.push({ value: "all", label: "All time" });
  return opts;
}

function pageWindow(total: number, cur: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, cur - 1), hi = Math.min(total - 1, cur + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push("…");
  out.push(total);
  return out;
}

/** Overdue first, then due soonest, then oldest last-activity — flow-script §2. */
function sortRows(rows: QueueRowData[]): QueueRowData[] {
  return [...rows].sort((a, b) => {
    if (a.next.overdue !== b.next.overdue) return a.next.overdue ? -1 : 1;
    const ad = a.next.dueAt ? a.next.dueAt.getTime() : Infinity;
    const bd = b.next.dueAt ? b.next.dueAt.getTime() : Infinity;
    if (ad !== bd) return ad - bd;
    const au = a.raw.updated_at ? new Date(a.raw.updated_at).getTime() : 0;
    const bu = b.raw.updated_at ? new Date(b.raw.updated_at).getTime() : 0;
    return au - bu;
  });
}

/** Due soonest — flow-script §2 default sort for Waiting on others. */
function sortByDueSoonest(rows: QueueRowData[]): QueueRowData[] {
  return [...rows].sort((a, b) => {
    const ad = a.next.dueAt ? a.next.dueAt.getTime() : Infinity;
    const bd = b.next.dueAt ? b.next.dueAt.getTime() : Infinity;
    return ad - bd;
  });
}

interface Group {
  key: string;
  rows: QueueRowData[];
}

/** Interrupt groups first, then groups containing an overdue row, then the rest alphabetically. */
function orderActionGroups(groups: Group[]): Group[] {
  return [...groups].sort((a, b) => {
    const aInterrupt = a.rows.some((r) => !!r.next.interrupt);
    const bInterrupt = b.rows.some((r) => !!r.next.interrupt);
    if (aInterrupt !== bInterrupt) return aInterrupt ? -1 : 1;
    const aOverdue = a.rows.some((r) => r.next.overdue);
    const bOverdue = b.rows.some((r) => r.next.overdue);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    return a.key.localeCompare(b.key);
  });
}

function CountBadge({ n }: { n: number }) {
  return <span className="ml-1.5 text-xs font-semibold text-muted-foreground tabular-nums">{n}</span>;
}

/** Small overflow menu: Open in new tab, Archive/Restore. */
function RowMenu({ id, archived, onArchive, onUnarchive }: { id: string; archived: boolean; onArchive: () => void; onUnarchive: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More options"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <MoreHorizontal width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => window.open(`/admin/referrals/${id}`, "_blank", "noopener,noreferrer")}>
          <ExternalLink className="mr-2 h-4 w-4" /> Open in new tab
        </DropdownMenuItem>
        {archived ? (
          <DropdownMenuItem onClick={onUnarchive}>
            <RotateCcw className="mr-2 h-4 w-4" /> Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onArchive}>
            <Trash2 className="mr-2 h-4 w-4" /> Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupHeader({ label, count, overdueCount, expanded, onToggle }: { label: string; count: number; overdueCount: number; expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-foreground bg-muted/40 border-b border-border hover:bg-muted/60"
    >
      <ChevronDown width={14} height={14} strokeWidth={1.75} className={expanded ? "" : "-rotate-90"} aria-hidden="true" />
      <span>{label}</span>
      <span className="inline-flex items-center rounded-full bg-muted px-1.5 text-[11px] font-bold text-muted-foreground">{count}</span>
      {overdueCount > 0 && <span className="text-xs font-semibold text-destructive">{overdueCount} overdue</span>}
    </button>
  );
}

function RowSkeletons() {
  return (
    <QueueList>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-4 py-3 border-b last:border-b-0 border-border">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48 flex-1" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </QueueList>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Search className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-semibold text-foreground">No referrals found</p>
      <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
      <button type="button" onClick={onClear} className="mt-2 text-sm font-medium text-primary hover:underline">
        Clear filters
      </button>
    </div>
  );
}

export default function AdminReferralsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Deep-link resolution (flow-script §2, dashboard ?filter= links) ──
  const initialFilter = searchParams.get("filter");
  const STATUS_DEEP_LINKS: Record<string, string> = {
    needs_review: "ready_for_review",
    approved_to_send: "approved_to_send",
    sent_to_pharmacy: "sent_to_pharmacy",
    rejected: "rejected",
  };
  const US_DEEP_LINKS = new Set(["delivery_issues", "task_replies", "pa_pending", "appeal"]);

  const initialTab: Tab = (() => {
    const t = searchParams.get("tab") as Tab | null;
    if (t === "us" || t === "others" || t === "all") return t;
    if (initialFilter && STATUS_DEEP_LINKS[initialFilter]) return "all";
    if (initialFilter && US_DEEP_LINKS.has(initialFilter)) return "us";
    return "us";
  })();

  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (initialFilter && STATUS_DEEP_LINKS[initialFilter]) return STATUS_DEEP_LINKS[initialFilter];
    if (initialFilter === "delivery_issues") return "sent_to_pharmacy"; // flow-script: dropdown shows "Sent"
    return "any";
  });
  const [clinicFilter, setClinicFilter] = useState("all");
  // Stage filter for the work tabs (Waiting on us / Waiting on others) —
  // separate from `statusFilter`, which stays raw-status and All-tab-only.
  const [stageFilter, setStageFilter] = useState<string>(() => {
    if (initialFilter === "pa_pending") return "PA pending";
    if (initialFilter === "appeal") return "Appeal";
    return "any";
  });
  const [groupBy, setGroupBy] = useState<GroupBy>("action");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // All tab defaults to all-time (Alex, live review 2026-09-23: a month-scoped
  // default showed "All 0" while work tabs showed rows). Month select still offers this month and back.
  const [month, setMonth] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);

  // ── Data: work tabs load ALL-TIME, non-archived rows (work is not
  // month-scoped — flow-script §2). All tab loads its own month/archived-
  // scoped query. ──
  const [workRows, setWorkRows] = useState<any[]>([]);
  const [workLoading, setWorkLoading] = useState(true);
  const [allRows, setAllRows] = useState<any[]>([]);
  const [allLoading, setAllLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setWorkLoading(true);
    adminApi
      .getReferrals({ month: "all", archived: false })
      .then((res) => {
        if (cancelled) return;
        setWorkRows(res.items || []);
      })
      .catch((err: any) => toast({ title: "Error", description: err.message || "Failed to load referrals", variant: "destructive" }))
      .finally(() => !cancelled && setWorkLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== "all") return;
    let cancelled = false;
    setAllLoading(true);
    adminApi
      .getReferrals({ month, archived: showArchived })
      .then((res) => {
        if (cancelled) return;
        setAllRows(res.items || []);
      })
      .catch((err: any) => toast({ title: "Error", description: err.message || "Failed to load referrals", variant: "destructive" }))
      .finally(() => !cancelled && setAllLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, month, showArchived]);

  // Sanity-tooltip counts only, per spec — nothing else reads this.
  const [counts, setCounts] = useState<any>({});
  useEffect(() => {
    adminApi.getReferralCounts().then(setCounts).catch(() => {});
  }, []);

  const now = useMemo(() => new Date(), [workRows]);

  const workQueueRows: QueueRowData[] = useMemo(
    () => workRows.map((r) => toQueueRow(r, resolveNextAction(toNextActionInput(r, now)))),
    [workRows, now],
  );

  const usRows = useMemo(() => workQueueRows.filter((r) => r.next.tab === "us"), [workQueueRows]);
  const othersRows = useMemo(() => workQueueRows.filter((r) => r.next.tab === "others"), [workQueueRows]);

  const clinics = useMemo(
    () => [...new Set([...workRows, ...allRows].map((r: any) => r.clinic_name).filter(Boolean))] as string[],
    [workRows, allRows],
  );

  // Work tabs (Waiting on us / Waiting on others) filter by resolved stage,
  // not raw status — the raw-status dropdown stays All-tab-only.
  const applyWorkFilters = (rows: QueueRowData[]) => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !((r.raw.patient_name || "").toLowerCase().includes(q) || (r.raw.id || "").toLowerCase().includes(q))) return false;
      if (stageFilter !== "any" && stageLabelForQueue(r.next.stage) !== stageFilter) return false;
      if (clinicFilter !== "all" && r.raw.clinic_name !== clinicFilter) return false;
      return true;
    });
  };

  const applySearchAndFilters = (rows: QueueRowData[]) => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !((r.raw.patient_name || "").toLowerCase().includes(q) || (r.raw.id || "").toLowerCase().includes(q))) return false;
      if (statusFilter !== "any" && r.raw.status !== statusFilter) return false;
      if (clinicFilter !== "all" && r.raw.clinic_name !== clinicFilter) return false;
      return true;
    });
  };

  const filteredUsRows = useMemo(() => applyWorkFilters(usRows), [usRows, search, stageFilter, clinicFilter]);
  const filteredOthersRows = useMemo(() => applyWorkFilters(othersRows), [othersRows, search, stageFilter, clinicFilter]);

  // ── Grouping: Waiting on us ──
  const usGroups: Group[] | null = useMemo(() => {
    if (groupBy === "none") return null;
    const key =
      groupBy === "clinic" ? (r: QueueRowData) => r.raw.clinic_name || "No clinic" :
      groupBy === "stage" ? (r: QueueRowData) => stageLabelForQueue(r.next.stage) :
      (r: QueueRowData) => groupKey(r.next);
    const map = new Map<string, QueueRowData[]>();
    for (const r of filteredUsRows) {
      const k = key(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    const groups: Group[] = [...map.entries()].map(([k, rows]) => ({ key: k, rows: sortRows(rows) }));
    return groupBy === "stage" ? orderStageGroups(groups) : orderActionGroups(groups);
  }, [filteredUsRows, groupBy]);

  const usFlat: QueueRowData[] = useMemo(() => sortRows(filteredUsRows), [filteredUsRows]);

  // ── Grouping: Waiting on others (fixed ball order) ──
  const othersGroups: Group[] = useMemo(() => {
    const map = new Map<string, QueueRowData[]>();
    for (const r of filteredOthersRows) {
      const k = ballKey(r.next) ?? "Other";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    const ordered: Group[] = [];
    for (const k of BALL_ORDER) {
      if (map.has(k)) ordered.push({ key: k, rows: sortByDueSoonest(map.get(k)!) });
    }
    const leftover = [...map.keys()].filter((k) => !(BALL_ORDER as readonly string[]).includes(k));
    for (const k of leftover) ordered.push({ key: k, rows: sortByDueSoonest(map.get(k)!) });
    return ordered;
  }, [filteredOthersRows]);

  // ── All tab: flat, newest first, client-side status/clinic/search filter, paginated ──
  const allQueueRows: QueueRowData[] = useMemo(
    () => allRows.map((r) => toQueueRow(r, resolveNextAction(toNextActionInput(r, now)))),
    [allRows, now],
  );
  const filteredAllRows = useMemo(() => {
    const rows = applySearchAndFilters(allQueueRows);
    return [...rows].sort((a, b) => new Date(b.raw.created_at || 0).getTime() - new Date(a.raw.created_at || 0).getTime());
  }, [allQueueRows, search, statusFilter, clinicFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAllRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedAllRows = filteredAllRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Tab switching persists in the URL ──
  const handleTabChange = (v: string) => {
    const t = v as Tab;
    setTab(t);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.set("tab", t);
    next.delete("filter");
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("any");
    setStageFilter("any");
    setClinicFilter("all");
  };

  const archiveRow = async (id: string, list: "work" | "all") => {
    try {
      await adminApi.archiveReferral(id);
      if (list === "work") setWorkRows((prev) => prev.filter((r) => r.id !== id));
      else setAllRows((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Referral archived" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };
  const unarchiveRow = async (id: string) => {
    try {
      await adminApi.unarchiveReferral(id);
      setAllRows((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Referral restored" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const renderRowWithMenu = (r: QueueRowData, list: "work" | "all") => (
    <QueueRow
      key={r.id}
      verb={r.verb}
      due={r.due}
      urgency={r.urgency}
      patient={r.patient}
      drug={r.drug}
      bridge={r.bridge}
      clinic={r.clinic}
      stage={r.stage}
      stageTone={r.stageTone}
      signal={r.signal}
      extra={r.extra}
      assignee={r.assignee}
      onClick={() => navigate(`/admin/referrals/${r.id}`)}
      menu={
        <RowMenu
          id={r.id}
          archived={list === "all" && showArchived}
          onArchive={() => archiveRow(r.id, list)}
          onUnarchive={() => unarchiveRow(r.id)}
        />
      }
    />
  );

  const loading = tab === "all" ? allLoading : workLoading;

  const footerHint =
    tab === "us"
      ? "Interrupts first, then actions with overdue rows, then the rest by due. Overdue rows first inside each group."
      : tab === "others"
        ? "Grouped by who has the ball. Rows move to Waiting on us when their clock expires."
        : "Newest first · month-scoped.";

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Referrals</h1>
        <p className="text-sm text-muted-foreground">Manage and review referrals from all clinics</p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className={underlineTabsListClass}>
          <TabsTrigger value="us" className={underlineTabsTriggerClass}>
            Waiting on us
            <CountBadge n={usRows.length} />
          </TabsTrigger>
          <TabsTrigger value="others" className={underlineTabsTriggerClass}>
            Waiting on others
            <CountBadge n={othersRows.length} />
          </TabsTrigger>
          <TabsTrigger value="all" className={underlineTabsTriggerClass}>
            All
            <CountBadge n={filteredAllRows.length} />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <FilterToolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by patient name or ID…"
        selects={[
          tab === "all"
            ? {
                options: STATUS_OPTIONS.map((s) => s.label),
                value: STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label,
                onChange: (label: string) => {
                  const opt = STATUS_OPTIONS.find((s) => s.label === label);
                  setStatusFilter(opt?.value ?? "any");
                  setPage(1);
                },
                width: "170px",
              }
            : {
                options: STAGE_FILTER_OPTIONS.map((s) => s.label),
                value: STAGE_FILTER_OPTIONS.find((s) => s.value === stageFilter)?.label,
                onChange: (label: string) => {
                  const opt = STAGE_FILTER_OPTIONS.find((s) => s.label === label);
                  setStageFilter(opt?.value ?? "any");
                  setPage(1);
                },
                width: "170px",
              },
          {
            options: ["All Clinics", ...clinics],
            value: clinicFilter === "all" ? "All Clinics" : clinicFilter,
            onChange: (v) => { setClinicFilter(v === "All Clinics" ? "all" : v); setPage(1); },
            width: "180px",
          },
          ...(tab === "us"
            ? [
                {
                  options: ["Group by: Action", "Group by: Stage", "Group by: Clinic", "Group by: List"],
                  value: `Group by: ${groupBy === "action" ? "Action" : groupBy === "stage" ? "Stage" : groupBy === "clinic" ? "Clinic" : "List"}`,
                  onChange: (v: string) => {
                    setGroupBy(v.endsWith("Action") ? "action" : v.endsWith("Stage") ? "stage" : v.endsWith("Clinic") ? "clinic" : "none");
                  },
                  width: "170px",
                },
              ]
            : []),
          ...(tab === "all"
            ? [
                {
                  options: monthOptions().map((m) => m.label),
                  value: monthOptions().find((m) => m.value === month)?.label,
                  onChange: (label: string) => {
                    const opt = monthOptions().find((m) => m.label === label);
                    setMonth(opt?.value ?? month);
                    setPage(1);
                  },
                  width: "190px",
                },
              ]
            : []),
        ]}
        trailing={
          tab === "all" ? (
            <button
              type="button"
              onClick={() => { setShowArchived((v) => !v); setPage(1); }}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted"
            >
              {showArchived ? "Back to referrals" : "Archived"}
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <RowSkeletons />
      ) : tab === "all" ? (
        filteredAllRows.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : (
          <>
            <QueueList>{paginatedAllRows.map((r) => renderRowWithMenu(r, "all"))}</QueueList>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredAllRows.length)} of {filteredAllRows.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-input text-sm disabled:opacity-40">
                    <ChevronLeft width={15} height={15} /> Prev
                  </button>
                  {pageWindow(totalPages, safePage).map((n, i) =>
                    n === "…" ? (
                      <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n as number)}
                        className={`h-8 min-w-8 px-2 rounded-md text-sm ${n === safePage ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        {n}
                      </button>
                    ),
                  )}
                  <button type="button" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-input text-sm disabled:opacity-40">
                    Next <ChevronRight width={15} height={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )
      ) : tab === "us" ? (
        filteredUsRows.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : usGroups ? (
          <div className="space-y-3">
            {usGroups.map((g) => {
              const isCollapsed = collapsed.has(g.key);
              const overdueCount = g.rows.filter((r) => r.next.overdue).length;
              return (
                <QueueList key={g.key}>
                  <GroupHeader label={g.key} count={g.rows.length} overdueCount={overdueCount} expanded={!isCollapsed} onToggle={() => toggleGroup(g.key)} />
                  {!isCollapsed && g.rows.map((r) => renderRowWithMenu(r, "work"))}
                </QueueList>
              );
            })}
          </div>
        ) : (
          <QueueList>{usFlat.map((r) => renderRowWithMenu(r, "work"))}</QueueList>
        )
      ) : filteredOthersRows.length === 0 ? (
        <EmptyState onClear={clearFilters} />
      ) : (
        <div className="space-y-3">
          {othersGroups.map((g) => {
            const isCollapsed = collapsed.has(g.key);
            return (
              <QueueList key={g.key}>
                <GroupHeader label={g.key} count={g.rows.length} overdueCount={0} expanded={!isCollapsed} onToggle={() => toggleGroup(g.key)} />
                {!isCollapsed && g.rows.map((r) => renderRowWithMenu(r, "work"))}
              </QueueList>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{footerHint}</p>
    </div>
  );
}
