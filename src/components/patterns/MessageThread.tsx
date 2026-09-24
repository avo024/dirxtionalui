import { File as FileIcon, Paperclip, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "./_shared";

interface MessageAttachment {
  name: string;
  size?: string;
  onClick?: () => void;
}

interface ThreadMessage {
  side?: "ours" | "clinic";
  /** Convenience flag: true = written by the current user (resolves against `ours`). */
  mine?: boolean;
  name?: string;
  role?: string;
  time?: string;
  body?: string;
  attachments?: MessageAttachment[];
  /** Centered, muted system line (e.g. "Task created") instead of a message bubble. */
  system?: string;
}

interface MessageThreadProps {
  messages: ThreadMessage[];
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  placeholder?: string;
  empty?: string;
  /** Which side represents the current viewer; default "ours" (the admin/internal team). */
  ours?: "ours" | "clinic";
  hint?: string;
  className?: string;
  /** Replaces the composer with a locked bar (e.g. a resolved/closed case) — pass a message and an action to unlock. */
  locked?: { message: string; actionLabel: string; onAction: () => void; actionDisabled?: boolean };
}

function resolveSide(message: ThreadMessage, ours: "ours" | "clinic"): "ours" | "clinic" {
  if (message.side) return message.side;
  if (message.mine !== undefined) {
    if (message.mine) return ours;
    return ours === "ours" ? "clinic" : "ours";
  }
  return "clinic";
}

/**
 * Shared conversation view + composer, used for both the admin-side notes
 * thread and the clinic-side notes thread. `ours` says which side is "me"
 * for the viewer, so the same component works on both surfaces.
 */
export function MessageThread({
  messages,
  value,
  onChange,
  onSend,
  onAttach,
  placeholder,
  empty = "No messages yet.",
  ours = "ours",
  hint = "Visible to the clinic",
  className,
  locked,
}: MessageThreadProps) {
  return (
    <div className={cn("bg-card border border-border rounded-lg overflow-hidden flex flex-col", className)}>
      <div className="max-h-[56vh] min-h-[160px] overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">{empty}</div>
        )}
        {messages.map((message, i) => {
          if (message.system) {
            return (
              <div key={i} className="px-4 py-2 text-center text-xs text-muted-foreground border-b last:border-b-0 border-border">
                {message.system}
              </div>
            );
          }
          const side = resolveSide(message, ours);
          return (
            <div
              key={i}
              className={cn(
                "px-4 py-3 border-b last:border-b-0 border-border",
                side === "ours" ? "bg-muted" : "bg-card",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                    side === "ours" ? "bg-teal-600" : "bg-primary",
                  )}
                >
                  {initials(message.name ?? "?")}
                </span>
                <span className="text-[13px] font-semibold text-foreground">{message.name}</span>
                {message.role && (
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{message.role}</span>
                )}
                {message.time && (
                  <span className="ml-auto font-mono text-xs text-muted-foreground">{message.time}</span>
                )}
              </div>
              {message.body && (
                <p className="pl-8 mt-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{message.body}</p>
              )}
              {message.attachments && message.attachments.length > 0 && (
                <div className="pl-8 mt-1.5 flex flex-col gap-1">
                  {message.attachments.map((att, j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={att.onClick}
                      className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
                    >
                      <FileIcon width={14} height={14} strokeWidth={1.75} aria-hidden="true" />
                      {att.name}
                      {att.size && <span className="text-muted-foreground">{att.size}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {locked ? (
        <div className="border-t border-border p-3 flex items-center justify-between gap-3 bg-muted/40">
          <span className="text-sm text-muted-foreground">{locked.message}</span>
          <Button type="button" variant="outline" size="sm" disabled={locked.actionDisabled} onClick={locked.onAction}>
            {locked.actionLabel}
          </Button>
        </div>
      ) : (
        <div className="border-t border-border p-3 flex flex-col gap-2">
          <Textarea
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onAttach}>
              <Paperclip width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
              Attach
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">{hint}</span>
            <Button type="button" size="sm" onClick={onSend} disabled={value.trim().length === 0}>
              <Send width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
