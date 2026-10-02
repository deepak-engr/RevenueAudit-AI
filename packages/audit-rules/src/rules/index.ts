import type { AuditRule } from "../types.js";
import { contentRules } from "./content.js";
import { imageRules } from "./images.js";
import { linkRules } from "./links.js";
import { revenueRules } from "./revenue.js";
import { seoRules } from "./seo.js";
import { technicalRules } from "./technical.js";

/**
 * The full, ordered rule set. Order is fixed so that generated `issueId`s are
 * deterministic for identical evidence.
 */
export const auditRules: AuditRule[] = [
  ...seoRules,
  ...technicalRules,
  ...contentRules,
  ...linkRules,
  ...imageRules,
  ...revenueRules,
];
