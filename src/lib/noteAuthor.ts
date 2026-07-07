/**
 * Helpers for rendering note author labels & avatar initials consistently
 * across the clinic and admin sides.
 */

export type NoteViewSide = "clinic" | "admin";

export interface NoteAuthorLike {
  author_type?: string | null;
  author_name?: string | null;
}

/**
 * Returns the display name for a note's author.
 * Clinic side never sees individual admin attribution — always "Dirxctional Team".
 */
export function getDisplayAuthor(note: NoteAuthorLike, viewSide: NoteViewSide): string {
  if (note.author_type === "admin" && viewSide === "clinic") {
    return "Dirxctional Team";
  }
  return (
    note.author_name ||
    (note.author_type === "clinic_user" || note.author_type === "clinic"
      ? "Clinic"
      : "Dirxctional Team")
  );
}

/**
 * Returns 2-letter initials for the avatar.
 * - "Alex Test — Test Clinic" → "AT" (first letters of first two words)
 * - Single word → first 2 chars
 * - Admin note on clinic side → "DT"
 */
export function getAuthorInitials(note: NoteAuthorLike, viewSide: NoteViewSide): string {
  if (note.author_type === "admin" && viewSide === "clinic") {
    return "DT";
  }
  const name = (note.author_name || "").trim();
  if (!name) {
    return note.author_type === "admin" ? "DT" : "CL";
  }
  const words = name.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
