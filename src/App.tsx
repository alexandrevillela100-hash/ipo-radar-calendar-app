import { Route, Switch } from "wouter";
import CalendarNavbar from "@/components/CalendarNavbar";

// Pages currently in the repo
import Calendar from "@/pages/Calendar";
import FactSheet from "@/pages/FactSheet";
import AllIPOs from "@/pages/AllIPOs";

/**
 * IPO Radar calendar-app router.
 *
 * CalendarNavbar is rendered at the App level (outside <Switch>) so
 * it shows on EVERY page automatically.
 *
 * Routes:
 *   /                    Calendar grid (home)
 *   /fact-sheet/:slug    One-pager fact sheet
 *   /ipos                Sortable list of every filing
 *
 * NOTE: /reports/:slug was previously routed to a Report.tsx page,
 * but that file doesn't currently exist in src/pages/. The route is
 * removed for now so the build succeeds. When you ship Report.tsx,
 * re-add the import and route block.
 */

export default function App() {
  return (
    <>
      {/* Top nav — shows on every page */}
      <CalendarNavbar />

      {/* Spacer for the fixed nav (h-16 = 4rem = 64px) */}
      <div style={{ paddingTop: "64px" }} />

      <Switch>
        <Route path="/" component={Calendar} />

        <Route path="/fact-sheet/:slug">
          <FactSheet />
        </Route>

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
    </>
  );
}
