import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Radar,
  ExternalLink,
  Search,
  ChevronDown,
  Star,
  Briefcase,
  Lock,
  GitCompare,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import SearchPalette from "@/components/SearchPalette";

/**
 * CalendarNavbar v6 — top nav with "More" dropdown for specialty pages.
 *
 * Save as:  calendar-app/src/components/CalendarNavbar.tsx (overwrite)
 *
 * Changes from v5:
 *   - Adds Watchlist as a primary nav item (with gold star)
 *   - Adds /diffs, /lockups, /underwriters under a "Trackers ▾" dropdown
 *     to keep the navbar tidy
 *   - Adds /insights as a primary nav item
 */

const LANDING_PAGE_URL = "https://ipo-radar-webp.vercel.app";

const navStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 50,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(10, 13, 16, 0.85)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const containerStyle: CSSProperties = {
  maxWidth: "1400px",
  margin: "0 auto",
  padding: "0 32px",
  height: "64px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const logoStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  textDecoration: "none",
  color: "inherit",
};

const navItemsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "22px",
};

function linkStyle(active: boolean): CSSProperties {
  return {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: "14px",
    textDecoration: "none",
    color: active ? "#03c8b5" : "rgba(228, 230, 232, 0.7)",
    fontWeight: active ? 600 : 400,
    transition: "color 0.15s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
  };
}

const searchTriggerStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  background: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  color: "rgba(228, 230, 232, 0.6)",
  fontFamily: '"DM Mono", monospace',
  fontSize: 11,
  cursor: "pointer",
};

const trackerItems = [
  {
    href: "/diffs",
    label: "Amendments",
    icon: GitCompare,
    description: "What changed in S-1/A filings",
  },
  {
    href: "/lockups",
    label: "Lockups",
    icon: Lock,
    description: "180-day post-IPO expirations",
  },
  {
    href: "/underwriters",
    label: "Underwriters",
    icon: Briefcase,
    description: "Bank league table",
  },
];

export default function CalendarNavbar() {
  const [location] = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [trackersOpen, setTrackersOpen] = useState(false);
  const trackersRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  // Global Cmd/Ctrl+K to open palette
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === "/" && !isInputFocused()) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close trackers dropdown on outside click / escape
  useEffect(() => {
    if (!trackersOpen) return;
    function clickHandler(e: MouseEvent) {
      if (
        trackersRef.current &&
        !trackersRef.current.contains(e.target as Node)
      ) {
        setTrackersOpen(false);
      }
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === "Escape") setTrackersOpen(false);
    }
    document.addEventListener("mousedown", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [trackersOpen]);

  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac");
  const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";

  const trackersActive =
    trackerItems.some((t) => isActive(t.href));

  return (
    <>
      <nav style={navStyle}>
        <div style={containerStyle}>
          <Link href="/" style={logoStyle}>
            <Radar style={{ width: "20px", height: "20px", color: "#03c8b5" }} />
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#e4e6e8" }}>
              IPO Radar{" "}
              <span style={{ color: "#03c8b5", fontWeight: 600 }}>AI</span>
            </span>
          </Link>

          <div style={navItemsStyle}>
            <Link href="/" style={linkStyle(isActive("/"))}>
              Calendar
            </Link>
            <Link href="/pipeline" style={linkStyle(isActive("/pipeline"))}>
              Pipeline
            </Link>
            <Link href="/sectors" style={linkStyle(isActive("/sector"))}>
              Sectors
            </Link>
            <Link href="/insights" style={linkStyle(isActive("/insights"))}>
              Insights
            </Link>
            <Link href="/ipos" style={linkStyle(isActive("/ipos"))}>
              All IPOs
            </Link>

            {/* Trackers dropdown */}
            <div ref={trackersRef} style={{ position: "relative" }}>
              <button
                onClick={() => setTrackersOpen((v) => !v)}
                aria-expanded={trackersOpen}
                style={{
                  ...linkStyle(trackersActive),
                  background: "transparent",
                  border: "none",
                  padding: 0,
                }}
              >
                Trackers <ChevronDown size={12} style={{ opacity: 0.65 }} />
              </button>

              {trackersOpen ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 14px)",
                    left: 0,
                    minWidth: 260,
                    background: "#131820",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                    overflow: "hidden",
                  }}
                >
                  {trackerItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setTrackersOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          textDecoration: "none",
                          color: active ? "#03c8b5" : "#e4e6e8",
                          fontFamily: 'system-ui, sans-serif',
                          fontSize: 13,
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <Icon size={14} style={{ color: "#8b9099", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>{item.label}</div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#8b9099",
                              marginTop: 2,
                              fontFamily: '"DM Mono", monospace',
                              letterSpacing: "0.02em",
                            }}
                          >
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <Link
              href="/watchlist"
              style={{
                ...linkStyle(isActive("/watchlist")),
                color: isActive("/watchlist") ? "#c8a45c" : linkStyle(false).color,
              }}
            >
              <Star size={13} fill={isActive("/watchlist") ? "#c8a45c" : "transparent"} />
              Watchlist
            </Link>
            <a
              href={LANDING_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle(false)}
            >
              Main site
              <ExternalLink
                style={{ width: "12px", height: "12px", opacity: 0.65 }}
              />
            </a>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            style={searchTriggerStyle}
            aria-label="Open search"
            title={`Open search (${shortcutLabel})`}
          >
            <Search size={12} />
            <span>Search</span>
            <kbd
              style={{
                marginLeft: 4,
                padding: "1px 6px",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 3,
                fontSize: 10,
                color: "rgba(228,230,232,0.7)",
              }}
            >
              {shortcutLabel}
            </kbd>
          </button>
        </div>
      </nav>

      <SearchPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).isContentEditable === true
  );
}
