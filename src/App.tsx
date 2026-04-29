// Top-level shell. Owns the visible month, the selected date, the active
// filters (filing types + search query), and the fetched filings.
// Re-fetches whenever the visible month changes so we only ever pull one
// month of data at a time. Filtering happens client-side in two stages:
// search first (so chip counts reflect the search-narrowed pool), then
// type-toggle on top.

import { useEffect, useMemo, useState } from "react";
import {
  getFilingsInWindow,
  groupByDate,
  type Filing,
  type FilingType,
} from "./lib/filingsClient";
import {
  type MonthRef,
  daysInMonth,
  formatIso,
  todayIso,
  todayMonth,
} from "./lib/calendarUtils";
import CalendarGrid from "./components/CalendarGrid";
import DetailPanel from "./components/DetailPanel";
import FilterBar from "./components/FilterBar";
import "./App.css";

const ALL_TYPES: FilingType[] = ["S-1", "S-1/A", "F-1", "F-1/A", "424B", "RW"];

export default function App() {
  const [month, setMonth] = useState<MonthRef>(function () { return todayMonth(); });
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Auto-select today on first load so the rail is populated immediately.
  const [selectedDate, setSelectedDate] = useState<string | null>(function () { return todayIso(); });
  const [enabledTypes, setEnabledTypes] = useState<Set<FilingType>>(function () {
    return new Set<FilingType>(ALL_TYPES);
  });
  const [search, setSearch] = useState("");

  // Reload filings whenever the visible month changes.
  useEffect(function () {
    const start = formatIso(month.year, month.month, 1);
    const end = formatIso(month.year, month.month, daysInMonth(month));
    setLoading(true);
    setError(null);
    getFilingsInWindow(start, end)
      .then(function (data) {
        setFilings(data);
        setLoading(false);
      })
      .catch(function (err: unknown) {
        console.error("[App] failed to load filings", err);
        setError(err instanceof Error ? err.message : "Failed to load filings");
        setLoading(false);
      });
  }, [month.year, month.month]);

  // Search-narrow first.
  const searchFiltered = useMemo(function () {
    const q = search.trim().toLowerCase();
    if (!q) return filings;
    return filings.filter(function (f) {
      const name = f.companyName.toLowerCase();
      const ticker = (f.ticker || "").toLowerCase();
      return name.indexOf(q) !== -1 || ticker.indexOf(q) !== -1;
    });
  }, [filings, search]);

  // Counts for chip badges — based on the search-narrowed pool.
  const countsByType = useMemo(function () {
    const out: Record<FilingType, number> = {
      "S-1": 0, "S-1/A": 0, "F-1": 0, "F-1/A": 0, "424B": 0, "RW": 0,
    };
    for (const f of searchFiltered) {
      out[f.filingType] = (out[f.filingType] || 0) + 1;
    }
    return out;
  }, [searchFiltered]);

  // Apply type toggle on top of search.
  const visibleFilings = useMemo(function () {
    return searchFiltered.filter(function (f) { return enabledTypes.has(f.filingType); });
  }, [searchFiltered, enabledTypes]);

  const filingsByDate = useMemo(function () {
    return groupByDate(visibleFilings);
  }, [visibleFilings]);

  // Selected day's filings, sorted alphabetically by company so the order
  // is stable and meaningful (not arbitrary accession-number order).
  const selectedFilings = useMemo(function () {
    if (!selectedDate) return [];
    const list = filingsByDate[selectedDate] || [];
    return list.slice().sort(function (a, b) {
      return a.companyName.localeCompare(b.companyName);
    });
  }, [filingsByDate, selectedDate]);

  function jumpToToday() {
    setMonth(todayMonth());
    setSelectedDate(todayIso());
  }

  function toggleTypes(types: FilingType[]) {
    setEnabledTypes(function (prev) {
      const isAnyEnabled = types.some(function (t) { return prev.has(t); });
      const next = new Set(prev);
      if (isAnyEnabled) {
        types.forEach(function (t) { next.delete(t); });
      } else {
        types.forEach(function (t) { next.add(t); });
      }
      return next;
    });
  }

  function resetFilters() {
    setEnabledTypes(new Set<FilingType>(ALL_TYPES));
    setSearch("");
  }

  const isDefault = enabledTypes.size === ALL_TYPES.length && search.trim() === "";

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">IPO</span>
          <span className="brand-mark accent">Radar</span>
        </div>
        <div className="byline">by Velocia Ventures</div>
      </header>

      <main className="app-main">
        <h1 className="page-title">Calendar</h1>
        <p className="page-subtitle">
          Track SEC filing events on a visual calendar. Filter by type, search by company, click any date to see filings.
        </p>

        {error ? <div className="status error">Error: {error}</div> : null}

        <FilterBar
          enabledTypes={enabledTypes}
          onToggleTypes={toggleTypes}
          search={search}
          onSearchChange={setSearch}
          countsByType={countsByType}
          onReset={resetFilters}
          isDefault={isDefault}
        />

        <div className={"calendar-layout " + (loading ? "is-loading" : "")}>
          <CalendarGrid
            month={month}
            onMonthChange={setMonth}
            filingsByDate={filingsByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onJumpToToday={jumpToToday}
          />
          <DetailPanel selectedDate={selectedDate} filings={selectedFilings} />
        </div>
      </main>

      <footer className="app-footer">
        <span className="muted">
          Data: SEC EDGAR via Sanity. Updated daily at 22:00 UTC.
        </span>
      </footer>
    </div>
  );
}
