import { Radar, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";

/**
 * CalendarNavbar — top navigation for the calendar-app.
 *
 * Mirrors the landing-page Navbar in style, but with calendar-app
 * routes plus a "Main site" link back to the landing page.
 *
 * Save as:  calendar-app/src/components/CalendarNavbar.tsx
 *
 * Use:  paste <CalendarNavbar /> as the FIRST element inside the
 *       return ( ... ) block of each page (Calendar.tsx, AllIPOs.tsx,
 *       FactSheet.tsx, etc.). The included `pt-16` spacer in each
 *       page accounts for the fixed-position nav.
 */

// If your landing page is on a different domain (custom domain, etc.),
// update this constant.
const LANDING_PAGE_URL = "https://ipo-radar-webp.vercel.app";

export default function CalendarNavbar() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const linkClass = (path: string) =>
    `transition-colors text-sm no-underline ${
      isActive(path)
        ? "text-primary font-semibold"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo — clicks back to calendar home */}
          <Link href="/" className="flex items-center gap-2 no-underline">
            <Radar className="w-5 h-5 text-primary" />
            <span className="text-base font-bold text-foreground">
              IPO Radar <span className="text-primary">AI</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-7">
            <Link href="/" className={linkClass("/")}>
              Calendar
            </Link>
            <Link href="/ipos" className={linkClass("/ipos")}>
              All IPOs
            </Link>
            <a
              href={LANDING_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors text-sm text-muted-foreground hover:text-foreground no-underline inline-flex items-center gap-1.5"
            >
              Main site
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>

          {/* Right-side spacer (kept for visual balance with the
              landing-page nav, which has a Sign in button here) */}
          <div className="w-[80px]" aria-hidden="true" />
        </div>
      </div>
    </nav>
  );
}
