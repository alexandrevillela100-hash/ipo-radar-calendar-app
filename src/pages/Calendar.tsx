import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Radar } from "lucide-react";
import CalendarGrid from "@/components/CalendarGrid";
import FilterBar from "@/components/FilterBar";
import DetailPanel from "@/components/DetailPanel";
import {
  getAllFilings,
  type Filing,
  type FilingType,
} from "@/lib/filingsClient";
import { todayIso, type MonthRef } from "@/lib/calendarUtils";

/**
 * Calendar — homepage of the calendar-app.
 *
 * Restores the month-grid view with FilterBar + DetailPanel that was
 * the original Manus experience. Adds a prominent "Browse all IPOs"
 * link in the hero so users can jump to the flat sortable list.
 *
 * Layout:
 *   - Hero header with "Browse all IPOs →" CTA
 *   - FilterBar (chips + search)
 *   - Two-column: CalendarGrid (left) + DetailPanel (right)
 *
 * CalendarNavbar is rendered at the App level — don't include it here.
 */

const ALL_FILING_TYPES: FilingType[] = [
  "S-1",
  "S-1/A",
  "F-1",
  "F-1/A",
  "424B",
  "RW",
];

function emptyCountsByType(): Record<FilingType, number> {
  return {
    "S-1": 0,
    "S-1/A": 0,
    "F-1": 0,
    "F-1/A": 0,
    "424B": 0,
    "RW": 0,
  };
}

function initialMonth(): MonthRef {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function Calendar() {
  // ─── Data state ────────────────────────────────────────────────────
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAllFilings()
      .then((rows: Filing[]) => {
        if (!cancelled) {
          setFilings(rows);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        console.error("[Calendar] Sanity fetch failed:", err);
        if (!cancelled) {
          setFilings([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── View state ────────────────────────────────────────────────────
  const [month, setMonth] = useState<MonthRef>(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayIso());
  const [enabledTypes, setEnabledTypes] = useState<Set<FilingType>>(
    new Set(ALL_FILING_TYPES),
  );
  const [search, setSearch] = useState("");

  // ─── Derived data ──────────────────────────────────────────────────

  // Apply filters + search to the full filings list.
  const filteredFilings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filings.filter((f) => {
      if (!enabledTypes.has(f.filingType)) return false;
      if (!q) return true;
      const hay = [f.companyName, f.ticker, f.industry]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filings, enabledTypes, search]);

  // Group filtered filings by filingDate for the calendar grid.
  const filingsByDate = useMemo(() => {
    const map: Record<string, Filing[]> = {};
    for (const f of filteredFilings) {
      const d = f.filingDate;
      if (!d) continue;
      if (!map[d]) map[d] = [];
      map[d].push(f);
    }
    return map;
  }, [filteredFilings]);

  // Counts by type — based on UNFILTERED full list, so the filter
  // chips always show total counts regardless of current selection.
  const countsByType = useMemo(() => {
    const counts = emptyCountsByType();
    for (const f of filings) {
      if (counts[f.filingType] !== undefined) {
        counts[f.filingType] += 1;
      }
    }
    return counts;
  }, [filings]);

  // Filings to show in the detail panel for the currently selected date.
  const selectedDateFilings = selectedDate
    ? filingsByDate[selectedDate] ?? []
    : [];

  // ─── Handlers ──────────────────────────────────────────────────────

  // FilterBar toggles a GROUP of types at once (e.g. "Initial" =
  // [S-1, F-1]). Behaviour: if all types in the group are currently
  // enabled, disable them; otherwise enable them.
  function handleToggleTypes(types: FilingType[]) {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      const allEnabled = types.every((t) => next.has(t));
      if (allEnabled) {
        types.forEach((t) => next.delete(t));
      } else {
        types.forEach((t) => next.add(t));
      }
      return next;
    });
  }

  function handleReset() {
    setEnabledTypes(new Set(ALL_FILING_TYPES));
    setSearch("");
  }

  function handleJumpToToday() {
    const now = new Date();
    setMonth({ year: now.getFullYear(), month: now.getMonth() + 1 });
    setSelectedDate(todayIso());
  }

  const isDefault =
    enabledTypes.size === ALL_FILING_TYPES.length && search.trim() === "";

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background, #0a0d10)",
        color: "var(--foreground, #e4e6e8)",
      }}
    >
      {/* ── Hero header ─────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "48px 32px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 480px" }}>
            <div
              style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "var(--primary, #03c8b5)",
                marginBottom: "16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Radar style={{ width: "12px", height: "12px", opacity: 0.8 }} />
              IPO Calendar · Live
            </div>
            <h1
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontWeight: 400,
                fontSize: "clamp(36px, 4.5vw, 60px)",
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                margin: "0 0 12px 0",
                color: "var(--foreground, #e4e6e8)",
              }}
            >
              The IPO{" "}
              <em style={{ color: "var(--primary, #03c8b5)" }}>pipeline</em>.
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "var(--muted-foreground, #8b9099)",
                maxWidth: "640px",
                fontWeight: 300,
                lineHeight: 1.75,
                margin: 0,
              }}
            >
              Every S-1, F-1, and amendment filed with the SEC, organized by
              date. Use the filter chips and search to narrow the view, click
              any day to inspect that date's filings.
            </p>
          </div>
          <Link
            href="/ipos"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 22px",
              background: "var(--primary, #03c8b5)",
              color: "var(--primary-foreground, #001512)",
              fontFamily: '"DM Mono", monospace',
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              textDecoration: "none",
              borderRadius: "2px",
              whiteSpace: "nowrap",
            }}
          >
            Browse all IPOs
            <ArrowRight style={{ width: "14px", height: "14px" }} />
          </Link>
        </div>
      </section>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 32px 16px",
        }}
      >
        <FilterBar
          enabledTypes={enabledTypes}
          onToggleTypes={handleToggleTypes}
          search={search}
          onSearchChange={setSearch}
          countsByType={countsByType}
          onReset={handleReset}
          isDefault={isDefault}
        />
      </section>

      {/* ── Calendar grid + detail panel ────────────────────────── */}
      <section
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 32px 64px",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "96px 0",
              textAlign: "center",
              fontFamily: '"DM Mono", monospace',
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--muted-foreground, #8b9099)",
            }}
          >
            Loading filings…
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "24px",
              gridTemplateColumns: "minmax(0, 1fr)",
            }}
            className="calendar-layout"
          >
            <CalendarGrid
              month={month}
              onMonthChange={setMonth}
              filingsByDate={filingsByDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onJumpToToday={handleJumpToToday}
            />
            <DetailPanel
              selectedDate={selectedDate}
              filings={selectedDateFilings}
            />
          </div>
        )}
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border, rgba(255,255,255,0.08))",
          padding: "40px 32px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            textAlign: "center",
            fontFamily: '"DM Mono", monospace',
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "var(--muted-foreground, #8b9099)",
            opacity: 0.6,
          }}
        >
          Source: SEC EDGAR · IPO Radar by Velocia Ventures
        </div>
      </footer>

      {/* Two-column layout on wider screens */}
      <style>{`
        @media (min-width: 1024px) {
          .calendar-layout {
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
