import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Power, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PharmacyFormModal } from "@/components/PharmacyFormModal";
import { pharmacyApi, type Pharmacy } from "@/lib/api";
import { toast } from "sonner";

function formatPhone(value: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value;
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
  const filtered = items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pharmacies</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${items.length} active ${items.length === 1 ? "pharmacy" : "pharmacies"}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Pharmacy
        </Button>
      </div>

      {!isLoading && !isError && items.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search pharmacies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
          <p className="text-sm text-destructive mb-3">Failed to load pharmacies — try again</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No pharmacies yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add your first specialty pharmacy partner to get started.</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Pharmacy
          </Button>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Phone</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Fax</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Alt Phone/Fax</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Location</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pharm) => {
                const location = [pharm.city, pharm.state].filter(Boolean).join(", ") || "—";
                return (
                  <TableRow
                    key={pharm.id}
                    className="cursor-pointer hover:bg-secondary/30"
                    onClick={() => navigate(`/admin/pharmacies/${pharm.id}`)}
                  >
                    <TableCell className="font-medium">{pharm.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatPhone(pharm.phone)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatPhone(pharm.fax)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pharm.alt_phone_fax || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pharm.email || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{location}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); setEditing(pharm); }}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeactivating(pharm); }}
                          aria-label="Deactivate"
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
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
    </div>
  );
}
