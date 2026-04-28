// Top-level shell. Renders the header and the calendar.
// Detail-panel state (which date is selected, if any) lives here so the
// CalendarGrid and DetailPanel can both read/write it.

import { useEffect, useState } from "react";
import { getRecentFilings } from "./lib/filingsClient";
import type { Filing } from "./lib/filingsClient";
import "./App.css";

export default function App() {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecentFilings(30)
      .then((data) => {
        setFilings(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error("[App] failed to load filings", err);
        setError(err instanceof Error ? err.message : "Failed to load filings");
        setLoading(false);
      });
      });
  }, []);

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
          Live SEC filings — S-1, S-1/A, F-1, F-1/A, RW, 424B — from the last 30 days.
        </p>

        {loading && <div className="status">Loading filings…</div>}
        {error && <div className="status error">Error: {error}</div>}
        {!loading && !error && (
          <div className="status">
            Loaded {filings.length} filings. Calendar UI ships in the next iteration.
          </div>
        )}
      </main>

      <footer className="app-footer">
        <span className="muted">
          Data: SEC EDGAR via Sanity. Updated daily at 22:00 UTC.
        </span>
      </footer>
    </div>
  );
}
