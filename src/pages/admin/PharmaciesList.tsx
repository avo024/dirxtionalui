import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Power, Store, TriangleAlert, RefreshCw } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PharmacyFormModal } from "@/components/PharmacyFormModal";
import { getInitials } from "@/components/CreatedByAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterToolbar } from "@/components/patterns/FilterToolbar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { pharmacyApi, type Pharmacy } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/patterns/PageContainer";

function formatPhone(value: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value;
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function PharmaciesList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Pharmacy | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<Pharmacy | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["pharmacies"],
    queryFn: () => pharmacyApi.getPharmacies(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pharmacyApi.deletePharmacy(id),
    onSuccess: () => {
      toast.success("Pharmacy deactivated");
      queryClient.invalidateQueries({ queryKey: ["pharmacies"] });
      setDeactivating(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to deactivate pharmacy"),
  });

  const items = data?.items ?? [];
  const q = search.trim().toLowerCase();
  const filtered = items.filter((p) => p.name.toLowerCase().includes(q));

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            Pharmacies
            {!isLoading && !isError && (
              <span className="text-sm font-medium text-muted-foreground">{items.length}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Specialty pharmacy partners that receive approved referrals</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus width={16} height={16} strokeWidth={1.75} />Add Pharmacy
        </Button>
      </div>

      {/* Toolbar */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="mb-4">
          <FilterToolbar search={search} onSearch={setSearch} searchPlaceholder="Search pharmacies…" />
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
          <h3 className="text-base font-semibold text-foreground">Couldn't load pharmacies</h3>
          <p className="text-sm text-muted-foreground">Something went wrong fetching the pharmacy directory.</p>
          <Button size="sm" onClick={() => refetch()}><RefreshCw width={15} height={15} strokeWidth={1.75} />Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><Store width={24} height={24} strokeWidth={1.75} /></span>
          <h3 className="text-base font-semibold text-foreground">No pharmacies yet</h3>
          <p className="text-sm text-muted-foreground">Add your first pharmacy to route approved referrals.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus width={15} height={15} strokeWidth={1.75} />Add Pharmacy</Button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Fax</TableHead>
                <TableHead>Alt Phone / Fax</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const location = [p.city, p.state].filter(Boolean).join(", ") || "—";
                return (
                  <TableRow
                    key={p.id}
                    className={cn("cursor-pointer", !p.is_active && "opacity-60")}
                    onClick={() => navigate(`/admin/pharmacies/${p.id}`)}
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary" title={p.name}>{getInitials(p.name)}</span>
                        <span className="font-semibold text-foreground">{p.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatPhone(p.phone)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatPhone(p.fax)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.alt_phone_fax || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{location}</TableCell>
                    <TableCell><StatusPill active={p.is_active} /></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit pharmacy"
                          aria-label="Edit pharmacy"
                          onClick={() => setEditing(p)}
                        >
                          <Pencil width={15} height={15} strokeWidth={1.75} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive disabled:opacity-40"
                          title="Deactivate pharmacy"
                          aria-label="Deactivate pharmacy"
                          disabled={!p.is_active}
                          onClick={() => setDeactivating(p)}
                        >
                          <Power width={15} height={15} strokeWidth={1.75} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    No pharmacies match "{search}"
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <PharmacyFormModal open={createOpen} onOpenChange={setCreateOpen} />
      <PharmacyFormModal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} pharmacy={editing} />

      <ConfirmModal
        open={!!deactivating}
        onOpenChange={(o) => !o && setDeactivating(null)}
        title="Deactivate pharmacy?"
        description={deactivating ? `Deactivate ${deactivating.name}? They won't appear in new referrals.` : ""}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={() => deactivating && deleteMutation.mutate(deactivating.id)}
      />
    </PageContainer>
  );
}
