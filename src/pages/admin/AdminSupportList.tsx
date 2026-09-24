import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LifeBuoy, MessageSquareHeart, ChevronRight, Inbox, AlertTriangle } from "lucide-react";
import { adminApi, type SupportCaseSummary } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getRelativeTime } from "@/lib/dateUtils";
import { SupportStatusBadge } from "@/components/SupportStatusBadge";
import { FilterToolbar } from "@/components/patterns/FilterToolbar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];
const CAT_TABS = [
  { value: "all", label: "All" },
  { value: "support", label: "Support" },
  { value: "feedback", label: "Feedback" },
  { value: "delivery_issue", label: "Delivery" },
];
const ASSIGNED_TABS = [
  { value: "all", label: "Everyone" },
  { value: "me", label: "Mine" },
  { value: "unassigned", label: "Unclaimed" },
];

function CategoryChip({ category }: { category: string }) {
  if (category === "delivery_issue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[11px] font-semibold">
        <AlertTriangle width={12} height={12} strokeWidth={1.75} />Delivery issue
      </span>
    );
  }
  const isFeedback = category === "feedback";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
      isFeedback ? "bg-teal-600/10 text-teal-700" : "bg-primary/10 text-primary",
    )}>
      {isFeedback ? <MessageSquareHeart width={12} height={12} strokeWidth={1.75} /> : <LifeBuoy width={12} height={12} strokeWidth={1.75} />}
      {isFeedback ? "Feedback" : "Support"}
    </span>
  );
}

export default function AdminSupportList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SupportCaseSummary[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("open");  // land on incoming — the claim queue
  const [category, setCategory] = useState("all");
  const [assigned, setAssigned] = useState("all");
  const month = "all";  // month control removed at pilot volume — search + status tabs suffice
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchCases = async () => {
      setLoading(true);
      try {
        const res = await adminApi.getSupportCases({
          status: status === "all" ? undefined : status,
          category: category === "all" ? undefined : category,
          month,
          search: search.trim() || undefined,
          assigned: assigned === "all" ? undefined : assigned,
        });
        if (!cancelled) {
          const items: SupportCaseSummary[] = res.items || [];
          // Triage order: unclaimed first (grab-me), then by recency.
          items.sort((a, b) => Number(!!a.assigned_admin_id) - Number(!!b.assigned_admin_id));
          setItems(items);
          setCounts(res.counts || {});
        }
      } catch (e: any) {
        if (!cancelled) toast({ title: "Error", description: e.message || "Failed to load support cases", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(fetchCases, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [status, category, search, assigned]);

  const totalCount = (counts.open || 0) + (counts.in_progress || 0) + (counts.resolved || 0);
  const chipCount = (v: string) => (v === "all" ? totalCount : counts[v] || 0);

  return (
    <div className="rw-page rw-fade">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold serif text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Clinic support cases and product feedback</p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
        <FilterToolbar
          filters={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label, count: chipCount(f.value) }))}
          active={status}
          onFilter={setStatus}
        />
        <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
          {ASSIGNED_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setAssigned(t.value)}
              className={cn(
                "inline-flex items-center rounded-[calc(var(--radius)-4px)] px-3 h-[var(--density-control-h-xs)] text-sm font-medium transition-colors",
                assigned === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <FilterToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search by clinic or subject (all time)…"
          selects={[
            {
              options: CAT_TABS.map((t) => (t.value === "all" ? "All categories" : t.label)),
              value: category === "all" ? "All categories" : CAT_TABS.find((t) => t.value === category)?.label,
              onChange: (label) => {
                const t = CAT_TABS.find((o) => (o.value === "all" ? "All categories" : o.label) === label);
                if (t) setCategory(t.value);
              },
              width: "180px",
            },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 width={26} height={26} strokeWidth={1.75} className="animate-spin text-primary" />
        </div>
      ) : items.length > 0 ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clinic</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/admin/support/${c.id}`)}>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {c.needs_reply && <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" title="Needs reply — clinic spoke last" />}
                      <span className="font-semibold text-foreground">{c.clinic_name}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="truncate max-w-[280px]" title={c.subject}>{c.subject}</div>
                    <span className="font-mono text-xs text-muted-foreground">#{c.short_id}</span>
                    {c.referral_id && (
                      <span className="font-mono text-xs text-teal-700 font-semibold"> · Ref #{c.referral_short}</span>
                    )}
                  </TableCell>
                  <TableCell><CategoryChip category={c.category} /></TableCell>
                  <TableCell><SupportStatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{c.assigned_admin_name || <span className="opacity-45">—</span>}</TableCell>
                  <TableCell className="text-muted-foreground">{getRelativeTime(c.last_message_at || c.updated_at)}</TableCell>
                  <TableCell><ChevronRight width={16} height={16} strokeWidth={1.75} className="text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Inbox width={20} height={20} strokeWidth={1.75} /></span>
          <p className="text-sm font-semibold text-foreground">No cases here</p>
          <p className="text-sm text-muted-foreground">Nothing matches these filters. When a clinic opens a case or sends feedback, it lands here.</p>
        </div>
      )}
    </div>
  );
}
