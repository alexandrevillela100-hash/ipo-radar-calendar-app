import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { BarChart3, Loader2, Flame, Snowflake } from "lucide-react";
import Heatmap from "@/components/Heatmap";
import {
  getAllFilings,
  dedupeByCompany,
  canonicalSector,
  sectorLabel,
  formatPct,
  returnColor,
  SECTORS,
  type Filing,
  type SectorSlug,
} from "@/lib/filingsClient";

/**
 * Insights — /insights page with 2D heatmaps.
 *
 * Save as:  calendar-app/src/pages/Insights.tsx
 *
 * Renders two heatmaps (months × sectors):
 *   1. Filing counts — how many IPOs filed by month / sector
 *   2. Average since-IPO return for trading IPOs in each cell
 *
 * Plus a "hot vs. cold sectors" panel computing the most/least active
 * sector by trailing 6-month filings.
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
  red: "#d86060",
  border: "rgba(255, 255, 255, 0.08)",
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

const MONTHS_BACK = 12; // trailing 12 months on the X axis

function monthKey(ymd: string): string | null {
  const d = new Date(ymd);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthAxis(monthsBack: number): { keys: string[]; labels: string[] } {
  const keys: string[] = [];
  const labels: string[] = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    labels.push(
      d.toLocaleDateString("en-US", { month: "short" }) + " " + String(d.getFullYear()).slice(2),
    );
  }
  return { keys, labels };
}

export default function Insights() {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        console.error("[Insights] load failed:", err);
        setError(err?.message || "Failed to load filings");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const deduped = useMemo(() => dedupeByCompany(filings), [filings]);
  const { keys: monthKeys, labels: monthLabels } = useMemo(
    () => buildMonthAxis(MONTHS_BACK),
    [],
  );

  const sectorOrder = SECTORS.map((s) => s.slug);
  const sectorRowLabels = SECTORS.map((s) => s.label);

  // Build counts matrix: rows = sectors, cols = months
  const countsMatrix = useMemo<Array<Array<number | null>>>(() => {
    const matrix: Array<Array<number | null>> = sectorOrder.map(() =>
      monthKeys.map(() => null),
    );
    for (const f of deduped) {
      const key = monthKey(f.filingDate);
      if (!key) continue;
      const ci = monthKeys.indexOf(key);
      if (ci < 0) continue;
      const sector = canonicalSector(f);
      const ri = sectorOrder.indexOf(sector);
      if (ri < 0) continue;
      const cur = matrix[ri][ci];
      matrix[ri][ci] = (cur ?? 0) + 1;
    }
    return matrix;
  }, [deduped, monthKeys, sectorOrder]);

  // Build avg-return matrix (only includes filings with performance data)
  const returnsMatrix = useMemo<Array<Array<number | null>>>(() => {
    const sums: Array<Array<{ sum: number; n: number }>> = sectorOrder.map(() =>
      monthKeys.map(() => ({ sum: 0, n: 0 })),
    );
    for (const f of deduped) {
      const ret = f.performance?.returnSinceIPO;
      if (ret === undefined || ret === null || Number.isNaN(ret)) continue;
      // Use IPO date if present, else filing date
      const refDate = f.pricing?.ipoDate || f.filingDate;
      const key = monthKey(refDate);
      if (!key) continue;
      const ci = monthKeys.indexOf(key);
      if (ci < 0) continue;
      const sector = canonicalSector(f);
      const ri = sectorOrder.indexOf(sector);
      if (ri < 0) continue;
      sums[ri][ci].sum += ret;
      sums[ri][ci].n += 1;
    }
    return sums.map((row) =>
      row.map((c) => (c.n === 0 ? null : c.sum / c.n)),
    );
  }, [deduped, monthKeys, sectorOrder]);

  // Compute hot / cold sectors (trailing 6 months)
  const sectorActivity = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    const counts = new Map<SectorSlug, number>();
    for (const f of deduped) {
      if ((f.filingDate || "") < cutoffIso) continue;
      const s = canonicalSector(f);
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    const ranked = Array.from(counts.entries())
      .filter(([s]) => s !== "other")
      .sort((a, b) => b[1] - a[1]);
    return ranked;
  }, [deduped]);

  // Overall stats
  const overall = useMemo(() => {
    const totalCompanies = deduped.length;
    const trading = deduped.filter(
      (f) => Number.isFinite(f.performance?.returnSinceIPO as number),
    );
    const avgReturn =
      trading.length > 0
        ? trading.reduce(
            (sum, f) => sum + (f.performance?.returnSinceIPO || 0),
            0,
          ) / trading.length
        : undefined;
    const last12mFilings = deduped.filter((f) => {
      const k = monthKey(f.filingDate);
      return k && monthKeys.includes(k);
    });
    return {
      totalCompanies,
      tradingCount: trading.length,
      avgReturn,
      last12mFilingsCount: last12mFilings.length,
    };
  }, [deduped, monthKeys]);

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
            <Loader2 size={20} style={{ marginRight: 10, animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading insights…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ color: "#d86060", padding: "40px 0" }}>Error: {error}</div>
        </div>
      </div>
    );
  }

  const hotSector = sectorActivity[0];
  const coldSector =
    sectorActivity.length >= 2 ? sectorActivity[sectorActivity.length - 1] : null;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLORS.primary,
              marginBottom: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <BarChart3 size={14} /> Insights
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
            The IPO map.
          </h1>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 16,
              fontWeight: 300,
              color: COLORS.fgMuted,
              marginTop: 12,
              maxWidth: 720,
              lineHeight: 1.55,
            }}
          >
            Where the IPO activity is — and how each cohort is performing.
            Trailing {MONTHS_BACK} months across {SECTORS.length} sectors.
          </div>
        </div>

        {/* Top-line stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 32,
          }}
        >
          <StatCard label="Companies tracked" value={String(overall.totalCompanies)} />
          <StatCard
            label="Trading IPOs"
            value={String(overall.tradingCount)}
          />
          <StatCard
            label="Avg since-IPO return"
            value={formatPct(overall.avgReturn)}
            color={returnColor(overall.avgReturn)}
          />
          <StatCard
            label={`Filings last ${MONTHS_BACK}mo`}
            value={String(overall.last12mFilingsCount)}
          />
        </div>

        {/* Hot / cold sector callout */}
        {hotSector || coldSector ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
              marginBottom: 32,
            }}
          >
            {hotSector ? (
              <SectorCallout
                kind="hot"
                sector={hotSector[0]}
                count={hotSector[1]}
              />
            ) : null}
            {coldSector && coldSector[0] !== hotSector?.[0] ? (
              <SectorCallout
                kind="cold"
                sector={coldSector[0]}
                count={coldSector[1]}
              />
            ) : null}
          </div>
        ) : null}

        {/* Filings heatmap */}
        <div style={{ marginBottom: 24 }}>
          <Heatmap
            title="Filing activity"
            subtitle="IPO filings by month & sector"
            rowLabels={sectorRowLabels}
            colLabels={monthLabels}
            data={countsMatrix}
            colorScale="teal"
            format={(v) => v.toFixed(0)}
          />
        </div>

        {/* Returns heatmap */}
        <div style={{ marginBottom: 24 }}>
          <Heatmap
            title="Performance map"
            subtitle="Average since-IPO return by cohort"
            rowLabels={sectorRowLabels}
            colLabels={monthLabels}
            data={returnsMatrix}
            colorScale="diverging"
            format={(v) =>
              `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`
            }
          />
        </div>

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
          Notes: Filing activity counts deduplicated by company (a company
          with S-1 + S-1/A counts as one). Performance map aggregates the
          since-IPO return for every cohort entry that has price history;
          cells where no companies have priced yet show as empty.
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLORS.fgMuted,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.serif,
          fontSize: 26,
          fontWeight: 500,
          color: color || COLORS.fg,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectorCallout({
  kind,
  sector,
  count,
}: {
  kind: "hot" | "cold";
  sector: SectorSlug;
  count: number;
}) {
  const color = kind === "hot" ? COLORS.gold : COLORS.fgMuted;
  const Icon = kind === "hot" ? Flame : Snowflake;
  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Icon size={11} /> {kind === "hot" ? "Hot sector" : "Cooling sector"}
      </div>
      <div
        style={{
          fontFamily: FONTS.serif,
          fontSize: 24,
          fontWeight: 500,
          color: COLORS.fg,
          marginBottom: 4,
        }}
      >
        {sectorLabel(sector)}
      </div>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          color: COLORS.fgMuted,
          letterSpacing: "0.04em",
        }}
      >
        {count} {count === 1 ? "filing" : "filings"} in the last 6 months
      </div>
    </div>
  );
}
