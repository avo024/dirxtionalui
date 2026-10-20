import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { PAStatusBadge } from "@/components/PAStatusBadge";
import { Button } from "@/components/ui/button";
import { FilterToolbar } from "@/components/patterns/FilterToolbar";
import { ListRows, ListRow } from "@/components/patterns/ListRow";
import { EmptyState } from "@/components/patterns/EmptyState";
import { clinicApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDateShort, parseLocalDate } from "@/lib/dateUtils";
import { PageContainer } from "@/components/patterns/PageContainer";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "expiring", label: "Expiring" },
];

function isExpiringSoon(p: any): boolean {
  if (!p.pa_expiration_date) return false;
  const daysLeft = Math.ceil((parseLocalDate(p.pa_expiration_date).getTime() - Date.now()) / 86400000);
  return daysLeft > 0 && daysLeft <= 30;
}

function matchesFilter(p: any, filter: string) {
  if (filter === "active") return p.pa_status === "approved" && p.last_drug;
  if (filter === "inactive") return !p.pa_status || p.pa_status === "none" || p.pa_status === "expired";
  if (filter === "expiring") return isExpiringSoon(p);
  return true;
}

type Sort = { col: "name" | "dob" | "created"; dir: "asc" | "desc" } | null;

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
function getAge(dob: string) {
  const b = parseLocalDate(dob), t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

export default function PatientsList() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<Sort>(null);
  const pageSize = 10;
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    clinicApi.getPatients(search)
      .then((data) => setPatients(data.items || []))
      .catch(() => toast({ title: "Error", description: "Failed to load patients", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [search]);

  const filterCount = (value: string) => value === "all" ? patients.length : patients.filter((p) => matchesFilter(p, value)).length;

  const filtered = useMemo(() => {
    const base = patients.filter((p) => matchesFilter(p, filter));
    if (!sort) return base;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      let av: any, bv: any;
      if (sort.col === "name") { av = (a.full_name || "").toLowerCase(); bv = (b.full_name || "").toLowerCase(); }
      else if (sort.col === "dob") { av = new Date(a.dob || 0).getTime(); bv = new Date(b.dob || 0).getTime(); }
      else { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [patients, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);

  const handleFilter = (v: string) => { setFilter(v); setCurrentPage(1); };
  const onSort = (col: "name" | "dob" | "created") =>
    setSort((s) => (!s || s.col !== col ? { col, dir: "asc" } : s.dir === "asc" ? { col, dir: "desc" } : null));

  const SortCaret = ({ col }: { col: "name" | "dob" | "created" }) => {
    const active = sort?.col === col;
    const caretIcon = !active ? "chevrons-updown" : sort!.dir === "asc" ? "chevron-up" : "chevron-down";
    return <Icon name={caretIcon} size={14} className={active ? "text-foreground" : "text-muted-foreground/60"} />;
  };
  const SortHead = ({ col, children }: { col: "name" | "dob" | "created"; children: React.ReactNode }) => (
    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSort(col)}>{children}<SortCaret col={col} /></button>
  );

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="ty-title">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your patients and their referrals</p>
        </div>
        <Button asChild data-tour="add-patient">
          <Link to="/clinic/patients/new"><Icon name="add" />New Patient</Link>
        </Button>
      </div>

      <div className="mb-4">
        <FilterToolbar
          filters={FILTERS.map((f) => ({ ...f, count: filterCount(f.value) }))}
          active={filter}
          onFilter={handleFilter}
          search={search}
          onSearch={(v) => { setSearch(v); setCurrentPage(1); }}
          searchPlaceholder="Search by name, DOB, phone, or email…"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Icon name="spinner" size={24} className="animate-spin text-primary" /></div>
      ) : paginated.length > 0 ? (
        <ListRows
          cols="minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.9fr) 104px 16px"
          head={[
            <SortHead key="n" col="name">Patient</SortHead>,
            "Contact",
            "Last drug",
            "PA status",
            { label: <SortHead col="created">Last referral</SortHead>, r: true },
            "",
          ]}
        >
          {paginated.map((p) => (
            <ListRow
              key={p.id}
              to={`/clinic/patients/${p.id}`}
              patient={<Link to={`/clinic/patients/${p.id}`} className="no-underline hover:underline focus-visible:outline-none" style={{ color: "inherit" }}>{p.full_name || "—"}</Link>}
              sub={<span>{p.dob ? `${formatDateShort(p.dob)} (${getAge(p.dob)})` : "—"}</span>}
              when={p.created_at ? formatDateShort(p.created_at) : "—"}
            >
              <span className="mut hide-sm" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{p.phone_primary || p.phone || "—"}</span>
              <span className="mut hide-sm">
                {p.last_drug ? <b style={{ color: "#1B2B5B", fontWeight: 500 }}>{p.last_drug}</b> : "—"}
                {p.last_dosage && <> {p.last_dosage}</>}
              </span>
              <span className="hide-sm"><PAStatusBadge status={p.pa_status || "none"} expirationDate={p.pa_expiration_date} /></span>
            </ListRow>
          ))}
        </ListRows>
      ) : search || filter !== "all" ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon name="patients" size={20} /></span>
          <p className="text-sm font-semibold text-foreground">No patients found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          <Button size="sm" variant="outline" onClick={() => { setSearch(""); setFilter("all"); }}>Clear Filters</Button>
        </div>
      ) : (
        <div className="lr-list">
          <EmptyState
            art="patients"
            title="No patients yet"
            text="Add your first patient to get started."
            actions={<Button asChild><Link to="/clinic/patients/new"><Icon name="add" />Add Your First Patient</Link></Button>}
          />
        </div>
      )}

      {!loading && filtered.length > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">Showing {startItem}-{endItem} of {filtered.length} patients</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={safePage === 1} onClick={() => setCurrentPage(safePage - 1)}><Icon name="chevron-left" />Prev</Button>
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
            <Button size="sm" variant="outline" disabled={safePage === totalPages} onClick={() => setCurrentPage(safePage + 1)}>Next<Icon name="chevron-right" /></Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
