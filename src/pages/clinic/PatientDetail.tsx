import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, User, Shield, Phone, Mail, Copy,
  FileText, Pill, Eye, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAStatusBadge } from "@/components/PAStatusBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mockPatients, mockReferrals } from "@/data/mockData";
import { formatDateShort, getRelativeTime } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = mockPatients.find((p) => p.id === id);

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Patient not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clinic/patients")}>
          Back to Patients
        </Button>
      </div>
    );
  }

  const fullName = `${patient.first_name} ${patient.last_name}`;
  const patientReferrals = mockReferrals.filter(
    (r) => r.patient_name === fullName && r.clinic_name === "Dallas Dermatology Clinic"
  );

  // Collect all documents from all referrals for this patient
  const allDocuments = patientReferrals.flatMap((r) =>
    r.documents.map((d) => ({ ...d, referralId: r.id, referralDrug: r.drug }))
  );

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
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

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
            <span>Age {getAge(patient.dob)}</span>
            <span className="text-border">|</span>
            <span>DOB: {formatDateShort(patient.dob)}</span>
            <span className="text-border">|</span>
            <span>{patient.phone}</span>
          </div>
        </div>
        <Button asChild>
          <Link to={`/clinic/referrals/new?patientId=${patient.id}`}>
            <Plus className="h-4 w-4 mr-2" />
            New Referral for {patient.first_name}
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Referral History</TabsTrigger>
          <TabsTrigger value="info">Patient Information</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* REFERRAL HISTORY TAB */}
        <TabsContent value="history" className="mt-4 space-y-4">
          {/* PA Status Card */}
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Prior Authorization Status</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Current Drug</p>
                <p className="text-sm font-medium text-foreground">{patient.last_drug} {patient.last_dosage}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">PA Status</p>
                <PAStatusBadge status={patient.pa_status} expirationDate={patient.pa_expiration_date} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">PA Expiration</p>
                <p className="text-sm font-medium text-foreground">
                  {patient.pa_expiration_date ? formatDateShort(patient.pa_expiration_date) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Last Referral</p>
                <p className="text-sm font-medium text-foreground">{getRelativeTime(patient.last_referral_date)}</p>
              </div>
            </div>
            {patient.pa_status === "expiring" && (
              <Alert className="mt-4 border-warning/30 bg-warning/5">
                <AlertDescription className="text-sm text-foreground">
                  ⚠️ PA expires on {formatDateShort(patient.pa_expiration_date)}. Consider creating a new referral.
                </AlertDescription>
              </Alert>
            )}
            {patient.pa_status === "expired" && (
              <Alert className="mt-4 border-destructive/30 bg-destructive/5">
                <AlertDescription className="text-sm text-foreground">
                  ❌ PA expired on {formatDateShort(patient.pa_expiration_date)}. A new referral with PA is required.
                </AlertDescription>
              </Alert>
            )}
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
                        <div className="flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">{ref.drug}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ref.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {getRelativeTime(ref.created_at)}
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

          {/* Quick Action */}
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to={`/clinic/referrals/new?patientId=${patient.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Referral for {patient.first_name}
            </Link>
          </Button>
        </TabsContent>

        {/* PATIENT INFO TAB */}
        <TabsContent value="info" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="rounded-xl border border-border bg-card p-5 card-shadow">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Basic Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Full Name" value={fullName} />
                <InfoField label="Date of Birth" value={`${formatDateShort(patient.dob)} (Age ${getAge(patient.dob)})`} />
                <InfoField label="Gender" value={patient.gender} />
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Phone</p>
                  <div className="flex items-center gap-1">
                    <p className="font-medium text-foreground text-sm">{patient.phone}</p>
                    <button onClick={() => copyToClipboard(patient.phone, "Phone")} className="p-0.5 rounded hover:bg-secondary transition-colors">
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Email</p>
                  <div className="flex items-center gap-1">
                    <p className="font-medium text-foreground text-sm">{patient.email}</p>
                    <button onClick={() => copyToClipboard(patient.email, "Email")} className="p-0.5 rounded hover:bg-secondary transition-colors">
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Insurance Info */}
            <div className="rounded-xl border border-border bg-card p-5 card-shadow">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Insurance Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Insurance Type" value={patient.insurance_type} />
                <InfoField label="Plan Details" value={patient.insurance_notes} />
                <InfoField label="PA Status" value={patient.pa_status.charAt(0).toUpperCase() + patient.pa_status.slice(1)} />
                <InfoField label="PA Expiration" value={patient.pa_expiration_date ? formatDateShort(patient.pa_expiration_date) : "N/A"} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-4">
          {allDocuments.length > 0 ? (
            <div className="space-y-4">
              {/* Group by referral */}
              {patientReferrals.map((ref) => {
                const docs = allDocuments.filter((d) => d.referralId === ref.id);
                if (docs.length === 0) return null;
                return (
                  <div key={ref.id}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      {ref.id.toUpperCase()} — {ref.drug} ({formatDateShort(ref.created_at)})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {docs.map((doc) => (
                        <div key={doc.id} className="rounded-xl border border-border bg-card p-4 card-shadow group hover:card-shadow-md transition-all duration-200">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-0.5">{doc.name}</p>
                          <p className="text-xs text-muted-foreground mb-3">Uploaded {formatDateShort(doc.uploaded_at)}</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 text-xs">
                              <Eye className="h-3.5 w-3.5 mr-1" />View
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 text-xs">
                              <Download className="h-3.5 w-3.5 mr-1" />Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No documents found for this patient</p>
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
