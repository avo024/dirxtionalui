import { useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Download, RefreshCw, FileText, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api";

interface BackendDocument {
  id: string;
  original_filename: string;
  file_type: string;
  doc_type: string;
  uploaded_at: string;
}

interface DocumentViewerProps {
  documents: BackendDocument[];
  className?: string;
}

interface CachedUrl {
  url: string;
  fetchedAt: number;
}

const URL_EXPIRY_MS = 4 * 60 * 1000; // 4 minutes

function isImageType(fileType: string): boolean {
  return ["image/jpeg", "image/png", "image/tiff", "image/jpg"].includes(fileType);
}

function isPdfType(fileType: string): boolean {
  return fileType === "application/pdf";
}

export function DocumentViewer({ documents, className }: DocumentViewerProps) {
  const [activeDocId, setActiveDocId] = useState<string>("");
  const [urlCache, setUrlCache] = useState<Record<string, CachedUrl>>({});
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Set initial active doc
  useEffect(() => {
    if (documents.length > 0 && !activeDocId) {
      setActiveDocId(documents[0].id);
    }
  }, [documents, activeDocId]);

  const activeDoc = documents.find((d) => d.id === activeDocId);
  const cachedEntry = activeDocId ? urlCache[activeDocId] : undefined;
  const isExpired = cachedEntry ? Date.now() - cachedEntry.fetchedAt > URL_EXPIRY_MS : true;
  const activeUrl = cachedEntry && !isExpired ? cachedEntry.url : undefined;

  const fetchUrl = useCallback(async (docId: string) => {
    setLoadingUrl(true);
    setUrlError(false);
    try {
      const data = await adminApi.getDocumentUrl(docId);
      setUrlCache((prev) => ({
        ...prev,
        [docId]: { url: data.url, fetchedAt: Date.now() },
      }));
    } catch {
      setUrlError(true);
    } finally {
      setLoadingUrl(false);
    }
  }, []);

  // Fetch URL when active doc changes or is expired
  useEffect(() => {
    if (!activeDocId) return;
    const cached = urlCache[activeDocId];
    if (!cached || Date.now() - cached.fetchedAt > URL_EXPIRY_MS) {
      fetchUrl(activeDocId);
    }
  }, [activeDocId, fetchUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  if (documents.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center p-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No documents uploaded</p>
          <p className="text-xs text-muted-foreground mt-1">No documents uploaded for this referral</p>
        </div>
      </div>
    );
  }

  const isImage = activeDoc ? isImageType(activeDoc.file_type) : false;
  const isPdf = activeDoc ? isPdfType(activeDoc.file_type) : false;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Document tabs */}
      <div className="border-b border-border bg-secondary/50 p-1 overflow-x-auto">
        <Tabs value={activeDocId} onValueChange={setActiveDocId}>
          <TabsList className="h-auto bg-transparent gap-1 flex-wrap">
            {documents.map((doc) => (
              <TabsTrigger
                key={doc.id}
                value={doc.id}
                className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <span className="truncate max-w-[140px]">{doc.original_filename}</span>
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {doc.doc_type}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-card">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {isImage ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
          <span>{activeDoc?.original_filename}</span>
        </div>
        <div className="flex items-center gap-1">
          {isImage && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(25, zoom - 25))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(300, zoom + 25))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </>
          )}
          {activeUrl && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(activeUrl, "_blank")}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Document area */}
      <div className="flex-1 flex items-center justify-center bg-secondary/30 overflow-auto relative" style={{ minHeight: 400 }}>
        {loadingUrl && (
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading document...</p>
          </div>
        )}

        {urlError && !loadingUrl && (
          <div className="text-center p-8">
            <p className="text-sm text-destructive mb-2">Failed to load document</p>
            <Button variant="outline" size="sm" onClick={() => fetchUrl(activeDocId)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        )}

        {activeUrl && !loadingUrl && isPdf && (
          <iframe src={activeUrl} className="w-full h-full border-0" title={activeDoc?.original_filename} />
        )}

        {activeUrl && !loadingUrl && isImage && (
          <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
            <img
              src={activeUrl}
              alt={activeDoc?.original_filename}
              className="cursor-pointer transition-transform"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center", maxWidth: "100%", objectFit: "contain" }}
              onClick={() => window.open(activeUrl, "_blank")}
              onError={() => setUrlError(true)}
            />
          </div>
        )}

        {activeUrl && !loadingUrl && !isPdf && !isImage && (
          <div className="text-center p-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground">{activeDoc?.original_filename}</p>
            <p className="text-xs text-muted-foreground mt-1">Preview not available for this file type</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => window.open(activeUrl, "_blank")}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          </div>
        )}

        {/* Expiration refresh overlay */}
        {cachedEntry && isExpired && !loadingUrl && !urlError && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Document URL expired</p>
              <Button variant="outline" size="sm" onClick={() => fetchUrl(activeDocId)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
