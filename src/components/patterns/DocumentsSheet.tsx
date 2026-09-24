import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { Download, File as FileIcon, Pin, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatDateShort } from "@/lib/dateUtils";

/** A file entry with enough metadata to group and date-stamp it. Plain
 *  strings are still accepted (backward-compatible with existing callers
 *  like DesignSystem's samples) — they just never qualify for the grouped
 *  picker below since there's no docType to group by. */
export interface DocumentsSheetFile {
  id: string;
  name: string;
  docType?: string;
  uploadedAt?: string;
}

type FileEntry = string | DocumentsSheetFile;

function isFileObject(f: FileEntry): f is DocumentsSheetFile {
  return typeof f === "object" && f !== null;
}

/** Group order for the >4-files picker — empty groups are hidden. Mirrors
 *  the real `doc_type` values used across the app (clinic-settable:
 *  referral_form/insurance_front/insurance_back/chart_notes/demographics/
 *  prior_auth/supplemental/packet/other; admin-only: pa_approval_letter/
 *  generated_referral_pdf(_sent)/appeal_document/payer_correspondence/
 *  team_document). "From the clinic" has no distinct doc_type today (task
 *  reply attachments aren't tagged that way in the documents list the admin
 *  API returns) — the group is kept in the order for when that lands, but
 *  nothing maps into it yet (Alex, flag: see workstation report).
 */
const DOC_GROUPS = ["Referral", "Insurance", "Clinical", "PA & appeal", "Enrollment", "From the clinic", "Other"] as const;

function groupForDocType(docType?: string): (typeof DOC_GROUPS)[number] {
  const t = (docType || "").toLowerCase();
  if (/^(referral_form|packet|generated_referral_pdf|generated_referral_pdf_sent)$/.test(t)) return "Referral";
  if (/^(insurance_front|insurance_back)$/.test(t) || /insurance/.test(t)) return "Insurance";
  if (/^(chart_notes|demographics|prior_auth)$/.test(t) || /clinical|labs?/.test(t)) return "Clinical";
  if (/^(pa_approval_letter|appeal_document|payer_correspondence)$/.test(t) || /denial|appeal|pa_letter/.test(t)) return "PA & appeal";
  if (/^team_document$/.test(t) || /enrollment|signed/.test(t)) return "Enrollment";
  return "Other";
}

interface DocumentsSheetProps {
  open: boolean;
  /** Docked into the split layout (inline, no overlay) vs a floating overlay sheet. */
  pinned?: boolean;
  /** Pinned only: fill the width/height of its container (a resizable panel)
   *  instead of the fixed 480px docked width. The floating sheet always
   *  keeps 480px regardless of this prop. */
  fill?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
  onClose?: () => void;
  /** Plain filenames (legacy), or `{ id, name, docType?, uploadedAt? }`
   *  objects — the latter unlocks the grouped picker once there are more
   *  than 4 files with a docType. */
  files: FileEntry[];
  active?: number;
  onSelect?: (index: number) => void;
  /** The document viewer itself; falls back to a placeholder sheet. */
  children?: ReactNode;
  page?: number;
  pages?: number;
  className?: string;
  /** Applied to the outer docked `<aside>` (pinned) or floating `SheetContent`
   *  — used to give the docked sheet an explicit sticky height tied to the
   *  page's header height (flow-script §8 / phase 4b finding #1). */
  style?: CSSProperties;
}

/**
 * Document viewer. Pinned = docked inline in a split layout (caller places
 * it beside the cards, no shadow/overlay) — either a fixed 480px aside, or
 * with `fill` set, stretches to whatever width its container (a resizable
 * panel) gives it. Unpinned = a floating shadcn Sheet on the right, fixed
 * 480px width and the same internals. The pin toggle is meant to persist
 * per-stage (localStorage, no PHI).
 */
export function DocumentsSheet({
  open,
  pinned,
  fill,
  onPinnedChange,
  onClose,
  files,
  active = 0,
  onSelect,
  children,
  page,
  pages,
  className,
  style,
}: DocumentsSheetProps) {
  const fileObjs: DocumentsSheetFile[] = useMemo(
    () => files.map((f, i) => (isFileObject(f) ? f : { id: String(i), name: f })),
    [files],
  );
  // Grouped list kicks in once there are more than 4 files AND at least one
  // carries a docType — plain-string callers (no docType at all) always keep
  // the flat tab strip, however many files they pass.
  const useGrouped = fileObjs.length > 4 && fileObjs.some((f) => f.docType);
  const grouped = useMemo(() => {
    if (!useGrouped) return null;
    const byGroup = new Map<string, { file: DocumentsSheetFile; index: number }[]>();
    fileObjs.forEach((file, index) => {
      const g = groupForDocType(file.docType);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push({ file, index });
    });
    return DOC_GROUPS.map((group) => ({ group, items: byGroup.get(group) || [] })).filter((g) => g.items.length > 0);
  }, [fileObjs, useGrouped]);

  const body = (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Documents ({files.length})</h2>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-pressed={pinned}
            aria-label={pinned ? "Unpin documents" : "Pin documents"}
            onClick={() => onPinnedChange?.(!pinned)}
            className={cn(
              "rounded-md p-1.5",
              pinned ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Pin width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
          {!pinned && (
            <button
              type="button"
              aria-label="Close documents"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {fileObjs.length > 0 && (
        grouped ? (
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto border-b border-border px-2 py-2">
            {grouped.map(({ group, items }) => (
              <div key={group}>
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </div>
                {items.map(({ file, index }) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => onSelect?.(index)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                      index === active ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-accent",
                    )}
                  >
                    <FileIcon width={14} height={14} strokeWidth={1.75} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    {file.uploadedAt && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">{formatDateShort(file.uploadedAt)}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
            {fileObjs.map((file, i) => (
              <button
                key={file.id}
                type="button"
                onClick={() => onSelect?.(i)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium truncate max-w-[140px]",
                  i === active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input bg-background text-foreground hover:bg-accent",
                )}
              >
                {file.name}
              </button>
            ))}
          </div>
        )
      )}

      <div className="flex-1 min-h-0 overflow-auto bg-[#EEEDEB] p-5">
        {children ?? (
          <div className="flex h-full min-h-[240px] items-center justify-center rounded-md border border-dashed border-stone-300 bg-white text-muted-foreground">
            <div className="flex flex-col items-center gap-2 text-sm">
              <FileIcon width={20} height={20} strokeWidth={1.75} aria-hidden="true" />
              No document selected
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
        <button type="button" aria-label="Zoom in" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
          <ZoomIn width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Download" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
          <Download width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {typeof page === "number" && typeof pages === "number" && (
          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
            Page {page} of {pages}
          </span>
        )}
      </div>
    </div>
  );

  if (pinned) {
    if (!open) return null;
    return (
      <aside
        className={cn(
          "h-full min-h-0 border-r border-border bg-card overflow-hidden",
          fill ? "w-full" : "w-[480px] shrink-0",
        )}
        style={style}
      >
        {body}
      </aside>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose?.()}>
      <SheetContent
        side="right"
        className="w-[480px] sm:max-w-[480px] p-0 [&>button]:hidden flex flex-col"
        style={{ height: "100vh", ...style }}
      >
        {body}
      </SheetContent>
    </Sheet>
  );
}
