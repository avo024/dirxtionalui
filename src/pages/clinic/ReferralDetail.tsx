import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockReferrals } from "@/data/mockData";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ReferralDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const referral = mockReferrals.find((r) => r.id === id);

  if (!referral) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Referral not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clinic/referrals")}>
          Back to Referrals
        </Button>
      </div>
    );
  }

  const { extracted_data: data } = referral;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clinic/referrals")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{referral.patient_name}</h1>
            <StatusBadge status={referral.status} />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {referral.drug} · Referral {referral.id} · Created {referral.created_at}
          </p>
        </div>
        {referral.status === "sent_to_pharmacy" && (
          <Button variant="outline-primary">
            <Download className="h-4 w-4 mr-2" />
            Download Final PDF
          </Button>
        )}
      </div>

      {/* Rejection alert */}
      {referral.status === "rejected" && referral.rejection_reason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Referral Rejected</AlertTitle>
          <AlertDescription>{referral.rejection_reason}</AlertDescription>
        </Alert>
      )}

      {/* Pharmacy info */}
      {referral.status === "sent_to_pharmacy" && (
        <div className="rounded-xl border border-border bg-card p-5 card-shadow">
          <h3 className="font-semibold text-foreground mb-3">Pharmacy Details</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{referral.pharmacy_name}</span></div>
            <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{referral.pharmacy_location}</span></div>
            <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{referral.pharmacy_contact}</span></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Patient Info */}
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            <h3 className="font-semibold text-foreground mb-3">Patient Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Field label="Name" value={`${data.patient.first_name} ${data.patient.last_name}`} />
              <Field label="Date of Birth" value={data.patient.dob} />
              <Field label="Gender" value={data.patient.gender} />
              <Field label="Phone" value={data.patient.phone} />
              <Field label="Email" value={data.patient.email} />
            </div>
          </div>

          {/* Clinical Info */}
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            <h3 className="font-semibold text-foreground mb-3">Clinical Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Field label="Diagnosis (ICD-10)" value={data.clinical.diagnosis_icd10} />
              <Field label="Drug Requested" value={data.clinical.drug_requested} />
              <Field label="Dosing" value={data.clinical.dosing} />
              <Field label="Quantity" value={data.clinical.quantity} />
              <Field label="Refill" value={data.clinical.is_refill ? "Yes" : "No"} />
              <Field label="Urgency" value={data.clinical.urgency} />
            </div>
          </div>

          {/* Provider Info */}
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            <h3 className="font-semibold text-foreground mb-3">Provider Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Field label="Name" value={data.provider.name} />
              <Field label="NPI" value={data.provider.npi} />
              <Field label="Address" value={data.provider.address} />
              <Field label="Phone" value={data.provider.phone} />
              <Field label="Signature Date" value={data.provider.signature_date} />
            </div>
          </div>

          {/* Insurance Info */}
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            <h3 className="font-semibold text-foreground mb-3">Insurance Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Has Insurance Card" value={data.insurance.has_insurance_card ? "Yes" : "No"} />
              <Field label="Notes" value={data.insurance.notes} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            <div className="space-y-3">
              {referral.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">Uploaded {doc.uploaded_at}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            <div className="space-y-0">
              {referral.history.map((entry, i) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-primary mt-1.5" />
                    {i < referral.history.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-6">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.status} />
                      <span className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{entry.note}</p>
                    <p className="text-xs text-muted-foreground">By: {entry.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
