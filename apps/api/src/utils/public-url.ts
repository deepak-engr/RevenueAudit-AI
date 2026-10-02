import { z } from "zod";

const privateIpv4Ranges = [
  /^(10)\./,
  /^(127)\./,
  /^(0)\./,
  /^(169\.254)\./,
  /^(172\.(1[6-9]|2\d|3[01]))\./,
  /^(192\.168)\./,
  /^(100\.(6[4-9]|[789]\d|1[01]\d|12[0-7]))\./,
];

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || !host.includes(".")) return true;
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  return privateIpv4Ranges.some((range) => range.test(host));
}

export const publicHttpUrlSchema = z.string().trim().min(1, "A URL is required").superRefine((value, context) => {
  let parsed: URL;
  try { parsed = new URL(value); } catch { context.addIssue({ code: "custom", message: "Enter a valid URL" }); return; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") context.addIssue({ code: "custom", message: "Only HTTP and HTTPS URLs are allowed" });
  if (parsed.username || parsed.password) context.addIssue({ code: "custom", message: "URLs with credentials are not allowed" });
  if (isBlockedHostname(parsed.hostname)) context.addIssue({ code: "custom", message: "Local, private, loopback, and internal URLs are not allowed" });
});

export function validatePublicHttpUrl(value: string): string { return publicHttpUrlSchema.parse(value); }
