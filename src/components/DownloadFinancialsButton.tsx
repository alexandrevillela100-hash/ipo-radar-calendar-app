import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import type {
  Filing,
  PnLRow,
  BalanceSheetRow,
  CashFlowRow,
  CapTableRow,
} from "@/lib/filingsClient";
import { hasFinancialsDeep } from "@/lib/filingsClient";

/**
 * DownloadFinancialsButton — generates and downloads an XLSX workbook
 * for the current filing, populated from filing.financialsDeep.
 *
 * Save as:  calendar-app/src/components/DownloadFinancialsButton.tsx
 *
 * Workbook structure:
 *   - Sheet 1: Cover   — company, ticker, source, generation timestamp
 *   - Sheet 2: P&L     — income statement, FYs across columns
 *   - Sheet 3: BS      — balance sheet, FYs across columns
 *   - Sheet 4: CF      — cash flow, FYs across columns
 *   - Sheet 5: CapTable — one row per holder/group at IPO
 *
 * Returns null when the filing has no financialsDeep data at all
 * (parent can decide to hide vs. show disabled state).
 *
 * Requires:
 *   - xlsx (SheetJS) ^0.18 — add to package.json dependencies
 */

interface Props {
  filing: Filing;
  variant?: "primary" | "ghost";
}

// ─── Field labels for each sheet ────────────────────────────────────

const PNL_FIELDS: Array<[keyof PnLRow, string, "label" | "money" | "eps"]> = [
  ["revenue", "Revenue", "money"],
  ["costOfRevenue", "Cost of revenue", "money"],
  ["grossProfit", "Gross profit", "money"],
  ["researchDev", "R&D", "money"],
  ["salesMarketing", "Sales & marketing", "money"],
  ["generalAdmin", "G&A", "money"],
  ["totalOpex", "Total operating expense", "money"],
  ["operatingIncome", "Operating income", "money"],
  ["interestNet", "Interest income (expense), net", "money"],
  ["otherIncome", "Other income (expense)", "money"],
  ["preTaxIncome", "Pre-tax income", "money"],
  ["tax", "Income tax (expense) benefit", "money"],
  ["netIncome", "Net income (loss)", "money"],
  ["basicEPS", "Basic EPS ($)", "eps"],
  ["dilutedEPS", "Diluted EPS ($)", "eps"],
];

const BS_FIELDS: Array<[keyof BalanceSheetRow, string]> = [
  ["cashEquivalents", "Cash & equivalents"],
  ["shortTermInvestments", "Short-term investments"],
  ["accountsReceivable", "Accounts receivable"],
  ["inventory", "Inventory"],
  ["otherCurrentAssets", "Other current assets"],
  ["totalCurrentAssets", "Total current assets"],
  ["propertyEquipment", "Property & equipment, net"],
  ["goodwill", "Goodwill"],
  ["intangibles", "Intangible assets"],
  ["otherLTAssets", "Other long-term assets"],
  ["totalAssets", "Total assets"],
  ["accountsPayable", "Accounts payable"],
  ["accruedLiabilities", "Accrued liabilities"],
  ["currentDebt", "Current portion of debt"],
  ["deferredRevenueCurrent", "Deferred revenue (current)"],
  ["totalCurrentLiabilities", "Total current liabilities"],
  ["longTermDebt", "Long-term debt"],
  ["otherLTLiabilities", "Other long-term liabilities"],
  ["totalLiabilities", "Total liabilities"],
  ["commonStock", "Common stock"],
  ["additionalPaidInCapital", "Additional paid-in capital"],
  ["accumulatedDeficit", "Accumulated deficit"],
  ["totalEquity", "Total stockholders' equity"],
];

const CF_FIELDS: Array<[keyof CashFlowRow, string]> = [
  ["netIncome", "Net income (loss)"],
  ["depreciationAmort", "Depreciation & amortization"],
  ["stockBasedComp", "Stock-based compensation"],
  ["workingCapital", "Change in working capital"],
  ["otherOperating", "Other operating items"],
  ["cfo", "Cash from operating activities"],
  ["capex", "Capital expenditures"],
  ["acquisitions", "Acquisitions"],
  ["otherInvesting", "Other investing"],
  ["cfi", "Cash from investing activities"],
  ["stockIssuance", "Stock issuance (net)"],
  ["stockBuybacks", "Stock buybacks"],
  ["debtNet", "Debt issuance (repayment), net"],
  ["dividends", "Dividends paid"],
  ["otherFinancing", "Other financing"],
  ["cff", "Cash from financing activities"],
  ["netChangeInCash", "Net change in cash"],
];

const TOTAL_ROW_KEYS = new Set([
  "grossProfit",
  "totalOpex",
  "operatingIncome",
  "preTaxIncome",
  "netIncome",
  "totalCurrentAssets",
  "totalAssets",
  "totalCurrentLiabilities",
  "totalLiabilities",
  "totalEquity",
  "cfo",
  "cfi",
  "cff",
  "netChangeInCash",
]);

// ─── Workbook builder ───────────────────────────────────────────────

function buildCoverSheet(filing: Filing): XLSX.WorkSheet {
  const fd = filing.financialsDeep;
  const rows: (string | number | null)[][] = [
    ["IPO Radar — Financial Workbook"],
    [],
    ["Company", filing.companyName],
    ["Ticker", filing.ticker || "—"],
    ["Exchange", filing.exchange || "—"],
    ["Industry", filing.industry || "—"],
    [
      "Filing",
      `${filing.filingType} filed ${filing.filingDate}`,
    ],
    ["IPO date", filing.pricing?.ipoDate || "—"],
    ["Offer price", filing.pricing?.offerPrice ? `$${filing.pricing.offerPrice}` : "—"],
    [
      "Gross proceeds",
      filing.grossProceedsM ? `$${filing.grossProceedsM}M` : "—",
    ],
    [],
    ["Source", fd?.source || "—"],
    ["Currency", fd?.currency || "USD"],
    ["Fiscal year end", fd?.fiscalYearEnd || "—"],
    ["Last updated", fd?.lastUpdated || "—"],
    ["Generated", new Date().toISOString()],
    [],
    [
      "Notes",
      "All money figures in millions unless noted. EPS in $ per share.",
    ],
    [
      "",
      "Source data is extracted from the company's S-1 / F-1 prospectus. AI-assisted; verify all numbers before use.",
    ],
    [
      "",
      "This workbook is not investment advice. IPO Radar is a research tool — readers must form their own conclusions.",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 22 }, { wch: 80 }];
  return ws;
}

function buildPnLSheet(filing: Filing): XLSX.WorkSheet | null {
  const rows = filing.financialsDeep?.pnl ?? [];
  if (rows.length === 0) return null;

  // Header row: blank, then FY columns
  const header: (string | number)[] = ["($ in millions)"];
  for (const r of rows) header.push(r.fy);

  const grid: (string | number | null)[][] = [
    ["Income Statement — P&L"],
    [],
    header,
  ];

  for (const [key, label, kind] of PNL_FIELDS) {
    const dataRow: (string | number | null)[] = [label];
    for (const r of rows) {
      const v = (r as PnLRow)[key];
      if (v === undefined || v === null) {
        dataRow.push(null);
      } else if (kind === "eps") {
        dataRow.push(typeof v === "number" ? Number(v.toFixed(2)) : v);
      } else {
        dataRow.push(typeof v === "number" ? Math.round(v as number) : v);
      }
    }
    grid.push(dataRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(grid);
  setColumnWidths(ws, rows.length, 28, 14);
  return ws;
}

function buildBalanceSheetSheet(filing: Filing): XLSX.WorkSheet | null {
  const rows = filing.financialsDeep?.balanceSheet ?? [];
  if (rows.length === 0) return null;

  const header: (string | number)[] = ["($ in millions)"];
  for (const r of rows) header.push(r.fy);

  const grid: (string | number | null)[][] = [
    ["Balance Sheet"],
    [],
    header,
  ];

  for (const [key, label] of BS_FIELDS) {
    const dataRow: (string | number | null)[] = [label];
    for (const r of rows) {
      const v = (r as BalanceSheetRow)[key];
      dataRow.push(
        v === undefined || v === null
          ? null
          : typeof v === "number"
            ? Math.round(v as number)
            : v,
      );
    }
    grid.push(dataRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(grid);
  setColumnWidths(ws, rows.length, 32, 14);
  return ws;
}

function buildCashFlowSheet(filing: Filing): XLSX.WorkSheet | null {
  const rows = filing.financialsDeep?.cashFlow ?? [];
  if (rows.length === 0) return null;

  const header: (string | number)[] = ["($ in millions)"];
  for (const r of rows) header.push(r.fy);

  const grid: (string | number | null)[][] = [
    ["Cash Flow Statement"],
    [],
    header,
  ];

  for (const [key, label] of CF_FIELDS) {
    const dataRow: (string | number | null)[] = [label];
    for (const r of rows) {
      const v = (r as CashFlowRow)[key];
      dataRow.push(
        v === undefined || v === null
          ? null
          : typeof v === "number"
            ? Math.round(v as number)
            : v,
      );
    }
    grid.push(dataRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(grid);
  setColumnWidths(ws, rows.length, 32, 14);
  return ws;
}

function buildCapTableSheet(filing: Filing): XLSX.WorkSheet | null {
  const rows = filing.financialsDeep?.capTable ?? [];
  if (rows.length === 0) return null;

  const grid: (string | number | null)[][] = [
    ["Capitalization — Cap Table at IPO"],
    [],
    [
      "Holder",
      "Type",
      "Shares (M)",
      "% Pre-IPO",
      "% Post-IPO",
      "Lockup (days)",
      "Notes",
    ],
  ];

  let totalShares = 0;
  let totalPctPre = 0;
  let totalPctPost = 0;

  for (const r of rows as CapTableRow[]) {
    grid.push([
      r.holder,
      r.holderType || "—",
      r.sharesM ?? null,
      r.pctPreIPO ?? null,
      r.pctPostIPO ?? null,
      r.lockupDays ?? 180,
      r.notes || "",
    ]);
    totalShares += r.sharesM ?? 0;
    totalPctPre += r.pctPreIPO ?? 0;
    totalPctPost += r.pctPostIPO ?? 0;
  }

  grid.push([]);
  grid.push([
    "Total",
    "",
    Number(totalShares.toFixed(1)),
    Number(totalPctPre.toFixed(1)),
    Number(totalPctPost.toFixed(1)),
    "",
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(grid);
  ws["!cols"] = [
    { wch: 38 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 36 },
  ];
  return ws;
}

function setColumnWidths(
  ws: XLSX.WorkSheet,
  numCols: number,
  firstColWidth: number,
  dataColWidth: number,
) {
  const cols = [{ wch: firstColWidth }];
  for (let i = 0; i < numCols; i++) cols.push({ wch: dataColWidth });
  ws["!cols"] = cols;
}

function safeSlug(s: string): string {
  return (s || "filing")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ─── React component ────────────────────────────────────────────────

export default function DownloadFinancialsButton({
  filing,
  variant = "primary",
}: Props) {
  const [busy, setBusy] = useState(false);

  if (!hasFinancialsDeep(filing)) return null;

  const handleClick = async () => {
    setBusy(true);
    try {
      const wb = XLSX.utils.book_new();

      const coverWs = buildCoverSheet(filing);
      XLSX.utils.book_append_sheet(wb, coverWs, "Cover");

      const pnlWs = buildPnLSheet(filing);
      if (pnlWs) XLSX.utils.book_append_sheet(wb, pnlWs, "P&L");

      const bsWs = buildBalanceSheetSheet(filing);
      if (bsWs) XLSX.utils.book_append_sheet(wb, bsWs, "Balance Sheet");

      const cfWs = buildCashFlowSheet(filing);
      if (cfWs) XLSX.utils.book_append_sheet(wb, cfWs, "Cash Flow");

      const capWs = buildCapTableSheet(filing);
      if (capWs) XLSX.utils.book_append_sheet(wb, capWs, "Cap Table");

      const filename = `${safeSlug(
        filing.ticker || filing.companyName,
      )}-financials.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[DownloadFinancials] failed:", err);
      alert(
        "Could not generate the workbook. Check the browser console for details.",
      );
    } finally {
      setBusy(false);
    }
  };

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 18px",
    fontFamily: '"DM Mono", monospace',
    fontSize: "11px",
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    fontWeight: 500,
    textDecoration: "none",
    borderRadius: "4px",
    cursor: busy ? "wait" : "pointer",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    transition: "background 0.15s ease, color 0.15s ease",
  };

  const styleByVariant =
    variant === "primary"
      ? {
          ...baseStyle,
          background: "#c8a45c",
          color: "#1a1408",
          border: "none",
          fontWeight: 600,
        }
      : {
          ...baseStyle,
          background: "transparent",
          color: "#e4e6e8",
        };

  return (
    <button onClick={handleClick} disabled={busy} style={styleByVariant}>
      {busy ? (
        <Loader2
          size={14}
          style={{ animation: "spin 1s linear infinite" }}
        />
      ) : (
        <FileSpreadsheet size={14} />
      )}
      <span>{busy ? "Generating…" : "Download financials (XLSX)"}</span>
      {!busy ? <Download size={12} style={{ opacity: 0.65 }} /> : null}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
