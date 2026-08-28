/**
 * API Service Layer - Dirxctional Platform
 * All backend API calls go through here
 *
 * Auth: a token provider is registered by `useApi()` (src/hooks/useApi.ts).
 * When a user is authenticated, requests automatically include
 * `Authorization: Bearer <token>`. The legacy `X-DEV-ADMIN: 1` header
 * is sent only in development to keep local backend access working
 * until the backend fully accepts Auth0 JWTs.
 */

// API base URL:
//   - Production:  set via .env (VITE_API_URL=https://app.dirxctional.com/api)
//   - Local dev:   falls back to '/api', which the Vite dev server proxies
//                  to the local Flask backend on localhost:5000 (see vite.config.ts).
// The relative fallback means `npm run dev` Just Works — no CORS, no manual
// env tweaking. See dev.sh for the standard local dev command.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ---- Token provider registration ------------------------------------------
// Race-safe: requests await `tokenReady` so they block until `useApi()` has
// registered a provider on app boot. The promise resolves once and stays
// resolved for the app's lifetime (re-registration on logout/login is fine).
type TokenProvider = () => Promise<string | undefined>;
let tokenProvider: TokenProvider | null = null;
let resolveTokenReady: () => void;
const tokenReady: Promise<void> = new Promise((resolve) => {
  resolveTokenReady = resolve;
});

export function setAuthTokenProvider(provider: TokenProvider | null) {
  tokenProvider = provider;
  if (provider) resolveTokenReady();
}

async function currentToken(): Promise<string | undefined> {
  await tokenReady;
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

export async function getHeaders(): Promise<HeadersInit> {
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

export interface MyClinic {
  id: string;
  name: string;
  specialty?: string;
  email?: string;
  phone?: string | null;
  fax?: string | null;
  address?: string | null;
  npi?: string | null;
  default_pharmacy_id?: string | null;
  default_pharmacy_name?: string | null;
}

export async function getMyClinic(): Promise<MyClinic> {
  const res = await fetch(`${API_BASE_URL}/clinics/me`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load clinic');
  return res.json();
}

export async function updateMyClinic(data: {
  name?: string;
  phone?: string | null;
  fax?: string | null;
  address?: string | null;
  default_pharmacy_id?: string | null;
}): Promise<MyClinic> {
  const res = await fetch(`${API_BASE_URL}/clinics/me`, {
    method: 'PATCH',
    headers: await getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update clinic');
  return res.json();
}

export interface MyProfile {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  npi: string | null;
  profile_complete: boolean;
  email?: string;
  clinic_id?: string;
  [key: string]: any;
}

export async function getMyProfile(): Promise<MyProfile> {
  const res = await fetch(`${API_BASE_URL}/clinics/me/profile`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function updateMyProfile(data: {
  first_name: string;
  last_name: string;
  phone: string;
  npi?: string;
}): Promise<MyProfile> {
  const res = await fetch(`${API_BASE_URL}/clinics/me/profile`, {
    method: 'PATCH',
    headers: await getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

// ---- Admin profile --------------------------------------------------------
export interface AdminProfile {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  profile_complete: boolean;
  email?: string;
  [key: string]: any;
}

export async function getMyAdminProfile(): Promise<AdminProfile> {
  const res = await fetch(`${API_BASE_URL}/admin/me/profile`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load admin profile');
  return res.json();
}

export async function updateMyAdminProfile(data: {
  first_name: string;
  last_name: string;
  phone: string;
}): Promise<AdminProfile> {
  const res = await fetch(`${API_BASE_URL}/admin/me/profile`, {
    method: 'PATCH',
    headers: await getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update admin profile');
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

  async getReferrals(filters?: { month?: string; archived?: boolean }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.month) params.append('month', filters.month);
    if (filters?.archived) params.append('archived', 'true');
    const response = await fetch(`${API_BASE_URL}/referrals${params.toString() ? '?' + params : ''}`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async archiveReferral(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${id}/archive`, {
      method: 'POST', headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async unarchiveReferral(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${id}/unarchive`, {
      method: 'POST', headers: await getHeaders(),
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

  async reportDeliveryIssue(referralId: string, details: string): Promise<{ ok: boolean; case_id: string; note_id: string }> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/delivery-issue`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ details }),
    });
    return handleResponse(response);
  },

  async getReferralDocuments(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${id}/documents`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async uploadDocument(referralId: string, file: File, docType: string, taskId?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const docTypeMap: Record<string, string> = {
      required: 'referral_form',
      insurance: 'insurance_front',
      additional: 'chart_notes',
    };
    formData.append('doc_type', docTypeMap[docType] || docType);
    // Uploading in answer to an admin task tags the doc with the task.
    if (taskId) formData.append('task_id', taskId);

    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/documents`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  // ── Tasks: "your Dirxctional team needs something on this referral" ──
  async getReferralTasks(referralId: string): Promise<{ items: ReferralTask[] }> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/tasks`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async respondToTask(referralId: string, taskId: string, message: string): Promise<{ task: ReferralTask }> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/tasks/${taskId}/respond`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ message }),
    });
    return handleResponse(response);
  },

  async getActionNeededCount(): Promise<{ count: number }> {
    const response = await fetch(`${API_BASE_URL}/referrals/action-needed/count`, {
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

  // Clinic edits to extracted_data (PATCH). Body is a partial map of editable
  // sections — { patient, clinical, provider, insurance } — deep-merged server-side.
  // Auto-promotes a rejected referral back to ready_for_review.
  async editReferral(referralId: string, sections: Record<string, any>): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify(sections),
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

  async getReferralDocumentUrl(
    referralId: string,
    docId: string,
  ): Promise<{ url: string; filename?: string; expires_in?: number }> {
    const response = await fetch(
      `${API_BASE_URL}/referrals/${referralId}/documents/${docId}/url`,
      { headers: await getHeaders() },
    );
    return handleResponse(response);
  },
};

// ============================================================================
// Clinic "Contact us" support thread — general / account / how-to support.
// NOT patient-specific (that stays in referral Notes). See SUPPORT_API_CONTRACT.md.
// ============================================================================

export interface SupportMessage {
  id: string;
  author_type: 'clinic_user' | 'admin';
  author_name: string;
  body: string;
  created_at: string;
}

export const supportApi = {
  async getCases(month?: string): Promise<{ items: SupportCaseSummary[] }> {
    const params = month ? `?month=${encodeURIComponent(month)}` : '';
    const response = await fetch(`${API_BASE_URL}/support/cases${params}`, { headers: await getHeaders() });
    return handleResponse(response);
  },

  async getCase(caseId: string): Promise<SupportCaseDetail> {
    const response = await fetch(`${API_BASE_URL}/support/cases/${caseId}`, { headers: await getHeaders() });
    return handleResponse(response);
  },

  async openCase(data: { category: 'support' | 'feedback'; body: string; subject?: string; referral_id?: string | null }): Promise<SupportCaseSummary> {
    const response = await fetch(`${API_BASE_URL}/support/cases`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async replyCase(caseId: string, body: string): Promise<SupportCaseSummary> {
    const response = await fetch(`${API_BASE_URL}/support/cases/${caseId}/messages`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ body }),
    });
    return handleResponse(response);
  },

  async getSummary(): Promise<{ open_cases: number; latest_admin_at: string | null }> {
    const response = await fetch(`${API_BASE_URL}/support/summary`, { headers: await getHeaders() });
    return handleResponse(response);
  },
};

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

export interface SupportCaseSummary {
  id: string;
  short_id: string;
  clinic_id: string;
  clinic_name?: string;
  category: "support" | "feedback" | "delivery_issue";
  subject: string;
  status: "open" | "in_progress" | "resolved";
  referral_id?: string | null;
  referral_short?: string | null;
  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  last_message_at?: string | null;
  last_author_type?: "clinic_user" | "admin" | null;
  needs_reply: boolean;
}
export interface SupportCaseDetail {
  case: SupportCaseSummary;
  messages: SupportMessage[];
}

export interface TaskDocument {
  id: string;
  filename: string;
  doc_type: string;
}

export interface ReferralTask {
  id: string;
  referral_id: string;
  instructions: string;
  status: 'open' | 'completed' | 'cancelled';
  clinic_response: string | null;
  created_by: string | null;
  created_at: string | null;
  responded_at: string | null;
  completed_at: string | null;
  document_count: number;
  /** Docs the admin attached at creation — the form/letter the clinic needs. */
  attachments: TaskDocument[];
  /** Docs the clinic uploaded back in response. */
  response_documents: TaskDocument[];
}

// ── Appeal packet (fax builder) ─────────────────────────────────
export interface AppealPacketFieldDef {
  key: string;
  label: string;
}

export interface AppealPacketDrugRegistry {
  drug_name: string;
  appeal_notes?: string | null;
  single_appeal: boolean;
  has_bridge: boolean;
  bridge_duration_months: number | null;
  bridge_notes: string | null;
}

export interface AppealPacketDocument {
  id: string;
  doc_type: string;
  filename: string;
  uploaded_at?: string | null;
}

export interface AppealPacket {
  id: string | null;
  kind: 'appeal' | 'lmn' | 'appeal_lmn';
  status: string;
  template_key: string | null;
  template_title: string | null;
  indication: string | null;
  field_values: Record<string, string>;
  included_document_ids: string[];
  fax_number: string | null;
  is_expedited: boolean;
}

export interface AppealPacketResponse {
  packet: AppealPacket;
  fields: Record<string, string>;
  missing_fields: string[];
  indication_options: string[];
  severity_fields: AppealPacketFieldDef[];
  drug_registry: AppealPacketDrugRegistry | null;
  documents: AppealPacketDocument[];
}

export interface AppealPacketLetter {
  kind: string;
  template_key: string;
  text: string;
  missing_tokens: string[];
}

export interface AppealPacketPreviewResponse {
  letters: AppealPacketLetter[];
}

export interface AppealPacketSendResponse {
  message: string;
  provider_fax_id: string;
  page_count: number;
  skipped_documents: string[];
  submitted_at: string;
}

export interface AppealPacketMarkSubmittedResponse {
  message: string;
  submitted_at: string;
}

// ── Manufacturer assistance enrollment (denied-referral bridge programs) ──
export interface EnrollmentFormFile {
  file: string;
  label: string | null;
  calibrated: boolean;
}

export interface EnrollmentEligibilityWarning {
  code: string;
  message: string;
}

export interface EnrollmentConsentEvent {
  signer?: string;
  [key: string]: unknown;
}

export interface EnrollmentProgram {
  id: string;
  program_name: string;
  manufacturer: string;
  bridge_kind: 'free_drug' | 'cost_share' | 'none' | string;
  bridge_terms: string | null;
  bridge_duration_months: number | null;
  appeal_linkage: string | null;
  age_max: number | null;
  commercial_only: boolean;
  state_exclusions: string[];
  rems: boolean;
  routing_mode: 'fax_to_program' | 'fax_to_specialty_pharmacy' | 'hub_runs_enrollment' | string;
  submission_fax: string | null;
  submission_phone: string | null;
  portal_url: string | null;
  eprescribe_target: string | null;
  consent_events: EnrollmentConsentEvent[];
  notes: string | null;
  last_verified_on: string | null;
  form_files: EnrollmentFormFile[];
  eligibility_warnings: EnrollmentEligibilityWarning[];
}

export interface EnrollmentDraft {
  id: string;
  program_id: string;
  form_file: string;
  status: 'draft' | 'awaiting_signatures' | 'sent';
  field_values: Record<string, string>;
  commercial_confirmed: boolean;
  fax_number: string;
  assistance_ends_on: string | null;
  signature_task_id: string | null;
  signed_document_id: string | null;
  adjusted_document?: { id: string; filename: string; uploaded_at: string | null } | null;
  submitted_via: string | null;
  submitted_at: string | null;
  updated_at: string | null;
}

export interface EnrollmentResponse {
  programs: EnrollmentProgram[];
  draft: EnrollmentDraft | null;
  field_values: Record<string, string>;
  missing_fields: string[];
  // Blank tokens the form itself marks "(optional)" — shown as quiet
  // fine-to-leave-blank inputs, never chased like missing_fields.
  optional_blank_fields?: string[];
  // False when the selected form has no calibrated fill map yet.
  form_fillable?: boolean;
}

export interface EnrollmentSendForSignaturesResponse {
  message: string;
  task_id: string;
  document_id: string;
  status: string;
}

export interface EnrollmentSubmitResponse {
  message: string;
  provider_fax_id: string;
  page_count: number;
  submitted_at: string | null;
}

export interface EnrollmentMarkSubmittedResponse {
  message: string;
  submitted_at: string;
}

export const adminApi = {
  async getReferrals(filters?: { status?: string; month?: string; archived?: boolean; view?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.month) params.append('month', filters.month);
    if (filters?.archived) params.append('archived', 'true');
    if (filters?.view) params.append('view', filters.view);

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

  // `extra` carries structured rejection — missing_documents + flagged_fields —
  // which the backend stores in missing_fields JSONB for the clinic's Fix panel.
  async makeDecision(
    id: string,
    decision: 'approve' | 'reject',
    reason?: string,
    extra?: { missing_documents?: string[]; flagged_fields?: string[] },
  ): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/decision`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ decision, reason, ...(extra || {}) }),
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

  // ── PA appeals (level-1) ─────────────────────────────────────────
  async startAppeal(id: string): Promise<{ pa_status: string; single_appeal_drug: boolean }> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/pa/appeal`, {
      method: 'POST', headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async recordAppealOutcome(id: string, outcome: 'won' | 'level2' | 'final'): Promise<{ pa_status: string; appeal_outcome: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/pa/appeal/outcome`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ outcome }),
    });
    return handleResponse(response);
  },

  // ── Appeal packet (fax builder) ───────────────────────────────────
  async getAppealPacket(referralId: string): Promise<AppealPacketResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/appeal-packet`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async saveAppealPacket(referralId: string, data: {
    kind: 'appeal' | 'lmn' | 'appeal_lmn';
    indication?: string | null;
    field_values: Record<string, string>;
    included_document_ids: string[];
    fax_number?: string | null;
    is_expedited: boolean;
  }): Promise<AppealPacketResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/appeal-packet`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async previewAppealPacket(referralId: string, data?: {
    field_values?: Record<string, string>;
    indication?: string;
    kind?: 'appeal' | 'lmn' | 'appeal_lmn';
  }): Promise<AppealPacketPreviewResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/appeal-packet/preview`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data || {}),
    });
    return handleResponse(response);
  },

  async previewAppealPacketPdf(referralId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/appeal-packet/preview-pdf`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!response.ok) {
      let msg = 'Could not build the packet preview';
      try { msg = (await response.json()).error || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
    return response.blob();
  },

  async sendAppealPacket(referralId: string, faxNumber?: string): Promise<AppealPacketSendResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/appeal-packet/send`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(faxNumber ? { fax_number: faxNumber } : {}),
    });
    return handleResponse(response);
  },

  async markAppealPacketSubmitted(referralId: string): Promise<AppealPacketMarkSubmittedResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/appeal-packet/mark-submitted`, {
      method: 'POST', headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  // ── Manufacturer assistance enrollment ────────────────────────────
  async getEnrollment(referralId: string): Promise<EnrollmentResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/enrollment`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async saveEnrollment(referralId: string, data: {
    program_id: string;
    form_file: string;
    field_values: Record<string, string>;
    commercial_confirmed: boolean;
    fax_number?: string | null;
    assistance_ends_on?: string | null;
  }): Promise<EnrollmentResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/enrollment`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async previewEnrollmentPdf(referralId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/enrollment/preview-pdf`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!response.ok) {
      let msg = 'Could not build the enrollment preview';
      try { msg = (await response.json()).error || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
    return response.blob();
  },

  async sendEnrollmentForSignatures(referralId: string): Promise<EnrollmentSendForSignaturesResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/enrollment/send-for-signatures`, {
      method: 'POST', headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async submitEnrollment(referralId: string, data?: {
    signed_document_id?: string | null;
    fax_number?: string | null;
    assistance_ends_on?: string | null;
  }): Promise<EnrollmentSubmitResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/enrollment/submit`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data || {}),
    });
    return handleResponse(response);
  },

  async markEnrollmentSubmitted(referralId: string, data?: { assistance_ends_on?: string | null }): Promise<EnrollmentMarkSubmittedResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/enrollment/mark-submitted`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data || {}),
    });
    return handleResponse(response);
  },

  // Admin's own edited copy of the manufacturer form — replaces the
  // generated fill for preview/signatures/fax once attached.
  async uploadAdjustedEnrollment(referralId: string, file: File): Promise<EnrollmentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/enrollment/upload-adjusted`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  async removeAdjustedEnrollment(referralId: string): Promise<EnrollmentResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/enrollment/upload-adjusted`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  // ── Referral tasks (ask the clinic for something) ────────────────
  async getTasks(referralId: string): Promise<{ items: ReferralTask[] }> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/tasks`, {
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async createTask(referralId: string, data: { instructions: string; created_by: string; attachment_document_ids?: string[] }): Promise<{ task: ReferralTask }> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/tasks`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async completeTask(taskId: string, completedBy: string): Promise<{ task: ReferralTask }> {
    const response = await fetch(`${API_BASE_URL}/admin/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ completed_by: completedBy }),
    });
    return handleResponse(response);
  },

  async cancelTask(taskId: string): Promise<{ task: ReferralTask }> {
    const response = await fetch(`${API_BASE_URL}/admin/tasks/${taskId}/cancel`, {
      method: 'POST', headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async editTask(taskId: string, data: { instructions: string; add_attachment_document_ids?: string[] }): Promise<{ task: ReferralTask }> {
    const response = await fetch(`${API_BASE_URL}/admin/tasks/${taskId}`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // ── Return an approved referral to review ────────────────────────
  // Reset a sent referral for resend (failed fax / delivery issue) — clears
  // the delivery-issue flag; the admin then re-sends via the normal Send flow.
  async resendReferral(id: string, reason?: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/resend`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(reason ? { reason } : {}),
    });
    return handleResponse(response);
  },

  async unapproveReferral(id: string, reason?: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/unapprove`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(reason ? { reason } : {}),
    });
    return handleResponse(response);
  },

  // ── Admin document upload (appeal docs, payer letters, team docs) ─
  async uploadAdminDocument(referralId: string, file: File, docType: 'appeal_document' | 'payer_correspondence' | 'team_document'): Promise<{ id: string; doc_type: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/documents`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  async getReferralCounts(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/counts`, {
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

  // ── Clinic support cases (tickets) ──────────────────────────────
  async getSupportCases(filters?: { status?: string; category?: string; month?: string; search?: string; assigned?: string }): Promise<{ items: SupportCaseSummary[]; counts: Record<string, number> }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.month) params.append('month', filters.month);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.assigned) params.append('assigned', filters.assigned);
    const url = `${API_BASE_URL}/admin/support/cases${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, { headers: await getHeaders() });
    return handleResponse(response);
  },

  async getSupportCase(caseId: string): Promise<SupportCaseDetail> {
    const response = await fetch(`${API_BASE_URL}/admin/support/cases/${caseId}`, { headers: await getHeaders() });
    return handleResponse(response);
  },

  async replySupportCase(caseId: string, body: string): Promise<SupportCaseSummary> {
    const response = await fetch(`${API_BASE_URL}/admin/support/cases/${caseId}/messages`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ body }),
    });
    return handleResponse(response);
  },

  async claimSupportCase(caseId: string): Promise<SupportCaseSummary> {
    const response = await fetch(`${API_BASE_URL}/admin/support/cases/${caseId}/claim`, {
      method: 'POST', headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async releaseSupportCase(caseId: string): Promise<SupportCaseSummary> {
    const response = await fetch(`${API_BASE_URL}/admin/support/cases/${caseId}/release`, {
      method: 'POST', headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async setSupportCaseStatus(caseId: string, status: string): Promise<SupportCaseSummary> {
    const response = await fetch(`${API_BASE_URL}/admin/support/cases/${caseId}`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  async recheckEligibility(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/recheck-eligibility`, {
      method: 'POST', headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async archiveReferral(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/archive`, {
      method: 'POST', headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async unarchiveReferral(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/unarchive`, {
      method: 'POST', headers: await getHeaders(),
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

  async deletePALetter(referralId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/${referralId}/pa/letter`, {
      method: 'DELETE',
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

  // ---- Clinics (admin) ----
  async getClinics(): Promise<{ items: AdminClinic[] }> {
    const response = await fetch(`${API_BASE_URL}/admin/clinics`, {
      headers: await getHeaders(),
    });
    // Backend may return either { items: [...] } or a bare array — normalize.
    const data = await handleResponse<any>(response);
    if (Array.isArray(data)) return { items: data };
    return data;
  },

  async createClinic(data: Partial<AdminClinic>): Promise<AdminClinic> {
    const response = await fetch(`${API_BASE_URL}/admin/clinics`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AdminClinic>(response);
  },

  async updateClinic(id: string, data: Partial<AdminClinic>): Promise<AdminClinic> {
    const response = await fetch(`${API_BASE_URL}/admin/clinics/${id}`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AdminClinic>(response);
  },

  // ---- Invites ----
  async listInvites(): Promise<{ items: AdminInvite[] }> {
    const response = await fetch(`${API_BASE_URL}/admin/invites`, {
      headers: await getHeaders(),
    });
    const data = await handleResponse<any>(response);
    if (Array.isArray(data)) return { items: data };
    return data;
  },

  async createInvite(data: { clinic_id: string; email: string }): Promise<AdminInvite> {
    const response = await fetch(`${API_BASE_URL}/admin/invites`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AdminInvite>(response);
  },

  async resendInvite(token: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/invites/${token}/resend`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    return handleResponse(response);
  },

  async revokeInvite(token: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/invites/${token}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.status === 204 ? null : response.json().catch(() => null);
  },

  // ── Fax Center — all outbound fax traffic + the inbound fax inbox ──
  async getFaxes(): Promise<AdminFaxesResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/faxes`, {
      headers: await getHeaders(),
    });
    return handleResponse<AdminFaxesResponse>(response);
  },

  async getInboundFaxPDF(id: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/admin/faxes/inbound/${id}/download`, {
      headers: await getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to get fax PDF');
    return response.blob();
  },

  async reviewInboundFax(id: string, reviewedBy: string): Promise<{ ok: boolean }> {
    const response = await fetch(`${API_BASE_URL}/admin/faxes/inbound/${id}/review`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ reviewed_by: reviewedBy }),
    });
    return handleResponse(response);
  },

  async linkInboundFax(id: string, referralId: string): Promise<{ ok: boolean }> {
    const response = await fetch(`${API_BASE_URL}/admin/faxes/inbound/${id}/link`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ referral_id: referralId }),
    });
    return handleResponse(response);
  },
};

export interface AdminClinic {
  id: string;
  name: string;
  specialty?: string | null;
  email?: string | null;
  phone?: string | null;
  fax?: string | null;
  address?: string | null;
  npi?: string | null;
  default_pharmacy_id?: string | null;
}

export interface AdminInvite {
  token: string;
  email: string;
  clinic_id: string;
  clinic_name?: string;
  created_at: string;
  expires_at: string;
  used_at?: string | null;
  revoked_at?: string | null;
}

// ============================================================================
// FAX CENTER
// ============================================================================

export type AdminFaxOutboundKind = 'referral' | 'appeal' | 'enrollment';

export interface AdminFaxOutbound {
  id: string;
  kind: AdminFaxOutboundKind;
  referral_id: string | null;
  counterparty: string;
  provider_fax_id: string | null;
  status: string;
  page_count: number | null;
  error_detail: string | null;
  at: string;
}

export interface AdminFaxInbound {
  id: string;
  provider_fax_id: string | null;
  from_number: string | null;
  to_number: string | null;
  page_count: number | null;
  has_pdf: boolean;
  status: 'new' | 'reviewed';
  linked_referral_id: string | null;
  linked_patient_name: string | null;
  reviewed_by: string | null;
  received_at: string;
}

export interface AdminFaxesResponse {
  outbound: AdminFaxOutbound[];
  inbound: AdminFaxInbound[];
  inbound_new_count: number;
}

// ============================================================================
// PHARMACY ENDPOINTS
// ============================================================================

export interface Pharmacy {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  fax: string | null;
  alt_phone_fax: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  accepts_no_insurance: boolean;
  blocked_medications: string[];
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export const pharmacyApi = {
  async getPharmacies(): Promise<{ items: Pharmacy[] }> {
    const response = await fetch(`${API_BASE_URL}/pharmacies`, {
      headers: await getHeaders(),
    });
    return handleResponse<{ items: Pharmacy[] }>(response);
  },

  async getPharmacy(id: string): Promise<Pharmacy> {
    const response = await fetch(`${API_BASE_URL}/pharmacies/${id}`, {
      headers: await getHeaders(),
    });
    return handleResponse<Pharmacy>(response);
  },

  async createPharmacy(data: Partial<Pharmacy>): Promise<Pharmacy> {
    const response = await fetch(`${API_BASE_URL}/pharmacies`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Pharmacy>(response);
  },

  async updatePharmacy(id: string, data: Partial<Pharmacy>): Promise<Pharmacy> {
    const response = await fetch(`${API_BASE_URL}/pharmacies/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Pharmacy>(response);
  },

  async deletePharmacy(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/pharmacies/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.status === 204 ? null : response.json().catch(() => null);
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
