/**
 * AI Extraction Quality API — internal_admin only.
 *
 * All requests pass `cache: "no-store"` and the responses are intentionally
 * NOT cached by react-query (staleTime/gcTime: 0 in the hooks). PHI must
 * not sit in browser storage beyond the active session.
 */
import { getHeaders } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function noStoreFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: await getHeaders(),
    cache: "no-store",
  });
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---- Types -----------------------------------------------------------------

export interface AIQualityTotals {
  extractions: number;
  acceptance_rate: number | null;
  high_conf_wrong: number;
  corrections: number;
}

export interface AIQualityFieldRow {
  field_path: string;
  edit_count: number;
  high_conf_wrong_count: number;
  acceptance_rate: number | null;
  avg_model_confidence: number | null;
  last_edited_at: string | null;
}

export interface AIQualityFormTypeRow {
  form_type: string;
  edits: number;
  edited_referrals: number;
}

export interface AIQualityTopProblemField {
  field_path: string;
  edit_count: number;
  high_conf_wrong_count: number;
}

export interface AIQualityOverview {
  totals: AIQualityTotals;
  fields: AIQualityFieldRow[];
  by_form_type: AIQualityFormTypeRow[];
  top_problem_fields: AIQualityTopProblemField[];
}

export type CorrectionChangeType = "edited" | "added" | "cleared";

export interface AIQualityCorrection {
  id?: string;
  referral_id: string;
  field_path: string;
  model_value: unknown;
  final_value: unknown;
  model_confidence: number | null;
  change_type: CorrectionChangeType;
  prompt_version?: string | null;
  edited_at: string;
  edited_by_role?: string | null;
}

export interface AIQualityCorrectionsResponse {
  items: AIQualityCorrection[];
  next_cursor: string | null;
}

export interface AIQualityReferralDocument {
  id: string;
  doc_type: string;
  original_filename: string;
  file_type: string;
  url: string | null;
}

export interface AIQualityReferralDetail {
  referral: {
    id: string;
    status: string;
    prompt_version: string | null;
    updated_at: string;
  };
  documents: AIQualityReferralDocument[];
  extracted_data: Record<string, any>;
  corrections: AIQualityCorrection[];
}

// ---- Endpoints -------------------------------------------------------------

export async function getOverview(params: {
  days: number;
  formType?: string;
}): Promise<AIQualityOverview> {
  const qs = new URLSearchParams();
  qs.set("days", String(params.days));
  if (params.formType) qs.set("form_type", params.formType);
  const res = await noStoreFetch(`${API_BASE_URL}/admin/extraction-quality?${qs}`);
  return handle(res);
}

export async function getCorrections(params: {
  days: number;
  field?: string;
  highConfOnly?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<AIQualityCorrectionsResponse> {
  const qs = new URLSearchParams();
  qs.set("days", String(params.days));
  if (params.field) qs.set("field", params.field);
  if (params.highConfOnly) qs.set("high_conf_only", "true");
  qs.set("limit", String(params.limit ?? 50));
  if (params.cursor) qs.set("cursor", params.cursor);
  const res = await noStoreFetch(
    `${API_BASE_URL}/admin/extraction-quality/corrections?${qs}`,
  );
  return handle(res);
}

export async function getReferralQuality(id: string): Promise<AIQualityReferralDetail> {
  const res = await noStoreFetch(
    `${API_BASE_URL}/admin/extraction-quality/referral/${encodeURIComponent(id)}`,
  );
  return handle(res);
}
