import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "wouter";
import { Search, X, Building2, Layers, Briefcase, Hash } from "lucide-react";
import {
  getAllFilings,
  dedupeByCompany,
  normalizeUnderwriter,
  underwriterSlug,
  SECTORS,
  type Filing,
} from "@/lib/filingsClient";

/**
 * SearchPalette — Cmd+K command palette.
 *
 * Save as:  calendar-app/src/components/SearchPalette.tsx
 *
 * Triggered by:
 *   - Cmd/Ctrl + K (global keyboard listener)
 *   - The button rendered alongside SearchTrigger (separate component)
 *
 * Searches across:
 *   - Companies (by name + ticker)
 *   - Sectors (by label)
 *   - Underwriters (by name)
 *
 * Keyboard:
 *   - Arrow up/down to navigate
 *   - Enter to go
 *   - Esc to close
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

interface Result {
  kind: "company" | "sector" | "underwriter";
  label: string;
  sublabel?: string;
  href: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchPalette({ open, onClose }: Props) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Lazy-load filings on first open
  useEffect(() => {
    if (!open || filings !== null) return;
    let cancelled = false;
    getAllFilings()
      .then((rows) => {
        if (cancelled) return;
        setFilings(dedupeByCompany(rows));
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[SearchPalette] load failed:", err);
        setFilings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, filings]);

  // Focus the input and reset state on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build the result list
  const results = useMemo<Result[]>(() => {
    if (!query || !filings) return [];
    const q = query.toLowerCase();
    const out: Result[] = [];

    // Companies (max 6)
    for (const f of filings) {
      const name = (f.companyName || "").toLowerCase();
      const ticker = (f.ticker || "").toLowerCase();
      if (name.includes(q) || ticker.includes(q)) {
        if (f.reportSlug) {
          out.push({
            kind: "company",
            label: f.companyName,
            sublabel:
              [
                f.ticker ? `${f.exchange || ""}: ${f.ticker}`.trim() : null,
                f.industry || null,
              ]
                .filter(Boolean)
                .join(" · ") || undefined,
            href: `/fact-sheet/${encodeURIComponent(f.reportSlug)}`,
          });
        }
      }
      if (out.length >= 6) break;
    }

    // Sectors (max 4)
    let sectorCount = 0;
    for (const s of SECTORS) {
      if (s.label.toLowerCase().includes(q) || s.slug.includes(q)) {
        out.push({
          kind: "sector",
          label: s.label,
          sublabel: `Sector · ${s.benchmarkEtf}`,
          href: `/sector/${s.slug}`,
        });
        sectorCount++;
        if (sectorCount >= 4) break;
      }
    }

    // Underwriters (max 4)
    const banks = new Set<string>();
    for (const f of filings) {
      for (const raw of f.leadUnderwriters || []) {
        const n = normalizeUnderwriter(raw);
        if (n) banks.add(n);
      }
    }
    let bankCount = 0;
    for (const b of Array.from(banks).sort()) {
      if (b.toLowerCase().includes(q)) {
        out.push({
          kind: "underwriter",
          label: b,
          sublabel: "Underwriter",
          href: `/underwriters/${underwriterSlug(b)}`,
        });
        bankCount++;
        if (bankCount >= 4) break;
      }
    }

    return out;
  }, [query, filings]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Handle Enter / arrow keys / Esc
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const r = results[activeIdx];
        if (r) {
          navigate(r.href);
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, results, activeIdx, navigate, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector(
      `[data-idx="${activeIdx}"]`,
    ) as HTMLElement | null;
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  if (!open) return null;

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    zIndex: 100,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "12vh",
  };

  const dialogStyle: CSSProperties = {
    width: "92%",
    maxWidth: 640,
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
    overflow: "hidden",
    fontFamily: FONTS.sans,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: COLORS.bgCard2,
          }}
        >
          <Search size={18} style={{ color: COLORS.fgMuted }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies, tickers, sectors, underwriters…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: COLORS.fg,
              fontFamily: FONTS.sans,
              fontSize: 16,
              fontWeight: 300,
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: COLORS.fgDim,
              cursor: "pointer",
              padding: 0,
              display: "flex",
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results / hints */}
        <div
          ref={listRef}
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          {!query ? (
            <div
              style={{
                padding: "28px 22px",
                color: COLORS.fgMuted,
                fontSize: 13,
                fontWeight: 300,
                lineHeight: 1.6,
              }}
            >
              Type to search across the IPO Radar universe.
              <div style={{ marginTop: 12, color: COLORS.fgDim, fontSize: 11 }}>
                Try: "reddit", "RDDT", "semis", "goldman"…
              </div>
            </div>
          ) : results.length === 0 ? (
            <div
              style={{
                padding: "28px 22px",
                color: COLORS.fgDim,
                fontFamily: FONTS.mono,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
              }}
            >
              No matches for "{query}"
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.kind}-${r.href}-${i}`}
                data-idx={i}
                onClick={() => {
                  navigate(r.href);
                  onClose();
                }}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  background:
                    i === activeIdx ? COLORS.bgCard2 : "transparent",
                  border: "none",
                  borderBottom: `1px solid ${COLORS.borderSubtle}`,
                  color: COLORS.fg,
                  fontFamily: FONTS.sans,
                  fontSize: 14,
                  fontWeight: 300,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <KindIcon kind={r.kind} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: COLORS.fg, fontWeight: 400 }}>
                    {r.label}
                  </div>
                  {r.sublabel ? (
                    <div
                      style={{
                        marginTop: 2,
                        color: COLORS.fgMuted,
                        fontFamily: FONTS.mono,
                        fontSize: 10,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {r.sublabel}
                    </div>
                  ) : null}
                </div>
                {i === activeIdx ? (
                  <span
                    style={{
                      color: COLORS.primary,
                      fontFamily: FONTS.mono,
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    Enter ↵
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: "10px 20px",
            borderTop: `1px solid ${COLORS.border}`,
            background: COLORS.bgCard2,
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.fgDim,
            letterSpacing: "0.04em",
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

// ─── Kind icons ─────────────────────────────────────────────────────

function KindIcon({ kind }: { kind: Result["kind"] }) {
  const common = { size: 14, style: { flexShrink: 0 } };
  if (kind === "company")
    return <Building2 {...common} color={COLORS.primary} />;
  if (kind === "sector") return <Layers {...common} color={COLORS.gold} />;
  if (kind === "underwriter")
    return <Briefcase {...common} color={COLORS.fgMuted} />;
  return <Hash {...common} color={COLORS.fgMuted} />;
}
