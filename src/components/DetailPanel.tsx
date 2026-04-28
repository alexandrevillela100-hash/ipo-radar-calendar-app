// src/components/DetailPanel.tsx
//
// Right-rail panel that lists all filings on the selected date. Empty state
// when no date is selected. Each filing card shows company, ticker, exchange,
// industry, a colour-coded type chip, and a link to the EDGAR source filing.

import type { Filing } from "../lib/filingsClient";
import { filingTypeColor, filingTypeLabel } from "../lib/filingsClient";
import { prettyDate } from "../lib/calendarUtils";
import "./DetailPanel.css";

interface Props {
  selectedDate: string | null;
  filings: Filing[];
}

export default function DetailPanel({ selectedDate, filings }: Props) {
  if (!selectedDate) {
    return (
      <aside className="detail-panel empty">
        <h3 className="panel-title">Select a date</h3>
        <p className="panel-empty-text">
          Click any day in the calendar to see SEC filing events for that
          date — initial registrations, amendments, final pricing, withdrawals.
        </p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <h3 className="panel-title">{prettyDate(selectedDate)}</h3>
      <p className="panel-count">
        {filings.length === 0
          ? "No filings on this date."
          : `${filings.length} filing${filings.length === 1 ? "" : "s"}`}
      </p>

      {filings.length > 0 && (
        <ul className="filing-list">
          {filings.map((f) => (
            <li key={f._id} className="filing-card">
              <header className="filing-card-header">
                <span
                  className="filing-type-chip"
                  style={{ backgroundColor: filingTypeColor(f.filingType) }}
                >
                  {f.filingType}
                </span>
                <span className="filing-type-label">
                  {filingTypeLabel(f.filingType)}
                </span>
              </header>

              <h4 className="filing-company">{f.companyName}</h4>

              <div className="filing-meta">
                {f.ticker && <span className="meta-pill">{f.ticker}</span>}
                {f.exchange && <span className="meta-pill">{f.exchange}</span>}
                {f.industry && (
                  <span className="meta-pill subtle">{f.industry}</span>
                )}
              </div>

              
                href={f.edgarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="filing-source"
              >
                View on EDGAR ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
