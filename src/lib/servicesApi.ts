import { getHeaders } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    const e = new Error(err.error || `HTTP ${res.status}`) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  return res.json();
}

export interface AdminAddonCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  monthly_price_cents: number;
  monthly_price_usd: number;
  icon: string | null;
  active: boolean;
}

export type AddonRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "cancelled";

export interface AdminAddonRequest {
  id: string;
  clinic_id: string;
  clinic_name: string;
  clinic_specialty?: string | null;
  addon_id: string;
  addon_code: string;
  addon_name: string;
  addon_icon: string | null;
  monthly_price_cents: number;
  monthly_price_usd: number;
  status: AddonRequestStatus;
  requested_at: string;
  decided_at?: string | null;
  clinic_notes?: string | null;
  admin_notes?: string | null;
}

export interface AdminClinicActiveAddon {
  id: string;
  addon_id: string;
  addon_code: string;
  addon_name: string;
  addon_description: string;
  addon_icon: string | null;
  monthly_price_cents: number;
  monthly_price_usd: number;
  quantity: number;
  activated_at: string;
  notes?: string | null;
}

export interface AdminClinicHistoryAddon extends AdminClinicActiveAddon {
  deactivated_at: string;
}

export interface AdminClinicAddonsResponse {
  clinic_id: string;
  clinic_name: string;
  active_addons: AdminClinicActiveAddon[];
  history: AdminClinicHistoryAddon[];
  monthly_addon_total_cents: number;
  monthly_addon_total_usd: number;
}

export const adminAddonsApi = {
  async listCatalog(): Promise<{ addons: AdminAddonCatalogItem[] }> {
    const res = await fetch(`${API_BASE_URL}/admin/addons`, {
      headers: await getHeaders(),
    });
    return handle(res);
  },

  async listRequests(
    status: AddonRequestStatus | "all" = "pending",
    limit = 50,
  ): Promise<{ status_filter: string; requests: AdminAddonRequest[] }> {
    const res = await fetch(
      `${API_BASE_URL}/admin/addon-requests?status=${status}&limit=${limit}`,
      { headers: await getHeaders() },
    );
    return handle(res);
  },

  async decideRequest(
    requestId: string,
    body: { decision: "approve" | "deny"; admin_notes?: string; quantity?: number },
  ): Promise<{ ok: boolean; request_id: string; status: string; clinic_addon_id?: string }> {
    const res = await fetch(
      `${API_BASE_URL}/admin/addon-requests/${requestId}/decide`,
      {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify(body),
      },
    );
    return handle(res);
  },

  async getClinicAddons(clinicId: string): Promise<AdminClinicAddonsResponse> {
    const res = await fetch(
      `${API_BASE_URL}/admin/clinics/${clinicId}/addons`,
      { headers: await getHeaders() },
    );
    return handle(res);
  },

  async addClinicAddon(
    clinicId: string,
    body: { addon_id: string; quantity?: number; notes?: string },
  ): Promise<AdminClinicActiveAddon> {
    const res = await fetch(
      `${API_BASE_URL}/admin/clinics/${clinicId}/addons`,
      {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify(body),
      },
    );
    return handle(res);
  },

  async removeClinicAddon(
    clinicId: string,
    clinicAddonId: string,
    body?: { notes?: string },
  ): Promise<{ ok: boolean; id: string; deactivated: boolean }> {
    const res = await fetch(
      `${API_BASE_URL}/admin/clinics/${clinicId}/addons/${clinicAddonId}`,
      {
        method: "DELETE",
        headers: await getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    return handle(res);
  },
};

// ===== Clinic-side (existing) ===============================================

export interface ServiceCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  monthly_price_cents: number;
  monthly_price_usd: number;
  icon: string | null;
  active: boolean;
  state: "active" | "requested" | "available";
}

export interface ActiveAddon {
  id: string;
  addon_id: string;
  addon_code: string;
  addon_name: string;
  addon_description: string;
  addon_icon: string | null;
  monthly_price_cents: number;
  monthly_price_usd: number;
  quantity: number;
  activated_at: string;
  notes?: string | null;
}

export interface PendingRequest {
  id: string;
  addon_id: string;
  addon_code: string;
  addon_name: string;
  addon_icon: string | null;
  monthly_price_cents: number;
  monthly_price_usd: number;
  status: string;
  requested_at: string;
  clinic_notes?: string | null;
}

export interface ServicesResponse {
  clinic: { id: string; name: string; specialty?: string };
  active_addons: ActiveAddon[];
  pending_requests: PendingRequest[];
  catalog: ServiceCatalogItem[];
}

export async function getMyServices(): Promise<ServicesResponse> {
  const res = await fetch(`${API_BASE_URL}/clinics/me/services`, {
    headers: await getHeaders(),
  });
  return handle<ServicesResponse>(res);
}

export async function requestAddon(body: {
  addon_id: string;
  clinic_notes?: string;
}): Promise<PendingRequest> {
  const res = await fetch(`${API_BASE_URL}/clinics/me/addon-requests`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(body),
  });
  return handle<PendingRequest>(res);
}

export async function cancelAddonRequest(
  requestId: string,
): Promise<{ ok: boolean; id: string; status: string }> {
  const res = await fetch(
    `${API_BASE_URL}/clinics/me/addon-requests/${requestId}`,
    {
      method: "DELETE",
      headers: await getHeaders(),
    },
  );
  return handle(res);
}
