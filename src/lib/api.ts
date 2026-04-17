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

function getAuthHeaders(): HeadersInit {
  return {
    'X-DEV-ADMIN': '1',
  };
}

// ============================================================================
// CLINIC ENDPOINTS
// ============================================================================

export const clinicApi = {
  async getPatients(search?: string): Promise<any> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${API_BASE_URL}/patients${params}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

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

  async getReferralDocuments(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${id}/documents`, {
      headers: getHeaders(),
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
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  async getPatient(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getPatientDrugs(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}/drugs`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async createPatient(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updatePatient(id: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async finalizeReferral(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/finalize`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async resubmitReferral(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/resubmit`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getReferralHistory(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/history`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getReferralNotes(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/notes`, {
      headers: getHeaders(),
    });
    return handleResponse<{ items: any[] }>(response);
  },

  async addReferralNote(referralId: string, content: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    });
    return handleResponse(response);
  },

  async updateReferralInsurance(referralId: string, insurance: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/insurance`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ insurance }),
    });
    return handleResponse(response);
  },

  async getFormularyDrugs(search?: string): Promise<{ items: any[] }> {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${API_BASE_URL}/referrals/drugs${q}`, {
      headers: getHeaders(),
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
    pa_number?: string;
    ref_number?: string;
    denial_reason?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/pa/decision`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getReferralCounts(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/counts`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getBlockedReferrals(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/blocked`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async updateExtractedData(id: string, extractedData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/extracted-data`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ extracted_data: extractedData }),
    });
    return handleResponse(response);
  },

  async getReferralDocuments(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/documents`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getDocumentUrl(docId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/documents/${docId}/url`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async deliverReferral(id: string, excludeDocIds?: string[]): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/deliver`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(excludeDocIds ? { exclude_doc_ids: excludeDocIds } : {}),
    });
    return handleResponse(response);
  },

  async getAlternativePharmacies(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/alternative-pharmacies`, {
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

  async getReferralNotes(referralId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/notes`, {
      headers: getHeaders(),
    });
    return handleResponse<{ items: any[] }>(response);
  },

  async addReferralNote(referralId: string, content: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    });
    return handleResponse(response);
  },

  async markInsuranceExpired(referralId: string, expired: boolean): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/mark-insurance-expired`, {
      method: 'POST',
      headers: getHeaders(),
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
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async uploadPALetter(referralId: string, file: File): Promise<{ id: string; doc_type: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/pa/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  async getFormularyDrugs(search?: string): Promise<{ items: any[] }> {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${API_BASE_URL}/admin/drugs${q}`, {
      headers: getHeaders(),
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
