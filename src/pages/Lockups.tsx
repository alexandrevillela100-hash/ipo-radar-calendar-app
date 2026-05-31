import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import { Lock, Unlock, Loader2, AlertTriangle } from "lucide-react";
import {
  getAllFilings,
  dedupeByCompany,
  lockupExpiration,
  daysUntilLockup,
  formatPct,
  returnColor,
  type Filing,
} from "@/lib/filingsClient";

/**
 * Lockups — IPO lockup expiration tracker.
 *
 * Save as:  calendar-app/src/pages/Lockups.tsx
 *
 * For every filing with pricing.ipoDate, computes the 180-day post-IPO
 * lockup expiration date and groups entries into:
 *   - Expiring this week (≤ 7 days)
 *   - Expiring this month (≤ 30 days)
 *   - Expiring next month (31-60 days)
 *   - Expiring beyond (61+ days)
 *   - Already expired
 *
 * Each row shows: company, ticker, IPO date, lockup date, days until,
 * current return.
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

type Bucket =
  | "thisWeek"
  | "thisMonth"
  | "nextMonth"
  | "beyond"
  | "expired";

interface BucketDef {
  key: Bucket;
  label: string;
  description: string;
  icon: "alert" | "lock" | "unlock";
  color: string;
  filter: (days: number) => boolean;
}

const BUCKETS: BucketDef[] = [
  {
    key: "thisWeek",
    label: "Expiring this week",
    description: "Insider supply hits the market within 7 days.",
    icon: "alert",
    color: COLORS.red,
    filter: (d) => d >= 0 && d <= 7,
  },
  {
    key: "thisMonth",
    label: "Expiring this month",
    description: "8 to 30 days until lockup unlocks.",
    icon: "alert",
    color: COLORS.gold,
    filter: (d) => d >= 8 && d <= 30,
  },
  {
    key: "nextMonth",
    label: "Next month",
    description: "31 to 60 days out — start watching.",
    icon: "lock",
    color: COLORS.primary,
    filter: (d) => d >= 31 && d <= 60,
  },
  {
    key: "beyond",
    label: "Beyond 60 days",
    description: "Still well inside the lockup window.",
    icon: "lock",
    color: COLORS.fgMuted,
    filter: (d) => d >= 61,
  },
  {
    key: "expired",
    label: "Already expired",
    description: "Lockup released. Insider supply now in the market.",
    icon: "unlock",
    color: COLORS.fgDim,
    filter: (d) => d < 0,
  },
];

export default function Lockups() {
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
        console.error("[Lockups] failed to load:", err);
        setError(err?.message || "Failed to load filings");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byBucket = useMemo(() => {
    const deduped = dedupeByCompany(filings);
    const withLockups = deduped
      .map((f) => {
        const exp = lockupExpiration(f);
        const days = daysUntilLockup(f);
        return exp && days !== undefined ? { filing: f, exp, days } : null;
      })
      .filter((x): x is { filing: Filing; exp: string; days: number } => !!x);

    const buckets: Record<Bucket, Array<typeof withLockups[number]>> = {
      thisWeek: [],
      thisMonth: [],
      nextMonth: [],
      beyond: [],
      expired: [],
    };
    for (const item of withLockups) {
      for (const def of BUCKETS) {
        if (def.filter(item.days)) {
          buckets[def.key].push(item);
          break;
        }
      }
    }
    // Sort within each bucket
    for (const def of BUCKETS) {
      const arr = buckets[def.key];
      arr.sort((a, b) => a.days - b.days);
    }
    return { withLockups, buckets };
  }, [filings]);

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
            Loading lockup schedule…
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

  const totalTracked = byBucket.withLockups.length;

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
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Lock size={14} />
            180-day lockup tracker
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
            Lockup expirations.
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
            When insider-share lockups expire and restricted holders can sell
            for the first time. {totalTracked} IPO{totalTracked === 1 ? "" : "s"}{" "}
            currently tracked. Default lockup = 180 calendar days post-IPO;
            deal-specific overrides supported.
          </div>
        </div>

        {totalTracked === 0 ? (
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
            No filings have pricing.ipoDate set. Run seed-pricing to add IPOs.
          </div>
        ) : (
          BUCKETS.map((def) => {
            const rows = byBucket.buckets[def.key];
            if (rows.length === 0) return null;
            return (
              <BucketSection
                key={def.key}
                def={def}
                items={rows}
              />
            );
          })
        )}

        <div
          style={{
            marginTop: 32,
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.fgDim,
            letterSpacing: "0.02em",
            lineHeight: 1.55,
          }}
        >
          Notes: 180 calendar days is the customary lockup period for US IPOs.
          Some deals use shorter (90d) or staggered lockups; those overrides
          will be honored when added to the filing's pricing block. Lockup
          expiration does not guarantee selling — it just removes the
          contractual restriction.
        </div>
      </div>
    </div>
  );
}

// ─── Bucket section ─────────────────────────────────────────────────

function BucketSection({
  def,
  items,
}: {
  def: BucketDef;
  items: Array<{ filing: Filing; exp: string; days: number }>;
}) {
  const Icon =
    def.icon === "alert" ? AlertTriangle : def.icon === "unlock" ? Unlock : Lock;
  return (
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: def.color,
            fontFamily: FONTS.serif,
            fontSize: 24,
            fontWeight: 500,
          }}
        >
          <Icon size={16} />
          {def.label}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            letterSpacing: "0.14em",
            color: def.color,
            textTransform: "uppercase",
          }}
        >
          {items.length} deal{items.length === 1 ? "" : "s"}
        </div>
      </div>
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: 13,
          color: COLORS.fgMuted,
          fontWeight: 300,
          marginBottom: 14,
        }}
      >
        {def.description}
      </div>

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
              <Th right>IPO date</Th>
              <Th right>Lockup date</Th>
              <Th right>Days</Th>
              <Th right>Return</Th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ filing, exp, days }) => {
              const href = filing.reportSlug
                ? `/fact-sheet/${encodeURIComponent(filing.reportSlug)}`
                : null;
              return (
                <tr
                  key={filing._id}
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
                        {filing.companyName}
                      </Link>
                    ) : (
                      filing.companyName
                    )}
                  </Td>
                  <Td mono color={COLORS.primary}>
                    {filing.ticker || "—"}
                  </Td>
                  <Td right mono>
                    {filing.pricing?.ipoDate || "—"}
                  </Td>
                  <Td right mono color={def.color}>
                    {exp}
                  </Td>
                  <Td right mono color={def.color}>
                    {days >= 0 ? `${days}d` : `${-days}d ago`}
                  </Td>
                  <Td
                    right
                    mono
                    color={returnColor(filing.performance?.returnSinceIPO)}
                  >
                    {formatPct(filing.performance?.returnSinceIPO)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
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
        padding: "14px 16px",
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
