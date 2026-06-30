import { DateTime } from 'luxon';

export interface AvailabilityWindow {
  staffId: string;
  /** 0-6, Sunday-Saturday (JS `Date.getDay()` convention). */
  weekday: number;
  /** Local wall-clock "HH:mm" in the store timezone. */
  startTime: string;
  endTime: string;
}

export interface BusyInterval {
  staffId: string;
  start: Date;
  end: Date;
}

export interface Slot {
  /** UTC instant the appointment would start. */
  startAt: Date;
  staffId: string;
}

export interface GenerateSlotsInput {
  /** Target day as `YYYY-MM-DD`, interpreted in `timezone`. */
  date: string;
  timezone: string;
  durationMin: number;
  bufferMin: number;
  /** Granularity of candidate start times, in minutes. Defaults to 30. */
  stepMin?: number;
  windows: AvailabilityWindow[];
  busy: BusyInterval[];
  /** Slots starting before this instant are excluded. Defaults to now. */
  now?: Date;
}

/**
 * Generates bookable start times for a service on a given day: walks each
 * staff member's working window in the store's timezone, steps through
 * candidate starts, and drops any that run past the window or collide with an
 * existing booking. Times are deduped so the caller sees one slot per instant.
 */
export function generateSlots(input: GenerateSlotsInput): Slot[] {
  const { date, timezone, durationMin, bufferMin, windows, busy } = input;
  const stepMin = input.stepMin ?? 30;
  const now = input.now ?? new Date();

  const target = DateTime.fromISO(date, { zone: timezone });
  if (!target.isValid) return [];
  const weekday = target.weekday % 7; // Luxon Mon=1..Sun=7 -> Sun=0..Sat=6

  const busyByStaff = new Map<string, BusyInterval[]>();
  for (const interval of busy) {
    const list = busyByStaff.get(interval.staffId) ?? [];
    list.push(interval);
    busyByStaff.set(interval.staffId, list);
  }

  const found: Slot[] = [];

  for (const window of windows) {
    if (window.weekday !== weekday) continue;

    const windowStart = atTime(target, window.startTime, timezone);
    const windowEnd = atTime(target, window.endTime, timezone);
    if (!windowStart || !windowEnd || windowEnd <= windowStart) continue;

    for (
      let cursor = windowStart;
      cursor.plus({ minutes: durationMin + bufferMin }) <= windowEnd;
      cursor = cursor.plus({ minutes: stepMin })
    ) {
      const startAt = cursor.toUTC().toJSDate();
      const endAt = cursor.plus({ minutes: durationMin }).toUTC().toJSDate();

      if (startAt.getTime() < now.getTime()) continue;
      if (overlaps(startAt, endAt, busyByStaff.get(window.staffId))) continue;

      found.push({ startAt, staffId: window.staffId });
    }
  }

  // Dedupe by instant (deterministic staff pick), then sort chronologically.
  const byInstant = new Map<number, Slot>();
  for (const slot of [...found].sort((a, b) =>
    a.staffId.localeCompare(b.staffId),
  )) {
    const key = slot.startAt.getTime();
    if (!byInstant.has(key)) byInstant.set(key, slot);
  }

  return [...byInstant.values()].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
  );
}

function atTime(
  dayInZone: DateTime,
  hhmm: string,
  zone: string,
): DateTime | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  return DateTime.fromObject(
    {
      year: dayInZone.year,
      month: dayInZone.month,
      day: dayInZone.day,
      hour: Number(match[1]),
      minute: Number(match[2]),
    },
    { zone },
  );
}

function overlaps(start: Date, end: Date, intervals?: BusyInterval[]): boolean {
  if (!intervals) return false;
  const s = start.getTime();
  const e = end.getTime();
  return intervals.some((i) => s < i.end.getTime() && i.start.getTime() < e);
}
