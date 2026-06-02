import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "wouter";
import { ArrowLeftRight, ChevronDown, Search } from "lucide-react";
import { getAllFilings, dedupeByCompany, type Filing } from "@/lib/filingsClient";

/**
 * CompareWithButton — small dropdown that lets the user pick another
 * filing to compare the current one against. Navigates to
 * /compare/<currentSlug>/vs/<otherSlug>.
 *
 * Save as:  calendar-app/src/components/CompareWithButton.tsx
 *
 * Lazy-loads the list of filings on first open. Filters out the
 * current filing and any filings without a reportSlug (so they're
 * actually navigable).
 */

const COLORS = {
  fg: "#e4e6e8",
  fgMuted: "#8b9099",
  fgDim: "#5b6068",
  primary: "#03c8b5",
  bgCard: "#131820",
  bgCard2: "#181f28",
  border: "rgba(255, 255, 255, 0.08)",
};

const FONTS = {
  mono: '"DM Mono", "JetBrains Mono", "SF Mono", Consolas, monospace',
  sans: '"Barlow", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface Props {
  currentFiling: Filing;
}

export default function CompareWithButton({ currentFiling }: Props) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [open]);

  // Close on escape.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [open]);

  // Lazy-load filings the first time the dropdown opens.
  useEffect(() => {
    if (!open || filings !== null) return;
    let cancelled = false;
    getAllFilings()
      .then((rows) => {
        if (cancelled) return;
        const deduped = dedupeByCompany(rows).filter(
          (f) =>
            f.reportSlug &&
            f.reportSlug !== currentFiling.reportSlug &&
            f._id !== currentFiling._id,
        );
        // Sort: trading filings first (most interesting comparisons), then by date desc
        deduped.sort((a, b) => {
          const aTrading = a.performance?.currentPrice ? 1 : 0;
          const bTrading = b.performance?.currentPrice ? 1 : 0;
          if (aTrading !== bTrading) return bTrading - aTrading;
          return (b.filingDate || "").localeCompare(a.filingDate || "");
        });
        setFilings(deduped);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[CompareWithButton] load failed:", err);
        setFilings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, filings, currentFiling]);

  // Auto-focus the filter input on open.
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = (filings || []).filter((f) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      f.companyName?.toLowerCase().includes(q) ||
      f.ticker?.toLowerCase().includes(q)
    );
  });

  const buttonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 18px",
    background: "transparent",
    color: COLORS.fg,
    fontFamily: FONTS.mono,
    fontSize: 11,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontWeight: 500,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    cursor: "pointer",
    transition: "border-color 0.15s ease, color 0.15s ease",
  };

  const dropdownStyle: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    minWidth: 320,
    maxWidth: 400,
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
    zIndex: 60,
    overflow: "hidden",
  };

  if (!currentFiling.reportSlug) return null;

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={buttonStyle}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.borderColor =
            COLORS.primary)
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.borderColor =
            COLORS.border)
        }
      >
        <ArrowLeftRight size={14} />
        Compare with…
        <ChevronDown size={12} style={{ opacity: 0.65 }} />
      </button>

      {open ? (
        <div style={dropdownStyle}>
          {/* Filter input */}
          <div
            style={{
              padding: 10,
              borderBottom: `1px solid ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: COLORS.bgCard2,
            }}
          >
            <Search size={14} style={{ color: COLORS.fgMuted }} />
            <input
              ref={inputRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by company or ticker…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: COLORS.fg,
                fontFamily: FONTS.sans,
                fontSize: 13,
              }}
            />
          </div>

          {/* Results */}
          <div
            style={{
              maxHeight: 360,
              overflowY: "auto",
            }}
          >
            {filings === null ? (
              <div
                style={{
                  padding: 20,
                  color: COLORS.fgMuted,
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  color: COLORS.fgDim,
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                No matches
              </div>
            ) : (
              filtered.slice(0, 30).map((f) => {
                const targetSlug = f.reportSlug!;
                const sourceSlug = currentFiling.reportSlug!;
                return (
                  <button
                    key={f._id}
                    onClick={() => {
                      navigate(
                        `/compare/${encodeURIComponent(sourceSlug)}/vs/${encodeURIComponent(targetSlug)}`,
                      );
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "transparent",
                      border: "none",
                      borderBottom: `1px solid rgba(255, 255, 255, 0.04)`,
                      color: COLORS.fg,
                      fontFamily: FONTS.sans,
                      fontSize: 13,
                      fontWeight: 300,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        COLORS.bgCard2)
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "transparent")
                    }
                  >
                    <span>{f.companyName}</span>
                    {f.ticker ? (
                      <span
                        style={{
                          fontFamily: FONTS.mono,
                          fontSize: 10,
                          letterSpacing: "0.06em",
                          color: COLORS.primary,
                        }}
                      >
                        {f.ticker}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
