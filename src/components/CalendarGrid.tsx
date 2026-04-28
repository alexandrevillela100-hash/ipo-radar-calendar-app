// src/components/CalendarGrid.tsx
//
// Month-view calendar grid. Shows 7 columns Sun–Sat, blank cells before the
// 1st of the month, and colour-coded dots inside each day cell — one dot per
// filing, capped at 4 visible with a "+N" overflow indicator.
//
// All filing-type colours come from filingTypeColor() so the calendar, the
// detail panel, and any future surfaces (Manus, fact sheets) stay in sync.

import type { Filing } from "../lib/filingsClient";
import { filingTypeColor } from "../lib/filingsClient";
import {
  type MonthRef,
  daysInMonth,
  firstDayOffset,
  formatIso,
  monthLabel,
  nextMonth,
  prevMonth,
  todayIso,
} from "../lib/calendarUtils";
import "./CalendarGrid.css";

interface Props {
  month: MonthRef;
  onMonthChange: (next: MonthRef) => void;
  filingsByDate: Record<string, Filing[]>;
  selectedDate: string | null;
  onSelectDate: (iso: string) => void;
  onJumpToToday: () => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarGrid({
  month,
  onMonthChange,
  filingsByDate,
  selectedDate,
  onSelectDate,
  onJumpToToday,
}: Props) {
  const today = todayIso();
  const dayCount = daysInMonth(month);
  const offset = firstDayOffset(month);

  // Flat array of cells: leading blanks, then day numbers, then trailing blanks
  // to round out the final row. Keeps the grid rectangular.
  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= dayCount; d++) {
    cells.push({ iso: formatIso(month.year, month.month, d), day: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <section className="calendar">
      <header className="calendar-header">
        <button
          type="button"
          className="month-nav"
          onClick={() => onMonthChange(prevMonth(month))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2 className="month-label">{monthLabel(month)}</h2>
        <div className="header-right">
          <button type="button" className="today-btn" onClick={onJumpToToday}>
            Today
          </button>
          <button
            type="button"
            className="month-nav"
            onClick={() => onMonthChange(nextMonth(month))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </header>

      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday">{w}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} className="day-cell empty" />;
          const filings = filingsByDate[cell.iso] || [];
          const isToday = cell.iso === today;
          const isSelected = cell.iso === selectedDate;
          const cls = ["day-cell"];
          if (isToday) cls.push("today");
          if (isSelected) cls.push("selected");
          if (filings.length > 0) cls.push("has-filings");

          return (
            <button
              key={cell.iso}
              type="button"
              className={cls.join(" ")}
              onClick={() => onSelectDate(cell.iso)}
            >
              <span className="day-number">{cell.day}</span>
              {filings.length > 0 && (
                <div className="dots">
                  {filings.slice(0, 4).map((f) => (
                    <span
                      key={f._id}
                      className="dot"
                      style={{ backgroundColor: filingTypeColor(f.filingType) }}
                      title={`${f.filingType} — ${f.companyName}`}
                    />
                  ))}
                  {filings.length > 4 && (
                    <span className="dot-more">+{filings.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <footer className="calendar-legend">
        <LegendItem color="var(--teal)" label="S-1 / F-1 (Initial)" />
        <LegendItem color="var(--gold)" label="S-1/A · F-1/A (Amendment)" />
        <LegendItem color="var(--green)" label="424B (Final / Pricing)" />
        <LegendItem color="var(--red)" label="RW (Withdrawal)" />
      </footer>
    </section>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="legend-item">
      <span className="legend-dot" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
