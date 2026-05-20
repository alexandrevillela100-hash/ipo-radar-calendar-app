import { Link } from "wouter";
import type { Filing } from "../lib/filingsClient";
import { filingTypeColor, filingTypeLabel } from "../lib/filingsClient";
import { prettyDate } from "../lib/calendarUtils";
import "./DetailPanel.css";

/**
 * DetailPanel — right-side panel showing filings for the selected date.
 *
 * Changes from Manus's original:
 *   - Fact Sheet button now points at the INTERNAL /fact-sheet/:slug
 *     route (rendered by our FactSheet.tsx), not the external Manus URL.
 *   - Uses wouter <Link> for internal navigation (no page reload, no
 *     target="_blank").
 *   - Full Report button unchanged — still points to /reports/:slug.
 *   - EDGAR source link unchanged — still external, opens in new tab.
 *   - Only renders Fact Sheet button when the filing has both a
 *     reportSlug AND a published initiationReport (detected via
 *     heroImageUrl on the joined data). Avoids dead clicks.
 */

interface Props {
  selectedDate: string | null;
  filings: Filing[];
}

function factSheetHref(slug?: string): string | null {
  if (!slug) return null;
  return `/fact-sheet/${encodeURIComponent(slug)}`;
}

function reportHref(slug?: string): string | null {
  if (!slug) return null;
  return `/reports/${encodeURIComponent(slug)}`;
}

function hasPublishedReport(f: Filing): boolean {
  // We treat "published initiationReport exists" as a synonym for
  // "fact sheet is safe to link to" — heroImageUrl is the cheapest
  // signal that gets joined in by filingsClient's GROQ.
  return Boolean(f.heroImageUrl && f.reportSlug);
}

export default function DetailPanel(props: Props) {
  const { selectedDate, filings } = props;

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
          {filings.map((f) => {
            const chipStyle = { backgroundColor: filingTypeColor(f.filingType) };
            const fsHref = hasPublishedReport(f) ? factSheetHref(f.reportSlug) : null;
            const rHref = reportHref(f.reportSlug);
            const hasArtifacts = fsHref !== null || rHref !== null;

            return (
              <li key={f._id} className="filing-card">
                <header className="filing-card-header">
                  <span className="filing-type-chip" style={chipStyle}>
                    {f.filingType}
                  </span>
                  <span className="filing-type-label">
                    {filingTypeLabel(f.filingType)}
                  </span>
                </header>

                <h4 className="filing-company">{f.companyName}</h4>

                <div className="filing-meta">
                  {f.ticker ? <span className="meta-pill">{f.ticker}</span> : null}
                  {f.exchange ? <span className="meta-pill">{f.exchange}</span> : null}
                  {f.industry ? (
                    <span className="meta-pill subtle">{f.industry}</span>
                  ) : null}
                </div>

                <div className="filing-actions">
                  {fsHref ? (
                    <Link href={fsHref} className="filing-primary-cta">
                      Fact Sheet
                    </Link>
                  ) : null}
                  {rHref ? (
                    <Link href={rHref} className="filing-primary-cta">
                      Full Report
                    </Link>
                  ) : null}
                  {f.edgarUrl ? (
                    <a
                      className="filing-source"
                      href={f.edgarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {hasArtifacts ? "Source filing" : "View on EDGAR"}
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </aside>
  );
}
