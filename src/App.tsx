import { Route, Switch } from "wouter";
import Calendar from "@/pages/Calendar";
import FactSheet from "@/pages/FactSheet";
import AllIPOs from "@/pages/AllIPOs";
import Pipeline from "@/pages/Pipeline";
import Compare from "@/pages/Compare";
import Underwriters from "@/pages/Underwriters";
import UnderwriterDetail from "@/pages/UnderwriterDetail";
import Lockups from "@/pages/Lockups";
import Sector from "@/pages/Sector";
import Watchlist from "@/pages/Watchlist";
import Diffs from "@/pages/Diffs";
import Insights from "@/pages/Insights";
import CalendarNavbar from "@/components/CalendarNavbar";

/**
 * App v6 — adds /watchlist, /diffs, /insights routes.
 *
 * Save as:  calendar-app/src/App.tsx (overwrite)
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
        <Route path="/compare/:slugA/vs/:slugB" component={Compare} />
        <Route path="/underwriters" component={Underwriters} />
        <Route path="/underwriters/:slug" component={UnderwriterDetail} />
        <Route path="/lockups" component={Lockups} />
        <Route path="/sectors" component={Sector} />
        <Route path="/sector/:slug" component={Sector} />
        <Route path="/watchlist" component={Watchlist} />
        <Route path="/diffs" component={Diffs} />
        <Route path="/insights" component={Insights} />
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
