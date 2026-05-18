import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import {
  getAllFilings,
  filingTypeColor,
  type Filing,
} from "@/lib/filingsClient";

/**
 * AllIPOs — flat, sortable, filterable list of every IPO in Sanity.
 *
 * Route: /ipos
 *
 * Design:
 *   - Header with search bar and filing-type filter chips
 *   - Sortable table: Company | Ticker | Filing type | Industry | Date
 *   - Click a row → /fact-sheet/:slug
 *
 * Pulls via getAllFilings() (full collection — fine up to a few hundred
 * filings; switch to paginated GROQ if it grows beyond that).
 */

type SortKey = "filingDate" | "companyName" | "filingType" | "industry";
type SortDir = "asc" | "desc";

const FILING_TYPE_OPTIONS = [
  { value: "ALL", label: "All filings" },
  { value: "S-1", label: "S-1" },
  { value: "S-1/A", label: "S-1/A" },
  { value: "F-1", label: "F-1" },
  { value: "F-1/A", label: "F-1/A" },
];

export default function AllIPOs() {
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("filingDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    let cancelled = false;
    getAllFilings()
      .then((rows) => !cancelled && (setFilings(rows), setLoading(false)))
      .catch((e) => {
        console.error("[AllIPOs] fetch failed:", e);
        if (!cancelled) (setFilings([]), setLoading(false));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply filters + search + sort
  const rows = useMemo(() => {
    if (!filings) return [];
    const q = search.trim().toLowerCase();
    let out = filings.filter((f) => {
      if (filterType !== "ALL" && f.filingType !== filterType) return false;
      if (!q) return true;
      const hay = [f.companyName, f.ticker, f.industry]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    out = [...out].sort((a, b) => {
      const va = (a[sortKey] ?? "").toString().toLowerCase();
      const vb = (b[sortKey] ?? "").toString().toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return out;
  }, [filings, search, filterType, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(k);
      setSortDir(k === "filingDate" ? "desc" : "asc");
    }
  }

  function sortIndicator(k: SortKey) {
    if (sortKey !== k) return "";
    return sortDir === "asc" ? "↑" : "↓";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Utility bar ─────────────────────────────────────────── */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors no-underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            All IPOs
          </div>
        </div>
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="container pt-16 pb-10">
        <div className="vv-eyebrow mb-4">The Pipeline · Full List</div>
        <h1 className="vv-section-title text-[clamp(36px,4vw,60px)] text-foreground mb-3">
          All <em>IPOs</em>.
        </h1>
        <p className="text-[15px] text-muted-foreground max-w-2xl font-light leading-[1.75]">
          Every filing we've tracked from SEC EDGAR. Sortable by any column,
          filterable by filing type, searchable by company / ticker / industry.
        </p>
      </section>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <section className="container pb-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, ticker, or industry…"
              className="w-full pl-10 pr-3 py-2.5 bg-card border border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 font-light text-sm"
              style={{ borderRadius: "2px" }}
            />
          </div>

          {/* Filing-type chips */}
          <div className="flex flex-wrap gap-2">
            {FILING_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors"
                style={{
                  borderRadius: "2px",
                  color: filterType === opt.value ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  backgroundColor: filterType === opt.value ? "var(--primary)" : "transparent",
                  border: `1px solid ${filterType === opt.value ? "var(--primary)" : "var(--border)"}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Table ───────────────────────────────────────────────── */}
      <section className="container pb-24">
        {loading ? (
          <div className="py-24 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Loading filings…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-24 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            No filings match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto border border-border/40" style={{ borderRadius: "4px" }}>
            <table className="w-full text-[14px]">
              <thead className="bg-card/40 border-b border-border/40">
                <tr>
                  <SortHeader
                    label="Company"
                    active={sortKey === "companyName"}
                    indicator={sortIndicator("companyName")}
                    onClick={() => toggleSort("companyName")}
                  />
                  <Th>Ticker</Th>
                  <SortHeader
                    label="Filing type"
                    active={sortKey === "filingType"}
                    indicator={sortIndicator("filingType")}
                    onClick={() => toggleSort("filingType")}
                  />
                  <SortHeader
                    label="Industry"
                    active={sortKey === "industry"}
                    indicator={sortIndicator("industry")}
                    onClick={() => toggleSort("industry")}
                  />
                  <SortHeader
                    label="Filing date"
                    active={sortKey === "filingDate"}
                    indicator={sortIndicator("filingDate")}
                    onClick={() => toggleSort("filingDate")}
                  />
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => {
                  const accent = filingTypeColor(f.filingType);
                  const href = f.reportSlug
                    ? `/fact-sheet/${encodeURIComponent(f.reportSlug)}`
                    : null;
                  const RowEl: React.ElementType = href ? Link : "div";
                  const rowProps = href
                    ? { href, className: "contents no-underline" }
                    : { className: "contents" };
                  return (
                    <tr
                      key={f._id}
                      className={
                        "border-b border-border/20 transition-colors " +
                        (href ? "hover:bg-card/40 cursor-pointer" : "opacity-70")
                      }
                    >
                      <td className="py-3.5 px-4 text-foreground">
                        {href ? (
                          <Link href={href} className="no-underline text-foreground hover:text-primary transition-colors">
                            {f.companyName}
                          </Link>
                        ) : (
                          f.companyName
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[12px] text-primary">
                        {f.ticker || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className="inline-block font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-1"
                          style={{
                            color: accent,
                            backgroundColor: `${accent}22`,
                            border: `1px solid ${accent}55`,
                            borderRadius: "2px",
                          }}
                        >
                          {f.filingType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-foreground/85">
                        {f.industry || "—"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[12px] text-foreground/85">
                        {f.filingDate || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-primary no-underline"
                          >
                            View
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && rows.length > 0 ? (
          <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {rows.length} filing{rows.length === 1 ? "" : "s"} ·{" "}
            {filings && rows.length < filings.length ? `${filings.length} total` : "all"}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-3 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-normal">
      {children}
    </th>
  );
}

function SortHeader({
  label,
  active,
  indicator,
  onClick,
}: {
  label: string;
  active: boolean;
  indicator: string;
  onClick: () => void;
}) {
  return (
    <th className="text-left py-3 px-4">
      <button
        onClick={onClick}
        className={
          "font-mono text-[10px] uppercase tracking-[0.18em] font-normal hover:text-foreground transition-colors " +
          (active ? "text-foreground" : "text-muted-foreground")
        }
      >
        {label} <span className="ml-1 opacity-70">{indicator}</span>
      </button>
    </th>
  );
}
