import type { CSSProperties } from "react";
import { Radar, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";

/**
 * CalendarNavbar v4 — top nav for the calendar-app.
 *
 * Save as:  calendar-app/src/components/CalendarNavbar.tsx (overwrite)
 *
 * Changes from v3:
 *   - Adds Underwriters + Lockups nav items.
 *   - Compare page (/compare/...) is accessible by URL only, not via nav.
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

export default function CalendarNavbar() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
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

        <div style={{ width: "100px" }} aria-hidden="true" />
      </div>
    </nav>
  );
}
