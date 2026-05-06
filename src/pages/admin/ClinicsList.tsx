import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Pencil, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ClinicFormModal } from "@/components/ClinicFormModal";
import { adminApi, type AdminClinic } from "@/lib/api";

export default function ClinicsList() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminClinic | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "clinics"],
    queryFn: () => adminApi.getClinics(),
  });

  const items = data?.items ?? [];
  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clinics</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${items.length} ${items.length === 1 ? "clinic" : "clinics"}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Clinic
        </Button>
      </div>

      {!isLoading && !isError && items.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clinics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive mb-3">Failed to load clinics — try again</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No clinics yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first clinic to start onboarding their staff.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Clinic
          </Button>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Specialty</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((clinic) => (
                <TableRow
                  key={clinic.id}
                  className="cursor-pointer hover:bg-secondary/30"
                  onClick={() => setEditing(clinic)}
                >
                  <TableCell className="font-medium">{clinic.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{clinic.email || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{clinic.specialty || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(clinic);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                    No clinics match "{search}"
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ClinicFormModal open={createOpen} onOpenChange={setCreateOpen} />
      <ClinicFormModal
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        clinic={editing}
      />
    </div>
  );
}
