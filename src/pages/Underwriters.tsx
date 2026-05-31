import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import { Briefcase, ArrowRight, Loader2 } from "lucide-react";
import {
  getAllFilings,
  dedupeByCompany,
  normalizeUnderwriter,
  underwriterSlug,
  formatPct,
  returnColor,
  formatMoneyM,
  type Filing,
} from "@/lib/filingsClient";

/**
 * Underwriters — league table page.
 *
 * Save as:  calendar-app/src/pages/Underwriters.tsx
 *
 * Aggregates across every filing with a leadUnderwriters array.
 * For each canonical underwriter name, computes:
 *   - # of deals
 *   - Total gross proceeds
 *   - Average first-day pop
 *   - Average current return-since-IPO
 *   - Most recent deal date
 *
 * Sortable. Click an underwriter row → /underwriters/:slug.
 */

const COLORS = {
  bg: "#0a0d10",
  bgCard: "#131820",
  bgCard2: "#181f28",
  fg: "#e4e6e8",
  fgMuted: "#8b9099",
  fgDim: "#5b6068",
  primary: "#03c8b5",
  gold: "#c8a45c",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
};

const FONTS = {
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '"Barlow", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", "SF Mono", Consolas, monospace',
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Barlow:wght@200;300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap";

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: COLORS.bg,
  color: COLORS.fg,
  fontFamily: FONTS.sans,
  paddingTop: "96px",
  paddingBottom: "96px",
};

const containerStyle: CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
  padding: "0 32px",
};

interface UnderwriterRow {
  name: string;
  slug: string;
  deals: number;
  grossProceedsM: number;
  firstDayPopAvg?: number;
  returnSinceIPOAvg?: number;
  mostRecentDate?: string;
  filings: Filing[];
}

type SortKey =
  | "deals"
  | "proceeds"
  | "firstDayPop"
  | "returnSinceIPO"
  | "name";

export default function Underwriters() {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("deals");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllFilings()
      .then((rows) => {
        if (cancelled) return;
        setFilings(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("[Underwriters] failed to load:", err);
        setError(err?.message || "Failed to load filings");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const aggregated = useMemo<UnderwriterRow[]>(() => {
    if (filings.length === 0) return [];

    const deduped = dedupeByCompany(filings);
    const byName = new Map<string, UnderwriterRow>();

    for (const f of deduped) {
      const list = f.leadUnderwriters || [];
      for (const raw of list) {
        const name = normalizeUnderwriter(raw);
        if (!name) continue;
        const existing = byName.get(name) || {
          name,
          slug: underwriterSlug(name),
          deals: 0,
          grossProceedsM: 0,
          firstDayPopAvg: undefined,
          returnSinceIPOAvg: undefined,
          mostRecentDate: undefined,
          filings: [],
        };
        existing.deals += 1;
        existing.grossProceedsM += f.grossProceedsM ?? 0;
        existing.filings.push(f);
        if (
          !existing.mostRecentDate ||
          (f.pricing?.ipoDate || f.filingDate) >
            (existing.mostRecentDate || "")
        ) {
          existing.mostRecentDate =
            f.pricing?.ipoDate || f.filingDate;
        }
        byName.set(name, existing);
      }
    }

    // Compute averages after the aggregation pass.
    for (const row of byName.values()) {
      const pops = row.filings
        .map((f) => f.performance?.firstDayPop)
        .filter((x): x is number => Number.isFinite(x as number));
      const returns = row.filings
        .map((f) => f.performance?.returnSinceIPO)
        .filter((x): x is number => Number.isFinite(x as number));
      if (pops.length > 0) {
        row.firstDayPopAvg = pops.reduce((a, b) => a + b, 0) / pops.length;
      }
      if (returns.length > 0) {
        row.returnSinceIPOAvg =
          returns.reduce((a, b) => a + b, 0) / returns.length;
      }
    }

    return Array.from(byName.values());
  }, [filings]);

  const sorted = useMemo(() => {
    const rows = [...aggregated];
    rows.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortBy) {
        case "deals":
          av = a.deals;
          bv = b.deals;
          break;
        case "proceeds":
          av = a.grossProceedsM;
          bv = b.grossProceedsM;
          break;
        case "firstDayPop":
          av = a.firstDayPopAvg ?? -Infinity;
          bv = b.firstDayPopAvg ?? -Infinity;
          break;
        case "returnSinceIPO":
          av = a.returnSinceIPOAvg ?? -Infinity;
          bv = b.returnSinceIPOAvg ?? -Infinity;
          break;
        case "name":
          av = a.name;
          bv = b.name;
          break;
      }
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [aggregated, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "120px 0",
              color: COLORS.fgMuted,
            }}
          >
            <Loader2
              size={20}
              style={{ marginRight: 10, animation: "spin 1s linear infinite" }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading league table…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ color: "#d86060", padding: "40px 0" }}>
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLORS.primary,
              marginBottom: 12,
            }}
          >
            League Table
          </div>
          <h1
            style={{
              fontFamily: FONTS.serif,
              fontSize: 56,
              fontWeight: 400,
              margin: 0,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}
          >
            Underwriters.
          </h1>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 16,
              fontWeight: 300,
              color: COLORS.fgMuted,
              marginTop: 12,
              maxWidth: 640,
              lineHeight: 1.55,
            }}
          >
            Investment banks ranked by IPO Radar coverage — deal count, proceeds
            raised, first-day pop, current performance. Updated as new
            offerings price.
          </div>
        </div>

        {/* ── League table ─────────────────────────────────────── */}
        {sorted.length === 0 ? (
          <div
            style={{
              padding: "96px 0",
              textAlign: "center",
              color: COLORS.fgDim,
              fontFamily: FONTS.mono,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            No underwriter data available yet. Run the seed-deal-info workflow.
          </div>
        ) : (
          <div
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>{"#"}</Th>
                  <Th sortable onClick={() => toggleSort("name")}>
                    Underwriter
                  </Th>
                  <Th right sortable onClick={() => toggleSort("deals")}>
                    Deals
                  </Th>
                  <Th right sortable onClick={() => toggleSort("proceeds")}>
                    Proceeds
                  </Th>
                  <Th right sortable onClick={() => toggleSort("firstDayPop")}>
                    Avg 1-day
                  </Th>
                  <Th
                    right
                    sortable
                    onClick={() => toggleSort("returnSinceIPO")}
                  >
                    Avg since IPO
                  </Th>
                  <Th right>Most recent</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr
                    key={row.slug}
                    style={{
                      borderTop: `1px solid ${COLORS.borderSubtle}`,
                    }}
                  >
                    <Td muted mono>
                      {i + 1}
                    </Td>
                    <Td>
                      <Link
                        href={`/underwriters/${row.slug}`}
                        style={{
                          color: COLORS.fg,
                          textDecoration: "none",
                          fontFamily: FONTS.sans,
                          fontWeight: 400,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Briefcase size={14} style={{ color: COLORS.primary }} />
                        {row.name}
                      </Link>
                    </Td>
                    <Td right mono>
                      {row.deals}
                    </Td>
                    <Td right mono>
                      {row.grossProceedsM > 0
                        ? formatMoneyM(row.grossProceedsM)
                        : "—"}
                    </Td>
                    <Td right mono color={returnColor(row.firstDayPopAvg)}>
                      {formatPct(row.firstDayPopAvg)}
                    </Td>
                    <Td right mono color={returnColor(row.returnSinceIPOAvg)}>
                      {formatPct(row.returnSinceIPOAvg)}
                    </Td>
                    <Td right mono>
                      {row.mostRecentDate || "—"}
                    </Td>
                    <Td right>
                      <Link
                        href={`/underwriters/${row.slug}`}
                        style={{
                          color: COLORS.primary,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontFamily: FONTS.mono,
                          fontSize: 10,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          textDecoration: "none",
                        }}
                      >
                        View
                        <ArrowRight size={11} />
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.fgDim,
            letterSpacing: "0.02em",
            lineHeight: 1.55,
          }}
        >
          Notes: Each underwriter is credited equally on every deal where they
          appear in the lead underwriter list. Proceeds reflect total deal size;
          actual fees vary by mandate structure. Averages are unweighted across
          deals.
        </div>
      </div>
    </div>
  );
}

// ─── Cell components ────────────────────────────────────────────────

function Th({
  children,
  right,
  sortable,
  onClick,
}: {
  children?: React.ReactNode;
  right?: boolean;
  sortable?: boolean;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={sortable ? onClick : undefined}
      style={{
        padding: "16px 18px",
        textAlign: right ? "right" : "left",
        fontFamily: FONTS.mono,
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: COLORS.fgMuted,
        fontWeight: 500,
        cursor: sortable ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  mono,
  muted,
  color,
}: {
  children?: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  muted?: boolean;
  color?: string;
}) {
  return (
    <td
      style={{
        padding: "16px 18px",
        textAlign: right ? "right" : "left",
        fontFamily: mono ? FONTS.mono : FONTS.sans,
        fontSize: mono ? 12 : 14,
        color: color || (muted ? COLORS.fgDim : COLORS.fg),
        fontWeight: 300,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}
