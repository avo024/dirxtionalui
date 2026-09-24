import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Best-effort MIME type from a filename's extension — used to build a
 *  synthetic document entry (DocumentViewer needs `file_type` to pick the
 *  PDF vs image renderer) for a file that isn't in the referral's own
 *  `documents` list, e.g. a PA letter carried over from a previous referral,
 *  or the generated referral PDF, which isn't a stored document at all. */
export function guessFileType(filename: string): string {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "tif" || ext === "tiff") return "image/tiff";
  return "application/octet-stream";
}
