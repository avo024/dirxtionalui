import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReferralTable } from "@/components/ReferralTable";
import { mockReferrals } from "@/data/mockData";
import { cn } from "@/lib/utils";

const filters = [
  { label: "All", value: "all" },
  { label: "Needs Review", value: "review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Sent", value: "sent" },
  { label: "Blocked", value: "blocked" },
];

const clinics = [...new Set(mockReferrals.map((r) => r.clinic_name))];

export default function AdminReferralsList() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("all");

  const filtered = mockReferrals.filter((r) => {
    const matchesSearch = r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (clinicFilter !== "all" && r.clinic_name !== clinicFilter) return false;

    if (activeFilter === "all") return true;
    if (activeFilter === "review") return r.status === "ready_for_review";
    if (activeFilter === "approved") return r.status === "approved_to_send";
    if (activeFilter === "rejected") return r.status === "rejected";
    if (activeFilter === "sent") return r.status === "sent_to_pharmacy";
    return true;
  });

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

      <ReferralTable referrals={filtered} userType="admin" showClinic />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filtered.length} of {mockReferrals.length} referrals</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}
