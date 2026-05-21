import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import { ArrowRight, Search } from "lucide-react";
import {
  getAllFilings,
  filingTypeColor,
  type Filing,
} from "@/lib/filingsClient";

/**
 * AllIPOs — v3.
 *
 * Save as:  calendar-app/src/pages/AllIPOs.tsx (overwrite)
 *
 * Changes from v2:
 *   - Inline styles (no Tailwind dependency, since the calendar-app
 *     doesn't have Tailwind configured).
 *   - Row link condition loosened: any filing with reportSlug becomes
 *     clickable to /fact-sheet/:slug, regardless of whether an
 *     InitiationReport has been published yet. The fact sheet page
 *     itself renders a minimal version if the report isn't ready.
 *   - CalendarNavbar removed from this file — rendered at App level.
 */

type SortKey = "filingDate" | "companyName" | "filingType" | "industry";
type SortDir = "asc" | "desc";

const FILING_TYPE_OPTIONS = [
  { value: "ALL", label: "All filings" },
  { value: "S-1", label: "S-1" },
  { value: "S-1/A", label: "S-1/A" },
  { value: "F-1", label: "F-1" },
  { value: "F-1/A", label: "F-1/A" },
];

// ─── Inline styles ───────────────────────────────────────────────────

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#0a0d10",
  color: "#e4e6e8",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

const containerStyle: CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
  padding: "0 32px",
};

const eyebrowStyle: CSSProperties = {
  fontFamily: '"DM Mono", monospace',
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: "#03c8b5",
  marginBottom: "16px",
};

const titleStyle: CSSProperties = {
  fontFamily: '"Cormorant Garamond", serif',
  fontWeight: 400,
  fontSize: "clamp(36px, 4.5vw, 60px)",
  lineHeight: 1.05,
  letterSpacing: "-0.01em",
  margin: "0 0 12px 0",
  color: "#e4e6e8",
};

const subtitleStyle: CSSProperties = {
  fontSize: "15px",
  color: "rgba(228,230,232,0.6)",
  maxWidth: "640px",
  fontWeight: 300,
  lineHeight: 1.75,
  margin: 0,
};

const filterRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "16px",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "20px",
};

const searchWrapStyle: CSSProperties = {
  position: "relative",
  flex: "1 1 280px",
  maxWidth: "420px",
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 14px 10px 38px",
  background: "#131820",
  color: "#e4e6e8",
  border: "1px solid rgba(255,255,255,0.1)",
  fontSize: "14px",
  fontWeight: 300,
  outline: "none",
  borderRadius: "2px",
};

const chipsRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: "8px 14px",
    fontFamily: '"DM Mono", monospace',
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    border: `1px solid ${active ? "#03c8b5" : "rgba(255,255,255,0.15)"}`,
    background: active ? "#03c8b5" : "transparent",
    color: active ? "#001512" : "rgba(228,230,232,0.7)",
    borderRadius: "2px",
    cursor: "pointer",
    transition: "all 0.15s",
  };
}

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "4px",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  fontFamily: '"DM Mono", monospace',
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: "rgba(228,230,232,0.55)",
  fontWeight: 400,
  background: "rgba(19,24,32,0.5)",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  whiteSpace: "nowrap",
};

const sortBtnStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  fontFamily: '"DM Mono", monospace',
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontWeight: 400,
  color: "inherit",
  cursor: "pointer",
};

const tdStyle: CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  color: "rgba(228,230,232,0.9)",
};

// ─── Component ───────────────────────────────────────────────────────

export default function AllIPOs() {
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("filingDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    let cancelled = false;
    getAllFilings()
      .then((rows: Filing[]) => {
        if (!cancelled) {
          setFilings(rows);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        console.error("[AllIPOs] fetch failed:", e);
        if (!cancelled) {
          setFilings([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!filings) return [];
    const q = search.trim().toLowerCase();
    let out = filings.filter((f) => {
      if (filterType !== "ALL" && f.filingType !== filterType) return false;
      if (!q) return true;
      const hay = [f.companyName, f.ticker, f.industry]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    out = [...out].sort((a, b) => {
      const va = (a[sortKey] ?? "").toString().toLowerCase();
      const vb = (b[sortKey] ?? "").toString().toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return out;
  }, [filings, search, filterType, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(k);
      setSortDir(k === "filingDate" ? "desc" : "asc");
    }
  }

  function sortIndicator(k: SortKey) {
    if (sortKey !== k) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <div style={pageStyle}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <section style={{ ...containerStyle, paddingTop: "48px", paddingBottom: "32px" }}>
        <div style={eyebrowStyle}>The Pipeline · Full List</div>
        <h1 style={titleStyle}>
          All <em style={{ color: "#03c8b5", fontStyle: "italic" }}>IPOs</em>.
        </h1>
        <p style={subtitleStyle}>
          Every filing we've tracked from SEC EDGAR. Sortable by any column,
          filterable by filing type, searchable by company / ticker / industry.
        </p>
      </section>

      {/* ── Filter row ──────────────────────────────────────────── */}
      <section style={{ ...containerStyle, paddingBottom: "8px" }}>
        <div style={filterRowStyle}>
          <div style={searchWrapStyle}>
            <Search
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                color: "rgba(228,230,232,0.4)",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, ticker, or industry…"
              style={searchInputStyle}
            />
          </div>

          <div style={chipsRowStyle}>
            {FILING_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                style={chipStyle(filterType === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Table ───────────────────────────────────────────────── */}
      <section style={{ ...containerStyle, paddingBottom: "96px" }}>
        {loading ? (
          <div style={{ padding: "96px 0", textAlign: "center", color: "rgba(228,230,232,0.5)", fontFamily: '"DM Mono", monospace', fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            Loading filings…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "96px 0", textAlign: "center", color: "rgba(228,230,232,0.5)", fontFamily: '"DM Mono", monospace', fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            No filings match your filters.
          </div>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>
                    <button onClick={() => toggleSort("companyName")} style={sortBtnStyle}>
                      Company{sortIndicator("companyName")}
                    </button>
                  </th>
                  <th style={thStyle}>Ticker</th>
                  <th style={thStyle}>
                    <button onClick={() => toggleSort("filingType")} style={sortBtnStyle}>
                      Filing type{sortIndicator("filingType")}
                    </button>
                  </th>
                  <th style={thStyle}>
                    <button onClick={() => toggleSort("industry")} style={sortBtnStyle}>
                      Industry{sortIndicator("industry")}
                    </button>
                  </th>
                  <th style={thStyle}>
                    <button onClick={() => toggleSort("filingDate")} style={sortBtnStyle}>
                      Filing date{sortIndicator("filingDate")}
                    </button>
                  </th>
                  <th style={thStyle}>{""}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => {
                  const accent = filingTypeColor(f.filingType);
                  // Loosened: any filing with reportSlug is clickable.
                  // The fact-sheet page renders a minimal version if
                  // the InitiationReport isn't published yet.
                  const href = f.reportSlug
                    ? `/fact-sheet/${encodeURIComponent(f.reportSlug)}`
                    : null;
                  return (
                    <tr
                      key={f._id}
                      style={{ background: "transparent" }}
                    >
                      <td style={tdStyle}>
                        {href ? (
                          <Link
                            href={href}
                            style={{
                              color: "#e4e6e8",
                              textDecoration: "none",
                              fontWeight: 400,
                            }}
                          >
                            {f.companyName}
                          </Link>
                        ) : (
                          f.companyName
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: '"DM Mono", monospace', fontSize: "12px", color: "#03c8b5" }}>
                        {f.ticker || "—"}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            fontFamily: '"DM Mono", monospace',
                            fontSize: "9px",
                            textTransform: "uppercase",
                            letterSpacing: "0.14em",
                            padding: "4px 8px",
                            color: accent,
                            backgroundColor: `${accent}22`,
                            border: `1px solid ${accent}55`,
                            borderRadius: "2px",
                          }}
                        >
                          {f.filingType}
                        </span>
                      </td>
                      <td style={tdStyle}>{f.industry || "—"}</td>
                      <td style={{ ...tdStyle, fontFamily: '"DM Mono", monospace', fontSize: "12px" }}>
                        {f.filingDate || "—"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {href ? (
                          <Link
                            href={href}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              fontFamily: '"DM Mono", monospace',
                              fontSize: "10px",
                              textTransform: "uppercase",
                              letterSpacing: "0.16em",
                              color: "#03c8b5",
                              textDecoration: "none",
                            }}
                          >
                            View
                            <ArrowRight style={{ width: "12px", height: "12px" }} />
                          </Link>
                        ) : (
                          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(228,230,232,0.3)" }}>
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && rows.length > 0 ? (
          <div style={{ marginTop: "16px", fontFamily: '"DM Mono", monospace', fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(228,230,232,0.4)" }}>
            {rows.length} filing{rows.length === 1 ? "" : "s"} ·{" "}
            {filings && rows.length < filings.length ? `${filings.length} total` : "all"}
          </div>
        ) : null}
      </section>
    </div>
  );
}
