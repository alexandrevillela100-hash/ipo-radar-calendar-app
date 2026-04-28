import type { Filing } from "../lib/filingsClient";
import { filingTypeColor, filingTypeLabel } from "../lib/filingsClient";
import { prettyDate } from "../lib/calendarUtils";
import "./DetailPanel.css";

interface Props {
  selectedDate: string | null;
  filings: Filing[];
}

export default function DetailPanel(props: Props) {
  const selectedDate = props.selectedDate;
  const filings = props.filings;

  if (!selectedDate) {
    return (
      <aside className="detail-panel empty">
        <h3 className="panel-title">Select a date</h3>
        <p className="panel-empty-text">
          Click any day in the calendar to see SEC filing events for that date.
        </p>
      </aside>
    );
  }

  let countLabel = "";
  if (filings.length === 0) countLabel = "No filings on this date.";
  else if (filings.length === 1) countLabel = "1 filing";
  else countLabel = filings.length + " filings";

  return (
    <aside className="detail-panel">
      <h3 className="panel-title">{prettyDate(selectedDate)}</h3>
      <p className="panel-count">{countLabel}</p>

      {filings.length > 0 ? (
        <ul className="filing-list">
          {filings.map(function (f) {
            const chipStyle = { backgroundColor: filingTypeColor(f.filingType) };
            return (
              <li key={f._id} className="filing-card">
                <header className="filing-card-header">
                  <span className="filing-type-chip" style={chipStyle}>{f.filingType}</span>
                  <span className="filing-type-label">{filingTypeLabel(f.filingType)}</span>
                </header>
                <h4 className="filing-company">{f.companyName}</h4>
                <div className="filing-meta">
                  {f.ticker ? <span className="meta-pill">{f.ticker}</span> : null}
                  {f.exchange ? <span className="meta-pill">{f.exchange}</span> : null}
                  {f.industry ? <span className="meta-pill subtle">{f.industry}</span> : null}
                </div>
                <a className="filing-source" href={f.edgarUrl}>View on EDGAR</a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </aside>
  );
}
