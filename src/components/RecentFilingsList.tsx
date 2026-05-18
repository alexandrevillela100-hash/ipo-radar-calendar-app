import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import {
  getRecentFilings,
  filingTypeColor,
  type Filing,
} from "@/lib/filingsClient";

/**
 * RecentFilingsList — past-30-days filing feed for the calendar homepage.
 *
 * Save as:  calendar-app/src/components/RecentFilingsList.tsx
 *
 * Use inside Calendar.tsx (homepage):
 *
 *   import RecentFilingsList from "@/components/RecentFilingsList";
 *
 *   <section className="container py-16">
 *     <RecentFilingsList />
 *   </section>
 *
 * Behavior:
 *   - Pulls the most recent 60 filings via getRecentFilings.
 *   - Filters down to filings dated in the past 30 days.
 *   - Renders a clean vertical list of rows.
 *   - Row click → /fact-sheet/:slug if a published report exists,
 *     otherwise the row is inert and shows "Report coming soon".
 *   - Filings with a real report (heroImageUrl populated) appear
 *     first within the list.
 */

const WINDOW_DAYS = 30;

function isWithinLastDays(iso: string | undefined, days: number): boolean {
  if (!iso) return false;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  const diff = Date.now() - then;
  return diff <= days * 24 * 60 * 60 * 1000 && diff >= 0;
}

function shortDate(iso?: string): string {
  if (!iso) return "—";
  const [, m, d] = iso.split("-").map(Number);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${d}`;
}

function hasPublishedReport(f: Filing): boolean {
  return Boolean(f.heroImageUrl && f.reportSlug);
}

export default function RecentFilingsList() {
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getRecentFilings(60)
      .then((rows) => {
        if (!cancelled) {
          setFilings(rows);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("[RecentFilingsList] Sanity fetch failed:", err);
        if (!cancelled) {
          setFilings([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const monthFilings = (filings ?? [])
    .filter((f) => isWithinLastDays(f.filingDate, WINDOW_DAYS))
    .sort((a, b) => {
      // Filings with a published report appear first; within each
      // group, sort by filingDate descending.
      const ra = hasPublishedReport(a) ? 1 : 0;
      const rb = hasPublishedReport(b) ? 1 : 0;
      if (rb !== ra) return rb - ra;
      return (b.filingDate || "").localeCompare(a.filingDate || "");
    });

  return (
    <div>
      <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
        <div>
          <div
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary mb-3 inline-flex items-center gap-2"
          >
            <CalendarIcon className="w-3 h-3 opacity-80" />
            Past 30 Days
          </div>
          <h2
            className="text-foreground"
            style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: 400,
              fontSize: "clamp(28px, 3vw, 44px)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}
          >
            Recent <em style={{ color: "var(--primary)" }}>filings</em>.
          </h2>
          <p className="text-[14px] text-muted-foreground max-w-xl font-light leading-[1.7] mt-3">
            Every S-1, F-1, and amendment filed with the SEC in the last
            month. Click any row to open its fact sheet.
          </p>
        </div>
        <Link
          href="/ipos"
          className="inline-flex items-center gap-2 font-mono text-[10px] text-primary hover:text-primary/80 tracking-[0.16em] uppercase no-underline transition-colors"
        >
          Browse all filings
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Loading recent filings…
        </div>
      ) : monthFilings.length === 0 ? (
        <div className="py-12 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          No filings in the past {WINDOW_DAYS} days.
        </div>
      ) : (
        <div className="border border-border/40" style={{ borderRadius: "4px" }}>
          {monthFilings.map((f, idx) => {
            const accent = filingTypeColor(f.filingType);
            const ready = hasPublishedReport(f);
            const href = ready
              ? `/fact-sheet/${encodeURIComponent(f.reportSlug!)}`
              : null;

            const rowContent = (
              <div
                className={
                  "flex items-center gap-4 px-5 py-4 transition-colors " +
                  (idx > 0 ? "border-t border-border/30 " : "") +
                  (href ? "hover:bg-card/60 cursor-pointer" : "opacity-75")
                }
              >
                {/* Date */}
                <div className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground tracking-[0.08em]">
                  {shortDate(f.filingDate)}
                </div>

                {/* Filing-type chip */}
                <div
                  className="w-16 shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-center py-1"
                  style={{
                    color: accent,
                    backgroundColor: `${accent}22`,
                    border: `1px solid ${accent}55`,
                    borderRadius: "2px",
                  }}
                >
                  {f.filingType}
                </div>

                {/* Company + ticker */}
                <div className="flex-1 min-w-0">
                  <div className="text-foreground text-[15px] truncate">
                    {f.companyName}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground tracking-[0.1em] mt-0.5">
                    {f.ticker ? (
                      <span className="text-primary">{f.ticker}</span>
                    ) : null}
                    {f.ticker && f.industry ? (
                      <span className="mx-2 opacity-40">·</span>
                    ) : null}
                    {f.industry || ""}
                  </div>
                </div>

                {/* Action */}
                <div className="shrink-0">
                  {href ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-primary tracking-[0.16em] uppercase">
                      View
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-muted-foreground/50 tracking-[0.16em] uppercase">
                      Soon
                    </span>
                  )}
                </div>
              </div>
            );

            if (href) {
              return (
                <Link
                  key={f._id}
                  href={href}
                  className="block no-underline text-inherit"
                >
                  {rowContent}
                </Link>
              );
            }
            return <div key={f._id}>{rowContent}</div>;
          })}
        </div>
      )}

      {!loading && monthFilings.length > 0 ? (
        <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {monthFilings.length} filing{monthFilings.length === 1 ? "" : "s"} · past {WINDOW_DAYS} days
        </div>
      ) : null}
    </div>
  );
}
