import { course } from './config.ts';

/** Current wall-clock date and minutes-since-midnight in the class time zone. */
function nowInZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return {
    y: get('year'),
    m: get('month'),
    d: get('day'),
    minutes: get('hour') * 60 + get('minute'),
  };
}

const iso = (dt: Date) => dt.toISOString().slice(0, 10);

/**
 * Upcoming class dates as ISO strings (YYYY-MM-DD), computed in America/Chicago.
 * Today counts only before the same-day cutoff. Blackout dates are skipped.
 */
export function upcomingClassDates(now: Date = new Date()): string[] {
  const { y, m, d, minutes } = nowInZone(now, course.timeZone);
  const [ch, cm] = course.sameDayCutoff.split(':').map(Number);
  const cutoff = ch * 60 + cm;
  // Work in UTC-noon dates so arithmetic never crosses a DST edge.
  const cursor = new Date(Date.UTC(y, m - 1, d, 12));
  const ahead = (course.weekday - cursor.getUTCDay() + 7) % 7;
  cursor.setUTCDate(cursor.getUTCDate() + ahead);
  if (ahead === 0 && minutes >= cutoff) cursor.setUTCDate(cursor.getUTCDate() + 7);

  const blackout = new Set<string>(course.blackoutDates);
  const out: string[] = [];
  for (let guard = 0; out.length < course.datesShown && guard < 104; guard++) {
    const key = iso(cursor);
    if (!blackout.has(key)) out.push(key);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return out;
}

/** "Wednesday, October 7, 2026" */
export function formatClassDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "October 6, 2026" for the signing date, in the class time zone. */
export function formatToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: course.timeZone,
  });
}
