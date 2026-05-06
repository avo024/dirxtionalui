import { getHeaders } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    const e = new Error(err.error || `HTTP ${res.status}`) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  return res.json();
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
