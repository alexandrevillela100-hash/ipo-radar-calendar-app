import { Route, Switch } from "wouter";

// Existing pages — match the filenames your project already uses.
// If your Calendar page is named differently (e.g. CalendarPage,
// Home, etc.), just adjust the import name on line 4.
import Calendar from "@/pages/Calendar";
import Report from "@/pages/Report";

// NEW pages — drop the FactSheet.tsx and AllIPOs.tsx files from
// this delivery folder into src/pages/ before deploying.
import FactSheet from "@/pages/FactSheet";
import AllIPOs from "@/pages/AllIPOs";

/**
 * IPO Radar calendar-app router.
 *
 * Routes:
 *   /                    Calendar grid (home)
 *   /reports/:slug       Full 30-page initiation report
 *   /fact-sheet/:slug    One-pager fact sheet  ← NEW
 *   /ipos                Sortable list of every filing  ← NEW
 *   *                    404 fallback
 *
 * If your existing App.tsx wraps <Switch> in providers like
 * <ThemeProvider>, <TooltipProvider>, or <ErrorBoundary>, paste
 * those wrappers back in around <Switch> below. The four <Route>
 * entries are the only thing this file really cares about.
 */

export default function App() {
  return (
    <Switch>
      {/* Home / calendar grid */}
      <Route path="/" component={Calendar} />

      {/* Existing full initiation report */}
      <Route path="/reports/:slug">
        <Report />
      </Route>

      {/* NEW — one-pager fact sheet */}
      <Route path="/fact-sheet/:slug">
        <FactSheet />
      </Route>

      {/* NEW — flat, sortable, searchable list of all filings */}
      <Route path="/ipos">
        <AllIPOs />
      </Route>

      {/* 404 fallback */}
      <Route>
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#8b9099",
            fontFamily: "system-ui, sans-serif",
            gap: "12px",
          }}
        >
          <h1 style={{ color: "#e4e6e8", fontWeight: 400, margin: 0 }}>
            Page not found
          </h1>
          <p style={{ margin: 0 }}>
            <a href="/" style={{ color: "#03c8b5" }}>
              ← Back to home
            </a>
          </p>
        </div>
      </Route>
    </Switch>
  );
}
