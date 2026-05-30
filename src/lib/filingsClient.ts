// ============================================================================
//  filingsClient.ts — v3 (adds comparables + pipelineStage helper)
//
//  Save as:  calendar-app/src/lib/filingsClient.ts (overwrite v2)
//
//  Changes from v2:
//    - Filing interface adds:
//        compTickers?:  string[]                — manually curated input
//        comps?:        CompCompany[]           — auto-populated by tracker
//    - New CompCompany type
//    - New pipelineStage() helper used by Pipeline page
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
  ipoDate?: string;
  offerPrice?: number;
  sharesOfferedM?: number;
  benchmarkSector?: string;
}

export interface PerformanceInfo {
  lastUpdated?: string;
  currentPrice?: number;
  openDay1?: number;
  closeDay1?: number;
  firstDayPop?: number;
  return7d?: number;
  return30d?: number;
  return90d?: number;
  returnSinceIPO?: number;
  spy?: { returnSinceIPO?: number };
  ipoETF?: { returnSinceIPO?: number };
  history?: Array<{ date: string; price: number }>;
}

/**
 * One comparable public company. Populated by track-comparables.js.
 * All ratios are plain numbers (P/S = 12.3 means 12.3x).
 * Margins are stored as percentages (45.2 = 45.2%).
 */
export interface CompCompany {
  ticker: string;
  name?: string;
  marketCapM?: number; // in $M
  revenueM?: number; // TTM, in $M
  ps?: number; // price-to-sales TTM
  evRevenue?: number; // EV/Revenue
  peRatio?: number; // trailing P/E
  grossMargin?: number; // %
  lastUpdated?: string;
}

export interface Filing {
  _id: string;
  companyName: string;
  ticker?: string;
  exchange?: string;
  industry?: string;
  sicCode?: string;
  filingType: FilingType;
  filingDate: string;
  status?: FilingStatus;
  cik?: string;
  accessionNumber?: string;
  edgarUrl?: string;
  reportSlug?: string;

  pricing?: PricingInfo;
  performance?: PerformanceInfo;

  // Comparables (valuation engine):
  compTickers?: string[]; // manually curated input list
  comps?: CompCompany[]; // populated nightly by track-comparables.js

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
  comparables?: string[]; // legacy name-only list, kept for backwards compat
}

// ─── GROQ projection shared by all queries ──────────────────────────
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
  compTickers,
  comps,
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
      return "#03c8b5";
    case "S-1/A":
    case "F-1/A":
      return "#c8a45c";
    case "424B":
      return "#7a89d8";
    case "RW":
      return "#d86060";
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

export function formatPct(n: number | undefined, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function returnColor(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "#8b9099";
  if (n > 0.05) return "#03c8b5";
  if (n < -0.05) return "#d86060";
  return "#8b9099";
}

/**
 * Format a $M number as "$1.2B" / "$345M" / "$12.5M".
 */
export function formatMoneyM(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  if (n >= 1) return `$${n.toFixed(0)}M`;
  return `$${(n * 1000).toFixed(0)}K`;
}

/** Format an N.Nx multiple. */
export function formatMultiple(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}x`;
}

// ─── Pipeline classification ────────────────────────────────────────

export type PipelineStage =
  | "filed"
  | "amended"
  | "pricing"
  | "trading"
  | "withdrawn";

export const PIPELINE_STAGES: PipelineStage[] = [
  "filed",
  "amended",
  "pricing",
  "trading",
];

export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  filed: "Filed",
  amended: "Amended",
  pricing: "Pricing window",
  trading: "Trading",
  withdrawn: "Withdrawn",
};

export const PIPELINE_STAGE_DESCRIPTION: Record<PipelineStage, string> = {
  filed: "Initial S-1 / F-1 on file. Awaiting amendments.",
  amended: "At least one amendment filed. SEC review ongoing.",
  pricing: "Final prospectus filed (424B) or pricing imminent.",
  trading: "Public. Live on exchange. Performance tracking active.",
  withdrawn: "Registration withdrawn or postponed indefinitely.",
};

export const PIPELINE_STAGE_COLOR: Record<PipelineStage, string> = {
  filed: "#03c8b5",
  amended: "#c8a45c",
  pricing: "#7a89d8",
  trading: "#56c490",
  withdrawn: "#d86060",
};

/**
 * Classify a single filing into a pipeline stage.
 * The Pipeline page dedupes by company and picks the furthest stage.
 */
export function pipelineStage(f: Filing): PipelineStage {
  if (f.filingType === "RW" || f.status === "withdrawn") return "withdrawn";
  if (f.performance?.currentPrice || f.status === "trading") return "trading";
  if (f.filingType === "424B" || f.status === "pricing-window")
    return "pricing";
  if (
    f.filingType === "S-1/A" ||
    f.filingType === "F-1/A" ||
    f.status === "amended"
  )
    return "amended";
  return "filed";
}

/** Numeric rank for "furthest along" — higher means further along. */
const STAGE_RANK: Record<PipelineStage, number> = {
  withdrawn: -1,
  filed: 0,
  amended: 1,
  pricing: 2,
  trading: 3,
};

/**
 * Given a list of filings (possibly multiple per company), dedupe by
 * company identifier and return one Filing per company representing
 * its furthest pipeline stage. Used by the Pipeline page.
 */
export function dedupeByCompany(filings: Filing[]): Filing[] {
  const byKey = new Map<string, Filing>();
  for (const f of filings) {
    const key = f.cik || f.reportSlug || f.companyName;
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, f);
      continue;
    }
    const a = STAGE_RANK[pipelineStage(existing)];
    const b = STAGE_RANK[pipelineStage(f)];
    // Keep the furthest along. On tie, keep the more recent filing.
    if (b > a) {
      byKey.set(key, f);
    } else if (b === a) {
      if ((f.filingDate || "") > (existing.filingDate || "")) {
        byKey.set(key, f);
      }
    }
  }
  return Array.from(byKey.values());
}

/**
 * Days since a date string (YYYY-MM-DD).
 */
export function daysSince(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}
