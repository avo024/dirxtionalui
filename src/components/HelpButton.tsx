import { useState } from "react";
import { HelpCircle, BookOpen, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

/**
 * Floating Help button (bottom-right, every clinic page).
 * Today it surfaces the Clinic User Guide. Feedback ("Send feedback") will be
 * added as a second item here once the approach is confirmed — the list below
 * is built to take more entries without restructuring.
 */
export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          aria-label="Help & resources"
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" side="top" className="w-64 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Help &amp; resources</p>
          <p className="text-xs text-muted-foreground">Guides and support for your clinic</p>
        </div>

        <div className="p-1">
          <a
            href="/manual.pdf"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted"
          >
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1">Clinic User Guide</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </a>
          {/* Feedback item goes here once the feedback approach is confirmed. */}
        </div>
      </PopoverContent>
    </Popover>
  );
}
