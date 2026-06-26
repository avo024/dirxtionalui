import { useState } from "react";
import {
  HelpCircle, BookOpen, ExternalLink, GraduationCap, MessageCircle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TutorialsMenu } from "@/components/tutorials/TutorialsMenu";
import { useTour } from "@/components/tutorials/useTour";
import { SupportThread } from "@/components/support/SupportThread";
import { useSupportUnread } from "@/components/support/useSupportUnread";

/**
 * Floating Help button (bottom-right, every clinic page).
 * Surfaces the Clinic User Guide, replayable Tutorials (interactive product
 * tours), and a two-way "Contact us" support thread. An unread dot appears on
 * the button when Dirxctional has replied since the clinic last opened the thread.
 */
type View = "main" | "tutorials" | "support";

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const { runTour } = useTour();
  const { hasUnread, bump } = useSupportUnread();

  const close = () => {
    setOpen(false);
    setView("main");
  };

  const handleRunTour = (key: string) => {
    close();
    // Let the popover unmount before the tour overlay mounts.
    window.setTimeout(() => runTour(key), 80);
  };

  const openSupport = () => {
    setView("support");
    bump(); // mark thread viewed → clear the unread dot
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setView("main");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          size="icon"
          aria-label={hasUnread ? "Help & resources (new reply)" : "Help & resources"}
          data-tour="help-button"
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        >
          <HelpCircle className="h-6 w-6" />
          {hasUnread && (
            <span
              aria-hidden
              className="absolute right-0 top-0 h-3 w-3 rounded-full bg-destructive ring-2 ring-background"
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="top"
        className={view === "support" ? "w-[380px] p-0" : "w-64 p-0"}
      >
        {view === "main" && (
          <>
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">Help &amp; resources</p>
              <p className="text-xs text-muted-foreground">Guides and support for your clinic</p>
            </div>

            <div className="p-1">
              <button
                type="button"
                onClick={() => setView("tutorials")}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">Tutorials</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={openSupport}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">Contact us</span>
                {hasUnread ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>

              <a
                href="/manual.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">Clinic User Guide</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            </div>
          </>
        )}

        {view === "tutorials" && (
          <>
            <div className="flex items-center gap-2 border-b px-3 py-3">
              <button
                type="button"
                onClick={() => setView("main")}
                aria-label="Back"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-semibold">Tutorials</p>
                <p className="text-xs text-muted-foreground">Replay any walkthrough anytime</p>
              </div>
            </div>
            <TutorialsMenu onRun={handleRunTour} />
          </>
        )}

        {view === "support" && (
          <>
            <div className="flex items-center gap-2 border-b px-3 py-3">
              <button
                type="button"
                onClick={() => setView("main")}
                aria-label="Back"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-semibold">Contact us</p>
                <p className="text-xs text-muted-foreground">We usually reply within a business day</p>
              </div>
            </div>
            <SupportThread active={view === "support"} />
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
