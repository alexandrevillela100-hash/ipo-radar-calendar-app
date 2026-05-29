// ============================================================================
//  filingsClient.ts — v2 (adds pricing + performance fields)
//
//  Save as:  calendar-app/src/lib/filingsClient.ts (overwrite existing)
//
//  Changes from v1:
//    - Filing interface now includes `pricing` (manually entered) and
//      `performance` (auto-populated by track-performance.js).
//    - GROQ projection now selects those two top-level fields on the
//      filing doc directly (no join needed — they live on `filing`).
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

export interface PricingInfo {
  ipoDate?: string; // ISO "YYYY-MM-DD"
  offerPrice?: number;
  sharesOfferedM?: number;
  benchmarkSector?: string; // e.g. "XLK"
}

export interface PerformanceInfo {
  lastUpdated?: string; // ISO datetime
  currentPrice?: number;
  openDay1?: number;
  closeDay1?: number;
  firstDayPop?: number; // percent, e.g. 12.4 means +12.4%
  return7d?: number;
  return30d?: number;
  return90d?: number;
  returnSinceIPO?: number;
  spy?: { returnSinceIPO?: number };
  ipoETF?: { returnSinceIPO?: number };
  history?: Array<{ date: string; price: number }>;
}

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

  // Manually entered once the IPO prices:
  pricing?: PricingInfo;

  // Auto-populated by the nightly tracker job:
  performance?: PerformanceInfo;

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
  pricing,
  performance,
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

export async function getRecentFilings(limit = 30): Promise<Filing[]> {
  const query = `
    *[_type == "filing"] | order(filingDate desc) [0...$limit] {
      ${PROJECTION}
    }
  `;
  return filingsClient.fetch<Filing[]>(query, { limit });
}

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

export async function getAllFilings(): Promise<Filing[]> {
  const query = `
    *[_type == "filing"] | order(filingDate desc) {
      ${PROJECTION}
    }
  `;
  return filingsClient.fetch<Filing[]>(query);
}

// ─── UI helpers ─────────────────────────────────────────────────────

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
      return "#8b9099";
  }
}

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

/**
 * Format a percent number for display.
 *   formatPct(12.5)  → "+12.5%"
 *   formatPct(-3.1)  → "-3.1%"
 *   formatPct(undefined) → "—"
 */
export function formatPct(n: number | undefined, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

/**
 * Return color for a percent value (teal up, red down, muted flat).
 */
export function returnColor(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "#8b9099";
  if (n > 0.05) return "#03c8b5";
  if (n < -0.05) return "#d86060";
  return "#8b9099";
}
