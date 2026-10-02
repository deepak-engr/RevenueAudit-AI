/**
 * Documented thresholds and limits for the deterministic audit rules.
 *
 * Every range below is a fixed, inspectable constant. Rules must reference these
 * constants so behaviour is reproducible and reviewable. Values are common
 * search/technical/content conventions, not tuned or randomised.
 */

/** Version of the rule set. Bump when rule behaviour changes. */
export const RULE_VERSION = "1.0.0";

/** Recommended minimum <title> length, in characters. */
export const TITLE_MIN_LENGTH = 30;
/** Recommended maximum <title> length, in characters. */
export const TITLE_MAX_LENGTH = 60;

/** Recommended minimum meta description length, in characters. */
export const META_DESCRIPTION_MIN_LENGTH = 70;
/** Recommended maximum meta description length, in characters. */
export const META_DESCRIPTION_MAX_LENGTH = 160;

/** Below this word count a page is considered very thin (critical content gap). */
export const VERY_LOW_WORD_COUNT = 100;
/** Between VERY_LOW_WORD_COUNT and this value a page has insufficient content. */
export const MIN_ACCEPTABLE_WORD_COUNT = 300;
/** Word count at or above which heading structure becomes objectively measurable. */
export const WEAK_HEADING_WORD_COUNT = 500;

/** Minimum internal links a page should expose for healthy internal navigation. */
export const MIN_HEALTHY_INTERNAL_LINKS = 3;
/** A single page linking to more external URLs than this is flagged (objectively countable). */
export const EXCESSIVE_EXTERNAL_LINKS = 50;

/** When this many images are missing alt text on a page, the finding severity rises. */
export const IMAGES_MISSING_ALT_MEDIUM_THRESHOLD = 3;

/**
 * Keyword fragments used to detect whether the crawl discovered any recognisable
 * commercial or contact pathway. Purely a countable observation over discovered
 * link paths; it never implies a monetary loss or conversion-rate impact.
 */
export const COMMERCIAL_PATH_KEYWORDS: readonly string[] = [
  "pricing",
  "price",
  "plan",
  "plans",
  "buy",
  "cart",
  "checkout",
  "shop",
  "product",
  "products",
  "store",
  "subscribe",
  "subscription",
  "signup",
  "sign-up",
  "demo",
  "contact",
  "quote",
  "order",
  "book",
];
