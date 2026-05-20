// ============================================================================
//  filingsClient.ts — drop-in replacement
//
//  Save as:  calendar-app/src/lib/filingsClient.ts (overwrite existing)
//
//  Exports:
//    - Filing interface (rich — includes joined initiationReport fields)
//    - FilingType / FilingStatus type unions
//    - filingsClient (Sanity client instance)
//    - getRecentFilings(limit) — used by FeaturedIPOs and the calendar
//    - getFilingBySlug(slug)   — used by FactSheet
//    - getAllFilings()         — used by AllIPOs and the calendar grid
//    - filingTypeColor(type)   — accent color helper for badges/chips
//    - filingTypeLabel(type)   — human-readable label (used by DetailPanel)
//
//  Required environment variables (Vercel project settings):
//    VITE_SANITY_PROJECT_ID
//    VITE_SANITY_DATASET       (defaults to "production")
//    VITE_SANITY_API_VERSION   (defaults to "2024-10-01")
// ============================================================================

import { createClient, type SanityClient } from "@sanity/client";

// ─── Sanity client setup ────────────────────────────────────────────

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID as string;
const dataset =
  (import.meta.env.VITE_SANITY_DATASET as string) || "production";
const apiVersion =
  (import.meta.env.VITE_SANITY_API_VERSION as string) || "2024-10-01";

if (!projectId && import.meta.env.MODE !== "test") {
  // eslint-disable-next-line no-console
  console.warn(
    "[filingsClient] VITE_SANITY_PROJECT_ID is not set — queries will fail.",
  );
}

export const filingsClient: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});

// ─── Types ──────────────────────────────────────────────────────────

export type FilingType =
  | "S-1"
  | "S-1/A"
  | "F-1"
  | "F-1/A"
  | "424B"
  | "RW";

export type FilingStatus =
  | "pre-pricing"
  | "amended"
  | "pricing-window"
  | "trading"
  | "withdrawn";

export interface Filing {
  _id: string;
  companyName: string;
  ticker?: string;
  exchange?: string;
  industry?: string;
  sicCode?: string;
  filingType: FilingType;
  filingDate: string; // ISO "YYYY-MM-DD"
  status?: FilingStatus;
  cik?: string;
  accessionNumber?: string;
  edgarUrl?: string;
  reportSlug?: string;

  // Joined-in from initiationReport when one exists:
  heroImageUrl?: string;
  pdfReportUrl?: string;

  offering?: {
    sharesOfferedM?: number;
    priceRange?: string;
    grossProceedsM?: number;
    impliedValuationM?: number;
  };

  useOfProceeds?: string[];
  keyRisks?: string[];

  financials?: {
    lastRevenueM?: number;
    history?: Array<{
      fy: string;
      revenueM?: number;
      grossProfitM?: number;
      netIncomeM?: number;
    }>;
  };

  leadUnderwriters?: string[];
  comparables?: string[];
}

// ─── GROQ projection shared by all three queries ────────────────────
// The sub-queries match a published `initiationReport` whose slug
// equals the filing's `reportSlug`. Each pulls one field. Filings
// without a matching report get `null` for every joined field —
// consumers gracefully hide empty sections.
const PROJECTION = /* groq */ `
  _id,
  companyName,
  ticker,
  exchange,
  industry,
  sicCode,
  filingType,
  filingDate,
  status,
  cik,
  accessionNumber,
  edgarUrl,
  reportSlug,
  "heroImageUrl": *[
    _type == "initiationReport"
    && defined(^.reportSlug)
    && slug.current == ^.reportSlug
    && status == "published"
  ][0].heroImage.asset->url,
  "pdfReportUrl": *[
    _type == "initiationReport"
    && defined(^.reportSlug)
    && slug.current == ^.reportSlug
    && status == "published"
  ][0].pdfFile.asset->url,
  "offering": *[
    _type == "initiationReport"
    && defined(^.reportSlug)
    && slug.current == ^.reportSlug
    && status == "published"
  ][0].offering,
  "useOfProceeds": *[
    _type == "initiationReport"
    && defined(^.reportSlug)
    && slug.current == ^.reportSlug
    && status == "published"
  ][0].useOfProceeds,
  "keyRisks": *[
    _type == "initiationReport"
    && defined(^.reportSlug)
    && slug.current == ^.reportSlug
    && status == "published"
  ][0].keyRisks,
  "financials": *[
    _type == "initiationReport"
    && defined(^.reportSlug)
    && slug.current == ^.reportSlug
    && status == "published"
  ][0].financials,
  "leadUnderwriters": *[
    _type == "initiationReport"
    && defined(^.reportSlug)
    && slug.current == ^.reportSlug
    && status == "published"
  ][0].leadUnderwriters,
  "comparables": *[
    _type == "initiationReport"
    && defined(^.reportSlug)
    && slug.current == ^.reportSlug
    && status == "published"
  ][0].comparables
`;

// ─── Queries ────────────────────────────────────────────────────────

/**
 * Most recent N filings, ordered by filingDate desc.
 * Used by the landing page's FeaturedIPOs grid.
 */
export async function getRecentFilings(limit = 30): Promise<Filing[]> {
  const query = `
    *[_type == "filing"] | order(filingDate desc) [0...$limit] {
      ${PROJECTION}
    }
  `;
  return filingsClient.fetch<Filing[]>(query, { limit });
}

/**
 * Single filing by reportSlug (or by the filing doc's own slug).
 * Used by the FactSheet page.
 */
export async function getFilingBySlug(
  slug: string,
): Promise<Filing | null> {
  const query = `
    *[
      _type == "filing"
      && (reportSlug == $slug || slug.current == $slug)
    ][0] {
      ${PROJECTION}
    }
  `;
  const result = await filingsClient.fetch<Filing | null>(query, { slug });
  return result ?? null;
}

/**
 * Every filing in the dataset, ordered by filingDate desc.
 * Used by AllIPOs and the calendar homepage.
 */
export async function getAllFilings(): Promise<Filing[]> {
  const query = `
    *[_type == "filing"] | order(filingDate desc) {
      ${PROJECTION}
    }
  `;
  return filingsClient.fetch<Filing[]>(query);
}

// ─── UI helpers ─────────────────────────────────────────────────────

/**
 * Accent color (hex) for badges and chips, keyed by filing type.
 * Tuned to the Velocia palette:
 *   - S-1, F-1     → teal (new filings, on the radar)
 *   - S-1/A, F-1/A → gold (amendments, material updates)
 *   - 424B         → indigo (pricing finalized)
 *   - RW           → red (withdrawn)
 */
export function filingTypeColor(type: FilingType): string {
  switch (type) {
    case "S-1":
    case "F-1":
      return "#03c8b5"; // teal
    case "S-1/A":
    case "F-1/A":
      return "#c8a45c"; // gold
    case "424B":
      return "#7a89d8"; // indigo
    case "RW":
      return "#d86060"; // red
    default:
      return "#8b9099"; // muted gray
  }
}

/**
 * Human-readable label for a filing type. Used by DetailPanel.tsx
 * (and any other component that wants a friendlier name than the
 * raw form type).
 *
 *   "S-1"   → "Initial Registration"
 *   "S-1/A" → "Amendment"
 *   "F-1"   → "Foreign Registration"
 *   "F-1/A" → "Foreign Amendment"
 *   "424B"  → "Pricing"
 *   "RW"    → "Withdrawn"
 */
export function filingTypeLabel(type: FilingType): string {
  switch (type) {
    case "S-1":
      return "Initial Registration";
    case "S-1/A":
      return "Amendment";
    case "F-1":
      return "Foreign Registration";
    case "F-1/A":
      return "Foreign Amendment";
    case "424B":
      return "Pricing";
    case "RW":
      return "Withdrawn";
    default:
      return type;
  }
}
