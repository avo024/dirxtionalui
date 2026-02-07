import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, FileSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReferralTable } from "@/components/ReferralTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockReferrals } from "@/data/mockData";
import { cn } from "@/lib/utils";

const clinicReferrals = mockReferrals.filter(
  (r) => r.clinic_name === "Dallas Dermatology Clinic"
);

interface FilterDef {
  label: string;
  value: string;
  color: string;
}

const filters: FilterDef[] = [
  { label: "All", value: "all", color: "bg-primary text-primary-foreground" },
  { label: "Pending", value: "pending", color: "bg-warning text-warning-foreground" },
  { label: "Approved", value: "approved", color: "bg-success text-success-foreground" },
  { label: "Rejected", value: "rejected", color: "bg-destructive text-destructive-foreground" },
  { label: "Sent", value: "sent", color: "bg-status-sent-bg text-status-sent-fg" },
];

function getFilterCount(value: string): number {
  if (value === "all") return clinicReferrals.length;
  if (value === "pending")
    return clinicReferrals.filter((r) =>
      ["uploaded", "processing", "ready_for_review"].includes(r.status)
    ).length;
  if (value === "approved")
    return clinicReferrals.filter((r) => r.status === "approved_to_send").length;
  if (value === "rejected")
    return clinicReferrals.filter((r) => r.status === "rejected").length;
  if (value === "sent")
    return clinicReferrals.filter((r) => r.status === "sent_to_pharmacy").length;
  return 0;
}

export default function ReferralsList() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const filtered = useMemo(() => {
    return clinicReferrals.filter((r) => {
      const matchesSearch =
        r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
        r.drug.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (activeFilter === "all") return true;
      if (activeFilter === "pending")
        return ["uploaded", "processing", "ready_for_review"].includes(r.status);
      if (activeFilter === "approved") return r.status === "approved_to_send";
      if (activeFilter === "rejected") return r.status === "rejected";
      if (activeFilter === "sent") return r.status === "sent_to_pharmacy";
      return true;
    });
  }, [activeFilter, search]);

  const itemsPerPage = parseInt(pageSize);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedReferrals = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const startItem = filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filtered.length);

  const handleFilterChange = (value: string) => {
    setActiveFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Referrals</h1>
          <p className="text-muted-foreground mt-1">
            View and track all your submitted referrals
          </p>
        </div>
        <Button asChild>
          <Link to="/clinic/referrals/new">
            <Plus className="h-4 w-4 mr-2" />
            Create New Referral
          </Link>
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {filters.map((f) => {
            const count = getFilterCount(f.value);
            return (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                  activeFilter === f.value
                    ? "bg-card text-foreground card-shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-semibold",
                    activeFilter === f.value
                      ? f.color
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient, drug, or ID..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table or Empty State */}
      {filtered.length > 0 ? (
        <ReferralTable referrals={paginatedReferrals} userType="clinic" />
      ) : search || activeFilter !== "all" ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileSearch className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            No referrals found
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your search or filters
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setActiveFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileSearch className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            You haven't created any referrals yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first referral to get started
          </p>
          <Button asChild>
            <Link to="/clinic/referrals/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Referral
            </Link>
          </Button>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              Showing {startItem}-{endItem} of {filtered.length} referrals
            </span>
            <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
