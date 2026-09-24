import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Building2, TriangleAlert, RefreshCw } from "lucide-react";
import { ClinicFormModal } from "@/components/ClinicFormModal";
import { getInitials } from "@/components/CreatedByAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterToolbar } from "@/components/patterns/FilterToolbar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { adminApi, type AdminClinic } from "@/lib/api";

export default function ClinicsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminClinic | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "clinics"],
    queryFn: () => adminApi.getClinics(),
  });

  const items = data?.items ?? [];
  const q = search.trim().toLowerCase();
  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)
  );

  return (
    <div className="rw-page rw-fade">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold serif text-foreground flex items-center gap-2">
            Clinics
            {!isLoading && !isError && (
              <span className="text-sm font-medium text-muted-foreground">{items.length}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Partner clinics that send referrals into Dirxctional</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus width={16} height={16} strokeWidth={1.75} />Add Clinic
        </Button>
      </div>

      {/* Toolbar */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="mb-4">
          <FilterToolbar search={search} onSearch={setSearch} searchPlaceholder="Search clinics…" />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"><TriangleAlert width={24} height={24} strokeWidth={1.75} /></span>
          <h3 className="text-base font-semibold text-foreground">Couldn't load clinics</h3>
          <p className="text-sm text-muted-foreground">Something went wrong fetching the clinic directory.</p>
          <Button size="sm" onClick={() => refetch()}><RefreshCw width={15} height={15} strokeWidth={1.75} />Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><Building2 width={24} height={24} strokeWidth={1.75} /></span>
          <h3 className="text-base font-semibold text-foreground">No clinics yet</h3>
          <p className="text-sm text-muted-foreground">Add your first partner clinic to start receiving referrals.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus width={15} height={15} strokeWidth={1.75} />Add Clinic</Button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/admin/clinics/${c.id}`)}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary" title={c.name}>{getInitials(c.name)}</span>
                      <span className="font-semibold text-foreground">{c.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.specialty || "—"}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Edit clinic"
                      aria-label="Edit clinic"
                      onClick={() => setEditing(c)}
                    >
                      <Pencil width={15} height={15} strokeWidth={1.75} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                    No clinics match "{search}"
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ClinicFormModal open={createOpen} onOpenChange={setCreateOpen} />
      <ClinicFormModal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} clinic={editing} />
    </div>
  );
}
