import type { PageEvidenceInput } from "../types.js";

/** The URL a finding should reference: the final crawled URL, falling back to the requested one. */
export function urlOf(page: PageEvidenceInput): string {
  return page.finalUrl || page.requestedUrl;
}

/** Trimmed length of an optional string, treating null/undefined as empty. */
export function textLength(value: string | null | undefined): number {
  return (value ?? "").trim().length;
}

/** Whether a robots directive list requests the page be excluded from indexing. */
export function isNoIndex(directives: string[]): boolean {
  return directives.some((directive) => {
    const value = directive.trim().toLowerCase();
    return value === "noindex" || value === "none";
  });
}
