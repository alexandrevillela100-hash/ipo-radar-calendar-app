// Top-level shell. Owns the visible month, the selected date, and the
// fetched filings. Re-fetches whenever the visible month changes so we
// only ever pull one month of data at a time.

import { useEffect, useMemo, useState } from "react";
import {
  getFilingsInWindow,
  groupByDate,
  type Filing,
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
import "./App.css";

export default function App() {
  const [month, setMonth] = useState<MonthRef>(() => todayMonth());
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Reload filings whenever the visible month changes.
  useEffect(() => {
    const start = formatIso(month.year, month.month, 1);
    const end = formatIso(month.year, month.month, daysInMonth(month));
    setLoading(true);
    setError(null);
    getFilingsInWindow(start, end)
      .then((data) => {
        setFilings(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error("[App] failed to load filings", err);
        setError(err instanceof Error ? err.message : "Failed to load filings");
        setLoading(false);
      });
  }, [month.year, month.month]);

  const filingsByDate = useMemo(() => groupByDate(filings), [filings]);
  const selectedFilings = selectedDate
    ? filingsByDate[selectedDate] || []
    : [];

  function jumpToToday() {
    setMonth(todayMonth());
    setSelectedDate(todayIso());
  }

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
          Track SEC filing events on a visual calendar. Click any date to see
          the filings that landed that day.
        </p>

        {error && <div className="status error">Error: {error}</div>}

        <div className={`calendar-layout ${loading ? "is-loading" : ""}`}>
          <CalendarGrid
            month={month}
            onMonthChange={setMonth}
            filingsByDate={filingsByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onJumpToToday={jumpToToday}
          />
          <DetailPanel
            selectedDate={selectedDate}
            filings={selectedFilings}
          />
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
