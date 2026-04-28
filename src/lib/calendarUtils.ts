// src/lib/calendarUtils.ts
//
// Pure date helpers for the calendar grid. Filing dates from Sanity arrive
// as "YYYY-MM-DD" strings (no time component), so everything here works in
// local time and ignores timezone shifts.

export interface MonthRef {
  year: number;
  month: number; // 0–11, JS Date convention
}

export function todayMonth(): MonthRef {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function todayIso(): string {
  const d = new Date();
  return formatIso(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatIso(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function nextMonth(m: MonthRef): MonthRef {
  return m.month === 11
    ? { year: m.year + 1, month: 0 }
    : { year: m.year, month: m.month + 1 };
}

export function prevMonth(m: MonthRef): MonthRef {
  return m.month === 0
    ? { year: m.year - 1, month: 11 }
    : { year: m.year, month: m.month - 1 };
}

export function monthLabel(m: MonthRef): string {
  return new Date(m.year, m.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function daysInMonth(m: MonthRef): number {
  // Day 0 of the next month is the last day of this month.
  return new Date(m.year, m.month + 1, 0).getDate();
}

// Day-of-week of the 1st of the month, 0 = Sunday, 6 = Saturday.
export function firstDayOffset(m: MonthRef): number {
  return new Date(m.year, m.month, 1).getDay();
}

// Pretty date label for the detail panel header.
// Parse the ISO string manually to avoid the "midnight UTC → previous-day-local"
// timezone trap that bites you when you do `new Date("2026-04-27")`.
export function prettyDate(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
