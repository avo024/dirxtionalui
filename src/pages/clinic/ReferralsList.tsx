import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { Plus, FileSearch, ChevronLeft, ChevronRight, Eye, Archive, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { CreatedByAvatar } from "@/components/CreatedByAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterToolbar } from "@/components/patterns/FilterToolbar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { IdChip } from "@/components/patterns/IdChip";
import { clinicApi } from "@/lib/api";
import { mapReferralsFromBackend } from "@/lib/dataMapper";
import { useToast } from "@/hooks/use-toast";
import { formatDateShort } from "@/lib/dateUtils";
import type { Referral } from "@/types/index";
import "./wizard.css";

const filters = [
  { label: "All", value: "all" },
  { label: "In Review", value: "in_review" },
  { label: "Action Needed", value: "action_needed" },
  { label: "Sent", value: "sent_to_pharmacy" },
];
const filterStatusMap: Record<string, string[]> = {
  all: [],
  in_review: ["processing", "ready_for_review", "uploaded"],
  rejected: ["rejected"], // legacy deep links (?filter=rejected) keep working
  sent_to_pharmacy: ["sent_to_pharmacy", "approved_to_send"],
};
// Action Needed = everything Dirxctional is waiting on the clinic for:
// rejected referrals to fix + referrals with open tasks to answer.
const isActionNeeded = (r: any) => r.status === "rejected" || (r.open_task_count ?? 0) > 0;

type Sort = { col: "status" | "created" | "updated"; dir: "asc" | "desc" } | null;

// Ellipsis-aware page window: 1 … c-1 c c+1 … total
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

export default function ReferralsList() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(searchParams.get("filter") || "all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sort] = useState<Sort>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchReferrals() {
      try {
        setLoading(true);
        const response = await clinicApi.getReferrals({
          month: search.trim() ? "all" : month,
          archived: showArchived,
        });
        setReferrals(mapReferralsFromBackend((response as any).items || response || []));
      } catch (err) {
        console.error("Failed to fetch referrals:", err);
        toast({ title: "Error loading referrals", description: err instanceof Error ? err.message : "Could not connect to the server.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchReferrals();
    const handleFocus = () => fetchReferrals();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [toast, location.key, month, showArchived, search.trim() === "" ? "m" : "all"]);

  const getFilterCount = (value: string): number => {
    if (value === "all") return referrals.length;
    if (value === "action_needed") return referrals.filter(isActionNeeded).length;
    const statuses = filterStatusMap[value] || [value];
    return referrals.filter((r) => statuses.includes(r.status)).length;
  };

  const filtered = useMemo(() => {
    const base = referrals.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch = r.patient_name.toLowerCase().includes(q) || r.drug.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (activeFilter === "all") return true;
      if (activeFilter === "action_needed") return isActionNeeded(r);
      const statuses = filterStatusMap[activeFilter] || [activeFilter];
      return statuses.includes(r.status);
    });
    // Action Needed is layered: fix-these (rejected) first, then requests.
    if (activeFilter === "action_needed" && !sort) {
      return [...base].sort((a: any, b: any) =>
        (a.status === "rejected" ? 0 : 1) - (b.status === "rejected" ? 0 : 1));
    }
    if (!sort) return base;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a: any, b: any) => {
      let av: any, bv: any;
      if (sort.col === "created") { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
      else if (sort.col === "updated") { av = new Date(a.updated_at || 0).getTime(); bv = new Date(b.updated_at || 0).getTime(); }
      else { av = a.status || ""; bv = b.status || ""; }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [activeFilter, search, referrals, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);

  const handleFilter = (value: string) => { setActiveFilter(value); setCurrentPage(1); };
  const handleSearch = (value: string) => { setSearch(value); setCurrentPage(1); };
  const clearFilters = () => { setSearch(""); setActiveFilter("all"); };

  const filterOptions = filters.map((f) => ({
    value: f.value,
    label: f.label,
    ...(f.value === "action_needed" ? { alert: getFilterCount(f.value) } : { count: getFilterCount(f.value) }),
  }));

  return (
    <div className="rw-page rw-fade">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold serif text-foreground">My Referrals</h1>
          <p className="text-sm text-muted-foreground mt-1">View and track all your submitted referrals</p>
        </div>
        <Button asChild>
          <Link to="/clinic/referrals/new"><Plus width={16} height={16} strokeWidth={1.75} />New Referral</Link>
        </Button>
      </div>

      {/* Toolbar. Note: there is no "rejected" filter option in this list (folded
          into "Action Needed" pre-v2) so a data-tour="referrals-needs-attention"
          anchor was never actually rendered here — kept as a comment for parity. */}
      <div data-tour="referrals-filters" className="mb-4">
        <FilterToolbar
          filters={filterOptions}
          active={activeFilter}
          onFilter={handleFilter}
          search={search}
          onSearch={handleSearch}
          searchPlaceholder="Search by patient, drug, or ID…"
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
            <Button
              size="sm"
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived((v) => !v)}
            >
              <Archive width={14} height={14} strokeWidth={1.75} />
              {showArchived ? "Back to referrals" : "Archived"}
            </Button>
          }
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div data-tour="referrals-table" className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Drug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead data-tour="referrals-pa-col">PA Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/clinic/referrals/${r.id}`)}>
                  <TableCell><IdChip id={r.id} /></TableCell>
                  <TableCell><span className="font-semibold text-foreground">{r.patient_name}</span></TableCell>
                  <TableCell>{r.drug || r.drug_requested || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={r.status} variant="soft" />
                        {(r.open_task_count ?? 0) > 0 && (
                          <span
                            title="Your Dirxctional team is waiting on a reply or document"
                            className="inline-flex items-center rounded-full bg-warning/15 text-[#92610B] px-2 py-0.5 text-[10px] font-bold"
                          >
                            Request
                          </span>
                        )}
                      </span>
                      {(r.open_task_count ?? 0) > 0 && r.open_task_preview && (
                        <span title={r.open_task_preview} className="text-[11.5px] text-muted-foreground max-w-[280px] truncate">
                          "{r.open_task_preview}"
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><ClinicPABadge status={r.pa_status} appealOutcome={r.appeal_outcome} /></TableCell>
                  <TableCell className="text-muted-foreground">{r.created_at ? formatDateShort(r.created_at) : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.updated_at ? formatDateShort(r.updated_at) : "—"}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {showArchived ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await clinicApi.unarchiveReferral(r.id);
                            setReferrals((prev: any) => prev.filter((x: any) => x.id !== r.id));
                            toast({ title: "Referral restored" });
                          } catch (e: any) {
                            toast({ title: "Error", description: e.message, variant: "destructive" });
                          }
                        }}
                      >
                        <RotateCcw width={14} height={14} strokeWidth={1.75} />Unarchive
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/clinic/referrals/${r.id}`}><Eye width={14} height={14} strokeWidth={1.75} />View</Link>
                      </Button>
                    )}
                  </TableCell>
                  <TableCell><CreatedByAvatar name={r.created_by_name} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : search || activeFilter !== "all" ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><FileSearch width={20} height={20} strokeWidth={1.75} /></span>
          <p className="text-sm font-semibold text-foreground">No referrals found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          <Button size="sm" variant="outline" onClick={clearFilters}>Clear Filters</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><FileSearch width={26} height={26} strokeWidth={1.75} /></span>
          <h3 className="text-base font-semibold text-foreground">You haven't created any referrals yet</h3>
          <p className="text-sm text-muted-foreground">Create your first referral to get started</p>
          <Button asChild><Link to="/clinic/referrals/new"><Plus width={16} height={16} strokeWidth={1.75} />Create Your First Referral</Link></Button>
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">Showing {startItem}-{endItem} of {filtered.length} referrals</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={safePage === 1} onClick={() => setCurrentPage(safePage - 1)}><ChevronLeft width={15} height={15} strokeWidth={1.75} />Prev</Button>
            <div className="flex items-center gap-1">
              {pageWindow(totalPages, safePage).map((n, i) =>
                n === "…" ? (
                  <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                ) : (
                  <button
                    key={n}
                    className={`h-7 w-7 rounded-md text-xs font-medium ${n === safePage ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    onClick={() => setCurrentPage(n as number)}
                  >
                    {n}
                  </button>
                ),
              )}
            </div>
            <span className="text-xs text-muted-foreground">Page {safePage} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={safePage === totalPages} onClick={() => setCurrentPage(safePage + 1)}>Next<ChevronRight width={15} height={15} strokeWidth={1.75} /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
