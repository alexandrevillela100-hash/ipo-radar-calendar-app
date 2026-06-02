import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Radar, ExternalLink, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import SearchPalette from "@/components/SearchPalette";

/**
 * CalendarNavbar v5 — top nav with search palette and Sectors link.
 *
 * Save as:  calendar-app/src/components/CalendarNavbar.tsx (overwrite)
 *
 * Changes from v4:
 *   - Adds Sectors nav item
 *   - Adds Cmd/Ctrl+K search trigger (button + global hotkey)
 *   - Mounts SearchPalette in this component (always available)
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
  gap: "24px",
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
  padding: "6px 10px 6px 10px",
  background: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  color: "rgba(228, 230, 232, 0.6)",
  fontFamily: '"DM Mono", monospace',
  fontSize: 11,
  cursor: "pointer",
};

export default function CalendarNavbar() {
  const [location] = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

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
        // Slash also opens search (Vim-style), only when not typing in a field
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac");
  const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";

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
            <Link href="/ipos" style={linkStyle(isActive("/ipos"))}>
              All IPOs
            </Link>
            <Link
              href="/underwriters"
              style={linkStyle(isActive("/underwriters"))}
            >
              Underwriters
            </Link>
            <Link href="/lockups" style={linkStyle(isActive("/lockups"))}>
              Lockups
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

          {/* Right side: search trigger */}
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
