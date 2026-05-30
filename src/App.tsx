import { Route, Switch } from "wouter";
import Calendar from "@/pages/Calendar";
import FactSheet from "@/pages/FactSheet";
import AllIPOs from "@/pages/AllIPOs";
import Pipeline from "@/pages/Pipeline";
import CalendarNavbar from "@/components/CalendarNavbar";

/**
 * App v3 — adds /pipeline route.
 *
 * Save as:  calendar-app/src/App.tsx (overwrite)
 *
 * Routes:
 *   /                 → Calendar grid (homepage)
 *   /pipeline         → IPO Pipeline kanban
 *   /ipos             → All IPOs browseable list
 *   /fact-sheet/:slug → Per-company fact sheet
 */

export default function App() {
  return (
    <>
      <CalendarNavbar />
      <Switch>
        <Route path="/" component={Calendar} />
        <Route path="/pipeline" component={Pipeline} />
        <Route path="/ipos" component={AllIPOs} />
        <Route path="/fact-sheet/:slug" component={FactSheet} />
        <Route>
          <div
            style={{
              minHeight: "100vh",
              background: "#0a0d10",
              color: "#e4e6e8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily:
                '"Barlow", -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: "16px",
            }}
          >
            404 — page not found
          </div>
        </Route>
      </Switch>
    </>
  );
}
