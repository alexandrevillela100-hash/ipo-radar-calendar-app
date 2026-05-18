import CalendarNavbar from "@/components/CalendarNavbar";
import RecentFilingsList from "@/components/RecentFilingsList";
import { Link } from "wouter";
import { ArrowRight, Radar } from "lucide-react";

/**
 * Calendar — homepage of the calendar-app.
 *
 * Save as:  calendar-app/src/pages/Calendar.tsx
 *
 * Layout:
 *   - CalendarNavbar (sticky top)
 *   - Hero header introducing the calendar
 *   - RecentFilingsList (past 30 days, clickable to fact sheet)
 *   - CTA strip → All IPOs
 *
 * If your project already has a CalendarGrid component you want to
 * keep, you can add it as a section between the hero and the
 * RecentFilingsList. By default this page works fine without it —
 * the filings list IS the calendar for now.
 */

export default function Calendar() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <CalendarNavbar />

      {/* Spacer for fixed nav */}
      <div className="pt-16" />

      {/* ── Hero header ─────────────────────────────────────────── */}
      <section className="container pt-16 pb-12">
        <div className="vv-eyebrow mb-5 inline-flex items-center gap-2">
          <Radar className="w-3 h-3 opacity-80" />
          IPO Calendar · Live
        </div>
        <h1
          className="text-foreground mb-5"
          style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontWeight: 400,
            fontSize: "clamp(40px, 5vw, 72px)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
          }}
        >
          The IPO <em style={{ color: "var(--primary)" }}>pipeline</em>.
        </h1>
        <p className="text-[16px] text-muted-foreground max-w-2xl font-light leading-[1.85]">
          Every S-1, F-1, and amendment filed with the SEC over the past
          month, plus the full archive of every filing we've tracked. Click
          any company to open its fact sheet.
        </p>
      </section>

      {/* ── Recent filings (the main view) ──────────────────────── */}
      <section className="container py-8 border-t border-border/40">
        <RecentFilingsList />
      </section>

      {/* ── CTA strip → All IPOs ────────────────────────────────── */}
      <section className="border-t border-border/40 bg-card/40 py-16 mt-12">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="vv-eyebrow mb-2">The full archive</div>
            <h2
              className="text-foreground"
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontWeight: 400,
                fontSize: "clamp(24px, 2.6vw, 36px)",
                lineHeight: 1.1,
              }}
            >
              Looking for an <em style={{ color: "var(--primary)" }}>older</em> filing?
            </h2>
            <p className="text-[14px] text-muted-foreground max-w-md font-light leading-[1.7] mt-2">
              Browse every filing we've tracked, with sortable columns and
              full-text search.
            </p>
          </div>
          <Link
            href="/ipos"
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-mono text-[10px] uppercase tracking-[0.18em] no-underline hover:opacity-90 transition-opacity"
            style={{ borderRadius: "2px" }}
          >
            Browse all IPOs
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-10">
        <div className="container text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Source: SEC EDGAR · IPO Radar by Velocia Ventures
        </div>
      </footer>
    </div>
  );
}
