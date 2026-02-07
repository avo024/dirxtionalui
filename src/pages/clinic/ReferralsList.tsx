import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReferralTable } from "@/components/ReferralTable";
import { mockReferrals, type ReferralStatus } from "@/data/mockData";
import { cn } from "@/lib/utils";

const filters: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Sent", value: "sent" },
];

const clinicReferrals = mockReferrals.filter((r) => r.clinic_name === "Dallas Dermatology Clinic");

export default function ReferralsList() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = clinicReferrals.filter((r) => {
    const matchesSearch = r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.drug.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return ["uploaded", "processing", "ready_for_review"].includes(r.status);
    if (activeFilter === "approved") return r.status === "approved_to_send";
    if (activeFilter === "rejected") return r.status === "rejected";
    if (activeFilter === "sent") return r.status === "sent_to_pharmacy";
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Referrals</h1>
        <p className="text-muted-foreground mt-1">View and track all your submitted referrals</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
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
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search referrals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ReferralTable referrals={filtered} userType="clinic" />

      {/* Pagination placeholder */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filtered.length} of {clinicReferrals.length} referrals</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}
