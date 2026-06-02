// ============================================================================
//  filingsClient.ts — v6 (adds sector classification)
//
//  Save as:  calendar-app/src/lib/filingsClient.ts (overwrite v5)
//
//  Changes from v5:
//    - SECTORS constant — 10 canonical sectors with labels, descriptions,
//      and benchmark ETF tickers
//    - canonicalSector(filing) — maps a filing to a sector slug
//    - sectorLabel(slug), sectorEtf(slug), sectorDescription(slug)
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

export interface CompCompany {
  ticker: string;
  name?: string;
  marketCapM?: number;
  revenueM?: number;
  ps?: number;
  evRevenue?: number;
  peRatio?: number;
  grossMargin?: number;
  lastUpdated?: string;
}

export interface PnLRow {
  fy: string;
  revenue?: number;
  costOfRevenue?: number;
  grossProfit?: number;
  researchDev?: number;
  salesMarketing?: number;
  generalAdmin?: number;
  totalOpex?: number;
  operatingIncome?: number;
  interestNet?: number;
  otherIncome?: number;
  preTaxIncome?: number;
  tax?: number;
  netIncome?: number;
  basicEPS?: number;
  dilutedEPS?: number;
}

export interface BalanceSheetRow {
  fy: string;
  cashEquivalents?: number;
  shortTermInvestments?: number;
  accountsReceivable?: number;
  inventory?: number;
  otherCurrentAssets?: number;
  totalCurrentAssets?: number;
  propertyEquipment?: number;
  goodwill?: number;
  intangibles?: number;
  otherLTAssets?: number;
  totalAssets?: number;
  accountsPayable?: number;
  accruedLiabilities?: number;
  currentDebt?: number;
  deferredRevenueCurrent?: number;
  totalCurrentLiabilities?: number;
  longTermDebt?: number;
  otherLTLiabilities?: number;
  totalLiabilities?: number;
  commonStock?: number;
  additionalPaidInCapital?: number;
  accumulatedDeficit?: number;
  totalEquity?: number;
}

export interface CashFlowRow {
  fy: string;
  netIncome?: number;
  depreciationAmort?: number;
  stockBasedComp?: number;
  workingCapital?: number;
  otherOperating?: number;
  cfo?: number;
  capex?: number;
  acquisitions?: number;
  otherInvesting?: number;
  cfi?: number;
  stockIssuance?: number;
  stockBuybacks?: number;
  debtNet?: number;
  dividends?: number;
  otherFinancing?: number;
  cff?: number;
  netChangeInCash?: number;
}

export interface CapTableRow {
  holder: string;
  holderType?: "founder" | "investor" | "employee" | "ipo-float" | "other";
  sharesM?: number;
  pctPreIPO?: number;
  pctPostIPO?: number;
  lockupDays?: number;
  notes?: string;
}

export interface FinancialsDeep {
  currency?: string;
  fiscalYearEnd?: string;
  source?: string;
  lastUpdated?: string;
  pnl?: PnLRow[];
  balanceSheet?: BalanceSheetRow[];
  cashFlow?: CashFlowRow[];
  capTable?: CapTableRow[];
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

  compTickers?: string[];
  comps?: CompCompany[];

  heroImageUrl?: string;
  pdfReportUrl?: string;

  offering?: {
    sharesOfferedM?: number;
    priceRange?: string;
    grossProceedsM?: number;
    impliedValuationM?: number;
  };

  leadUnderwriters?: string[];
  grossProceedsM?: number;

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

  financialsDeep?: FinancialsDeep;
  comparables?: string[];
}

// ─── GROQ projection ────────────────────────────────────────────────
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
  financialsDeep,
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
  "leadUnderwriters": coalesce(
    leadUnderwriters,
    *[
      _type == "initiationReport"
      && defined(^.reportSlug)
      && slug.current == ^.reportSlug
      && status == "published"
    ][0].leadUnderwriters
  ),
  "grossProceedsM": coalesce(
    grossProceedsM,
    *[
      _type == "initiationReport"
      && defined(^.reportSlug)
      && slug.current == ^.reportSlug
      && status == "published"
    ][0].offering.grossProceedsM
  ),
  "comparables": *[
    _type == "initiationReport"
    && defined(^.reportSlug)
    && slug.current == ^.reportSlug
    && status == "published"
  ][0].comparables
`;

// ─── Queries ────────────────────────────────────────────────────────

export async function getRecentFilings(limit = 30): Promise<Filing[]> {
  return filingsClient.fetch<Filing[]>(
    `*[_type == "filing"] | order(filingDate desc) [0...$limit] { ${PROJECTION} }`,
    { limit },
  );
}

export async function getFilingBySlug(slug: string): Promise<Filing | null> {
  const result = await filingsClient.fetch<Filing | null>(
    `*[
      _type == "filing"
      && (reportSlug == $slug || slug.current == $slug)
    ][0] { ${PROJECTION} }`,
    { slug },
  );
  return result ?? null;
}

export async function getAllFilings(): Promise<Filing[]> {
  return filingsClient.fetch<Filing[]>(
    `*[_type == "filing"] | order(filingDate desc) { ${PROJECTION} }`,
  );
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
    case "S-1": return "Initial Registration";
    case "S-1/A": return "Amendment";
    case "F-1": return "Foreign Registration";
    case "F-1/A": return "Foreign Amendment";
    case "424B": return "Pricing";
    case "RW": return "Withdrawn";
    default: return type;
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

export function formatMoneyM(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  if (n >= 1) return `$${n.toFixed(0)}M`;
  return `$${(n * 1000).toFixed(0)}K`;
}

export function formatMultiple(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}x`;
}

// ─── Pipeline classification ────────────────────────────────────────

export type PipelineStage =
  | "filed" | "amended" | "pricing" | "trading" | "withdrawn";

export const PIPELINE_STAGES: PipelineStage[] = [
  "filed", "amended", "pricing", "trading",
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

export function pipelineStage(f: Filing): PipelineStage {
  if (f.filingType === "RW" || f.status === "withdrawn") return "withdrawn";
  if (f.performance?.currentPrice || f.status === "trading") return "trading";
  if (f.filingType === "424B" || f.status === "pricing-window") return "pricing";
  if (
    f.filingType === "S-1/A" || f.filingType === "F-1/A" ||
    f.status === "amended"
  ) return "amended";
  return "filed";
}

const STAGE_RANK: Record<PipelineStage, number> = {
  withdrawn: -1, filed: 0, amended: 1, pricing: 2, trading: 3,
};

export function dedupeByCompany(filings: Filing[]): Filing[] {
  const byKey = new Map<string, Filing>();
  for (const f of filings) {
    const key = f.cik || f.reportSlug || f.companyName;
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) { byKey.set(key, f); continue; }
    const a = STAGE_RANK[pipelineStage(existing)];
    const b = STAGE_RANK[pipelineStage(f)];
    if (b > a) {
      byKey.set(key, f);
    } else if (b === a) {
      if ((f.filingDate || "") > (existing.filingDate || "")) byKey.set(key, f);
    }
  }
  return Array.from(byKey.values());
}

export function daysSince(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Lockup helpers ─────────────────────────────────────────────────

export const LOCKUP_DAYS = 180;

export function lockupExpiration(f: Filing): string | undefined {
  const ipo = f.pricing?.ipoDate;
  if (!ipo) return undefined;
  const d = new Date(ipo);
  if (isNaN(d.getTime())) return undefined;
  d.setDate(d.getDate() + LOCKUP_DAYS);
  return d.toISOString().slice(0, 10);
}

export function daysUntilLockup(f: Filing): number | undefined {
  const exp = lockupExpiration(f);
  if (!exp) return undefined;
  const target = new Date(exp);
  return Math.floor((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── Underwriter normalization ──────────────────────────────────────

const UNDERWRITER_CANONICAL: Array<[RegExp, string]> = [
  [/^goldman/i, "Goldman Sachs"],
  [/^morgan stanley/i, "Morgan Stanley"],
  [/^j\.?\s*p\.?\s*morgan|^jp ?morgan/i, "J.P. Morgan"],
  [/^bofa|^bank of america|^merrill lynch/i, "Bank of America"],
  [/^citi/i, "Citigroup"],
  [/^barclays/i, "Barclays"],
  [/^deutsche bank|^db securities/i, "Deutsche Bank"],
  [/^mizuho/i, "Mizuho"],
  [/^credit suisse|^cs securities/i, "Credit Suisse"],
  [/^ubs/i, "UBS"],
  [/^jefferies/i, "Jefferies"],
  [/^wells fargo/i, "Wells Fargo"],
  [/^evercore/i, "Evercore"],
  [/^cowen/i, "Cowen"],
  [/^raymond james/i, "Raymond James"],
  [/^rbc/i, "RBC Capital Markets"],
  [/^bmo/i, "BMO Capital Markets"],
  [/^nomura/i, "Nomura"],
  [/^bnp|^bnp paribas/i, "BNP Paribas"],
  [/^hsbc/i, "HSBC"],
  [/^stifel/i, "Stifel"],
  [/^piper sandler/i, "Piper Sandler"],
  [/^needham/i, "Needham"],
  [/^william blair/i, "William Blair"],
];

export function normalizeUnderwriter(s: string): string {
  const trimmed = (s || "").trim();
  if (!trimmed) return trimmed;
  for (const [re, name] of UNDERWRITER_CANONICAL) {
    if (re.test(trimmed)) return name;
  }
  return trimmed
    .replace(/,?\s*(LLC|Inc\.?|Incorporated|Co\.?|& Co\.?|Securities)\s*$/i, "")
    .trim();
}

export function underwriterSlug(name: string): string {
  return normalizeUnderwriter(name)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hasFinancialsDeep(f: Filing): boolean {
  const fd = f.financialsDeep;
  if (!fd) return false;
  return (
    (fd.pnl?.length ?? 0) > 0 ||
    (fd.balanceSheet?.length ?? 0) > 0 ||
    (fd.cashFlow?.length ?? 0) > 0 ||
    (fd.capTable?.length ?? 0) > 0
  );
}

// ─── Sector classification ──────────────────────────────────────────

export type SectorSlug =
  | "tech"
  | "semiconductors"
  | "biotech"
  | "pharma"
  | "fintech"
  | "consumer"
  | "industrial"
  | "energy"
  | "healthcare"
  | "media"
  | "other";

export interface SectorDef {
  slug: SectorSlug;
  label: string;
  description: string;
  benchmarkEtf: string; // ticker for sector benchmark
}

export const SECTORS: SectorDef[] = [
  {
    slug: "tech",
    label: "Software & Internet",
    description:
      "SaaS, cloud infrastructure, internet platforms, and digital marketplaces.",
    benchmarkEtf: "XLK",
  },
  {
    slug: "semiconductors",
    label: "Semiconductors",
    description:
      "Chip design, foundry, equipment makers, and silicon-adjacent hardware.",
    benchmarkEtf: "SOXX",
  },
  {
    slug: "biotech",
    label: "Biotech",
    description:
      "Clinical-stage and early commercial therapeutics, gene editing, diagnostics.",
    benchmarkEtf: "XBI",
  },
  {
    slug: "pharma",
    label: "Pharmaceuticals",
    description:
      "Specialty and large-cap drug developers with marketed products.",
    benchmarkEtf: "XPH",
  },
  {
    slug: "fintech",
    label: "Financial Services & Fintech",
    description:
      "Payments, lending, banking infrastructure, capital markets technology.",
    benchmarkEtf: "XLF",
  },
  {
    slug: "consumer",
    label: "Consumer",
    description:
      "Consumer brands, retail, footwear, apparel, food & beverage.",
    benchmarkEtf: "XLY",
  },
  {
    slug: "industrial",
    label: "Industrial",
    description:
      "Manufacturing, machinery, transportation, defense and aerospace.",
    benchmarkEtf: "XLI",
  },
  {
    slug: "energy",
    label: "Energy",
    description:
      "Oil, gas, renewables, energy infrastructure and services.",
    benchmarkEtf: "XLE",
  },
  {
    slug: "healthcare",
    label: "Healthcare",
    description:
      "Providers, payors, devices, healthcare IT.",
    benchmarkEtf: "XLV",
  },
  {
    slug: "media",
    label: "Communications & Media",
    description:
      "Social platforms, streaming, telecom, advertising, content.",
    benchmarkEtf: "XLC",
  },
];

export function sectorLabel(slug: SectorSlug): string {
  return SECTORS.find((s) => s.slug === slug)?.label || slug;
}

export function sectorEtf(slug: SectorSlug): string | undefined {
  return SECTORS.find((s) => s.slug === slug)?.benchmarkEtf;
}

export function sectorDescription(slug: SectorSlug): string {
  return SECTORS.find((s) => s.slug === slug)?.description || "";
}

/**
 * Classify a filing into a canonical sector by keyword matching on
 * `industry` (preferred) then falling back to `sicCode` major groups.
 * Returns "other" if nothing matches.
 */
export function canonicalSector(f: Filing): SectorSlug {
  const ind = (f.industry || "").toLowerCase();
  const sic = (f.sicCode || "").toString();
  const sicNum = parseInt(sic, 10);

  // Semiconductors
  if (
    /semiconductor|chip|silicon|asic|fabless|foundry/.test(ind) ||
    sic === "3674"
  ) return "semiconductors";

  // Biotech
  if (
    /biotech|bioscience|gene |genomic|therapeutic|clinical/.test(ind) ||
    sic === "2836" || sic === "8731"
  ) return "biotech";

  // Pharma
  if (
    /pharma|drug|medicin/.test(ind) ||
    sic === "2834" || sic === "2835"
  ) return "pharma";

  // Healthcare (providers, devices)
  if (
    /health|hospital|medical device|diagnostics|nursing/.test(ind) ||
    (sicNum >= 8000 && sicNum <= 8099) ||
    (sicNum >= 3840 && sicNum <= 3845)
  ) return "healthcare";

  // Fintech / financial
  if (
    /fintech|payment|bank|insur|capital markets|broker|lending|crypto|exchange/.test(ind) ||
    (sicNum >= 6000 && sicNum <= 6799)
  ) return "fintech";

  // Media / communications
  if (
    /media|advertis|streaming|content|broadcasting|telecom|internet content|social/.test(ind) ||
    (sicNum >= 2710 && sicNum <= 2790) ||
    sic === "7812" ||
    (sicNum >= 4810 && sicNum <= 4899)
  ) return "media";

  // Software & Internet
  if (
    /software|saas|cloud|internet|platform|marketplace|data/.test(ind) ||
    (sicNum >= 7370 && sicNum <= 7379)
  ) return "tech";

  // Consumer
  if (
    /retail|consumer|apparel|footwear|food|beverage|restaurant|hospitality/.test(ind) ||
    (sicNum >= 2000 && sicNum <= 2399) ||
    (sicNum >= 3100 && sicNum <= 3199) ||
    (sicNum >= 5000 && sicNum <= 5999) ||
    (sicNum >= 5800 && sicNum <= 5899)
  ) return "consumer";

  // Energy
  if (
    /energy|oil|gas|renewable|solar|wind|battery|utility/.test(ind) ||
    sic === "1311" || sic === "1381" ||
    (sicNum >= 4900 && sicNum <= 4939)
  ) return "energy";

  // Industrial (catch-all manufacturing / transport)
  if (
    /industrial|manufactur|aerospace|defense|transport|machinery|construction|chemical|materials/.test(ind) ||
    (sicNum >= 2400 && sicNum <= 2700) ||
    (sicNum >= 2800 && sicNum <= 2899) ||
    (sicNum >= 3300 && sicNum <= 3499) ||
    (sicNum >= 3500 && sicNum <= 3590) ||
    (sicNum >= 3600 && sicNum <= 3670) ||
    (sicNum >= 3700 && sicNum <= 3799) ||
    (sicNum >= 4000 && sicNum <= 4790)
  ) return "industrial";

  return "other";
}
