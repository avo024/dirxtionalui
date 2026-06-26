import { PlayCircle } from "lucide-react";
import { TOURS, TUTORIAL_ORDER } from "./tours";

/**
 * The replayable tutorials list shown inside the Help popover.
 * Each entry launches its tour via the `onRun` handler (provided by HelpButton,
 * which also closes the popover so the tour isn't obscured).
 */
export function TutorialsMenu({ onRun }: { onRun: (key: string) => void }) {
  return (
    <div className="p-1">
      {TUTORIAL_ORDER.map((key) => {
        const tour = TOURS[key];
        if (!tour) return null;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onRun(key)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
          >
            <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex flex-col">
              <span className="font-medium leading-tight">{tour.label}</span>
              <span className="text-xs text-muted-foreground leading-tight">
                {tour.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
