import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, User, Shield, FileText, Pill, ClipboardList, Loader2, Pencil, Save, X, Eye } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { underlineTabsListClass, underlineTabsTriggerClass } from "@/components/patterns/underlineTabs";
import { DefinitionList } from "@/components/patterns/DefinitionList";
import { IdChip } from "@/components/patterns/IdChip";
import { StatusBadge } from "@/components/StatusBadge";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { PAStatusBadge } from "@/components/PAStatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clinicApi } from "@/lib/api";
import { mapReferralsFromBackend } from "@/lib/dataMapper";
import { formatDateShort, parseLocalDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import { PageContainer } from "@/components/patterns/PageContainer";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

const formatDateForInput = (s: string | null | undefined): string => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s as string;
  return d.toISOString().split("T")[0];
};
const getAge = (dob: string) => {
  const b = parseLocalDate(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
};

// PA badge for a medication — verbatim logic from the original page, mapped
// onto the existing PAStatusBadge status keys.
function drugPAStatus(drug: any): string {
  if (drug.is_active === false) return "discontinued";
  if (drug.pa_status === "appeal") return "appeal";
  if (drug.pa_status === "denied") return "denied";
  if (["pending", "submitted", "processing"].includes(drug.pa_status)) return "pending";
  if (drug.pa_status === "approved" && drug.pa_expiration_date) {
    const exp = parseLocalDate(drug.pa_expiration_date);
    if (exp < new Date()) return "expired";
    const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);
    if (days <= 30) return "expiring";
    return "approved";
  }
  if (drug.pa_status === "approved") return "approved";
  return "none";
}
function refStatusLabel(status: string): string {
  const m: Record<string, string> = {
    uploaded: "Uploaded", processing: "Processing", ready_for_review: "Ready for review",
    needs_info: "Needs info", approved_to_send: "Approved to send", sent_to_pharmacy: "Sent to pharmacy",
    rejected: "Rejected",
  };
  return m[status] || status || "—";
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [medsLoading, setMedsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const loadPatient = () => {
    if (!id) return;
    setLoading(true);
    clinicApi.getPatient(id).then((data) => setPatient(data)).catch(() => setError("Failed to load patient")).finally(() => setLoading(false));
  };
  useEffect(() => { loadPatient(); }, [id]);
  useEffect(() => {
    if (!id) return;
    setMedsLoading(true);
    clinicApi.getPatientDrugs(id).then((data) => setMedications(data.drugs || [])).catch(() => setMedications([])).finally(() => setMedsLoading(false));
  }, [id]);
  useEffect(() => {
    if (!id) return;
    clinicApi.getReferrals().then((data) => setReferrals(mapReferralsFromBackend(data.items || []).filter((r: any) => r.patient_id === id))).catch(() => setReferrals([]));
  }, [id]);

  const sortedMedications = useMemo(() => [...medications].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    const ad = a.pa_expiration_date ? parseLocalDate(a.pa_expiration_date).getTime() : Infinity;
    const bd = b.pa_expiration_date ? parseLocalDate(b.pa_expiration_date).getTime() : Infinity;
    return ad - bd;
  }), [medications]);

  const beginEdit = () => {
    setDraft({
      full_name: patient.full_name || "", dob: formatDateForInput(patient.dob), gender: patient.gender || "",
      phone_primary: patient.phone_primary || "", phone_alternate: patient.phone_alternate || "", email: patient.email || "",
      address: patient.address || "", city: patient.city || "", state: patient.state || "", zip: patient.zip || "",
      height: patient.height || "", weight: patient.weight || "", allergies: patient.allergies || "",
      authorized_representative: patient.authorized_representative || "", authorized_representative_phone: patient.authorized_representative_phone || "",
    });
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setDraft({}); };
  const saveEdits = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await clinicApi.updatePatient(id, draft);
      toast.success("Patient updated successfully");
      setEditing(false);
      loadPatient();
    } catch (err: any) {
      toast.error(err.message || "Failed to update patient");
    } finally { setSaving(false); }
  };
  const setField = (k: string, v: string) => setDraft((d: any) => ({ ...d, [k]: v }));

  if (loading) return <PageContainer fade={false} style={{ display: "flex", justifyContent: "center", padding: 80 }}><Loader2 width={26} height={26} className="animate-spin text-primary" /></PageContainer>;
  if (error || !patient) return (
    <PageContainer fade={false} className="text-center py-20">
      <p className="text-muted-foreground">{error || "Patient not found"}</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/clinic/patients")}>Back to Patients</Button>
    </PageContainer>
  );

  const fullName = patient.full_name || `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "—";
  const firstName = patient.full_name?.split(" ")[0] || "Patient";

  return (
    <PageContainer>
      <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4" onClick={() => navigate("/clinic/patients")}>
        <ArrowLeft width={15} height={15} strokeWidth={1.75} />Back to Patients
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{fullName}</h1>
          <span className="text-sm text-muted-foreground">{patient.dob ? `${formatDateShort(patient.dob)} · Age ${getAge(patient.dob)}` : "—"}</span>
          <IdChip id={patient.id} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={beginEdit}><Pencil width={16} height={16} strokeWidth={1.75} />Edit patient</Button>
          <Button onClick={() => navigate(`/clinic/referrals/new?patientId=${patient.id}`)}><Plus width={16} height={16} strokeWidth={1.75} />New Referral for {firstName}</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={underlineTabsListClass}>
          <TabsTrigger value="overview" className={underlineTabsTriggerClass}>Overview</TabsTrigger>
          <TabsTrigger value="referrals" className={underlineTabsTriggerClass}>Referrals ({referrals.length})</TabsTrigger>
          <TabsTrigger value="pa" className={underlineTabsTriggerClass}>Prior authorizations ({medications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DefinitionList
              title="Personal information"
              icon={<User width={16} height={16} strokeWidth={1.75} />}
              rows={[
                { label: "Full name", value: patient.full_name },
                { label: "Date of birth", value: patient.dob ? `${formatDateShort(patient.dob)} (Age ${getAge(patient.dob)})` : undefined },
                { label: "Gender", value: patient.gender },
                { label: "Height", value: patient.height },
                { label: "Weight", value: patient.weight },
              ]}
            />
            <DefinitionList
              title="Contact"
              icon={<FileText width={16} height={16} strokeWidth={1.75} />}
              rows={[
                { label: "Phone", value: patient.phone_primary, copy: true },
                { label: "Alternate phone", value: patient.phone_alternate },
                { label: "Email", value: patient.email, copy: true },
                { label: "Address", value: [patient.address, patient.city, patient.state, patient.zip].filter(Boolean).join(", ") || undefined },
              ]}
            />
            <DefinitionList
              title="Medical"
              icon={<Pill width={16} height={16} strokeWidth={1.75} />}
              rows={[
                { label: "Allergies", value: patient.allergies },
                { label: "Insurance type", value: patient.insurance_type },
                { label: "Plan details", value: patient.insurance_notes },
              ]}
            />
            <DefinitionList
              title="Guardian / authorized representative"
              icon={<Shield width={16} height={16} strokeWidth={1.75} />}
              rows={[
                { label: "Name", value: patient.authorized_representative },
                { label: "Phone", value: patient.authorized_representative_phone },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="pt-5">
          <div className="flex justify-end mb-3">
            <Button variant="outline" size="sm" onClick={() => navigate(`/clinic/referrals/new?patientId=${patient.id}`)}>
              <Plus width={14} height={14} strokeWidth={1.75} />New referral for this patient
            </Button>
          </div>
          {referrals.length > 0 ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral ID</TableHead><TableHead>Drug</TableHead><TableHead>Status</TableHead>
                    <TableHead>PA status</TableHead><TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((r: any) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/clinic/referrals/${r.id}`)}>
                      <TableCell><IdChip id={r.id} /></TableCell>
                      <TableCell>{r.drug || r.drug_requested || "—"}</TableCell>
                      <TableCell><StatusBadge status={r.status} variant="soft" /></TableCell>
                      <TableCell><ClinicPABadge status={r.pa_status} appealOutcome={r.appeal_outcome} /></TableCell>
                      <TableCell className="text-muted-foreground">{r.created_at ? formatDateShort(r.created_at) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"><FileText width={20} height={20} strokeWidth={1.75} /></span>
              <p className="text-sm font-semibold text-foreground">No referrals for this patient</p>
              <p className="text-sm text-muted-foreground">Create a referral to get started</p>
              <Button onClick={() => navigate(`/clinic/referrals/new?patientId=${patient.id}`)}><Plus width={16} height={16} strokeWidth={1.75} />Create Referral</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pa" className="pt-5">
          {medsLoading ? (
            <div className="flex items-center justify-center gap-2 py-16"><Loader2 width={22} height={22} className="animate-spin text-primary" /><span className="text-sm text-muted-foreground">Loading medications…</span></div>
          ) : sortedMedications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"><ClipboardList width={20} height={20} strokeWidth={1.75} /></span>
              <p className="text-sm font-semibold text-foreground">No medications on record</p>
              <p className="text-sm text-muted-foreground">No active prescriptions for this patient yet</p>
              <Button onClick={() => navigate(`/clinic/referrals/new?patientId=${patient.id}`)}><Plus width={16} height={16} strokeWidth={1.75} />Create First Referral</Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead><TableHead>PA status</TableHead><TableHead>PA number</TableHead>
                    <TableHead>Valid through</TableHead><TableHead>Last referral</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMedications.map((d: any) => {
                    const disabled = !d.last_referral_id;
                    return (
                      <TableRow
                        key={d.id}
                        className={disabled ? undefined : "cursor-pointer"}
                        style={d.is_active === false ? { opacity: 0.62 } : undefined}
                        onClick={() => !disabled && navigate(`/clinic/referrals/${d.last_referral_id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><Pill width={14} height={14} strokeWidth={1.75} /></span>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{d.drug_name}</span>
                              <span className="text-xs text-muted-foreground">{d.dosage} · {d.frequency || "—"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><PAStatusBadge status={drugPAStatus(d)} expirationDate={d.pa_expiration_date} /></TableCell>
                        <TableCell className="font-mono text-xs">{d.pa_number || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{d.pa_expiration_date ? formatDateShort(d.pa_expiration_date) : "N/A"}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {disabled ? (
                            <span className="text-muted-foreground text-xs">No referral linked</span>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/clinic/referrals/${d.last_referral_id}`)}>
                              <Eye width={13} height={13} strokeWidth={1.75} />View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit drawer */}
      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={cancelEdit} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-[480px] bg-card border-l border-border flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold">Edit Patient</h3>
              <button className="text-muted-foreground hover:text-foreground" onClick={cancelEdit} aria-label="Close"><X width={18} height={18} strokeWidth={1.75} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label className="text-xs">Full name</Label><Input className="mt-1" value={draft.full_name || ""} onChange={(e) => setField("full_name", e.target.value)} /></div>
                <div><Label className="text-xs">Date of birth</Label><Input type="date" className="mt-1" value={draft.dob || ""} onChange={(e) => setField("dob", e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Gender</Label>
                  <Select value={draft.gender || undefined} onValueChange={(v) => setField("gender", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Phone</Label><Input className="mt-1" value={draft.phone_primary || ""} onChange={(e) => setField("phone_primary", e.target.value)} /></div>
                <div><Label className="text-xs">Alternate phone</Label><Input className="mt-1" value={draft.phone_alternate || ""} onChange={(e) => setField("phone_alternate", e.target.value)} /></div>
                <div className="col-span-2"><Label className="text-xs">Email</Label><Input className="mt-1" value={draft.email || ""} onChange={(e) => setField("email", e.target.value)} /></div>
                <div className="col-span-2"><Label className="text-xs">Street address</Label><Input className="mt-1" value={draft.address || ""} onChange={(e) => setField("address", e.target.value)} /></div>
                <div>
                  <Label className="text-xs">State</Label>
                  <Select value={draft.state || undefined} onValueChange={(v) => setField("state", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Zip</Label><Input className="mt-1" value={draft.zip || ""} onChange={(e) => setField("zip", e.target.value)} /></div>
                <div><Label className="text-xs">Height</Label><Input className="mt-1" value={draft.height || ""} onChange={(e) => setField("height", e.target.value)} /></div>
                <div><Label className="text-xs">Weight</Label><Input className="mt-1" value={draft.weight || ""} onChange={(e) => setField("weight", e.target.value)} /></div>
                <div className="col-span-2"><Label className="text-xs">Allergies</Label><Textarea className="mt-1" rows={2} value={draft.allergies || ""} onChange={(e) => setField("allergies", e.target.value)} /></div>
                <div><Label className="text-xs">Authorized representative</Label><Input className="mt-1" value={draft.authorized_representative || ""} onChange={(e) => setField("authorized_representative", e.target.value)} /></div>
                <div><Label className="text-xs">Representative phone</Label><Input className="mt-1" value={draft.authorized_representative_phone || ""} onChange={(e) => setField("authorized_representative_phone", e.target.value)} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>Cancel</Button>
              <Button onClick={saveEdits} disabled={saving}>{saving ? <Loader2 width={14} height={14} className="animate-spin" /> : <Save width={14} height={14} strokeWidth={1.75} />}Save</Button>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
