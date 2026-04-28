// src/lib/filingsClient.ts
//
// Read-only Sanity client for the IPO Radar calendar. All queries hit the
// Sanity CDN — no token required for published content. The project ID
// and dataset are non-sensitive (visible in any Sanity Studio URL) so we
// bake them in here as defaults; Vercel env vars can override if needed.

import { createClient, type SanityClient } from "@sanity/client";

const DEFAULT_PROJECT_ID = "8896dke9"; // IPO Radar — Sanity project ID
const DEFAULT_DATASET = "production";
const DEFAULT_API_VERSION = "2024-10-01";

const projectId =
  (import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined) || DEFAULT_PROJECT_ID;
const dataset =
  (import.meta.env.VITE_SANITY_DATASET as string | undefined) || DEFAULT_DATASET;
const apiVersion =
  (import.meta.env.VITE_SANITY_API_VERSION as string | undefined) ||
  DEFAULT_API_VERSION;

export const filingsClient: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,            // public CDN — fast, cached, no token needed
  perspective: "published",
});

// ───────────────────────────────────────────────────────────────────────
// Types — mirror the Sanity schema in calendar-feed/sanity/schemas/filing.ts
// ───────────────────────────────────────────────────────────────────────

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
  filingType: FilingType;
  filingDate: string;          // ISO date "YYYY-MM-DD"
  status: FilingStatus;
  cik: string;
  accessionNumber: string;
  edgarUrl: string;
  reportSlug?: string;
}

// ───────────────────────────────────────────────────────────────────────
// GROQ queries
// ───────────────────────────────────────────────────────────────────────

const PROJECTION = /* groq */ `
  _id,
  companyName,
  ticker,
  exchange,
  industry,
  filingType,
  filingDate,
  status,
  cik,
  accessionNumber,
  edgarUrl,
  reportSlug
`;

// "Recent": filings with filingDate within the last $days, newest first.
const RECENT_QUERY = /* groq */ `
  *[_type == "filing" && filingDate >= $cutoff]
    | order(filingDate desc)
    { ${PROJECTION} }
`;

// "Upcoming": filings the editor has promoted to pricing-window or trading.
// Driven by status, not date, because EDGAR doesn't disclose pricing dates.
const UPCOMING_QUERY = /* groq */ `
  *[_type == "filing" && status in ["pricing-window","trading"]]
    | order(filingDate desc)
    { ${PROJECTION} }
`;

// All filings within an explicit date window — used by the calendar to
// fill a month at a time.
const WINDOW_QUERY = /* groq */ `
  *[_type == "filing" && filingDate >= $start && filingDate <= $end]
    | order(filingDate desc)
    { ${PROJECTION} }
`;

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function getRecentFilings(days = 30): Promise<Filing[]> {
  return filingsClient.fetch<Filing[]>(RECENT_QUERY, { cutoff: isoDaysAgo(days) });
}

export async function getUpcomingFilings(): Promise<Filing[]> {
  return filingsClient.fetch<Filing[]>(UPCOMING_QUERY);
}

export async function getFilingsInWindow(
  startDate: string,
  endDate: string,
): Promise<Filing[]> {
  return filingsClient.fetch<Filing[]>(WINDOW_QUERY, {
    start: startDate,
    end: endDate,
  });
}

// Group filings by filingDate. `byDate["2026-04-08"]` returns the filings
// that landed that day. Convenient for the calendar grid renderer.
export function groupByDate(filings: Filing[]): Record<string, Filing[]> {
  const out: Record<string, Filing[]> = {};
  for (const f of filings) {
    const k = f.filingDate;
    if (!out[k]) out[k] = [];
    out[k].push(f);
  }
  return out;
}

// Visual helpers — single source of truth for the colour-coding so the
// calendar UI and (future) Manus UI stay in sync.
export function filingTypeColor(t: FilingType): string {
  switch (t) {
    case "S-1":   return "#03c8b5"; // teal — initial registrations
    case "S-1/A": return "#c8a45c"; // gold — amendments
    case "F-1":   return "#03c8b5";
    case "F-1/A": return "#c8a45c";
    case "424B":  return "#59c280"; // green — final prospectus / pricing
    case "RW":    return "#d65a5a"; // red — withdrawals
    default:      return "#a9c3bf";
  }
}

export function filingTypeLabel(t: FilingType): string {
  switch (t) {
    case "S-1":   return "Initial filing";
    case "S-1/A": return "Amendment";
    case "F-1":   return "Initial filing (foreign)";
    case "F-1/A": return "Amendment (foreign)";
    case "424B":  return "Final prospectus";
    case "RW":    return "Withdrawal";
    default:      return t;
  }
}
