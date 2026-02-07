import { useState } from "react";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReferralDocument } from "@/data/mockData";

interface DocumentViewerProps {
  documents: ReferralDocument[];
  className?: string;
}

export function DocumentViewer({ documents, className }: DocumentViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(100);

  const activeDoc = documents[activeIndex];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Document tabs */}
      <div className="flex gap-1 border-b border-border bg-secondary/50 p-1 overflow-x-auto">
        {documents.map((doc, i) => (
          <button
            key={doc.id}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
              i === activeIndex
                ? "bg-card text-foreground card-shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {doc.name}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-card">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {activeIndex + 1} / {documents.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setActiveIndex(Math.min(documents.length - 1, activeIndex + 1))}
            disabled={activeIndex === documents.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(50, zoom - 25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(200, zoom + 25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document area */}
      <div className="flex-1 flex items-center justify-center bg-secondary/30 p-8 overflow-auto">
        <div
          className="bg-card rounded-lg card-shadow-md flex flex-col items-center justify-center gap-4 p-12 text-center"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
        >
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{activeDoc?.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF/Image viewer — will be integrated later
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Uploaded: {activeDoc?.uploaded_at}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
