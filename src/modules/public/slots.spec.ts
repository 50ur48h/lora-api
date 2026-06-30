import { generateSlots, type AvailabilityWindow } from './slots';

const TZ = 'Asia/Kuala_Lumpur';
const PAST = new Date('2020-01-01T00:00:00Z');
const MONDAY = '2027-01-04'; // weekday 1
const SUNDAY = '2027-01-03'; // weekday 0

function window(
  staffId: string,
  weekday: number,
  startTime = '10:00',
  endTime = '18:00',
): AvailabilityWindow {
  return { staffId, weekday, startTime, endTime };
}

describe('generateSlots', () => {
  it('walks the working window at the service cadence', () => {
    const slots = generateSlots({
      date: MONDAY,
      timezone: TZ,
      durationMin: 60,
      bufferMin: 0,
      stepMin: 60,
      windows: [window('s1', 1)],
      busy: [],
      now: PAST,
    });

    expect(slots).toHaveLength(8); // 10:00..17:00 starts
    // 10:00 Kuala Lumpur (UTC+8) == 02:00 UTC.
    expect(slots[0].startAt.toISOString()).toBe('2027-01-04T02:00:00.000Z');
    expect(slots[7].startAt.toISOString()).toBe('2027-01-04T09:00:00.000Z');
    expect(slots.every((s) => s.staffId === 's1')).toBe(true);
  });

  it('excludes slots that collide with an existing booking', () => {
    const slots = generateSlots({
      date: MONDAY,
      timezone: TZ,
      durationMin: 60,
      bufferMin: 0,
      stepMin: 60,
      windows: [window('s1', 1)],
      busy: [
        {
          staffId: 's1',
          start: new Date('2027-01-04T04:00:00Z'), // 12:00 local
          end: new Date('2027-01-04T05:00:00Z'),
        },
      ],
      now: PAST,
    });

    expect(slots).toHaveLength(7);
    expect(
      slots.find((s) => s.startAt.toISOString() === '2027-01-04T04:00:00.000Z'),
    ).toBeUndefined();
  });

  it('returns nothing when no staff works that weekday', () => {
    const slots = generateSlots({
      date: SUNDAY,
      timezone: TZ,
      durationMin: 60,
      bufferMin: 0,
      windows: [window('s1', 1)],
      busy: [],
      now: PAST,
    });
    expect(slots).toHaveLength(0);
  });

  it('dedupes overlapping staff into one slot per instant', () => {
    const slots = generateSlots({
      date: MONDAY,
      timezone: TZ,
      durationMin: 60,
      bufferMin: 0,
      stepMin: 60,
      windows: [window('s2', 1), window('s1', 1)],
      busy: [],
      now: PAST,
    });

    expect(slots).toHaveLength(8);
    // Deterministic staff pick: lexicographically smallest id wins.
    expect(slots.every((s) => s.staffId === 's1')).toBe(true);
  });

  it('respects the service buffer when fitting the window', () => {
    const slots = generateSlots({
      date: MONDAY,
      timezone: TZ,
      durationMin: 60,
      bufferMin: 30,
      stepMin: 60,
      windows: [window('s1', 1, '10:00', '12:30')],
      busy: [],
      now: PAST,
    });
    // Only 10:00 fits (10:00 + 60 + 30 = 11:30 <= 12:30); 11:00 + 90 = 12:30 ok too.
    expect(slots.map((s) => s.startAt.toISOString())).toEqual([
      '2027-01-04T02:00:00.000Z',
      '2027-01-04T03:00:00.000Z',
    ]);
  });

  it('drops slots in the past', () => {
    const slots = generateSlots({
      date: MONDAY,
      timezone: TZ,
      durationMin: 60,
      bufferMin: 0,
      stepMin: 60,
      windows: [window('s1', 1)],
      busy: [],
      now: new Date('2027-01-04T06:00:00Z'), // 14:00 local — only 14:00+ remain
    });
    expect(slots[0].startAt.toISOString()).toBe('2027-01-04T06:00:00.000Z');
    expect(
      slots.every(
        (s) => s.startAt.getTime() >= Date.parse('2027-01-04T06:00:00Z'),
      ),
    ).toBe(true);
  });
});
