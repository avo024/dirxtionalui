import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Pencil, Building2, TriangleAlert, RefreshCw } from "lucide-react";
import { ClinicFormModal } from "@/components/ClinicFormModal";
import { getInitials } from "@/components/CreatedByAvatar";
import { adminApi, type AdminClinic } from "@/lib/api";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "../clinic/referrals.css";
import "./admin-clinics.css";

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
      <div className="cl-header">
        <div>
          <h1 className="cl-h1 serif">
            Clinics
            {!isLoading && !isError && <span className="cl-count num">{items.length}</span>}
          </h1>
          <p className="cl-sub">Partner clinics that send referrals into Dirxctional</p>
        </div>
        <button className="rw-btn primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />Add Clinic
        </button>
      </div>

      {/* Search */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="cl-toolbar">
          <div className="rl-search cl-search">
            <span className="rl-search-ic"><Search size={16} /></span>
            <input
              className="rl-search-input"
              placeholder="Search clinics..."
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
          <h3>Couldn’t load clinics</h3>
          <p>Something went wrong fetching the clinic directory.</p>
          <button className="rw-btn primary" onClick={() => refetch()}><RefreshCw size={15} />Retry</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="dh-empty">
          <div className="dh-empty-ic"><Building2 size={24} /></div>
          <h3>No clinics yet</h3>
          <p>Add your first partner clinic to start receiving referrals.</p>
          <button className="rw-btn primary" onClick={() => setCreateOpen(true)}><Plus size={15} />Add Clinic</button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="dh-table-wrap cl-table-wrap">
          <table className="dh-table cl-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Specialty</th>
                <th className="r">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="cl-row" onClick={() => navigate(`/admin/clinics/${c.id}`)}>
                  <td>
                    <span className="cl-name-cell">
                      <span className="dh-avatar cl-avatar" title={c.name}>{getInitials(c.name)}</span>
                      <span className="cl-name">{c.name}</span>
                    </span>
                  </td>
                  <td className="cl-email">{c.email || "—"}</td>
                  <td><span className="cl-specialty">{c.specialty || "—"}</span></td>
                  <td className="r" onClick={(e) => e.stopPropagation()}>
                    <button className="rw-ic-btn cl-edit" title="Edit clinic" aria-label="Edit clinic" onClick={() => setEditing(c)}>
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="dh-muted-cell" style={{ textAlign: "center", padding: "28px 14px" }}>
                    No clinics match “{search}”
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ClinicFormModal open={createOpen} onOpenChange={setCreateOpen} />
      <ClinicFormModal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} clinic={editing} />
    </div>
  );
}
