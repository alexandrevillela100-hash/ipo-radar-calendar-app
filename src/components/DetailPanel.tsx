import type { Filing } from "../lib/filingsClient";
import { filingTypeColor, filingTypeLabel } from "../lib/filingsClient";
import { prettyDate } from "../lib/calendarUtils";
import "./DetailPanel.css";

// Phase 1 of the Fact Sheet pivot: when a filing has a reportSlug, route
// users to our hosted Fact Sheet (currently on Manus) as the primary CTA,
// with EDGAR as a secondary "source filing" link. When no Fact Sheet exists
// yet, EDGAR remains the only action. Insourcing the Fact Sheet from Manus
// is a future phase; this constant is the single switch we'd flip.
const FACTSHEET_BASE = "https://iporadar-jxwaypt6.manus.space";

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
            const factSheetUrl = f.reportSlug ? FACTSHEET_BASE + "/ipo/" + f.reportSlug : null;
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
                <div className="filing-actions">
                  {factSheetUrl ? <a className="filing-primary-cta" href={factSheetUrl} target="_blank" rel="noopener noreferrer">View Fact Sheet</a> : null}
                  <a className="filing-source" href={f.edgarUrl} target="_blank" rel="noopener noreferrer">{factSheetUrl ? "Source filing" : "View on EDGAR"}</a>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </aside>
  );
}
