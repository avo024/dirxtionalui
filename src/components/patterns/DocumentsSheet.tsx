import type { CSSProperties, ReactNode } from "react";
import { Download, File as FileIcon, Pin, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

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
  files: string[];
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

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
          {files.map((file, i) => (
            <button
              key={file + i}
              type="button"
              onClick={() => onSelect?.(i)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium truncate max-w-[140px]",
                i === active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background text-foreground hover:bg-accent",
              )}
            >
              {file}
            </button>
          ))}
        </div>
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
