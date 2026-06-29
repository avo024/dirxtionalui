import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HelpCircle, BookOpen, ExternalLink, GraduationCap, MessageCircle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TutorialsMenu } from "@/components/tutorials/TutorialsMenu";
import { useTour } from "@/components/tutorials/useTour";
import { useSupportUnread } from "@/components/support/useSupportUnread";

/**
 * Floating Help button (bottom-right, every clinic page).
 * Quick access to the Clinic User Guide, replayable Tutorials, and the full
 * Help & Support center (cases). An unread dot appears when Dirxctional has
 * replied since the clinic last opened their requests.
 */
type View = "main" | "tutorials";

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const { runTour } = useTour();
  const { hasUnread, bump } = useSupportUnread();
  const navigate = useNavigate();

  const close = () => {
    setOpen(false);
    setView("main");
  };

  const handleRunTour = (key: string) => {
    close();
    // Let the popover unmount before the tour overlay mounts.
    window.setTimeout(() => runTour(key), 80);
  };

  const goToSupport = () => {
    bump(); // mark replies viewed → clear the unread dot
    close();
    navigate("/clinic/support");
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

      <PopoverContent align="end" side="top" className="w-64 p-0">
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
                onClick={goToSupport}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">Help &amp; Support</span>
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
      </PopoverContent>
    </Popover>
  );
}
