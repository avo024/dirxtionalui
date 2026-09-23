import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { StatusBadge } from "@/components/StatusBadge";
import { StageChip } from "@/components/StageChip";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { Icon } from "@/components/ui/icon";
import { ICONS } from "@/lib/icons";
import type { ReferralStatus } from "@/data/mockData";

import { DefinitionList } from "@/components/patterns/DefinitionList";
import { FilterToolbar } from "@/components/patterns/FilterToolbar";
import { QueueList } from "@/components/patterns/QueueList";
import { QueueRow } from "@/components/patterns/QueueRow";
import { StageHeader } from "@/components/patterns/StageHeader";
import { DocumentsSheet } from "@/components/patterns/DocumentsSheet";
import { ActionBar } from "@/components/patterns/ActionBar";
import { MessageThread } from "@/components/patterns/MessageThread";

/** All sample data below is fake — no real patients, clinics, or PHI. */

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 py-10 border-b border-border last:border-b-0">
      <div>
        <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const colorSwatches: Array<{ name: string; bg: string; fg: string }> = [
  { name: "background", bg: "bg-background", fg: "text-foreground" },
  { name: "foreground", bg: "bg-foreground", fg: "text-background" },
  { name: "primary", bg: "bg-primary", fg: "text-primary-foreground" },
  { name: "secondary", bg: "bg-secondary", fg: "text-secondary-foreground" },
  { name: "muted", bg: "bg-muted", fg: "text-muted-foreground" },
  { name: "accent", bg: "bg-accent", fg: "text-accent-foreground" },
  { name: "destructive", bg: "bg-destructive", fg: "text-destructive-foreground" },
  { name: "success", bg: "bg-success", fg: "text-success-foreground" },
  { name: "warning", bg: "bg-warning", fg: "text-warning-foreground" },
  { name: "border", bg: "bg-border", fg: "text-foreground" },
  { name: "ring", bg: "bg-ring", fg: "text-white" },
];

const statusPairSwatches: Array<{ name: string; bg: string; fg: string }> = [
  { name: "uploaded", bg: "bg-status-uploaded-bg", fg: "text-status-uploaded-fg" },
  { name: "processing", bg: "bg-status-processing-bg", fg: "text-status-processing-fg" },
  { name: "review", bg: "bg-status-review-bg", fg: "text-status-review-fg" },
  { name: "approved", bg: "bg-status-approved-bg", fg: "text-status-approved-fg" },
  { name: "sent", bg: "bg-status-sent-bg", fg: "text-status-sent-fg" },
  { name: "rejected", bg: "bg-status-rejected-bg", fg: "text-status-rejected-fg" },
];

const allStatuses: ReferralStatus[] = [
  "uploaded",
  "processing",
  "ready_for_review",
  "approved_to_send",
  "sent_to_pharmacy",
  "rejected",
  "closed",
];

const ICON_CONCEPTS = Object.keys(ICONS) as Array<keyof typeof ICONS>;

/**
 * Internal reference page rendering every Phase 1 design-system primitive
 * with fake sample data. Not linked from navigation — open directly at
 * /admin/design-system. No page in the app is migrated to these patterns yet
 * (that's Phase 3+); this page exists only to sanity-check the system.
 */
export default function DesignSystem() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("waiting-on-us");
  const [selectValue, setSelectValue] = useState("Clinic");
  const [docsOpen, setDocsOpen] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  const [clinicMsg, setClinicMsg] = useState("");
  const [handoff, setHandoff] = useState("Called Dr. Carter's office, chart notes expected Friday, don't resubmit before then.");

  return (
    <div className="max-w-[1280px] mx-auto pb-24">
      <div className="pb-6 border-b border-border">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Design system</h1>
        <p className="text-sm text-muted-foreground mt-1">
          UI v2 Phase 1 — every token, primitive, and workflow pattern in one place, with fake sample data. Internal
          reference only; no app page uses these yet.
        </p>
      </div>

      {/* ── Colors & type ───────────────────────────────────────────── */}
      <Section title="Colors & type" description="Core shadcn tokens plus the six status color pairs, and the three type families.">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {colorSwatches.map((s) => (
            <div key={s.name} className={`${s.bg} ${s.fg} rounded-lg border border-border p-3 flex flex-col gap-6`}>
              <span className="text-xs font-medium">{s.name}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statusPairSwatches.map((s) => (
            <div key={s.name} className={`${s.bg} ${s.fg} rounded-lg border border-border p-3 flex flex-col gap-6`}>
              <span className="text-xs font-medium">{s.name}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Inter (body)</p>
            <p className="text-lg" style={{ fontFamily: "var(--font-sans)" }}>
              Clinic referral queue
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Newsreader (editorial)</p>
            <p className="text-lg" style={{ fontFamily: "var(--font-editorial)" }}>
              Clinic referral queue
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">JetBrains Mono</p>
            <p className="text-lg" style={{ fontFamily: "var(--font-mono)" }}>
              REF-20394 · 9:41 AM
            </p>
          </div>
        </div>
      </Section>

      {/* ── Status & stage ──────────────────────────────────────────── */}
      <Section title="Status & stage" description="Every referral status in all three variants, admin vs. clinic labels, plus PA badges and stage chips.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs text-muted-foreground text-left">
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Clinic · text</th>
                <th className="py-2 pr-4 font-medium">Clinic · outline</th>
                <th className="py-2 pr-4 font-medium">Clinic · soft</th>
                <th className="py-2 pr-4 font-medium">Admin · text</th>
                <th className="py-2 pr-4 font-medium">Admin · outline</th>
                <th className="py-2 pr-4 font-medium">Admin · soft</th>
              </tr>
            </thead>
            <tbody>
              {allStatuses.map((status) => (
                <tr key={status} className="border-t border-border">
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{status}</td>
                  <td className="py-2.5 pr-4"><StatusBadge status={status} variant="text" context="clinic" /></td>
                  <td className="py-2.5 pr-4"><StatusBadge status={status} variant="outline" context="clinic" /></td>
                  <td className="py-2.5 pr-4"><StatusBadge status={status} variant="soft" context="clinic" /></td>
                  <td className="py-2.5 pr-4"><StatusBadge status={status} variant="text" context="admin" /></td>
                  <td className="py-2.5 pr-4"><StatusBadge status={status} variant="outline" context="admin" /></td>
                  <td className="py-2.5 pr-4"><StatusBadge status={status} variant="soft" context="admin" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">ClinicPABadge:</span>
          <ClinicPABadge status="pending" />
          <ClinicPABadge status="processing" />
          <ClinicPABadge status="submitted" />
          <ClinicPABadge status="approved" />
          <ClinicPABadge status="denied" />
          <ClinicPABadge status="denied" appealOutcome="level2" />
          <ClinicPABadge status="denied" appealOutcome="final" />
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Stone:</span>
            <StageChip label="Review" variant="text" />
            <StageChip label="Review" variant="outline" />
            <StageChip label="Review" variant="soft" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Teal:</span>
            <StageChip label="Enrollment" variant="text" tone="teal" />
            <StageChip label="Enrollment" variant="outline" tone="teal" />
            <StageChip label="Enrollment" variant="soft" tone="teal" />
          </div>
        </div>
      </Section>

      {/* ── Buttons ──────────────────────────────────────────────────── */}
      <Section title="Buttons" description="All shadcn Button variants and sizes.">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="outline-primary">Outline primary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Icon button">
            <Icon name="Send" size={16} />
          </Button>
        </div>
      </Section>

      {/* ── Form controls ───────────────────────────────────────────── */}
      <Section title="Form controls" description="Input, Textarea, Select, Checkbox, Switch, RadioGroup.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-input">Patient name</Label>
            <Input id="ds-input" placeholder="First Last" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-select">Clinic</Label>
            <Select value={selectValue} onValueChange={setSelectValue}>
              <SelectTrigger id="ds-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Clinic">Sagebrush Dermatology</SelectItem>
                <SelectItem value="Clinic2">Piney Woods Family Med</SelectItem>
                <SelectItem value="Clinic3">Rio Grande Rheumatology</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ds-textarea">Note</Label>
            <Textarea id="ds-textarea" rows={3} placeholder="Write a note…" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="ds-checkbox" />
            <Label htmlFor="ds-checkbox" className="font-normal">Notify clinic by email</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="ds-switch" />
            <Label htmlFor="ds-switch" className="font-normal">Pin documents for this stage</Label>
          </div>
          <RadioGroup defaultValue="rural" className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="rural" id="ds-radio-1" />
              <Label htmlFor="ds-radio-1" className="font-normal">Rural clinic</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="urban" id="ds-radio-2" />
              <Label htmlFor="ds-radio-2" className="font-normal">Urban clinic</Label>
            </div>
          </RadioGroup>
        </div>
      </Section>

      {/* ── DefinitionList ──────────────────────────────────────────── */}
      <Section title="DefinitionList" description="Normal density and the compact rail density, with mono/copy/confidence/flag examples.">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <DefinitionList
            title="Patient"
            icon={<Icon name="User" size={16} />}
            flagged={1}
            rows={[
              { label: "Name", value: "Amanda Foster", confidence: 0.97 },
              { label: "Date of birth", value: "04/12/1968", mono: true, confidence: 0.94 },
              { label: "Member ID", value: "TX-88213409", mono: true, copy: true, confidence: 0.61 },
              { label: "Phone", value: "(432) 555-0148", mono: true, copy: true, flag: true, confidence: 0.42 },
              { label: "Preferred pharmacy", value: undefined },
            ]}
          />
          <DefinitionList
            title="Quick facts"
            density="rail"
            icon={<Icon name="Pill" size={16} />}
            rows={[
              { label: "Drug", value: "Tremfya" },
              { label: "Clinic", value: "Sagebrush Derm" },
              { label: "Days waiting", value: "3", mono: true },
              { label: "PA status", value: "Submitted" },
            ]}
          />
        </div>
      </Section>

      {/* ── FilterToolbar ───────────────────────────────────────────── */}
      <Section title="FilterToolbar" description="Segmented filters with counts and an alert, search, two selects, and a trailing action.">
        <FilterToolbar
          filters={[
            { value: "waiting-on-us", label: "Waiting on us", count: 14, alert: 3 },
            { value: "waiting-on-others", label: "Waiting on others", count: 22 },
            { value: "all", label: "All" },
          ]}
          active={activeFilter}
          onFilter={setActiveFilter}
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search patient, drug, clinic…"
          selects={[
            { options: ["All clinics", "Sagebrush Derm", "Piney Woods Family Med"], value: "All clinics", width: "200px" },
            { options: ["This month", "Last 90 days", "All time"], value: "This month", width: "160px" },
          ]}
          trailing={<Button size="sm"><Icon name="ClipboardList" size={16} />New referral</Button>}
        />
      </Section>

      {/* ── QueueRow / QueueList ────────────────────────────────────── */}
      <Section title="Queue" description="Six sample rows: overdue, attention, normal, bridge, a two-track referral, and a waiting-on-clinic row with no assignee.">
        <QueueList>
          <QueueRow
            verb="Check CMM for decision"
            due="Due Thu 9:41 AM"
            urgency="overdue"
            patient="Amanda Foster"
            drug="Tremfya"
            clinic="Sagebrush Derm"
            stage="PA submitted"
            signal="PA submitted 3d ago · due Thu 9:41 AM"
            assignee="Mari Okafor"
            onClick={() => {}}
          />
          <QueueRow
            verb="Review clinic reply"
            urgency="attention"
            patient="Kevin O'Brien"
            drug="Enbrel"
            clinic="Piney Woods Family Med"
            stage="Rejected"
            signal="Clinic replied 2h ago"
            assignee="Mari Okafor"
            onClick={() => {}}
          />
          <QueueRow
            verb="Review extraction"
            due="Due today"
            patient="Lisa Chen"
            drug="Stelara"
            clinic="Rio Grande Rheumatology"
            stage="Review"
            signal="AI extraction completed 3h ago · 3 fields low confidence"
            assignee="Mari Okafor"
            onClick={() => {}}
          />
          <QueueRow
            verb="Review extraction"
            due="Due today"
            patient="Michael Brown"
            drug="Dupixent"
            bridge
            clinic="Sagebrush Derm"
            stage="Review"
            signal="AI extraction completed 1h ago"
            assignee="Mari Okafor"
            onClick={() => {}}
          />
          <QueueRow
            verb="Review denial, choose appeal"
            due="Due Fri 2:00 PM"
            urgency="attention"
            patient="Thomas Anderson"
            drug="Cosentyx"
            clinic="Sagebrush Derm"
            stage="PA denied"
            signal="Denial received 1d ago"
            extra={{ verb: "Send form for signature", signal: "Bridge enrollment opened 1d ago" }}
            assignee="Mari Okafor"
            onClick={() => {}}
          />
          <QueueRow
            verb="Chase signature"
            due="Due Mon 9:00 AM"
            patient="Daniel Martinez"
            drug="Dupixent"
            bridge
            clinic="Piney Woods Family Med"
            stage="Enrollment"
            stageTone="teal"
            signal="Signature request sent 2d ago"
            assignee={null}
            onClick={() => {}}
          />
        </QueueList>
      </Section>

      {/* ── StageHeader ─────────────────────────────────────────────── */}
      <Section title="StageHeader" description="Normal state with a handoff note, an interrupt badge with no handoff, and the enrollment (teal) state.">
        <div className="flex flex-col gap-4 border border-border rounded-lg overflow-hidden">
          <StageHeader
            patient="Amanda Foster"
            stage="PA submitted"
            question="Has Humana made a decision yet?"
            lastEvent="PA submitted"
            lastTime="3d ago"
            handoff={handoff}
            onEditHandoff={() => setHandoff(handoff + " (edited)")}
            docCount={4}
          />
          <StageHeader
            patient="Kevin O'Brien"
            stage="Rejected"
            question="What needs to change before this can be resubmitted?"
            lastEvent="Referral rejected"
            lastTime="2h ago"
            handoff={null}
            onEditHandoff={() => {}}
            docCount={2}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-[#B45309] px-2 py-0.5 text-[11px] font-medium">
                <AlertTriangle width={12} height={12} strokeWidth={1.75} />
                Fix delivery issue
              </span>
            }
          />
          <StageHeader
            patient="Daniel Martinez"
            stage="Enrollment"
            stageTone="teal"
            question="Waiting on the clinic to sign the bridge enrollment form."
            lastEvent="Signature request sent"
            lastTime="2d ago"
            handoff="Faxed form to clinic front desk, follow up if no signature by Monday."
            onEditHandoff={() => {}}
            docCount={3}
          />
        </div>
      </Section>

      {/* ── DocumentsSheet ──────────────────────────────────────────── */}
      <Section title="DocumentsSheet" description="Docked/pinned inline (as it renders in a split-layout stage) beside a placeholder card, plus the floating overlay version.">
        <div className="flex items-stretch gap-4 h-[360px]">
          <DocumentsSheet
            open
            pinned
            onPinnedChange={() => {}}
            files={["Referral.pdf", "Insurance card.pdf", "Chart notes.pdf"]}
            active={0}
            page={1}
            pages={3}
          />
          <div className="flex-1 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
            Workstation cards render here, beside the docked sheet
          </div>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={() => setDocsOpen(true)}>
            <Icon name="File" size={16} />
            Open floating Documents sheet
          </Button>
          <DocumentsSheet
            open={docsOpen}
            onClose={() => setDocsOpen(false)}
            files={["Referral.pdf", "Insurance card.pdf"]}
            active={0}
            page={1}
            pages={2}
          />
        </div>
      </Section>

      {/* ── ActionBar ───────────────────────────────────────────────── */}
      <Section title="ActionBar" description="Four static states: primary+secondary, request with an open count, a hand-off state with Next in queue, and an interrupt (warning) state.">
        <div className="flex flex-col gap-3 border border-border rounded-lg overflow-hidden">
          <ActionBar
            status="Extraction complete · 3 fields need review"
            request={{ openCount: 0, onClick: () => {} }}
            secondary={{ label: "Reject", onClick: () => {}, icon: <Icon name="XCircle" size={16} /> }}
            primary={{ label: "Approve", onClick: () => {}, icon: <CheckCircle2 width={16} height={16} strokeWidth={1.75} />, variant: "success" }}
          />
          <ActionBar
            status="Waiting on Humana"
            request={{ openCount: 1, onClick: () => {} }}
            secondary={{ label: "Mark PA submitted", onClick: () => {} }}
            more={[{ label: "Archive", onClick: () => {} }, "-", { label: "Open in new tab", onClick: () => {} }]}
          />
          <ActionBar
            status="Waiting on payer · due Thu 9:41 AM"
            tone="warning"
            icon={<AlertTriangle width={16} height={16} strokeWidth={1.75} />}
            next={{ onClick: () => {} }}
          />
          <ActionBar
            status="Referral was returned undeliverable"
            tone="destructive"
            icon={<AlertTriangle width={16} height={16} strokeWidth={1.75} />}
            request={{ openCount: 0, onClick: () => {} }}
            primary={{ label: "Reset for resend", onClick: () => {}, icon: <RotateCcw width={16} height={16} strokeWidth={1.75} /> }}
          />
        </div>
      </Section>

      {/* ── MessageThread ───────────────────────────────────────────── */}
      <Section title="MessageThread" description="Admin side (with a system line and a clinic attachment) and clinic side (writing to the Dirxctional team).">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MessageThread
            ours="ours"
            value={adminMsg}
            onChange={setAdminMsg}
            onSend={() => setAdminMsg("")}
            placeholder="Write a note…"
            messages={[
              { system: "Task created: “Confirm insurance ID”" },
              {
                side: "clinic",
                name: "Front Desk — Sagebrush Derm",
                role: "clinic",
                time: "9:12 AM",
                body: "Here's the updated insurance card, let us know if you need anything else.",
                attachments: [{ name: "insurance-card-back.jpg", size: "1.1 MB" }],
              },
              {
                side: "ours",
                name: "Mari Okafor",
                role: "Dirxctional",
                time: "9:41 AM",
                body: "Got it, thank you — submitting the PA now.",
              },
            ]}
          />
          <MessageThread
            ours="clinic"
            value={clinicMsg}
            onChange={setClinicMsg}
            onSend={() => setClinicMsg("")}
            placeholder="Write a note to your Dirxctional team…"
            hint="Visible to the Dirxctional team"
            messages={[
              {
                side: "ours",
                name: "Mari Okafor",
                role: "Dirxctional",
                time: "9:41 AM",
                body: "Submitting the PA now — I'll update you as soon as Humana responds.",
              },
              { mine: true, name: "Front Desk", role: "clinic", time: "9:50 AM", body: "Thank you!" },
            ]}
          />
        </div>
      </Section>

      {/* ── Icon vocabulary ─────────────────────────────────────────── */}
      <Section title="Icon vocabulary" description="All 33 concepts from src/lib/icons.ts, and the three size steps.">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {ICON_CONCEPTS.map((concept) => {
            const LucideIcon = ICONS[concept];
            return (
              <div key={concept} className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-center">
                <LucideIcon width={20} height={20} strokeWidth={1.75} className="text-foreground" aria-hidden="true" />
                <span className="text-xs font-medium text-foreground">{concept}</span>
                <span className="text-[10px] text-muted-foreground">{LucideIcon.displayName}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">14</span>
            <Icon name="FileText" size={14} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">16</span>
            <Icon name="FileText" size={16} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">20</span>
            <Icon name="FileText" size={20} />
          </div>
        </div>
      </Section>
    </div>
  );
}
