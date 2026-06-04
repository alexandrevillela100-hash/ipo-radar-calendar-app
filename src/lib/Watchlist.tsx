import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Link } from "wouter";
import { Star, Mail, Check, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import {
  getFilingsBySlugs,
  filingTypeColor,
  formatPct,
  returnColor,
  formatMoneyM,
  pipelineStage,
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGE_COLOR,
  type Filing,
} from "@/lib/filingsClient";
import StarButton from "@/components/StarButton";
import {
  loadWatchlist,
  onWatchlistChange,
  clearWatchlist,
} from "@/lib/watchlistStorage";

/**
 * Watchlist — /watchlist page.
 *
 * Save as:  calendar-app/src/pages/Watchlist.tsx
 *
 * Shows starred filings with live performance data. Optional email
 * subscription form at top — POSTs to /api/watchlist-subscribe so a
 * daily cron can fire alerts via notify-watchlists.js.
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

const LOCAL_EMAIL_KEY = "ipo-radar-watchlist-email-v1";

export default function Watchlist() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  // Initial load + subscribe to changes
  useEffect(() => {
    setSlugs(loadWatchlist());
    const unsub = onWatchlistChange((next) => setSlugs(next));
    return unsub;
  }, []);

  // Fetch filings whenever slugs change
  useEffect(() => {
    let cancelled = false;
    if (slugs.length === 0) {
      setFilings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getFilingsBySlugs(slugs)
      .then((rows) => {
        if (cancelled) return;
        setFilings(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("[Watchlist] load failed:", err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slugs]);

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLORS.gold,
              marginBottom: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Star size={14} fill={COLORS.gold} /> Your watchlist
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
            Names to watch.
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
            Star any company on its fact sheet to add it here. Lives in your
            browser by default — subscribe with an email below to also get
            daily alerts when something material changes on your starred
            names.
          </div>
        </div>

        {/* Email subscription form */}
        <SubscribeForm slugs={slugs} />

        {/* Filings list or empty state */}
        {slugs.length === 0 ? (
          <EmptyState />
        ) : loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 0",
              color: COLORS.fgMuted,
            }}
          >
            <Loader2
              size={18}
              style={{ marginRight: 10, animation: "spin 1s linear infinite" }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading…
          </div>
        ) : (
          <FilingsList filings={filings} />
        )}

        {/* Footer actions */}
        {slugs.length > 0 ? (
          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: FONTS.mono,
              fontSize: 11,
              color: COLORS.fgDim,
            }}
          >
            <span>{slugs.length} {slugs.length === 1 ? "name" : "names"} watched</span>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Remove all names from your watchlist? This cannot be undone.",
                  )
                ) {
                  clearWatchlist();
                }
              }}
              style={{
                background: "transparent",
                border: `1px solid ${COLORS.border}`,
                color: COLORS.fgMuted,
                fontFamily: FONTS.mono,
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "8px 14px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: "56px 40px",
        textAlign: "center",
      }}
    >
      <Star
        size={32}
        style={{ color: COLORS.fgDim, marginBottom: 16 }}
        strokeWidth={1.5}
      />
      <div
        style={{
          fontFamily: FONTS.serif,
          fontSize: 26,
          fontWeight: 500,
          marginBottom: 12,
        }}
      >
        No names yet.
      </div>
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: 14,
          color: COLORS.fgMuted,
          fontWeight: 300,
          marginBottom: 24,
          maxWidth: 480,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.6,
        }}
      >
        Visit any fact sheet and tap the <strong style={{ color: COLORS.gold }}>★ Watch</strong> button
        to add a company here. The list lives in your browser — no account needed.
      </div>
      <Link
        href="/pipeline"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 22px",
          background: COLORS.primary,
          color: "#001512",
          fontFamily: FONTS.mono,
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 600,
          textDecoration: "none",
          borderRadius: 4,
        }}
      >
        Browse the pipeline <ArrowRight size={12} />
      </Link>
    </div>
  );
}

// ─── Subscribe form ─────────────────────────────────────────────────

function SubscribeForm({ slugs }: { slugs: string[] }) {
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LOCAL_EMAIL_KEY);
    if (stored) {
      setEmail(stored);
      setSavedEmail(stored);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (slugs.length === 0) {
      setFeedback({
        kind: "error",
        message:
          "Star at least one company first — there's nothing to subscribe to yet.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const resp = await fetch("/api/watchlist-subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), slugs }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      window.localStorage.setItem(LOCAL_EMAIL_KEY, email.trim());
      setSavedEmail(email.trim());
      setFeedback({
        kind: "success",
        message: `Subscribed. You'll get an email when any of your ${slugs.length} ${slugs.length === 1 ? "name" : "names"} has a material change.`,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Watchlist] subscribe failed:", err);
      setFeedback({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not subscribe. Try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isExistingSub = savedEmail && savedEmail === email.trim();
  const buttonLabel = isExistingSub ? "Update subscription" : "Subscribe to alerts";

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <Mail size={18} style={{ color: COLORS.primary, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <label
          htmlFor="watchlist-email"
          style={{
            display: "block",
            fontFamily: FONTS.mono,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: COLORS.fgMuted,
            marginBottom: 4,
          }}
        >
          Email alerts (optional)
        </label>
        <input
          id="watchlist-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourdomain.com"
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: COLORS.fg,
            fontFamily: FONTS.sans,
            fontSize: 16,
            width: "100%",
            padding: 0,
            fontWeight: 300,
          }}
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !email.trim()}
        style={{
          padding: "12px 22px",
          background: submitting ? "transparent" : COLORS.gold,
          color: submitting ? COLORS.fg : "#1a1408",
          border: submitting ? `1px solid ${COLORS.border}` : "none",
          fontFamily: FONTS.mono,
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 600,
          borderRadius: 4,
          cursor: submitting ? "wait" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          opacity: !email.trim() ? 0.5 : 1,
        }}
      >
        {submitting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : null}
        {buttonLabel}
      </button>

      {feedback ? (
        <div
          style={{
            flexBasis: "100%",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            color:
              feedback.kind === "success" ? COLORS.primary : COLORS.red,
            fontFamily: FONTS.mono,
            fontSize: 11,
            letterSpacing: "0.04em",
            lineHeight: 1.55,
          }}
        >
          {feedback.kind === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
          <span>{feedback.message}</span>
        </div>
      ) : null}
    </form>
  );
}

// ─── Filings list ───────────────────────────────────────────────────

function FilingsList({ filings }: { filings: Filing[] }) {
  return (
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
            <Th>{""}</Th>
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
          {filings.map((f) => {
            const stage = pipelineStage(f);
            const accent = filingTypeColor(f.filingType);
            const stageColor = PIPELINE_STAGE_COLOR[stage];
            const href = f.reportSlug
              ? `/fact-sheet/${encodeURIComponent(f.reportSlug)}`
              : null;
            return (
              <tr key={f._id} style={{ borderTop: `1px solid ${COLORS.borderSubtle}` }}>
                <Td>
                  <StarButton slug={f.reportSlug} variant="icon" size={14} />
                </Td>
                <Td>
                  {href ? (
                    <Link
                      href={href}
                      style={{
                        color: COLORS.fg,
                        textDecoration: "none",
                        fontFamily: FONTS.sans,
                      }}
                    >
                      {f.companyName}
                    </Link>
                  ) : (
                    f.companyName
                  )}
                </Td>
                <Td mono color={COLORS.primary}>{f.ticker || "—"}</Td>
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
                <Td right mono>{f.filingDate || "—"}</Td>
                <Td right mono>
                  {f.grossProceedsM ? formatMoneyM(f.grossProceedsM) : "—"}
                </Td>
                <Td right mono color={returnColor(f.performance?.returnSinceIPO)}>
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
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
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
  children, right, mono, color,
}: {
  children?: React.ReactNode; right?: boolean; mono?: boolean; color?: string;
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
