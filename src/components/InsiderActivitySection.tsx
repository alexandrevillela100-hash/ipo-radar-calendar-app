import type { CSSProperties } from "react";
import { Users, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import {
  formatMoneySigned,
  formatMoneyAbs,
  returnColor,
  insiderActionLabel,
  insiderActionColor,
  type Filing,
  type InsiderTransaction,
} from "@/lib/filingsClient";

/**
 * InsiderActivitySection — fact-sheet section showing Form 4 insider
 * transactions for this name.
 *
 * Save as:  calendar-app/src/components/InsiderActivitySection.tsx
 *
 * Sections:
 *   - 30/90-day rollup tiles (net $, # buys, # sells)
 *   - Compact transaction table (last 10 rows, most recent first)
 *
 * Auto-hides when insiderActivity is missing or has no transactions.
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

const sectionStyle: CSSProperties = {
  padding: "48px 0",
  borderTop: `1px solid ${COLORS.border}`,
};

const containerStyle: CSSProperties = {
  maxWidth: "1080px",
  margin: "0 auto",
  padding: "0 32px",
};

const SHOW_ROWS = 10;

interface Props {
  filing: Filing;
}

export default function InsiderActivitySection({ filing }: Props) {
  const activity = filing.insiderActivity;
  if (!activity) return null;
  const txs = activity.transactions ?? [];
  if (txs.length === 0) {
    // Render a small "no recent insider activity" stub instead of fully
    // hiding the section — gives the user signal that we ARE tracking
    // this name and just found nothing.
    return <EmptyState ticker={activity.ticker} />;
  }

  const top = txs.slice(0, SHOW_ROWS);

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.primary,
            marginBottom: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Users size={14} /> Insider activity
        </div>
        <h2
          style={{
            fontFamily: FONTS.serif,
            fontSize: 36,
            fontWeight: 500,
            color: COLORS.fg,
            margin: 0,
            lineHeight: 1.1,
            marginBottom: 8,
          }}
        >
          What insiders are doing.
        </h2>
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 14,
            color: COLORS.fgMuted,
            marginBottom: 24,
            fontWeight: 300,
            lineHeight: 1.55,
          }}
        >
          Form 4 transactions for directors, officers, and 10%+ holders.
          Source: <span style={{ color: COLORS.fg }}>OpenInsider</span> ·
          aggregated from SEC EDGAR.
        </div>

        {/* Rollup tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <RollupTile
            label="Net last 30 days"
            value={formatMoneySigned(activity.net30dUsd)}
            color={returnColor(activity.net30dUsd ? activity.net30dUsd / 1e6 : 0)}
            sub={`${activity.buys30d ?? 0} buy${activity.buys30d === 1 ? "" : "s"} · ${activity.sells30d ?? 0} sale${activity.sells30d === 1 ? "" : "s"}`}
          />
          <RollupTile
            label="Net last 90 days"
            value={formatMoneySigned(activity.net90dUsd)}
            color={returnColor(activity.net90dUsd ? activity.net90dUsd / 1e6 : 0)}
            sub={`${activity.buys90d ?? 0} buys · ${activity.sells90d ?? 0} sales`}
          />
          <RollupTile
            label="Most recent"
            value={activity.mostRecentTradeDate || "—"}
            sub={`${txs.length} tracked transaction${txs.length === 1 ? "" : "s"}`}
          />
        </div>

        {/* Transactions table */}
        <div
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Insider</Th>
                <Th>Title</Th>
                <Th>Action</Th>
                <Th right>Shares</Th>
                <Th right>Price</Th>
                <Th right>Value</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {top.map((t, i) => (
                <Row key={i} t={t} last={i === top.length - 1} />
              ))}
            </tbody>
          </table>
        </div>

        {txs.length > SHOW_ROWS ? (
          <div
            style={{
              marginTop: 12,
              fontFamily: FONTS.mono,
              fontSize: 10,
              color: COLORS.fgDim,
              letterSpacing: "0.04em",
              textAlign: "right",
            }}
          >
            Showing {SHOW_ROWS} of {txs.length} tracked transactions
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.fgDim,
            letterSpacing: "0.02em",
            lineHeight: 1.55,
          }}
        >
          Codes: P = Purchase, S = Sale, A = Award/Grant, M = Option exercise,
          F = Tax withholding, D = Disposition. Net $ flow includes all coded
          transactions. Updated {activity.lastUpdated ? new Date(activity.lastUpdated).toLocaleDateString() : "—"}.
        </div>
      </div>
    </section>
  );
}

// ─── Empty state ────────────────────────────────────────────────────

function EmptyState({ ticker }: { ticker: string | undefined }) {
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.fgMuted,
            marginBottom: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Users size={14} /> Insider activity
        </div>
        <div
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "24px 28px",
            color: COLORS.fgMuted,
            fontFamily: FONTS.sans,
            fontSize: 14,
            fontWeight: 300,
            lineHeight: 1.55,
          }}
        >
          No recent insider transactions on file for{" "}
          <span style={{ color: COLORS.fg, fontFamily: FONTS.mono }}>{ticker}</span>.
          We refresh daily from OpenInsider — anything new will appear here
          automatically.
        </div>
      </div>
    </section>
  );
}

// ─── Row + Tile ─────────────────────────────────────────────────────

function Row({ t, last }: { t: InsiderTransaction; last: boolean }) {
  const color = insiderActionColor(t.txCode);
  const Icon =
    t.txCode === "P"
      ? TrendingUp
      : t.txCode === "S" || t.txCode === "D"
        ? TrendingDown
        : null;

  const borderBottom = last
    ? "none"
    : `1px solid ${COLORS.borderSubtle}`;

  const cellStyle = {
    padding: "12px 14px",
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.fg,
    fontWeight: 300,
    whiteSpace: "nowrap" as const,
    borderBottom,
  };
  const monoStyle = {
    ...cellStyle,
    fontFamily: FONTS.mono,
    fontSize: 12,
  };
  const monoRightStyle = { ...monoStyle, textAlign: "right" as const };

  return (
    <tr>
      <td style={monoStyle}>{t.tradeDate || "—"}</td>
      <td style={cellStyle}>{t.insider || "—"}</td>
      <td style={{ ...cellStyle, color: COLORS.fgMuted, fontSize: 12 }}>
        {t.title || "—"}
      </td>
      <td style={cellStyle}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: FONTS.mono,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            padding: "3px 8px",
            color,
            background: `${color}22`,
            border: `1px solid ${color}55`,
            borderRadius: 2,
          }}
        >
          {Icon ? <Icon size={10} /> : null}
          {t.txCode || "—"} · {insiderActionLabel(t.txCode)}
        </span>
      </td>
      <td style={monoRightStyle}>
        {Number.isFinite(t.shares)
          ? Math.abs(t.shares as number).toLocaleString("en-US")
          : "—"}
      </td>
      <td style={monoRightStyle}>
        {Number.isFinite(t.price) ? `$${(t.price as number).toFixed(2)}` : "—"}
      </td>
      <td
        style={{
          ...monoRightStyle,
          color: returnColor(
            Number.isFinite(t.valueUsd) ? (t.valueUsd as number) / 1e6 : 0,
          ),
        }}
      >
        {formatMoneyAbs(
          Number.isFinite(t.valueUsd) ? Math.abs(t.valueUsd as number) : undefined,
        )}
      </td>
      <td style={{ ...monoRightStyle, color: COLORS.fgDim }}>
        {t.link ? (
          <a
            href={t.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: COLORS.primary, textDecoration: "none" }}
            aria-label="View on OpenInsider"
            title="View on OpenInsider"
          >
            <ExternalLink size={12} />
          </a>
        ) : null}
      </td>
    </tr>
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
        padding: "14px 14px",
        textAlign: right ? "right" : "left",
        fontFamily: FONTS.mono,
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: COLORS.fgMuted,
        fontWeight: 500,
        whiteSpace: "nowrap",
        borderBottom: `1px solid ${COLORS.borderSubtle}`,
      }}
    >
      {children}
    </th>
  );
}

function RollupTile({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
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
      {sub ? (
        <div
          style={{
            marginTop: 8,
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: COLORS.fgDim,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}
