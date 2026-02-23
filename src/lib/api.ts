/**
 * API Service Layer - DiRxtional Platform
 * All backend API calls go through here
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-DEV-ADMIN': '1',
  };
}

// ============================================================================
// CLINIC ENDPOINTS
// ============================================================================

export const clinicApi = {
  async getReferrals(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getReferral(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async createReferral(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async uploadDocument(referralId: string, file: File, docType: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);

    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/documents`, {
      method: 'POST',
      headers: {
        'X-DEV-ADMIN': '1',
      },
      body: formData,
    });
    return handleResponse(response);
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
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getReferral(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async processReferral(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/process`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async makeDecision(id: string, decision: 'approve' | 'reject', reason?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/decision`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ decision, reason }),
    });
    return handleResponse(response);
  },

  async getReferralPDF(id: string, preview = true): Promise<Blob> {
    const params = new URLSearchParams();
    if (preview) params.append('preview', 'true');

    const response = await fetch(
      `${API_BASE_URL}/admin/referrals/${id}/pdf?${params}`,
      { headers: getHeaders() }
    );
    if (!response.ok) throw new Error('Failed to get PDF');
    return response.blob();
  },

  async submitPA(id: string, submittedDate: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/pa/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ submitted_date: submittedDate }),
    });
    return handleResponse(response);
  },

  async recordPADecision(id: string, data: {
    decision: 'approved' | 'denied';
    decision_date: string;
    expiration_date?: string;
    approval_duration?: string;
    denial_reason?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/pa/decision`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getBlockedReferrals(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/blocked`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async reassignPharmacy(id: string, pharmacyId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/reassign-pharmacy`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ new_pharmacy_id: pharmacyId }),
    });
    return handleResponse(response);
  },
};

// ============================================================================
// PHARMACY ENDPOINTS
// ============================================================================

export const pharmacyApi = {
  async getPharmacies(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/pharmacies`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getPharmacy(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/pharmacies/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async createPharmacy(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/pharmacies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updatePharmacy(id: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/pharmacies/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
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
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getPatient(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      headers: getHeaders(),
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
