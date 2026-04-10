import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Users, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAStatusBadge } from "@/components/PAStatusBadge";
import { clinicApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getRelativeTime, formatDateShort } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

export default function PatientsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    clinicApi.getPatients(search)
      .then((data) => {
        setPatients(data.items || []);
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load patients", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [search]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (filter === "active") return p.pa_status === "approved" && p.last_drug;
      if (filter === "inactive") return !p.pa_status || p.pa_status === "none" || p.pa_status === "expired";
      if (filter === "expiring") return p.pa_status === "expiring";
      return true;
    });
  }, [patients, filter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filtered.length);

  const getAge = (dob: string) => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-muted-foreground mt-1">Manage your patients and their referrals</p>
        </div>
        <Button asChild>
          <Link to="/clinic/patients/new">
            <Plus className="h-4 w-4 mr-2" />
            Add New Patient
          </Link>
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, DOB, phone, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        {search && (
          <p className="text-sm text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""} found</p>
        )}
        <Select value={filter} onValueChange={(v) => { setFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Patients</SelectItem>
            <SelectItem value="active">Active (Recent Referral)</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expiring">PA Expiring Soon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Table */}
      {!loading && paginated.length > 0 ? (
        <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Patient Name</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">DOB (Age)</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Last Drug</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Last Referral</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">PA Status</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((patient, i) => (
                <tr
                  key={patient.id}
                  onClick={() => navigate(`/clinic/patients/${patient.id}`)}
                  className={cn(
                    "border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-primary/[0.03]",
                    i % 2 === 1 && "bg-secondary/20"
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground text-sm hover:underline">
                      {patient.full_name || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {patient.dob ? `${formatDateShort(patient.dob)} (${getAge(patient.dob)})` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{patient.last_drug || '—'}</span>
                    <span className="text-xs text-muted-foreground">{patient.last_dosage || ''}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {patient.created_at ? getRelativeTime(patient.created_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <PAStatusBadge status={patient.pa_status || 'none'} expirationDate={patient.pa_expiration_date} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <Link to={`/clinic/patients/${patient.id}`}>View</Link>
                      </Button>
                      <Button size="sm" className="text-xs" asChild>
                        <Link to={`/clinic/referrals/new?patientId=${patient.id}`}>New Referral</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          {search || filter !== "all" ? (
            <>
              <p className="text-sm font-medium text-foreground mb-1">No patients found</p>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>Clear Filters</Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-foreground mb-1">No patients yet</h3>
              <p className="text-sm text-muted-foreground mb-6">Add your first patient to get started</p>
              <Button asChild>
                <Link to="/clinic/patients/new"><Plus className="h-4 w-4 mr-2" />Add Your First Patient</Link>
              </Button>
            </>
          )}
        </div>
      ) : null}

      {/* Pagination */}
      {!loading && filtered.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {startItem}-{endItem} of {filtered.length} patients</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button key={page} variant={page === currentPage ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(page)}>
                {page}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
