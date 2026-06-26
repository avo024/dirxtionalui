import { useState } from "react";
import { HelpCircle, BookOpen, ExternalLink, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TutorialsMenu } from "@/components/tutorials/TutorialsMenu";
import { useTour } from "@/components/tutorials/useTour";

/**
 * Floating Help button (bottom-right, every clinic page).
 * Surfaces the Clinic User Guide and replayable Tutorials (interactive product
 * tours). Feedback ("Contact us") will be added as a third item here once the
 * approach is confirmed — the list is built to take more entries without
 * restructuring.
 */
export function HelpButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "tutorials">("main");
  const { runTour } = useTour();

  const close = () => {
    setOpen(false);
    setView("main");
  };

  const handleRunTour = (key: string) => {
    close();
    // Let the popover unmount before the tour overlay mounts.
    window.setTimeout(() => runTour(key), 80);
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
          aria-label="Help & resources"
          data-tour="help-button"
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" side="top" className="w-64 p-0">
        {view === "main" ? (
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
              {/* "Contact us" item goes here once the feedback approach is confirmed. */}
            </div>
          </>
        ) : (
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
