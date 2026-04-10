import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, User, Shield, Phone, Mail, Copy,
  FileText, Pill, ClipboardList, Loader2, Pencil, Save, X, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAStatusBadge } from "@/components/PAStatusBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clinicApi } from "@/lib/api";
import { formatDateShort, getRelativeTime } from "@/lib/dateUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr as string;
  return d.toISOString().split('T')[0];
};

function getDrugPABadge(drug: any) {
  const today = new Date();
  if (!drug.pa_status || drug.pa_status === "pending") {
    return { label: "No PA", className: "bg-muted text-muted-foreground" };
  }
  if (drug.pa_status === "approved" && drug.pa_expiration_date) {
    const expDate = new Date(drug.pa_expiration_date);
    if (expDate < today) return { label: "PA Expired", className: "bg-destructive/10 text-destructive" };
    const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 30) return { label: "PA Expiring Soon", className: "bg-warning/10 text-warning" };
    return { label: "PA Active", className: "bg-success/10 text-success" };
  }
  return { label: "No PA", className: "bg-muted text-muted-foreground" };
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
  const [activeTab, setActiveTab] = useState("history");

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const loadPatient = () => {
    if (!id) return;
    setLoading(true);
    clinicApi.getPatient(id)
      .then((data) => setPatient(data))
      .catch(() => setError("Failed to load patient"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPatient(); }, [id]);

  useEffect(() => {
    if (!id) return;
    setMedsLoading(true);
    clinicApi.getPatientDrugs(id)
      .then((data) => setMedications(data.drugs || []))
      .catch(() => setMedications([]))
      .finally(() => setMedsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    clinicApi.getReferrals()
      .then((data) => {
        const patientRefs = (data.items || []).filter((r: any) => r.patient_id === id);
        setReferrals(patientRefs);
      })
      .catch(() => setReferrals([]));
  }, [id]);

  const sortedMedications = useMemo(() => {
    return [...medications].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      const aDate = a.pa_expiration_date ? new Date(a.pa_expiration_date).getTime() : Infinity;
      const bDate = b.pa_expiration_date ? new Date(b.pa_expiration_date).getTime() : Infinity;
      return aDate - bDate;
    });
  }, [medications]);

  const startEditing = () => {
    setEditData({
      full_name: patient.full_name || "",
      dob: formatDateForInput(patient.dob),
      gender: patient.gender || "",
      phone_primary: patient.phone_primary || "",
      phone_alternate: patient.phone_alternate || "",
      email: patient.email || "",
      address: patient.address || "",
      city: patient.city || "",
      state: patient.state || "",
      zip: patient.zip || "",
      height: patient.height || "",
      weight: patient.weight || "",
      allergies: patient.allergies || "",
      authorized_representative: patient.authorized_representative || "",
      authorized_representative_phone: patient.authorized_representative_phone || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  const saveEdits = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await clinicApi.updatePatient(id, editData);
      toast.success("Patient updated successfully");
      setIsEditing(false);
      loadPatient();
    } catch (err: any) {
      toast.error(err.message || "Failed to update patient");
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: string, value: string) => setEditData((d: any) => ({ ...d, [field]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{error || "Patient not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clinic/patients")}>
          Back to Patients
        </Button>
      </div>
    );
  }

  const fullName = patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || '—';
  const patientReferrals = referrals;

  const getAge = (dob: string) => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const firstName = patient.full_name?.split(' ')[0] || 'Patient';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/clinic/patients")} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{fullName}</h1>
          <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
            {patient.dob && <span>Age {getAge(patient.dob)}</span>}
            {patient.dob && <span className="text-border">|</span>}
            {patient.dob && <span>DOB: {formatDateShort(patient.dob)}</span>}
            {patient.phone_primary && <span className="text-border">|</span>}
            {patient.phone_primary && <span>{patient.phone_primary}</span>}
          </div>
        </div>
        <Button asChild>
          <Link to={`/clinic/referrals/new?patientId=${patient.id}`}>
            <Plus className="h-4 w-4 mr-2" />
            New Referral for {firstName}
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history">Referral History</TabsTrigger>
          <TabsTrigger value="info">Patient Information</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
        </TabsList>

        {/* REFERRAL HISTORY TAB */}
        <TabsContent value="history" className="mt-4 space-y-4">
          {/* PA Status Card */}
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Prior Authorization Status</h3>
            </div>
            {medsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (() => {
              const activeDrugs = medications.filter(m => m.is_active);
              if (activeDrugs.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground py-2">
                    No active medications — medications appear here after a referral is approved.
                  </p>
                );
              }
              const today = new Date();
              return (
                <div className="space-y-3">
                  {activeDrugs.map((drug: any) => {
                    const badge = getDrugPABadge(drug);
                    const expDate = drug.pa_expiration_date ? new Date(drug.pa_expiration_date) : null;
                    const isExpired = expDate && expDate < today;
                    const daysUntil = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    const isExpiringSoon = daysUntil !== null && daysUntil > 0 && daysUntil <= 30;

                    return (
                      <div key={drug.id}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Current Drug</p>
                            <p className="text-sm font-medium text-foreground">
                              {drug.drug_name}
                              {drug.dosage && <span className="text-muted-foreground font-normal ml-1">{drug.dosage}</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">PA Status</p>
                            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", badge.className)}>
                              {badge.label}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">PA Expiration</p>
                            <p className={cn("text-sm font-medium", isExpired ? "text-destructive" : isExpiringSoon ? "text-warning" : "text-foreground")}>
                              {expDate ? (isExpired ? `Expired ${formatDateShort(drug.pa_expiration_date)}` : formatDateShort(drug.pa_expiration_date)) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Last Filled</p>
                            <p className="text-sm font-medium text-foreground">
                              {drug.last_filled ? formatDateShort(drug.last_filled) : '—'}
                            </p>
                          </div>
                        </div>
                        {isExpiringSoon && (
                          <Alert className="mt-2 border-warning/30 bg-warning/5">
                            <AlertDescription className="text-sm text-foreground">
                              ⚠️ PA for {drug.drug_name} expires on {formatDateShort(drug.pa_expiration_date)}. Consider creating a new referral.
                            </AlertDescription>
                          </Alert>
                        )}
                        {isExpired && (
                          <Alert className="mt-2 border-destructive/30 bg-destructive/5">
                            <AlertDescription className="text-sm text-foreground">
                              ❌ PA for {drug.drug_name} expired on {formatDateShort(drug.pa_expiration_date)}. A new referral with PA is required.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Referrals Table */}
          {patientReferrals.length > 0 ? (
            <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Referral ID</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Drug</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">PA Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Created</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patientReferrals.map((ref, i) => (
                    <tr
                      key={ref.id}
                      onClick={() => navigate(`/clinic/referrals/${ref.id}`)}
                      className={cn(
                        "border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-primary/[0.03]",
                        i % 2 === 1 && "bg-secondary/20"
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{ref.id.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">{ref.drug || ref.drug_requested || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ref.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ClinicPABadge status={ref.pa_status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {ref.created_at ? formatDateShort(ref.created_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="text-xs" asChild>
                          <Link to={`/clinic/referrals/${ref.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No referrals for this patient</p>
              <p className="text-sm text-muted-foreground mb-4">Create a referral to get started</p>
              <Button asChild>
                <Link to={`/clinic/referrals/new?patientId=${patient.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Referral
                </Link>
              </Button>
            </div>
          )}

        </TabsContent>

        {/* PATIENT INFO TAB */}
        <TabsContent value="info" className="mt-4 space-y-4">
          <div className="flex justify-end">
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdits} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            /* ── Edit mode: all fields in one card ── */
            <div className="rounded-xl border border-border bg-card p-5 card-shadow space-y-6">
              <div>
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Full Name" value={editData.full_name} onChange={(v) => setField("full_name", v)} />
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Date of Birth</p>
                    <Input type="date" value={editData.dob} onChange={(e) => setField("dob", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Gender</p>
                    <Select value={editData.gender} onValueChange={(v) => setField("gender", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <EditField label="Email" value={editData.email} onChange={(v) => setField("email", v)} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-3">Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Phone" value={editData.phone_primary} onChange={(v) => setField("phone_primary", v)} />
                  <EditField label="Alternate Phone" value={editData.phone_alternate} onChange={(v) => setField("phone_alternate", v)} />
                  <div className="col-span-2">
                    <EditField label="Street Address" value={editData.address} onChange={(v) => setField("address", v)} />
                  </div>
                  <div className="col-span-2 grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <EditField label="City" value={editData.city} onChange={(v) => setField("city", v)} />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">State</p>
                      <Select value={editData.state} onValueChange={(v) => setField("state", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="State" /></SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <EditField label="Zip" value={editData.zip} onChange={(v) => setField("zip", v)} />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-3">Medical</h3>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Height" value={editData.height} onChange={(v) => setField("height", v)} />
                  <EditField label="Weight" value={editData.weight} onChange={(v) => setField("weight", v)} />
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs mb-1">Allergies</p>
                    <Textarea value={editData.allergies} onChange={(e) => setField("allergies", e.target.value)} rows={2} className="text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-3">Guardian / Authorized Representative</h3>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Authorized Representative" value={editData.authorized_representative} onChange={(v) => setField("authorized_representative", v)} />
                  <EditField label="Representative Phone" value={editData.authorized_representative_phone} onChange={(v) => setField("authorized_representative_phone", v)} />
                </div>
              </div>
            </div>
          ) : (
            /* ── Read mode: grouped sections ── */
            <div className="space-y-4">
              {/* Section 1: Personal Information */}
              <div className="rounded-lg border border-border/50 bg-card p-5">
                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Full Name" value={fullName} />
                  <InfoField label="Date of Birth" value={patient.dob ? `${formatDateShort(patient.dob)} (Age ${getAge(patient.dob)})` : '—'} />
                  <InfoField label="Gender" value={patient.gender || '—'} />
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Email</p>
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-foreground text-sm">{patient.email || '—'}</p>
                      {patient.email && (
                        <button onClick={() => copyToClipboard(patient.email, "Email")} className="p-0.5 rounded hover:bg-secondary transition-colors">
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact */}
              <div className="rounded-lg border border-border/50 bg-card p-5">
                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Phone</p>
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-foreground text-sm">{patient.phone_primary || '—'}</p>
                      {patient.phone_primary && (
                        <button onClick={() => copyToClipboard(patient.phone_primary, "Phone")} className="p-0.5 rounded hover:bg-secondary transition-colors">
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                  <InfoField label="Alternate Phone" value={patient.phone_alternate || '—'} />
                  <div className="col-span-2">
                    <InfoField label="Street Address" value={patient.address || '—'} />
                  </div>
                  <div className="col-span-2 grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <InfoField label="City" value={patient.city || '—'} />
                    </div>
                    <InfoField label="State" value={patient.state || '—'} />
                    <InfoField label="Zip" value={patient.zip || '—'} />
                  </div>
                </div>
              </div>

              {/* Section 3: Medical */}
              <div className="rounded-lg border border-border/50 bg-card p-5">
                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">Medical</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Height" value={patient.height || '—'} />
                  <InfoField label="Weight" value={patient.weight || '—'} />
                  <div className="col-span-2">
                    <InfoField label="Allergies" value={patient.allergies || '—'} />
                  </div>
                </div>
              </div>

              {/* Section 4: Guardian (only if data exists) */}
              {patient.authorized_representative && (
                <div className="rounded-lg border border-border/50 bg-card p-5">
                  <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">Guardian / Authorized Representative</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="Authorized Representative" value={patient.authorized_representative} />
                    <InfoField label="Representative Phone" value={patient.authorized_representative_phone || '—'} />
                  </div>
                </div>
              )}

              {/* Insurance Info */}
              <div className="rounded-lg border border-border/50 bg-card p-5">
                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">Insurance Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Insurance Type" value={patient.insurance_type || '—'} />
                  <InfoField label="Plan Details" value={patient.insurance_notes || '—'} />
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">PA Status</p>
                    <PAStatusBadge status={patient.pa_status || 'none'} expirationDate={patient.pa_expiration_date} />
                  </div>
                  <InfoField label="PA Expiration" value={patient.pa_expiration_date ? formatDateShort(patient.pa_expiration_date) : "N/A"} />
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* MEDICATIONS TAB */}
        <TabsContent value="medications" className="mt-4">
          {medsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading medications...</span>
            </div>
          ) : sortedMedications.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedMedications.map((drug) => {
                const badge = getDrugPABadge(drug);
                return (
                  <div
                    key={drug.id}
                    className={cn(
                      "rounded-xl border border-border bg-card p-4 card-shadow transition-all duration-200 hover:shadow-md",
                      !drug.is_active && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Pill className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{drug.drug_name}</p>
                          {!drug.is_active && (
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Discontinued</span>
                          )}
                        </div>
                      </div>
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", badge.className)}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {drug.dosage} · {drug.frequency || '—'}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3 mb-3">
                      <span>
                        PA expires: {drug.pa_expiration_date ? formatDateShort(drug.pa_expiration_date) : "N/A"}
                      </span>
                      <span>
                        Last filled: {drug.last_filled ? formatDateShort(drug.last_filled) : "Never"}
                      </span>
                    </div>

                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View PA Details
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No Medications on Record</p>
              <p className="text-sm text-muted-foreground mb-4">No active prescriptions for this patient yet</p>
              <Button asChild>
                <Link to={`/clinic/referrals/new?patientId=${patient.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Referral
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="font-medium text-foreground text-sm">{value}</p>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}
