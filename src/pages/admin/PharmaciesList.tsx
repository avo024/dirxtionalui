import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Power, Store, TriangleAlert, RefreshCw } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PharmacyFormModal } from "@/components/PharmacyFormModal";
import { getInitials } from "@/components/CreatedByAvatar";
import { pharmacyApi, type Pharmacy } from "@/lib/api";
import { toast } from "sonner";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "../clinic/referrals.css";
import "./admin-clinics.css";
import "./admin-pharmacies.css";

function formatPhone(value: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value;
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700,
        padding: "2px 9px", borderRadius: 9999,
        color: active ? "var(--status-approved-fg)" : "var(--text-muted)",
        background: active ? "var(--status-approved-bg)" : "var(--bg-muted)",
      }}
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
    <div className="rw-page rw-fade">
      {/* Header */}
      <div className="cl-header">
        <div>
          <h1 className="cl-h1 serif">
            Pharmacies
            {!isLoading && !isError && <span className="cl-count num">{items.length}</span>}
          </h1>
          <p className="cl-sub">Specialty pharmacy partners that receive approved referrals</p>
        </div>
        <button className="rw-btn primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />Add Pharmacy
        </button>
      </div>

      {/* Search */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="cl-toolbar">
          <div className="rl-search cl-search">
            <span className="rl-search-ic"><Search size={16} /></span>
            <input
              className="rl-search-input"
              placeholder="Search pharmacies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="cl-skel">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="cl-skel-row" />)}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="dh-empty">
          <div className="dh-empty-ic cl-error-ic"><TriangleAlert size={24} /></div>
          <h3>Couldn’t load pharmacies</h3>
          <p>Something went wrong fetching the pharmacy directory.</p>
          <button className="rw-btn primary" onClick={() => refetch()}><RefreshCw size={15} />Retry</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="dh-empty">
          <div className="dh-empty-ic"><Store size={24} /></div>
          <h3>No pharmacies yet</h3>
          <p>Add your first pharmacy to route approved referrals.</p>
          <button className="rw-btn primary" onClick={() => setCreateOpen(true)}><Plus size={15} />Add Pharmacy</button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="dh-table-wrap ph-table-wrap">
          <table className="dh-table ph-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Fax</th>
                <th>Alt Phone / Fax</th>
                <th>Email</th>
                <th>Location</th>
                <th>Status</th>
                <th className="r">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const location = [p.city, p.state].filter(Boolean).join(", ") || "—";
                return (
                  <tr
                    key={p.id}
                    className={`ph-row${!p.is_active ? " inactive" : ""}`}
                    onClick={() => navigate(`/admin/pharmacies/${p.id}`)}
                  >
                    <td>
                      <span className="ph-name-cell">
                        <span className="dh-avatar ph-avatar" title={p.name}>{getInitials(p.name)}</span>
                        <span className="ph-name">{p.name}</span>
                      </span>
                    </td>
                    <td className="ph-num mono">{formatPhone(p.phone)}</td>
                    <td className="ph-num mono">{formatPhone(p.fax)}</td>
                    <td className="ph-num mono">{p.alt_phone_fax || "—"}</td>
                    <td className="ph-email">{p.email || "—"}</td>
                    <td className="ph-loc">{location}</td>
                    <td><StatusPill active={p.is_active} /></td>
                    <td className="r" onClick={(e) => e.stopPropagation()}>
                      <div className="ph-acts">
                        <button
                          className="rw-ic-btn"
                          title="Edit pharmacy"
                          aria-label="Edit pharmacy"
                          onClick={() => setEditing(p)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="rw-ic-btn ph-deact"
                          title="Deactivate pharmacy"
                          aria-label="Deactivate pharmacy"
                          disabled={!p.is_active}
                          onClick={() => setDeactivating(p)}
                        >
                          <Power size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="dh-muted-cell" style={{ textAlign: "center", padding: "28px 14px" }}>
                    No pharmacies match “{search}”
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
