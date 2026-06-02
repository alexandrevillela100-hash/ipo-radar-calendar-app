import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useRoute } from "wouter";
import { Layers, ArrowLeft, ArrowRight, Loader2, Briefcase } from "lucide-react";
import {
  getAllFilings,
  dedupeByCompany,
  canonicalSector,
  sectorLabel,
  sectorEtf,
  sectorDescription,
  filingTypeColor,
  formatPct,
  returnColor,
  formatMoneyM,
  normalizeUnderwriter,
  underwriterSlug,
  pipelineStage,
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGE_COLOR,
  SECTORS,
  type Filing,
  type SectorSlug,
} from "@/lib/filingsClient";

/**
 * Sector — /sector/:slug page.
 *
 * Save as:  calendar-app/src/pages/Sector.tsx
 *
 * Aggregates every filing in a sector. Shows:
 *   - Hero (sector label + description + ETF benchmark callout)
 *   - Summary tiles: # companies, total proceeds, avg first-day pop,
 *     avg since-IPO return
 *   - Top underwriters in the sector
 *   - Filings table (sortable, links to fact sheets)
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
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 32px",
};

export default function Sector() {
  const [match, params] = useRoute("/sector/:slug");
  const slug = (match ? params.slug : null) as SectorSlug | null;

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
        console.error("[Sector] failed to load:", err);
        setError(err?.message || "Failed to load filings");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inSector = useMemo(() => {
    if (!slug) return [];
    const deduped = dedupeByCompany(filings);
    return deduped
      .filter((f) => canonicalSector(f) === slug)
      .sort((a, b) =>
        (b.filingDate || "").localeCompare(a.filingDate || ""),
      );
  }, [filings, slug]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = inSector.length;
    const grossProceeds = inSector.reduce(
      (s, f) => s + (f.grossProceedsM ?? 0),
      0,
    );
    const pops = inSector
      .map((f) => f.performance?.firstDayPop)
      .filter((x): x is number => Number.isFinite(x as number));
    const returns = inSector
      .map((f) => f.performance?.returnSinceIPO)
      .filter((x): x is number => Number.isFinite(x as number));
    const avgPop =
      pops.length > 0
        ? pops.reduce((a, b) => a + b, 0) / pops.length
        : undefined;
    const avgReturn =
      returns.length > 0
        ? returns.reduce((a, b) => a + b, 0) / returns.length
        : undefined;
    return { total, grossProceeds, avgPop, avgReturn };
  }, [inSector]);

  // Top underwriters in sector
  const topBanks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of inSector) {
      for (const raw of f.leadUnderwriters || []) {
        const n = normalizeUnderwriter(raw);
        if (!n) continue;
        counts.set(n, (counts.get(n) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [inSector]);

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
            Loading sector view…
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

  // Unknown sector → list all sectors
  if (!slug || !SECTORS.some((s) => s.slug === slug)) {
    return <SectorsIndex filings={filings} />;
  }

  const label = sectorLabel(slug);
  const desc = sectorDescription(slug);
  const etf = sectorEtf(slug);

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link
          href="/sectors"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: COLORS.primary,
            fontFamily: FONTS.mono,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            textDecoration: "none",
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={12} /> All sectors
        </Link>

        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
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
            <Layers size={14} /> Sector
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
            {label}.
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
            {desc}{" "}
            {etf ? (
              <span style={{ color: COLORS.fg }}>
                Sector benchmark:{" "}
                <span style={{ fontFamily: FONTS.mono, color: COLORS.gold }}>
                  {etf}
                </span>
                .
              </span>
            ) : null}
          </div>
        </div>

        {/* ── Stats ────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 40,
          }}
        >
          <StatCard label="Companies" value={String(stats.total)} />
          <StatCard
            label="Total proceeds"
            value={
              stats.grossProceeds > 0 ? formatMoneyM(stats.grossProceeds) : "—"
            }
          />
          <StatCard
            label="Avg first-day pop"
            value={formatPct(stats.avgPop)}
            color={returnColor(stats.avgPop)}
          />
          <StatCard
            label="Avg since-IPO return"
            value={formatPct(stats.avgReturn)}
            color={returnColor(stats.avgReturn)}
          />
        </div>

        {/* ── Top underwriters ─────────────────────────────────── */}
        {topBanks.length > 0 ? (
          <section style={{ marginBottom: 40 }}>
            <SectionLabel>
              <Briefcase
                size={12}
                style={{ display: "inline-block", marginRight: 6 }}
              />
              Top underwriters in {label.toLowerCase()}
            </SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 10,
              }}
            >
              {topBanks.map(([name, count]) => (
                <Link
                  key={name}
                  href={`/underwriters/${underwriterSlug(name)}`}
                  style={{
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: COLORS.fg,
                    textDecoration: "none",
                    fontFamily: FONTS.sans,
                    fontSize: 14,
                  }}
                >
                  <span>{name}</span>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 11,
                      color: COLORS.primary,
                    }}
                  >
                    {count} {count === 1 ? "deal" : "deals"}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Filings list ─────────────────────────────────────── */}
        {inSector.length === 0 ? (
          <div
            style={{
              padding: "60px 0",
              textAlign: "center",
              color: COLORS.fgDim,
              fontFamily: FONTS.mono,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            No filings classified into this sector yet
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
                  <Th>Company</Th>
                  <Th>Ticker</Th>
                  <Th>Type</Th>
                  <Th>Stage</Th>
                  <Th right>Filed</Th>
                  <Th right>Proceeds</Th>
                  <Th right>Since IPO</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {inSector.map((f) => {
                  const stage = pipelineStage(f);
                  const accent = filingTypeColor(f.filingType);
                  const stageColor = PIPELINE_STAGE_COLOR[stage];
                  const href = f.reportSlug
                    ? `/fact-sheet/${encodeURIComponent(f.reportSlug)}`
                    : null;
                  return (
                    <tr
                      key={f._id}
                      style={{ borderTop: `1px solid ${COLORS.borderSubtle}` }}
                    >
                      <Td>
                        {href ? (
                          <Link
                            href={href}
                            style={{
                              color: COLORS.fg,
                              textDecoration: "none",
                              fontFamily: FONTS.sans,
                              fontWeight: 400,
                            }}
                          >
                            {f.companyName}
                          </Link>
                        ) : (
                          f.companyName
                        )}
                      </Td>
                      <Td mono color={COLORS.primary}>
                        {f.ticker || "—"}
                      </Td>
                      <Td>
                        <span
                          style={{
                            fontFamily: FONTS.mono,
                            fontSize: 9,
                            textTransform: "uppercase",
                            letterSpacing: "0.14em",
                            padding: "3px 7px",
                            color: accent,
                            backgroundColor: `${accent}22`,
                            border: `1px solid ${accent}55`,
                            borderRadius: 2,
                          }}
                        >
                          {f.filingType}
                        </span>
                      </Td>
                      <Td>
                        <span
                          style={{
                            fontFamily: FONTS.mono,
                            fontSize: 9,
                            textTransform: "uppercase",
                            letterSpacing: "0.14em",
                            color: stageColor,
                          }}
                        >
                          {PIPELINE_STAGE_LABEL[stage]}
                        </span>
                      </Td>
                      <Td right mono>
                        {f.filingDate || "—"}
                      </Td>
                      <Td right mono>
                        {f.grossProceedsM ? formatMoneyM(f.grossProceedsM) : "—"}
                      </Td>
                      <Td
                        right
                        mono
                        color={returnColor(f.performance?.returnSinceIPO)}
                      >
                        {formatPct(f.performance?.returnSinceIPO)}
                      </Td>
                      <Td right>
                        {href ? (
                          <Link
                            href={href}
                            style={{
                              color: COLORS.primary,
                              fontFamily: FONTS.mono,
                              fontSize: 10,
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            View <ArrowRight size={11} />
                          </Link>
                        ) : null}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sectors index (when no slug or unknown slug) ───────────────────

function SectorsIndex({ filings }: { filings: Filing[] }) {
  const deduped = dedupeByCompany(filings);
  const countsBySector = new Map<SectorSlug, number>();
  for (const f of deduped) {
    const s = canonicalSector(f);
    countsBySector.set(s, (countsBySector.get(s) || 0) + 1);
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ marginBottom: 32 }}>
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
            <Layers size={14} /> Sectors
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
            Browse by sector.
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
            Every IPO filing classified into a canonical sector. Click in to
            see all companies, top underwriters, and aggregate performance.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {SECTORS.map((s) => {
            const count = countsBySector.get(s.slug) || 0;
            return (
              <Link
                key={s.slug}
                href={`/sector/${s.slug}`}
                style={{
                  background: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "22px 24px",
                  color: COLORS.fg,
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor =
                    COLORS.primary)
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor =
                    COLORS.border)
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONTS.serif,
                      fontSize: 22,
                      fontWeight: 500,
                    }}
                  >
                    {s.label}
                  </div>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 11,
                      color: COLORS.primary,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {count}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 13,
                    color: COLORS.fgMuted,
                    fontWeight: 300,
                    lineHeight: 1.55,
                  }}
                >
                  {s.description}
                </div>
                <div
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 10,
                    color: COLORS.gold,
                    letterSpacing: "0.04em",
                    marginTop: "auto",
                  }}
                >
                  Benchmark · {s.benchmarkEtf}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Cells ──────────────────────────────────────────────────────────

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: COLORS.fgMuted,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function Th({
  children,
  right,
}: {
  children?: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      style={{
        padding: "14px 16px",
        textAlign: right ? "right" : "left",
        fontFamily: FONTS.mono,
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: COLORS.fgMuted,
        fontWeight: 500,
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
  color,
}: {
  children?: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  color?: string;
}) {
  return (
    <td
      style={{
        padding: "12px 16px",
        textAlign: right ? "right" : "left",
        fontFamily: mono ? FONTS.mono : FONTS.sans,
        fontSize: mono ? 12 : 14,
        color: color || COLORS.fg,
        fontWeight: 300,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}
