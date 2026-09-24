import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, AlertTriangle, ExternalLink, RefreshCw, Pencil } from "lucide-react";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { formatDateShort, todayLocalISO } from "@/lib/dateUtils";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

import { StageHeader } from "@/components/patterns/StageHeader";
import { DocumentsSheet } from "@/components/patterns/DocumentsSheet";
import { ActionBar } from "@/components/patterns/ActionBar";
import { MessageThread } from "@/components/patterns/MessageThread";
import { DefinitionList } from "@/components/patterns/DefinitionList";
import { underlineTabsListClass, underlineTabsTriggerClass } from "@/components/patterns/underlineTabs";
import { StageChip } from "@/components/StageChip";
import { StatusBadge } from "@/components/StatusBadge";
import { PAStatusBadge } from "@/components/PAStatusBadge";

import { ConfirmModal } from "@/components/ConfirmModal";
import { DeliveryConfirmModal } from "@/components/DeliveryConfirmModal";
import { AdminRejectModal, FLAGGABLE_FIELDS, type RejectPayload } from "@/components/AdminRejectModal";
import { DocumentViewer } from "@/components/DocumentViewer";
import { PAAppealCard } from "@/components/PAAppealCard";
import { AppealPacketCard, type AppealPacketActions } from "@/components/AppealPacketCard";
import { EnrollmentCard, type EnrollmentActions } from "@/components/EnrollmentCard";
import { ReferralTasksCard } from "@/components/ReferralTasksCard";
import { EligibilityPanel } from "@/components/EligibilityPanel";
import { ExtractionEditor } from "@/components/admin/ExtractionEditor";
import { getDisplayAuthor } from "@/lib/noteAuthor";
import { cn } from "@/lib/utils";

import { resolveNextAction, stageLabelForQueue, type NextAction } from "@/lib/nextAction";
import { toNextActionInput } from "@/lib/queueRows";

// ── small helpers ──────────────────────────────────────────────────

function mapReferral(data: any) {
  return { ...data, drug: data.drug_requested, blocked: data.preferred_pharmacy_blocked };
}

/** "Thu 9:41 AM" for a due date, matching nextAction's own formatting. */
function formatWhen(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

function relTime(d: string | null | undefined): string {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** Chip tone/label for the review-stage Insurance card's Eligibility row —
 *  mirrors EligibilityPanel's own switch so the two stay in sync visually. */
function eligibilityChip(status: string | null | undefined, mismatchCount: number): { tone: "success" | "warning" | "destructive" | "muted"; label: string } {
  switch (status) {
    case "verified":
      return { tone: "success", label: "Verified vs payer" };
    case "mismatch":
      return { tone: "warning", label: `Needs review — ${mismatchCount} mismatch${mismatchCount === 1 ? "" : "es"}` };
    case "inactive":
      return { tone: "destructive", label: "Coverage inactive" };
    case "payer_unmatched":
    case "error":
      return { tone: "muted", label: "Not verified" };
    default:
      return { tone: "muted", label: "Not checked yet" };
  }
}
const ELIGIBILITY_CHIP_CLASS: Record<string, string> = {
  success: "bg-success/13 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
  muted: "bg-muted-foreground/12 text-muted-foreground",
};

/**
 * The header's "Last:" line prefers a real, named event over the generic
 * "Updated" timestamp — stage-priority order (most-advanced first), not
 * simply whichever timestamp happens to be newest (phase 4b finding #6).
 */
function lastEventFor(referral: any): { label: string; time: string } | null {
  if (referral.status === "rejected") {
    return { label: "Rejected", time: relTime(referral.updated_at) };
  }
  if (referral.status === "sent_to_pharmacy") {
    const label = referral.pharmacy_name ? `Packet faxed to ${referral.pharmacy_name}` : "Packet faxed to pharmacy";
    return { label, time: relTime(referral.updated_at) };
  }
  if (referral.appeal_started_at) {
    return { label: "Appeal packet faxed", time: relTime(referral.appeal_started_at) };
  }
  if (referral.pa_submitted_at) {
    return { label: "PA filed on CoverMyMeds", time: relTime(referral.pa_submitted_at) };
  }
  if (referral.created_at) {
    return { label: "Referral received", time: relTime(referral.created_at) };
  }
  if (referral.updated_at) {
    return { label: "Updated", time: relTime(referral.updated_at) };
  }
  return null;
}

/** Measures an element's rendered height, tracking resizes (used to pin the
 *  docked documents sheet to `calc(100vh - header height)`). */
function useElementHeight<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (typeof h === "number") setHeight(h);
    });
    observer.observe(el);
    setHeight(el.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, [ref.current]); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, height];
}

/** ActionBar's rendered height (sticky bottom-0) — subtracted from the docked
 *  documents sheet's height so it doesn't run under the fixed action row. */
const ACTION_BAR_H = 64;

// ── page ───────────────────────────────────────────────────────────

export default function AdminReferralWorkstation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const notesDeepLink = searchParams.get("tab") === "notes";
  const { data: adminProfile } = useAdminProfile();

  const [referral, setReferral] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) return;
    const [refData, docsRes, notesRes, tasksRes] = await Promise.all([
      adminApi.getReferral(id),
      adminApi.getReferralDocuments(id).catch(() => ({ items: [] })),
      adminApi.getReferralNotes(id).catch(() => ({ items: [] })),
      adminApi.getTasks(id).catch(() => ({ items: [] })),
    ]);
    setReferral(mapReferral(refData));
    setDocuments(docsRes.items || docsRes || []);
    setNotes(notesRes.items || []);
    setTasks(tasksRes.items || []);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    reload()
      .catch((err: any) => toast({ title: "Error", description: err.message || "Failed to load referral", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [id, reload]);

  // Deep-linked from a note bell — clear the unread flag.
  useEffect(() => {
    if (notesDeepLink && id) localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString());
  }, [id, notesDeepLink]);

  const next: NextAction | null = useMemo(() => {
    if (!referral) return null;
    return resolveNextAction(toNextActionInput(referral));
  }, [referral]);

  // Whether the enrollment track is what's actually leading this row (the
  // resolver's "+1" mechanic swapped verb/primary to the track's) — bridge
  // referrals with no PA work land here. In that case the stage tab IS the
  // Enrollment tab; there is no separate second tab (Alex, 2026-09-23).
  const isEnrollmentLed = !!(next?.track && next.verb === next.track.verb);

  // ── Tab state (controlled — the header + ActionBar react to which tab is
  // active, since the enrollment tab drives its own header/action bar) ───
  const [activeTab, setActiveTab] = useState<string>(notesDeepLink ? "notes" : "stage");
  const deepLinkAppliedForId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!id || !next) return;
    if (deepLinkAppliedForId.current === id) return; // applied once per referral view
    deepLinkAppliedForId.current = id;
    if (notesDeepLink) setActiveTab("notes");
    else if (searchParams.get("tab") === "enrollment") setActiveTab(isEnrollmentLed ? "stage" : "enrollment");
    else setActiveTab("stage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, next, notesDeepLink, isEnrollmentLed]);

  // ── Documents sheet ──────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | undefined>(undefined);
  const stageKey = next?.stage ?? "processing";
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem(`ws.docs.pinned.${stageKey}`);
      setPinned(v === "true");
    } catch {
      setPinned(false);
    }
  }, [stageKey]);
  const setPinnedPersist = (v: boolean) => {
    setPinned(v);
    try {
      localStorage.setItem(`ws.docs.pinned.${stageKey}`, String(v));
    } catch {
      // localStorage unavailable — pin just won't persist across reloads
    }
  };
  const isSplit = next?.layout === "split";
  const isWideEnough = useIsWideViewport(1200);
  const showDocked = isSplit && isWideEnough;

  // Docked documents panel width (split stages only) — a percentage of the
  // split's width, resizable via the shadcn/react-resizable-panels handle
  // and remembered across sessions (no PHI, just a layout preference).
  const [docsPanelSize, setDocsPanelSize] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("ws.docs.width");
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) && n >= 30 && n <= 65 ? n : 45;
    } catch {
      return 45;
    }
  });
  const handleDocsLayout = useCallback((sizes: number[]) => {
    const size = sizes[0];
    if (typeof size !== "number") return;
    setDocsPanelSize(size);
    try {
      localStorage.setItem("ws.docs.width", String(size));
    } catch {
      // localStorage unavailable — width just won't persist across reloads
    }
  }, []);

  // Header block height (StageHeader + interrupt banner, if any) — the docked
  // documents sheet is sticky below it at calc(100vh - headerH), so the PDF
  // area gets a real, non-zero height instead of collapsing inside the
  // flex chain (phase 4b finding #1).
  const [headerRef, headerH] = useElementHeight<HTMLDivElement>();

  // Enrollment track summary (program name), for the collapsed section's
  // one-line header ("Enrollment · <program> · <state>") — fetched lazily,
  // only while an enrollment track is actually live for this referral.
  const [enrollmentSummary, setEnrollmentSummary] = useState<{ programName?: string; state?: string } | null>(null);

  // Default document per stage — best-effort match by doc_type/filename.
  useEffect(() => {
    if (!referral || documents.length === 0) {
      setActiveDocId(undefined);
      return;
    }
    const byType = (pred: (d: any) => boolean) => documents.find(pred);
    let picked: any = null;
    const stage = next?.stage;
    if (stage === "pa_denied") {
      picked =
        byType((d) => /denial|pa_letter/i.test(d.doc_type || "")) ||
        [...documents].filter((d) => /fax/i.test(d.doc_type || "")).sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0];
    } else if (stage === "pa_approved" || stage === "appeal_won") {
      picked = byType((d) => /pa_letter|approval/i.test(d.doc_type || ""));
    } else if (stage === "ready_to_send" || stage === "sent") {
      picked = byType((d) => /generated_referral_pdf/i.test(d.doc_type || ""));
    } else {
      picked = byType((d) => /referral|prescription/i.test(d.doc_type || ""));
    }
    setActiveDocId((picked || documents[0])?.id);
  }, [referral, documents, next?.stage]);

  useEffect(() => {
    // Split stages: sheet is already open (and pinned by default) per flow-script §8.
    // When a stage flips to single-column (e.g. after "Filed on CoverMyMeds") the
    // docked pane must NOT reappear as a floating sheet — close it (Alex, 2026-09-24).
    setSheetOpen(isSplit);
  }, [isSplit, stageKey]);

  useEffect(() => {
    if (!id || !next?.track) {
      setEnrollmentSummary(null);
      return;
    }
    adminApi
      .getEnrollment(id)
      .then((res) => {
        const program = res.programs?.find((p) => p.id === res.draft?.program_id);
        setEnrollmentSummary({
          programName: program?.program_name,
          state: referral?.extracted_data?.patient?.state,
        });
      })
      .catch(() => setEnrollmentSummary(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, next?.track?.stage]);

  // ── Handoff note ─────────────────────────────────────────────────
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffDraft, setHandoffDraft] = useState("");
  const [savingHandoff, setSavingHandoff] = useState(false);
  const openHandoffEditor = () => {
    setHandoffDraft(referral?.admin_handoff_note || "");
    setHandoffOpen(true);
  };
  const saveHandoff = async () => {
    if (!id) return;
    setSavingHandoff(true);
    try {
      await adminApi.setHandoffNote(id, handoffDraft.trim() || null);
      setHandoffOpen(false);
      await reload();
    } catch (e: any) {
      toast({ title: "Couldn't save handoff note", description: e.message, variant: "destructive" });
    } finally {
      setSavingHandoff(false);
    }
  };

  // ── Request from clinic ──────────────────────────────────────────
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestDraft, setRequestDraft] = useState("");
  const [requestSending, setRequestSending] = useState(false);
  const openTaskCount = tasks.filter((t) => t.status === "open").length;
  const sendRequest = async () => {
    if (!id || !requestDraft.trim()) return;
    setRequestSending(true);
    try {
      const actor = (adminProfile?.first_name || "").trim() || "Dirxctional team";
      await adminApi.createTask(id, { instructions: requestDraft.trim(), created_by: actor });
      toast({ title: "Task sent to the clinic", description: "They've been emailed — replies land here." });
      setRequestDraft("");
      setRequestOpen(false);
      await reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRequestSending(false);
    }
  };

  // ── Dialogs: confirm actions shared with the legacy page ─────────
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reExtracting, setReExtracting] = useState(false);
  const [insuranceRechecking, setInsuranceRechecking] = useState(false);
  const [paLetterInfo, setPaLetterInfo] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    adminApi.getPALetterInfo(id).then(setPaLetterInfo).catch(() => setPaLetterInfo(null));
  }, [id, referral?.pa_status]);

  // ── PA dialogs ────────────────────────────────────────────────────
  const [filedOpen, setFiledOpen] = useState(false);
  const [filedDate, setFiledDate] = useState(todayLocalISO());
  const [filedCmmKey, setFiledCmmKey] = useState("");
  const [filedNotes, setFiledNotes] = useState("");
  const [filing, setFiling] = useState(false);

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionOutcome, setDecisionOutcome] = useState<"approved" | "denied">("approved");
  const [decisionPaNumber, setDecisionPaNumber] = useState("");
  const [decisionStart, setDecisionStart] = useState(todayLocalISO());
  const [decisionExpiration, setDecisionExpiration] = useState("");
  const [decisionDenialReason, setDecisionDenialReason] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decisionFile, setDecisionFile] = useState<File | null>(null);
  const [recordingDecision, setRecordingDecision] = useState(false);

  const [nextInQueue, setNextInQueue] = useState<string | null>(null);

  const computeNextInQueue = useCallback(async () => {
    if (!id) return null;
    try {
      const res = await adminApi.getReferrals({ month: "all", archived: false });
      const rows: any[] = res.items || res || [];
      const candidates = rows
        .filter((r) => r.id !== id)
        .map((r) => ({ row: r, next: resolveNextAction(toNextActionInput(r)) }))
        .filter((c) => c.next.tab === "us");
      candidates.sort((a, b) => {
        if (!!a.next.overdue !== !!b.next.overdue) return a.next.overdue ? -1 : 1;
        const aDue = a.next.dueAt?.getTime() ?? Infinity;
        const bDue = b.next.dueAt?.getTime() ?? Infinity;
        if (aDue !== bDue) return aDue - bDue;
        return new Date(a.row.created_at).getTime() - new Date(b.row.created_at).getTime();
      });
      return candidates[0]?.row.id ?? null;
    } catch {
      return null;
    }
  }, [id]);

  const handOff = async (message: string) => {
    const nextId = await computeNextInQueue();
    setNextInQueue(nextId);
    toast({ title: "Moved to Waiting on others", description: message });
    await reload();
  };

  // ── Action handlers ───────────────────────────────────────────────
  const handleApprove = async () => {
    if (!id) return;
    try {
      await adminApi.makeDecision(id, "approve");
      toast({ title: "Referral approved", description: `${referral.patient_name}'s referral has been approved.` });
      setApproveOpen(false);
      await reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleReject = async (payload: RejectPayload) => {
    if (!id) return;
    setRejecting(true);
    try {
      await adminApi.makeDecision(id, "reject", payload.reason, {
        missing_documents: payload.missing_documents,
        flagged_fields: payload.flagged_fields,
      });
      toast({ title: "Referral rejected", description: "The clinic has been notified with the recovery checklist." });
      setRejectOpen(false);
      navigate("/admin/referrals");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRejecting(false);
    }
  };

  const handleReExtract = async () => {
    if (!id) return;
    setReExtracting(true);
    try {
      await adminApi.processReferral(id);
      toast({ title: "Re-extraction started" });
      setTimeout(() => reload(), 3000);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setReExtracting(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await adminApi.archiveReferral(id);
      toast({ title: "Referral archived" });
      navigate("/admin/referrals");
    } catch (e: any) {
      toast({ title: "Couldn't archive", description: e.message, variant: "destructive" });
    }
  };

  const handlePreviewPDF = async () => {
    if (!id) return;
    try {
      const blob = await adminApi.getReferralPDF(id, true);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const submitFiledOnCmm = async () => {
    if (!id) return;
    setFiling(true);
    try {
      // CMM key / notes are structured on pa_data by the backend branch
      // (pa/submit accepts ref_number + notes since design/system-v2-backend).
      await adminApi.submitPA(id, filedDate, {
        ref_number: filedCmmKey.trim() || undefined,
        notes: filedNotes.trim() || undefined,
      });
      setFiledOpen(false);
      setFiledCmmKey("");
      setFiledNotes("");
      const due = new Date(Date.now() + 72 * 3600_000);
      await handOff(`Clock started · check by ${formatWhen(due)}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setFiling(false);
    }
  };

  const submitDecision = async () => {
    if (!id) return;
    setRecordingDecision(true);
    try {
      if (decisionOutcome === "approved") {
        if (!decisionPaNumber.trim() || !decisionExpiration) {
          toast({ title: "Missing information", description: "PA number and expiration date are required.", variant: "destructive" });
          setRecordingDecision(false);
          return;
        }
        await adminApi.recordPADecision(id, {
          decision: "approved",
          decision_date: decisionStart,
          expiration_date: decisionExpiration,
          pa_number: decisionPaNumber,
          approval_duration: "",
        });
        if (decisionFile) {
          await adminApi.uploadPALetter(id, decisionFile).catch((e: any) =>
            toast({ title: "Decision recorded — letter upload failed", description: e.message, variant: "destructive" }),
          );
        }
        toast({ title: "PA approved", description: "Recorded — verify and approve to send." });
      } else {
        if (!decisionDenialReason.trim()) {
          toast({ title: "Reason required", description: "Please provide a denial reason.", variant: "destructive" });
          setRecordingDecision(false);
          return;
        }
        await adminApi.recordPADecision(id, {
          decision: "denied",
          decision_date: decisionStart,
          denial_reason: decisionDenialReason,
        });
        toast({ title: "PA denied", description: "Denial recorded." });
      }
      if (decisionNotes.trim()) {
        await adminApi.addReferralNote(id, `PA decision note: ${decisionNotes.trim()}`).catch(() => {});
      }
      setDecisionOpen(false);
      await reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRecordingDecision(false);
    }
  };

  const letterInputRef = useRef<HTMLInputElement>(null);
  const uploadLetter = async (file: File) => {
    if (!id) return;
    try {
      await adminApi.uploadPALetter(id, file);
      toast({ title: "Letter uploaded" });
      const info = await adminApi.getPALetterInfo(id);
      setPaLetterInfo(info);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };
  const deleteLetter = async () => {
    if (!id) return;
    if (!window.confirm("Delete the PA letter on file?")) return;
    try {
      await adminApi.deletePALetter(id);
      toast({ title: "Letter deleted" });
      const info = await adminApi.getPALetterInfo(id);
      setPaLetterInfo(info);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const enrollmentRef = useRef<HTMLDivElement>(null);
  const appealPacketRef = useRef<HTMLDivElement>(null);
  const appealOutcomesRef = useRef<HTMLDivElement>(null);
  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Imperative handles for cards whose stage actions now live only in the
  // ActionBar (flow-script §7/§9) — AppealPacketCard / EnrollmentCard render
  // their builders as before but no longer their own bottom buttons.
  const appealActionsRef = useRef<AppealPacketActions>(null);
  const enrollmentActionsRef = useRef<EnrollmentActions>(null);
  // The refs above mutate without triggering a re-render; the cards call
  // this after anything their canFax/canSend depends on changes, so the
  // ActionBar's `disabled` state (read from the ref at render time) stays live.
  const [, bumpActionTick] = useReducer((n: number) => n + 1, 0);

  // ── Record appeal outcome (appeal_sent primary) — replaces PAAppealCard's
  // own outcome buttons at this stage; same endpoint/toasts as the card had.
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [outcomeChoice, setOutcomeChoice] = useState<"won" | "level2" | "final">("won");
  const [recordingOutcome, setRecordingOutcome] = useState(false);
  const submitOutcome = async () => {
    if (!id) return;
    setRecordingOutcome(true);
    try {
      await adminApi.recordAppealOutcome(id, outcomeChoice);
      if (outcomeChoice === "won") {
        toast({ title: "Appeal won 🎉", description: "PA is approved. Record the new approval number/letter on the PA card, then Approve → Send as normal." });
      } else if (outcomeChoice === "level2") {
        toast({ title: "Handed off to Level 2", description: "The clinic has been emailed — the insurer works with them directly from here." });
      } else {
        toast({ title: "Recorded as final", description: "The clinic has been emailed that this decision is final (bridge/cash options)." });
      }
      setOutcomeDialogOpen(false);
      await reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRecordingOutcome(false);
    }
  };

  // ── Notes composer ────────────────────────────────────────────────
  const [noteDraft, setNoteDraft] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const sendNote = async () => {
    if (!id || !noteDraft.trim()) return;
    setSendingNote(true);
    try {
      await adminApi.addReferralNote(id, noteDraft.trim());
      setNoteDraft("");
      await reload();
      localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString());
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to add note", variant: "destructive" });
    } finally {
      setSendingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading referral...</p>
        </div>
      </div>
    );
  }

  if (!referral || !next) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Referral not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/referrals")}>Back</Button>
      </div>
    );
  }

  const data = referral.extracted_data || {};
  const conf = data?.meta?.confidence || data?.confidence || {};
  const patient = data.patient || {};
  const insurance = data.insurance || {};
  const clinical = data.clinical || {};
  const provider = data.provider || {};

  const last = lastEventFor(referral);
  const stageLabel = isEnrollmentLed ? "Enrollment" : stageLabelForQueue(next.stage);
  const stageTone = isEnrollmentLed ? ("teal" as const) : undefined;

  // The enrollment tab appears whenever a track is live, or on the two
  // stages that always offered an enrollment starting point today (closed,
  // appeal_final) even before any draft exists (flow-script §3/§4). When
  // the track already leads the row (isEnrollmentLed), it takes over the
  // stage tab itself instead of getting a second tab (Alex, 2026-09-23).
  // pa_denied offers the bridge fork, so the Enrollment tab must exist there even before a draft
  const showEnrollmentSection = !!next.track || next.stage === "closed" || next.stage === "appeal_final" || next.stage === "pa_denied";
  const showSeparateEnrollmentTab = showEnrollmentSection && !isEnrollmentLed;
  // True whenever the page should act as the enrollment track's stage —
  // either the dedicated tab is open, or the track already leads the row.
  const enrollmentActionsActive = activeTab === "enrollment" || isEnrollmentLed;
  const headerStage = enrollmentActionsActive ? "Enrollment" : stageLabel;
  const headerStageTone = enrollmentActionsActive ? ("teal" as const) : stageTone;
  const headerQuestion = enrollmentActionsActive && next.track ? next.track.question : next.question;

  // ── Interrupt banner ──────────────────────────────────────────────
  let interruptExplain = "";
  if (next.interrupt) {
    switch (next.interrupt.key) {
      case "delivery_issue":
        interruptExplain = referral.delivery_issue_at
          ? `Reported ${relTime(referral.delivery_issue_at)} — the clinic says the pharmacy never received it.`
          : "The clinic reports a delivery issue.";
        break;
      case "insurance_expired":
        interruptExplain = "Insurance on file has expired.";
        break;
      case "inbound_fax":
        interruptExplain = `${referral.unread_inbound_fax_count ?? 1} unread fax(es) linked to this referral.`;
        break;
      case "clinic_replied":
        interruptExplain = referral.latest_task_reply_at
          ? `Clinic replied ${relTime(referral.latest_task_reply_at)}.`
          : "The clinic replied to a task.";
        break;
      case "extraction_stuck":
        interruptExplain = "Processing for over 15 minutes.";
        break;
    }
  }

  // ── ActionBar status text ─────────────────────────────────────────
  const overdue = !!next.overdue;
  const dueStr = next.dueAt ? formatWhen(next.dueAt) : null;
  let statusText: string;
  let tone: "success" | "warning" | "destructive" | undefined;
  if (enrollmentActionsActive && next.track) {
    // While the Enrollment tab is active (or it already leads the row), the
    // status line describes the TRACK's clock, not the referral stage's.
    const t = next.track;
    const tDueStr = t.dueAt ? formatWhen(t.dueAt) : null;
    const tOverdue = !!(t.dueAt && t.dueAt.getTime() < Date.now());
    statusText = t.waitingOn === "us"
      ? `Waiting on us · ${t.verb ?? ""}`
      : t.waitingOn
        ? `Waiting on ${t.waitingOn}${tDueStr ? ` · due ${tDueStr}` : ""}…`
        : "Nothing to do.";
    tone = tOverdue ? "destructive" : undefined;
  } else {
    if (next.interrupt) {
      statusText = `${next.interrupt.verb} — then ${next.verb ?? "continue"}`;
    } else if (next.waitingOn === "us") {
      statusText = `Waiting on us · ${next.verb ?? ""}`;
    } else if (next.waitingOn) {
      const who = { payer: "payer", clinic: "clinic", manufacturer: "manufacturer", pharmacy: "pharmacy", system: "system" }[next.waitingOn] ?? next.waitingOn;
      statusText = `Waiting on ${who}${dueStr ? ` · due ${dueStr}` : ""}`;
    } else {
      statusText = next.stage === "sent" ? "Delivered. Monitoring." : "Nothing to do.";
    }
    tone = overdue
      ? "destructive"
      : next.interrupt
        ? "warning"
        : next.stage === "sent"
          ? "success"
          : undefined;
  }

  // ── More menu (shared by header + action bar) ────────────────────
  const moreItems: Array<{ label: string; onClick?: () => void } | "-"> = [];
  for (const item of next.more) {
    if (item === "Archive") moreItems.push({ label: "Archive", onClick: () => setArchiveOpen(true) });
    else if (item === "Re-extract") moreItems.push({ label: "Re-extract", onClick: handleReExtract });
    else if (item === "Open CoverMyMeds") moreItems.push({ label: "Open CoverMyMeds", onClick: () => window.open("https://www.covermymeds.com", "_blank") });
    else if (item === "Reject") moreItems.push({ label: "Reject", onClick: () => setRejectOpen(true) });
    else if (item === "Replace letter") moreItems.push({ label: "Replace letter", onClick: () => letterInputRef.current?.click() });
    else if (item === "Delete letter") moreItems.push({ label: "Delete letter", onClick: deleteLetter });
    else if (item === "Resend packet") moreItems.push({ label: "Resend packet", onClick: () => appealActionsRef.current?.faxPacket() });
    else if (item === "Preview PDF") moreItems.push({ label: "Preview PDF", onClick: handlePreviewPDF });
    else if (item === "Return to review") moreItems.push({ label: "Return to review", onClick: () => setReturnOpen(true) });
  }
  // The appeal packet builder's own actions moved out of the card
  // (AppealPacketCard `hideActions`) — its secondary actions live in More
  // now instead of duplicating a button inside the card (flow-script §7/§9).
  if (next.stage === "appeal_build") {
    moreItems.push(
      { label: "Preview letter", onClick: () => appealActionsRef.current?.previewLetter() },
      { label: "I submitted it another way", onClick: () => appealActionsRef.current?.markSubmitted() },
    );
  }
  // ── Primary / secondary handlers ──────────────────────────────────
  function actionFor(label: string | null): (() => void) | undefined {
    if (!label) return undefined;
    switch (label) {
      case "Approve":
        return () => setApproveOpen(true);
      case "Submit PA":
      case "File PA on CoverMyMeds":
        return () => setFiledOpen(true);
      case "Reject":
        return () => setRejectOpen(true);
      case "Filed on CoverMyMeds":
        return () => setFiledOpen(true);
      case "Record decision":
        return () => setDecisionOpen(true);
      case "Upload letter (then View letter)":
      case "Upload letter":
        return () => letterInputRef.current?.click();
      case "View letter":
        return () => activeDocId && setSheetOpen(true);
      case "Start appeal":
        // pa_denied renders no PAAppealCard (flow-script §3), so call the
        // endpoint directly; the resolver flips the header to appeal_build.
        return async () => {
          try { await adminApi.startAppeal(id!); toast({ title: "Appeal started", description: "Build and fax the appeal packet." }); await reload(); }
          catch (e: any) { toast({ title: "Could not start the appeal", description: e.message, variant: "destructive" }); }
        };
      case "Start bridge enrollment":
        // Open the Enrollment tab (mounts the card) and start on the next tick once the ref exists.
        return () => {
          setActiveTab(isEnrollmentLed ? "stage" : "enrollment");
          setTimeout(() => enrollmentActionsRef.current?.start(), 50);
        };
      case "Fax packet":
        return () => appealActionsRef.current?.faxPacket();
      case "Preview":
        return () => appealActionsRef.current?.previewPacket();
      case "Record outcome (won / level 2 / final)":
        return () => { setOutcomeChoice("won"); setOutcomeDialogOpen(true); };
      case "Send for signature":
        return () => enrollmentActionsRef.current?.sendForSignatures();
      case "Fax enrollment":
        return () => enrollmentActionsRef.current?.faxEnrollment();
      case "Upload adjusted copy":
        return () => {
          // The card now lives inside the Enrollment tab — switch to it
          // (or to the stage tab when the track already leads it) before
          // scrolling, since the ref is only mounted while that tab shows.
          setActiveTab(isEnrollmentLed ? "stage" : "enrollment");
          requestAnimationFrame(() => scrollTo(enrollmentRef));
        };
      case "Deliver":
        return () => setDeliverOpen(true);
      case "Return to review":
        return () => setReturnOpen(true);
      case "Reset for resend":
        return () => setResendOpen(true);
      case "Re-extract":
        return handleReExtract;
      case "Mark handled":
        return undefined; // no endpoint today — disabled below
      default:
        return undefined;
    }
  }

  // While the Enrollment tab is active (or leads the row), the ActionBar's
  // primary/secondary come from the TRACK, not the referral stage — the bar
  // always acts on whatever it's currently showing (Alex, 2026-09-23).
  const primaryLabelRaw = enrollmentActionsActive ? (next.track?.primary ?? null) : next.primary;
  const primaryLabel = primaryLabelRaw === "Submit PA" ? "File PA on CoverMyMeds" : primaryLabelRaw;
  // "Upload adjusted copy" is a document tool that lives inside the enrollment
  // card (next to "Preview the filled form"); showing it in the bar too was a
  // duplicate (Alex, 2026-09-23 click-through).
  const rawSecondary = enrollmentActionsActive ? (next.track?.secondary ?? null) : next.secondary;
  const secondaryLabel = rawSecondary === "Upload adjusted copy" ? null : rawSecondary;

  // canFax/canSend live on the cards' imperative handles (flow-script §7/§9
  // — the ActionBar drives the action, but the card still owns the
  // validation that decides whether it's allowed to run right now).
  function gatingFor(label: string | null): { disabled?: boolean; title?: string } {
    switch (label) {
      case "Fax packet":
        return { disabled: !appealActionsRef.current?.canFax, title: appealActionsRef.current?.faxBlockedReason };
      case "Send for signature":
      case "Fax enrollment":
        return { disabled: !enrollmentActionsRef.current?.canSend, title: enrollmentActionsRef.current?.blockedReason };
      case "Record outcome":
        // enr_sent's track primary — flow-script §14 #5: no manufacturer
        // outcome endpoint exists yet. Shown so Mari knows the step exists,
        // disabled so nothing pretends to record it.
        return { disabled: true, title: "Not wired up yet — no manufacturer-outcome endpoint (flow-script §14 #5)." };
      default:
        return {};
    }
  }

  const primarySpec = primaryLabelRaw
    ? {
        label: primaryLabel ?? primaryLabelRaw,
        onClick: actionFor(primaryLabelRaw),
        disabled: primaryLabelRaw === "Mark handled" || gatingFor(primaryLabelRaw).disabled, // Mark handled: no endpoint yet (enrollment outcomes)
        title: gatingFor(primaryLabelRaw).title,
      }
    : null;
  const secondarySpec = secondaryLabel
    ? { label: secondaryLabel, onClick: actionFor(secondaryLabel), ...gatingFor(secondaryLabel) }
    : null;

  const nextInQueueSpec = nextInQueue
    ? { label: "Next in Waiting on us", onClick: () => navigate(`/admin/referrals/${nextInQueue}`) }
    : null;

  // ── stage cards ────────────────────────────────────────────────────

  /** Same save path as ExtractionEditor's per-section save: deep-merge the
   *  changed field into a copy of the referral's current extracted_data,
   *  PUT the whole object, then reload. Confidences are left untouched —
   *  ExtractionEditor doesn't touch them on save either. */
  const saveExtractedField = async (section: string, field: string, value: string) => {
    if (!id) return;
    const currentData = referral?.extracted_data || {};
    const merged = {
      ...currentData,
      [section]: {
        ...currentData[section],
        [field]: value,
      },
    };
    await adminApi.updateExtractedData(id, merged);
    await reload();
  };

  type FieldOpts = {
    mono?: boolean;
    copy?: boolean;
    confPath?: string;
    /** [section, field, inputType] — wires the row for inline editing via
     *  the review-stage cards' shared save path. */
    editField?: [string, string, ("text" | "textarea" | "date")?];
    /** Raw editable value, when it differs from the formatted display value
     *  (e.g. a raw ISO dob vs a formatted display date). Defaults to value. */
    editValue?: any;
  };

  function fieldRows(fields: Array<[string, any, FieldOpts?]>) {
    return fields.map(([label, value, opts]) => {
      const row: {
        label: string;
        value: any;
        mono?: boolean;
        copy?: boolean;
        confidence?: number;
        edit?: { value: string; onSave: (v: string) => Promise<void>; type?: "text" | "textarea" | "date" };
      } = {
        label,
        value: value ?? undefined,
        mono: opts?.mono,
        copy: opts?.copy,
        confidence: opts?.confPath ? conf[opts.confPath] : undefined,
      };
      if (opts?.editField) {
        const [section, field, type] = opts.editField;
        const raw = opts.editValue !== undefined ? opts.editValue : value;
        row.edit = {
          value: raw === undefined || raw === null ? "" : String(raw),
          onSave: (v: string) => saveExtractedField(section, field, v),
          type,
        };
      }
      return row;
    });
  }

  /** Drops rows with no value — used on the Delivery summary card so a row
   *  like "Delivery issue" only appears when there's actually one to show
   *  (finding #6), instead of DefinitionList's usual "—" placeholder. */
  function definedRows<T extends { value?: any }>(rows: T[]): T[] {
    return rows.filter((r) => r.value !== undefined && r.value !== null && r.value !== "");
  }

  function renderStageCards() {
    const cards: JSX.Element[] = [];
    const key = next.stage;

    const patientCard = (
      <DefinitionList
        key="patient"
        title="Patient"
        rows={fieldRows([
          ["First name", patient.first_name, { confPath: "patient.first_name", editField: ["patient", "first_name"] }],
          ["Last name", patient.last_name, { confPath: "patient.last_name", editField: ["patient", "last_name"] }],
          ["DOB", patient.dob && formatDateShort(patient.dob), { confPath: "patient.dob", editField: ["patient", "dob", "date"], editValue: patient.dob }],
          ["Phone", patient.phone_primary || patient.phone, { editField: ["patient", "phone_primary"] }],
          [
            "Address",
            [patient.address, patient.city, patient.state, patient.zip].filter(Boolean).join(", "),
            { editField: ["patient", "address"], editValue: patient.address },
          ],
        ])}
      />
    );
    const insuranceCard = (
      <DefinitionList
        key="insurance"
        title="Insurance"
        rows={
          referral.is_bridge_program
            ? [{ label: "Coverage", value: "Bridge Program" }]
            : fieldRows([
                ["Plan", insurance.primary_plan_name || insurance.primary_insurance_name],
                ["Member ID", insurance.primary_member_id, { mono: true, copy: true }],
                ["Group #", insurance.primary_group_number, { mono: true, copy: true }],
                ["RxBIN", insurance.primary_rxbin, { mono: true, copy: true }],
                ["RxPCN", insurance.primary_rxpcn, { mono: true, copy: true }],
              ])
        }
      />
    );
    const medicationCard = (
      <DefinitionList
        key="medication"
        title="Medication"
        rows={fieldRows([
          ["Drug", clinical.brand_name || clinical.drug_requested, { confPath: "clinical.drug_requested", editField: ["clinical", "drug_requested"], editValue: clinical.drug_requested }],
          ["Generic", clinical.generic_name],
          ["Dose", clinical.dose_amount, { editField: ["clinical", "dose_amount"] }],
          ["Frequency", clinical.dose_frequency || clinical.frequency, { editField: ["clinical", "dose_frequency"], editValue: clinical.dose_frequency || clinical.frequency }],
          ["Quantity", clinical.quantity, { editField: ["clinical", "quantity"] }],
          ["Route", clinical.route || clinical.administration],
          ["PA path", referral.is_bridge_program ? "Bridge — no PA" : referral.pa_required ? `PA required${referral.pa_required_reason ? `: ${referral.pa_required_reason}` : ""}` : "No PA required"],
        ])}
      />
    );
    const clinicalCard = (
      <DefinitionList
        key="clinical"
        title="Clinical"
        rows={fieldRows([
          [
            "ICD-10",
            clinical.diagnosis_icd10_primary || clinical.diagnosis_icd10,
            { mono: true, copy: true, confPath: "clinical.diagnosis_icd10_primary", editField: ["clinical", "diagnosis_icd10_primary"], editValue: clinical.diagnosis_icd10_primary || clinical.diagnosis_icd10 },
          ],
          ["Description", clinical.diagnosis_description, { editField: ["clinical", "diagnosis_description", "textarea"] }],
          ["Clinical justification", clinical.clinical_justification],
          ["Prior treatments", (clinical.prior_failed_medications || []).map((m: any) => (typeof m === "string" ? m : m?.name || String(m))).join(", ")],
        ])}
      />
    );
    const prescriberCard = (
      <DefinitionList
        key="prescriber"
        title="Prescriber"
        rows={fieldRows([
          ["Name", provider.name, { editField: ["provider", "name"] }],
          ["NPI", provider.npi, { mono: true, copy: true, confPath: "provider.npi", editField: ["provider", "npi"] }],
          ["Phone", provider.phone, { editField: ["provider", "phone"] }],
          ["Fax", provider.fax, { editField: ["provider", "fax"] }],
        ])}
      />
    );

    switch (key) {
      case "processing":
        cards.push(medicationCard);
        break;
      case "review": {
        cards.push(medicationCard, clinicalCard, patientCard, prescriberCard);

        // Insurance card always shows on review — Alex 2026-09-23: the Stedi
        // eligibility check needs to be visible even while dormant, with a
        // way to re-run it and to jump to the editable fields.
        const insuranceCardDocs = documents.filter(
          (d) => /insurance/i.test(d.doc_type || "") || /insurance/i.test(d.original_filename || ""),
        );
        const hasEligibilityResult = !!referral.eligibility_status && referral.eligibility_status !== "skipped";
        const elig = eligibilityChip(referral.eligibility_status, (referral.eligibility_mismatches || []).length);

        const recheckInsuranceEligibility = async () => {
          if (!id) return;
          setInsuranceRechecking(true);
          try {
            const res = await adminApi.recheckEligibility(id);
            if (res?.eligibility_status === "skipped") {
              toast({ title: "Eligibility checks are not live yet" });
            } else {
              toast({ title: "Eligibility re-checked", description: `Result: ${String(res?.eligibility_status || "").replace(/_/g, " ")}` });
            }
            await reload();
          } catch (e: any) {
            toast({ title: "Re-check failed", description: e.message, variant: "destructive" });
          } finally {
            setInsuranceRechecking(false);
          }
        };
        const editInsurance = () => {
          setActiveTab("all-fields");
          setTimeout(() => {
            document.getElementById("extraction-insurance")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
        };

        cards.push(
          <DefinitionList
            key="insurance_review"
            title="Insurance"
            action={
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={recheckInsuranceEligibility}
                  disabled={insuranceRechecking}
                  title="Re-run the insurance check"
                  className="h-7 gap-1.5 px-2.5 text-xs"
                >
                  <RefreshCw width={12} height={12} className={insuranceRechecking ? "animate-spin" : undefined} />
                  Re-check
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={editInsurance}
                  title="Edit insurance in All Fields"
                  className="h-7 gap-1.5 px-2.5 text-xs"
                >
                  <Pencil width={12} height={12} />
                  Edit
                </Button>
              </div>
            }
            rows={
              referral.is_bridge_program
                ? [{ label: "Coverage", value: "Bridge Program" }]
                : [
                    {
                      label: "Payer",
                      value: insurance.primary_plan_name || insurance.primary_insurance_name,
                      edit: {
                        value: insurance.primary_plan_name || insurance.primary_insurance_name || "",
                        onSave: (v: string) => saveExtractedField("insurance", "primary_plan_name", v),
                      },
                    },
                    {
                      label: "Member ID",
                      value: insurance.primary_member_id,
                      mono: true,
                      copy: true,
                      edit: {
                        value: insurance.primary_member_id || "",
                        onSave: (v: string) => saveExtractedField("insurance", "primary_member_id", v),
                      },
                    },
                    {
                      label: "Group",
                      value: insurance.primary_group_number,
                      mono: true,
                      copy: true,
                      edit: {
                        value: insurance.primary_group_number || "",
                        onSave: (v: string) => saveExtractedField("insurance", "primary_group_number", v),
                      },
                    },
                    {
                      label: "Card on file",
                      value: insuranceCardDocs.length ? insuranceCardDocs.map((d) => d.original_filename).join(", ") : "—",
                    },
                    ...(referral.insurance_expired
                      ? [{ label: "Status", value: "Expired — needs updated info", flag: true }]
                      : []),
                    {
                      label: "Eligibility",
                      value: hasEligibilityResult ? (
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                              ELIGIBILITY_CHIP_CLASS[elig.tone],
                            )}
                          >
                            {elig.label}
                          </span>
                          {referral.eligibility_checked_at && (
                            <span className="text-xs font-normal text-muted-foreground">
                              checked {relTime(referral.eligibility_checked_at)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="font-normal text-muted-foreground">
                          Not run yet — eligibility checks turn on when Stedi is live.
                        </span>
                      ),
                    },
                  ]
            }
          />,
        );

        // EligibilityPanel adds the detailed mismatch view directly under the
        // Insurance card — it renders nothing itself when there's no non-skipped result.
        // The Insurance card already carries the eligibility line + Re-check; the detailed panel
        // only earns its space when there is mismatch detail to show.
        if ((referral.eligibility_mismatches?.length ?? 0) > 0) cards.push(<EligibilityPanel key="eligibility" referral={referral} referralId={id!} />);

        cards.push(
          <p key="edit_hint" className="text-xs text-muted-foreground">
            Click any value to correct it · All Fields has everything else.
          </p>,
        );
        break;
      }
      case "pa_pending":
        cards.push(
          <DefinitionList
            key="cmm_worksheet"
            title="CoverMyMeds worksheet"
            action={
              <Button variant="outline" size="sm" asChild>
                <a href="https://www.covermymeds.com" target="_blank" rel="noreferrer">
                  <ExternalLink width={14} height={14} strokeWidth={1.75} />
                  Open CoverMyMeds
                </a>
              </Button>
            }
            rows={[
              { label: "Patient name", value: [patient.first_name, patient.last_name].filter(Boolean).join(" "), copy: true },
              { label: "Date of birth", value: patient.dob && formatDateShort(patient.dob), copy: true },
              { label: "Member ID", value: insurance.primary_member_id, mono: true, copy: true },
              { label: "Group", value: insurance.primary_group_number, mono: true, copy: true },
              { label: "BIN / PCN", value: [insurance.primary_rxbin, insurance.primary_rxpcn].filter(Boolean).join(" / "), mono: true, copy: true },
              { label: "Prescriber + NPI", value: [provider.name, provider.npi].filter(Boolean).join(" · "), copy: true },
              { label: "Drug", value: clinical.brand_name || clinical.drug_requested, copy: true },
              { label: "Dose", value: clinical.dose_amount, copy: true },
              { label: "Quantity", value: clinical.quantity, copy: true },
              { label: "ICD-10", value: clinical.diagnosis_icd10_primary || clinical.diagnosis_icd10, mono: true, copy: true },
              { label: "Prior treatments", value: (clinical.prior_failed_medications || []).map((m: any) => (typeof m === "string" ? m : m?.name || String(m))).join(", "), copy: true },
              { label: "Clinical notes", value: clinical.clinical_justification, copy: true },
            ]}
          />,
        );
        if (referral.insurance_expired) cards.push(insuranceCard);
        break;
      case "pa_submitted": {
        const dueAt = referral.pa_submitted_at ? new Date(new Date(referral.pa_submitted_at).getTime() + 72 * 3600_000) : null;
        cards.push(
          <DefinitionList
            key="pa"
            title="PA"
            rows={[
              { label: "Status", value: <PAStatusBadge status="submitted" /> },
              { label: "Payer", value: insurance.primary_insurance_name || insurance.primary_plan_name },
              { label: "Submitted", value: referral.pa_submitted_at && formatDateShort(referral.pa_submitted_at) },
              { label: "Follow-up due", value: dueAt ? formatWhen(dueAt) : undefined, flag: !!dueAt && dueAt.getTime() < Date.now() },
              { label: "CMM key", value: referral.pa_data?.reference_number || referral.pa_data?.ref_number, mono: true, copy: true },
              { label: "Notes", value: referral.pa_data?.notes },
            ]}
          />,
        );
        break;
      }
      case "pa_approved":
      case "appeal_won":
        cards.push(
          <DefinitionList
            key="pa_letter"
            title="PA"
            rows={[
              { label: "Status", value: <PAStatusBadge status="approved" /> },
              { label: "PA number", value: referral.pa_data?.pa_number, mono: true, copy: true },
              { label: "CMM key", value: referral.pa_data?.reference_number || referral.pa_data?.ref_number, mono: true, copy: true },
              { label: "Start date", value: referral.pa_data?.submitted_date && formatDateShort(referral.pa_data.submitted_date) },
              { label: "Expiration date", value: (referral.pa_data?.expiration_date || referral.pa_expiration_date) && formatDateShort(referral.pa_data?.expiration_date || referral.pa_expiration_date), flag: !!(referral.pa_data?.expiration_date || referral.pa_expiration_date) && new Date(referral.pa_data?.expiration_date || referral.pa_expiration_date).getTime() < Date.now() },
              { label: "Letter on file", value: paLetterInfo?.has_letter ? "On file" : "No letter yet" },
              { label: "Notes", value: referral.pa_data?.notes },
            ]}
          />,
          medicationCard,
        );
        break;
      case "pa_denied":
        cards.push(
          <DefinitionList
            key="pa_denial"
            title="PA"
            rows={[
              { label: "Status", value: <PAStatusBadge status="denied" /> },
              { label: "Denial reason", value: referral.pa_data?.denial_reason },
              { label: "Denied", value: referral.pa_data?.decision_date && formatDateShort(referral.pa_data.decision_date) },
              { label: "CMM key", value: referral.pa_data?.reference_number || referral.pa_data?.ref_number, mono: true, copy: true },
            ]}
          />,
          <DefinitionList
            key="appeal_fork"
            title="Appeal fork"
            rows={[
              { label: "Appeal", value: referral.pa_data?.denial_reason ? `Refutable if the denial reason (${referral.pa_data.denial_reason}) can be addressed with clinical documentation.` : "Available — see the denial reason above." },
              { label: "Bridge enrollment", value: "Available when a manufacturer program matches this drug." },
              { label: "Both", value: "An appeal and a bridge enrollment can run at the same time." },
            ]}
          />,
        );
        break;
      case "appeal_build":
        // No "Appeal outcomes" card here — nothing can be recorded until the
        // packet is faxed (Alex, 2026-09-23). "I submitted it another way"
        // stays reachable under More.
        cards.push(
          <div key="appeal_packet" ref={appealPacketRef}>
            <AppealPacketCard
              referralId={id!}
              paStatus={referral.pa_status}
              appealStartedAt={referral.appeal_started_at}
              onChanged={reload}
              hideActions
              actionsRef={appealActionsRef}
              onActionStateChange={bumpActionTick}
            />
          </div>,
        );
        break;
      case "appeal_sent":
        cards.push(
          <div key="appeal_outcomes" ref={appealOutcomesRef}>
            <PAAppealCard referral={referral} referralId={id!} onChanged={reload} hideActions />
          </div>,
          <div key="appeal_packet" ref={appealPacketRef}>
            <AppealPacketCard
              referralId={id!}
              paStatus={referral.pa_status}
              appealStartedAt={referral.appeal_started_at}
              onChanged={reload}
              hideActions
              actionsRef={appealActionsRef}
              onActionStateChange={bumpActionTick}
            />
          </div>,
        );
        break;
      case "appeal_level2":
      case "appeal_final":
        cards.push(
          <div key="appeal_outcomes" ref={appealOutcomesRef}>
            <PAAppealCard referral={referral} referralId={id!} onChanged={reload} />
          </div>,
        );
        // Enrollment no longer nests here — it's the "Enrollment" tab
        // (Alex, 2026-09-23).
        break;
      case "ready_to_send":
        cards.push(
          <DefinitionList
            key="delivery"
            title="Delivery summary"
            rows={definedRows([
              { label: "Pharmacy", value: referral.pharmacy_name },
              { label: "Packet contents", value: documents.map((d) => d.original_filename).join(", ") },
              { label: "Delivery issue", value: referral.delivery_issue_at ? `Reported ${formatDateShort(referral.delivery_issue_at)}` : undefined },
            ])}
          />,
        );
        if (referral.pa_status === "approved") {
          cards.push(
            <DefinitionList
              key="pa_summary"
              title="PA summary"
              density="rail"
              rows={[
                { label: "PA number", value: referral.pa_data?.pa_number, mono: true },
                { label: "Expiration", value: (referral.pa_data?.expiration_date || referral.pa_expiration_date) && formatDateShort(referral.pa_data?.expiration_date || referral.pa_expiration_date) },
                { label: "Letter on file", value: paLetterInfo?.has_letter ? "Yes" : "No" },
              ]}
            />,
          );
        }
        cards.push(medicationCard);
        break;
      case "sent":
        cards.push(
          <DefinitionList
            key="delivery"
            title="Delivery summary"
            rows={definedRows([
              { label: "Pharmacy", value: referral.pharmacy_name },
              { label: "Packet contents", value: documents.map((d) => d.original_filename).join(", ") },
              { label: "Sent", value: referral.updated_at && formatDateShort(referral.updated_at) },
              { label: "Delivery issue", value: referral.delivery_issue_at ? `Reported ${formatDateShort(referral.delivery_issue_at)}` : undefined },
            ])}
          />,
        );
        if (referral.pa_status === "approved") {
          cards.push(
            <DefinitionList
              key="pa_summary"
              title="PA summary"
              density="rail"
              rows={[
                { label: "PA number", value: referral.pa_data?.pa_number, mono: true },
                { label: "Expiration", value: (referral.pa_data?.expiration_date || referral.pa_expiration_date) && formatDateShort(referral.pa_data?.expiration_date || referral.pa_expiration_date) },
                { label: "Letter on file", value: paLetterInfo?.has_letter ? "Yes" : "No" },
              ]}
            />,
          );
        }
        break;
      case "rejected":
        cards.push(
          <DefinitionList
            key="rejection"
            title="Rejection"
            rows={[
              { label: "Reason", value: referral.rejection_reason },
              { label: "Missing documents", value: (referral.missing_fields?.missing_documents || []).join(", ") },
              { label: "Flagged fields", value: (referral.missing_fields?.flagged_fields || []).join(", ") },
            ]}
          />,
          <div key="tasks">
            <ReferralTasksCard referralId={id!} adminFirstName={adminProfile?.first_name} onShared={reload} />
          </div>,
        );
        break;
      case "closed":
        // Enrollment no longer nests here — it's the "Enrollment" tab
        // (Alex, 2026-09-23).
        cards.push(
          <DefinitionList key="status_strip" title="Status" rows={[{ label: "Status", value: <StatusBadge status="closed" variant="outline" context="admin" /> }]} />,
        );
        break;
    }

    // Enrollment moved out of the card stack entirely — it's the
    // "Enrollment" tab now (see renderEnrollmentTabContent below), not a
    // section nested inside the stage's own cards (Alex, 2026-09-23).

    // ClinicTasks only when the stage lists it (rejected — handled above) or
    // the referral has at least one open task that isn't already covered by
    // the Enrollment tab's own tasks card (enr_awaiting); otherwise it's
    // absent — the ActionBar's "Request from clinic" covers creating one
    // (finding #2c).
    if (
      key !== "rejected" &&
      next.track?.stage !== "enr_awaiting" &&
      !cards.some((c) => (c.key || "").toString().includes("tasks")) &&
      openTaskCount > 0
    ) {
      cards.push(
        <div key="tasks-open">
          <ReferralTasksCard referralId={id!} adminFirstName={adminProfile?.first_name} onShared={reload} />
        </div>,
      );
    }

    return cards;
  }

  /** Enrollment tab content — full EnrollmentCard (one column) plus the
   *  tasks card while a signature is being chased. Rendered either in the
   *  dedicated "Enrollment" tab, or in the "stage" tab when the track leads
   *  the row (isEnrollmentLed) — the workstation acts as that track's stage
   *  either way (Alex, 2026-09-23). hideActions is always on: the ActionBar
   *  owns every enrollment action now, the card never shows its own. */
  function renderEnrollmentTabContent() {
    return (
      <div className="space-y-3">
        <div ref={enrollmentRef}>
          <EnrollmentCard
            referralId={id!}
            paStatus={referral.pa_status}
            status={referral.status}
            onChanged={reload}
            hideActions
            actionsRef={enrollmentActionsRef}
            onActionStateChange={bumpActionTick}
          />
        </div>
        {next.track?.stage === "enr_awaiting" && (
          <div key="tasks-track">
            <ReferralTasksCard referralId={id!} adminFirstName={adminProfile?.first_name} onShared={reload} />
          </div>
        )}
      </div>
    );
  }


  // ── Notes thread ───────────────────────────────────────────────────
  const threadMessages = [
    ...(referral.pa_submitted_at ? [{ system: `PA submitted on CoverMyMeds — ${formatDateShort(referral.pa_submitted_at)}` }] : []),
    ...(referral.appeal_started_at ? [{ system: `Appeal packet faxed — ${formatDateShort(referral.appeal_started_at)}` }] : []),
    ...notes.map((n) => ({
      side: n.author_type === "admin" ? ("ours" as const) : ("clinic" as const),
      name: getDisplayAuthor(n, "admin"),
      time: new Date(n.created_at).toLocaleString(),
      body: n.content,
    })),
  ];

  // Stage/enrollment/all-fields/notes tabs — rendered inside whichever
  // container the split layout picks (a resizable panel when docked, a
  // plain flex-1 column otherwise).
  const stageTabs = (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className={underlineTabsListClass}>
        <TabsTrigger value="stage" className={underlineTabsTriggerClass}>{stageLabel}</TabsTrigger>
        {showSeparateEnrollmentTab && (
          <TabsTrigger value="enrollment" className={underlineTabsTriggerClass}>Enrollment</TabsTrigger>
        )}
        <TabsTrigger value="all-fields" className={underlineTabsTriggerClass}>All Fields</TabsTrigger>
        <TabsTrigger value="notes" className={underlineTabsTriggerClass}>Notes ({notes.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="stage" className="space-y-3 pt-4">
        {isEnrollmentLed ? renderEnrollmentTabContent() : renderStageCards()}
      </TabsContent>

      {showSeparateEnrollmentTab && (
        <TabsContent value="enrollment" className="space-y-3 pt-4">
          {renderEnrollmentTabContent()}
        </TabsContent>
      )}

      <TabsContent value="all-fields" className="space-y-3 pt-4">
        <ExtractionEditor referral={referral} onSaved={reload} />
      </TabsContent>

      <TabsContent value="notes" className="pt-4">
        <MessageThread
          messages={threadMessages}
          value={noteDraft}
          onChange={setNoteDraft}
          onSend={sendNote}
          placeholder="Add a note about this referral..."
        />
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="-mx-6 -my-8 lg:-mx-8 flex flex-col min-h-[calc(100vh-0px)]">
      <div ref={headerRef}>
        <StageHeader
          back={{ label: "Back to referrals", onClick: () => navigate("/admin/referrals") }}
        patient={referral.patient_name}
          stage={headerStage}
          stageTone={headerStageTone}
          question={headerQuestion}
          lastEvent={last?.label}
          lastTime={last?.time}
          handoff={referral.admin_handoff_note}
          onEditHandoff={openHandoffEditor}
          docCount={documents.length}
          onDocuments={() => setSheetOpen(true)}
          moreItems={moreItems}
          badge={next.interrupt ? <StageChip label={next.interrupt.verb} tone="warning" variant="outline" /> : undefined}
        />

        {next.interrupt && (
          <div className="px-[26px] pt-3">
            <Alert variant="destructive" className="border-warning/40 bg-warning/10 text-foreground">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{next.interrupt.verb}</AlertTitle>
              <AlertDescription>{interruptExplain}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {showDocked ? (
          <ResizablePanelGroup direction="horizontal" onLayout={handleDocsLayout} className="flex-1 min-h-0">
            <ResizablePanel defaultSize={docsPanelSize} minSize={30} maxSize={65} className="min-h-0">
              <DocumentsSheet
                open
                pinned
                fill
                onPinnedChange={setPinnedPersist}
                files={documents.map((d) => d.original_filename)}
                active={documents.findIndex((d) => d.id === activeDocId)}
                onSelect={(i) => setActiveDocId(documents[i]?.id)}
                style={
                  headerH > 0
                    ? { position: "sticky", top: headerH, height: `calc(100vh - ${headerH + ACTION_BAR_H}px)`, alignSelf: "flex-start" }
                    : undefined
                }
              >
                <DocumentViewer documents={documents} initialDocId={activeDocId} hideTabs />
              </DocumentsSheet>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel minSize={35} className="min-h-0">
              <div className="h-full overflow-y-auto p-6 pb-28">{stageTabs}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex-1 min-w-0 overflow-y-auto p-6 pb-28">{stageTabs}</div>
        )}
      </div>

      {!showDocked && (
        <DocumentsSheet
          open={sheetOpen}
          pinned={false}
          onClose={() => setSheetOpen(false)}
          files={documents.map((d) => d.original_filename)}
          active={documents.findIndex((d) => d.id === activeDocId)}
          onSelect={(i) => setActiveDocId(documents[i]?.id)}
        >
          <DocumentViewer documents={documents} initialDocId={activeDocId} hideTabs />
        </DocumentsSheet>
      )}

      <ActionBar
        status={statusText}
        tone={tone}
        request={{ openCount: openTaskCount, onClick: () => setRequestOpen(true) }}
        secondary={secondarySpec}
        primary={primarySpec}
        more={moreItems}
        next={nextInQueueSpec}
      />
      {/* Hidden trigger so the header's "More" button can open the same menu. */}

      <input
        ref={letterInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.tiff"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadLetter(f);
          if (letterInputRef.current) letterInputRef.current.value = "";
        }}
      />

      {/* ── Handoff note editor ── */}
      <Dialog open={handoffOpen} onOpenChange={setHandoffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Handoff note</DialogTitle>
            <DialogDescription>Internal-only — never shown to the clinic.</DialogDescription>
          </DialogHeader>
          <Textarea value={handoffDraft} onChange={(e) => setHandoffDraft(e.target.value)} rows={4} maxLength={500} placeholder="e.g. Called Dr. Carter's office, chart notes Friday, don't resubmit before then" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandoffOpen(false)}>Cancel</Button>
            <Button onClick={saveHandoff} disabled={savingHandoff}>{savingHandoff ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Request from clinic ── */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request from clinic</DialogTitle>
            <DialogDescription>Emails the clinic; their reply lands here.</DialogDescription>
          </DialogHeader>
          <Label className="text-xs text-muted-foreground mb-1 block">Instructions</Label>
          <Textarea value={requestDraft} onChange={(e) => setRequestDraft(e.target.value)} rows={4} placeholder="What do you need from the clinic?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={sendRequest} disabled={!requestDraft.trim() || requestSending}>{requestSending ? "Sending..." : "Send"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Filed on CoverMyMeds ── */}
      <Dialog open={filedOpen} onOpenChange={setFiledOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filed on CoverMyMeds</DialogTitle>
            <DialogDescription>Starts the 72h payer follow-up clock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Date filed</Label>
              <Input type="date" value={filedDate} onChange={(e) => setFiledDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">CMM access key / ref # (optional)</Label>
              <Input className="font-mono" value={filedCmmKey} onChange={(e) => setFiledCmmKey(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
              <Textarea value={filedNotes} onChange={(e) => setFiledNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFiledOpen(false)}>Cancel</Button>
            <Button onClick={submitFiledOnCmm} disabled={filing}>{filing ? "Saving..." : "Filed on CoverMyMeds"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Record decision ── */}
      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record decision</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <RadioGroup value={decisionOutcome} onValueChange={(v) => setDecisionOutcome(v as "approved" | "denied")} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="approved" />Approved</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="denied" />Denied</label>
            </RadioGroup>
            {decisionOutcome === "approved" ? (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">PA number</Label>
                  <Input value={decisionPaNumber} onChange={(e) => setDecisionPaNumber(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Start date</Label>
                    <Input type="date" value={decisionStart} onChange={(e) => setDecisionStart(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Expiration date</Label>
                    <Input type="date" value={decisionExpiration} onChange={(e) => setDecisionExpiration(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Letter (optional)</Label>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff" onChange={(e) => setDecisionFile(e.target.files?.[0] || null)} />
                </div>
              </>
            ) : (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Denial reason</Label>
                <Textarea value={decisionDenialReason} onChange={(e) => setDecisionDenialReason(e.target.value)} rows={2} />
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
              <Textarea value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)}>Cancel</Button>
            <Button onClick={submitDecision} disabled={recordingDecision}>{recordingDecision ? "Saving..." : "Record decision"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Record the appeal outcome (appeal_sent ActionBar primary) — same
          three outcomes, labels, and toasts PAAppealCard's own buttons had. ── */}
      <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record the appeal outcome</DialogTitle>
          </DialogHeader>
          <RadioGroup value={outcomeChoice} onValueChange={(v) => setOutcomeChoice(v as "won" | "level2" | "final")} className="flex flex-col gap-3">
            <label className="flex items-start gap-2 text-sm">
              <RadioGroupItem value="won" className="mt-0.5" />
              <span>
                <span className="font-medium">Appeal won</span>
                <span className="block text-xs text-muted-foreground">PA becomes approved. You'll then record the new approval number/letter on the PA card before sending.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <RadioGroupItem value="level2" className="mt-0.5" />
              <span>
                <span className="font-medium">Lost — hand off (Level 2)</span>
                <span className="block text-xs text-muted-foreground">The clinic will be emailed that the insurer now works with their office directly, and this leaves the appeal tab.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <RadioGroupItem value="final" className="mt-0.5" />
              <span>
                <span className="font-medium">Lost — final (no level 2)</span>
                <span className="block text-xs text-muted-foreground">For drugs with no second appeal level. The clinic will be emailed that the payer's decision is final, with bridge/cash as remaining options.</span>
              </span>
            </label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutcomeDialogOpen(false)}>Cancel</Button>
            <Button
              className={outcomeChoice === "won" ? "bg-success text-success-foreground hover:bg-success/90" : undefined}
              disabled={recordingOutcome}
              onClick={submitOutcome}
            >
              {recordingOutcome ? "Saving…" : outcomeChoice === "won" ? "Appeal won" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Shared confirm dialogs (same components/behaviour as the legacy page) ── */}
      <ConfirmModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Referral"
        description={`Are you sure you want to approve ${referral.patient_name}'s referral for ${referral.drug}?`}
        confirmLabel="Approve"
        variant="success"
        onConfirm={handleApprove}
      />
      <ConfirmModal
        open={resendOpen}
        onOpenChange={setResendOpen}
        title="Reset for resend?"
        description="Moves this referral back to Ready to Send so you can send it to the pharmacy again."
        confirmLabel="Reset for resend"
        onConfirm={async () => {
          if (!id) return;
          try {
            await adminApi.resendReferral(id);
            toast({ title: "Ready to resend" });
            await reload();
          } catch (e: any) {
            toast({ title: "Couldn't reset", description: e.message, variant: "destructive" });
          }
        }}
      />
      <ConfirmModal
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title="Return to review?"
        description="Pulls the referral back to Needs Review so you can fix something before sending."
        confirmLabel="Return to review"
        onConfirm={async () => {
          if (!id) return;
          try {
            await adminApi.unapproveReferral(id);
            toast({ title: "Returned to review" });
            await reload();
          } catch (e: any) {
            toast({ title: "Couldn't return to review", description: e.message, variant: "destructive" });
          }
        }}
      />
      <ConfirmModal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this referral?"
        description="It will be hidden from the lists — restore anytime from the Archived view."
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
      <DeliveryConfirmModal
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        referralId={id!}
        referral={referral}
        documents={documents}
        paLetterInfo={paLetterInfo}
        patientName={referral.patient_name}
        drugName={referral.drug}
        onDelivered={reload}
      />
      <AdminRejectModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        submitting={rejecting}
        onConfirm={handleReject}
        defaultFlagged={FLAGGABLE_FIELDS.filter((f) => {
          const [sec, k] = f.path.split(".");
          const v = (data?.[sec] || {})[k];
          const empty = v == null || String(v).trim() === "";
          const c = conf[f.path];
          return empty || (typeof c === "number" && c < 0.85);
        }).map((f) => f.path)}
      />
    </div>
  );
}

function useIsWideViewport(minWidth: number): boolean {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= minWidth);
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= minWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [minWidth]);
  return wide;
}
