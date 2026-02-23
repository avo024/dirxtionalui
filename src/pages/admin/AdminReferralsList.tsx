import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReferralTable } from "@/components/ReferralTable";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const filters = [
  { label: "All", value: "all" },
  { label: "Needs Review", value: "ready_for_review" },
  { label: "Approved", value: "approved_to_send" },
  { label: "Rejected", value: "rejected" },
  { label: "Sent", value: "sent_to_pharmacy" },
];

export default function AdminReferralsList() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [paSortDirection, setPASortDirection] = useState<"asc" | "desc" | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getReferrals();

        const mapped = (response.items || []).map((r: any) => ({
          ...r,
          drug: r.drug_requested,
          blocked: r.preferred_pharmacy_blocked,
          dob: r.patient_dob,
        }));

        setReferrals(mapped);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to load referrals",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReferrals();
  }, []);

  const handlePASortToggle = () => {
    setPASortDirection((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const clinics = [...new Set(referrals.map((r: any) => r.clinic_name).filter(Boolean))];

  const filtered = referrals.filter((r: any) => {
    const matchesSearch = (r.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.id || "").toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (clinicFilter !== "all" && r.clinic_name !== clinicFilter) return false;

    if (activeFilter === "all") return true;
    return r.status === activeFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading referrals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Referrals</h1>
        <p className="text-muted-foreground mt-1">Manage and review referrals from all clinics</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                activeFilter === f.value
                  ? "bg-card text-foreground card-shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={clinicFilter} onValueChange={setClinicFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by clinic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinics</SelectItem>
              {clinics.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ReferralTable
        referrals={filtered}
        userType="admin"
        showClinic
        paSortDirection={paSortDirection}
        onPASortToggle={handlePASortToggle}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filtered.length} of {referrals.length} referrals</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}
