import type { CSSProperties } from "react";
import { GitCompare, Plus, Minus, ArrowRight } from "lucide-react";
import {
  amendmentChangeColor,
  type Filing,
  type AmendmentChange,
} from "@/lib/filingsClient";

/**
 * AmendmentDiffSection — fact-sheet section that renders Claude's
 * structured comparison of an amendment vs. the prior filing.
 *
 * Save as:  calendar-app/src/components/AmendmentDiffSection.tsx
 *
 * Renders only when filing.amendmentDiff has a summary OR at least
 * one change. Auto-hides otherwise.
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

interface Props {
  filing: Filing;
}

export default function AmendmentDiffSection({ filing }: Props) {
  const diff = filing.amendmentDiff;
  if (!diff) return null;
  if (!diff.summary && (diff.changes?.length ?? 0) === 0) return null;

  const changes = diff.changes ?? [];

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <GitCompare size={14} /> What changed in the amendment
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
          {filing.filingType} vs. {diff.priorFilingType || "prior filing"}.
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
          AI-generated comparison.
          {diff.priorFilingDate ? (
            <>
              {" "}Prior filing dated <span style={{ color: COLORS.fg }}>{diff.priorFilingDate}</span>.
            </>
          ) : null}
          {diff.comparedAt ? (
            <>
              {" · Compared "}
              <span style={{ color: COLORS.fg }}>
                {new Date(diff.comparedAt).toLocaleDateString()}
              </span>
              .
            </>
          ) : null}
        </div>

        {/* Headline summary */}
        {diff.summary ? (
          <div
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `3px solid ${COLORS.gold}`,
              borderRadius: 8,
              padding: "18px 24px",
              marginBottom: 20,
              fontFamily: FONTS.serif,
              fontSize: 19,
              fontStyle: "italic",
              lineHeight: 1.5,
              color: COLORS.fg,
            }}
          >
            {diff.summary}
          </div>
        ) : null}

        {/* Changes list */}
        {changes.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {changes.map((c, i) => (
              <ChangeRow key={i} change={c} />
            ))}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 18,
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.fgDim,
            letterSpacing: "0.02em",
            lineHeight: 1.55,
          }}
        >
          AI-generated comparison. Verify against the official SEC filing
          before acting on any specific change.
        </div>
      </div>
    </section>
  );
}

function ChangeRow({ change }: { change: AmendmentChange }) {
  const color = amendmentChangeColor(change.category);
  const Icon =
    change.direction === "added"
      ? Plus
      : change.direction === "removed"
        ? Minus
        : ArrowRight;

  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: "14px 18px",
        display: "grid",
        gridTemplateColumns: "auto auto 1fr",
        gap: 14,
        alignItems: "start",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          background: `${color}1f`,
          border: `1px solid ${color}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
        }}
      >
        <Icon size={14} />
      </div>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color,
          alignSelf: "center",
          minWidth: 120,
        }}
      >
        {change.category}
      </div>
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: 14,
          color: COLORS.fg,
          fontWeight: 300,
          lineHeight: 1.55,
        }}
      >
        {change.description}
      </div>
    </div>
  );
}
