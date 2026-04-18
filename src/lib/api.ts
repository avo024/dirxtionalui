/**
 * API Service Layer - DiRxctional Platform
 * All backend API calls go through here
 *
 * Auth: a token provider is registered by `useApi()` (src/hooks/useApi.ts).
 * When a user is authenticated, requests automatically include
 * `Authorization: Bearer <token>`. The legacy `X-DEV-ADMIN: 1` header
 * is sent only in development to keep local backend access working
 * until the backend fully accepts Auth0 JWTs.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ---- Token provider registration ------------------------------------------
type TokenProvider = () => Promise<string | undefined>;
let tokenProvider: TokenProvider | null = null;

export function setAuthTokenProvider(provider: TokenProvider | null) {
  tokenProvider = provider;
}

async function currentToken(): Promise<string | undefined> {
  if (!tokenProvider) return undefined;
  try {
    return await tokenProvider();
  } catch {
    return undefined;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

async function getHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await currentToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (import.meta.env.DEV) headers['X-DEV-ADMIN'] = '1';
  return headers;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  const token = await currentToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (import.meta.env.DEV) headers['X-DEV-ADMIN'] = '1';
  return headers;
}

// ============================================================================
// CURRENT USER / CLINIC
// ============================================================================

export async function getMyClinic(): Promise<{
  id: string;
  name: string;
  specialty?: string;
  email?: string;
  default_pharmacy_id?: string;
}> {
  const res = await fetch(`${API_BASE_URL}/clinics/me`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load clinic');
  return res.json();
}

// ============================================================================
// CLINIC ENDPOINTS
// ============================================================================

export const clinicApi = {
  async getPatients(search?: string): Promise<any> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${API_BASE_URL}/patients${params}`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async getReferrals(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async getReferral(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${id}`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async createReferral(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getReferralDocuments(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${id}/documents`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async uploadDocument(referralId: string, file: File, docType: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const docTypeMap: Record<string, string> = {
      required: 'referral_form',
      insurance: 'insurance_front',
      additional: 'chart_notes',
    };
    formData.append('doc_type', docTypeMap[docType] || docType);

    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/documents`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  async getPatient(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async getPatientDrugs(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}/drugs`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async createPatient(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updatePatient(id: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async finalizeReferral(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/finalize`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async resubmitReferral(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/resubmit`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async getReferralHistory(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/history`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async getReferralNotes(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/notes`, {
      headers: await getHeaders(),
    });
    return handleResponse<{ items: any[] }>(response);
  },

  async addReferralNote(referralId: string, content: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/notes`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ content }),
    });
    return handleResponse(response);
  },

  async updateReferralInsurance(referralId: string, insurance: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/insurance`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify({ insurance }),
    });
    return handleResponse(response);
  },

  async getFormularyDrugs(search?: string): Promise<{ items: any[] }> {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${API_BASE_URL}/referrals/drugs${q}`, {
      headers: await getHeaders(),
    });
    return handleResponse<{ items: any[] }>(response);
  },
};

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

export const adminApi = {
  async getReferrals(filters?: { status?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);

    const url = `${API_BASE_URL}/admin/referrals${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async getReferral(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async processReferral(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/process`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async makeDecision(id: string, decision: 'approve' | 'reject', reason?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/decision`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ decision, reason }),
    });
    return handleResponse(response);
  },

  async getReferralPDF(id: string, preview = true): Promise<Blob> {
    const params = new URLSearchParams();
    if (preview) params.append('preview', 'true');

    const response = await fetch(
      `${API_BASE_URL}/admin/referrals/${id}/pdf?${params}`,
      { headers: await getHeaders() }
    );
    if (!response.ok) throw new Error('Failed to get PDF');
    return response.blob();
  },

  async submitPA(id: string, submittedDate: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/pa/submit`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ submitted_date: submittedDate }),
    });
    return handleResponse(response);
  },

  async recordPADecision(id: string, data: {
    decision: 'approved' | 'denied';
    decision_date: string;
    expiration_date?: string;
    approval_duration?: string;
    pa_number?: string;
    ref_number?: string;
    denial_reason?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/pa/decision`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getReferralCounts(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/counts`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async getBlockedReferrals(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/blocked`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async updateExtractedData(id: string, extractedData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/extracted-data`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify({ extracted_data: extractedData }),
    });
    return handleResponse(response);
  },

  async getReferralDocuments(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/documents`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async getDocumentUrl(docId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/documents/${docId}/url`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async deliverReferral(id: string, excludeDocIds?: string[]): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/deliver`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(excludeDocIds ? { exclude_doc_ids: excludeDocIds } : {}),
    });
    return handleResponse(response);
  },

  async getAlternativePharmacies(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/alternative-pharmacies`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async reassignPharmacy(id: string, pharmacyId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/reassign-pharmacy`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ new_pharmacy_id: pharmacyId }),
    });
    return handleResponse(response);
  },

  async getReferralNotes(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/notes`, {
      headers: await getHeaders(),
    });
    return handleResponse<{ items: any[] }>(response);
  },

  async addReferralNote(referralId: string, content: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/notes`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ content }),
    });
    return handleResponse(response);
  },

  async markInsuranceExpired(referralId: string, expired: boolean): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/mark-insurance-expired`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ expired }),
    });
    return handleResponse(response);
  },

  async getPALetterInfo(referralId: string): Promise<{
    has_letter: boolean;
    drug_requires_pa: boolean;
    is_fallback: boolean;
    letter: { id: string; filename: string; uploaded_at: string; from_referral_id: string } | null;
  }> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/pa/letter`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async uploadPALetter(referralId: string, file: File): Promise<{ id: string; doc_type: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/pa/upload`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  async getFormularyDrugs(search?: string): Promise<{ items: any[] }> {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${API_BASE_URL}/admin/drugs${q}`, {
      headers: await getHeaders(),
    });
    return handleResponse<{ items: any[] }>(response);
  },
};

// ============================================================================
// PHARMACY ENDPOINTS
// ============================================================================

export const pharmacyApi = {
  async getPharmacies(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/pharmacies`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async getPharmacy(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/pharmacies/${id}`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async createPharmacy(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/pharmacies`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updatePharmacy(id: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/pharmacies/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

// ============================================================================
// PATIENT ENDPOINTS
// ============================================================================

export const patientApi = {
  async getPatients(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async getPatient(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },
};

export default {
  clinic: clinicApi,
  admin: adminApi,
  pharmacy: pharmacyApi,
  patient: patientApi,
};
