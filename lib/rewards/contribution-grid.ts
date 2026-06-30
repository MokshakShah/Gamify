import {
  getLocalDateKey,
  normalizeDateKey,
  uniqueVisitDates,
} from '@/lib/rewards/date-key';

export type ContributionDay = {
  date: string;
  visited: boolean;
  weekIndex: number;
  dayOfWeek: number;
};

export type ContributionGrid = {
  weeks: ContributionDay[][];
  monthLabels: { label: string; weekIndex: number }[];
  totalVisits: number;
  startDate: string;
  endDate: string;
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function startOfWeekSunday(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Builds a GitHub-style year grid (weeks × 7 days, Sunday-first). One square per day max. */
export function buildContributionGrid(
  visitDates: string[],
  daysBack = 364
): ContributionGrid {
  const visitSet = new Set(uniqueVisitDates(visitDates));

  const end = new Date();
  end.setHours(12, 0, 0, 0);

  const rangeStart = new Date(end);
  rangeStart.setDate(rangeStart.getDate() - daysBack);

  const gridStart = startOfWeekSunday(rangeStart);
  const weeks: ContributionDay[][] = [];
  let totalVisits = 0;
  let lastMonth = -1;
  const monthLabels: { label: string; weekIndex: number }[] = [];

  const cursor = new Date(gridStart);
  let weekIndex = 0;

  while (cursor <= end) {
    const week: ContributionDay[] = [];

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dateKey = getLocalDateKey(cursor);
      const inRange = cursor >= rangeStart && cursor <= end;
      const visited = inRange && visitSet.has(dateKey);

      if (visited) {
        totalVisits += 1;
      }

      week.push({
        date: dateKey,
        visited,
        weekIndex,
        dayOfWeek,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const firstDayOfWeek = new Date(`${week[0].date}T12:00:00`);
    const month = firstDayOfWeek.getMonth();
    if (
      month !== lastMonth &&
      week.some((d) => new Date(`${d.date}T12:00:00`) >= rangeStart)
    ) {
      monthLabels.push({ label: MONTHS[month], weekIndex });
      lastMonth = month;
    }

    weeks.push(week);
    weekIndex += 1;
  }

  return {
    weeks,
    monthLabels,
    totalVisits,
    startDate: getLocalDateKey(rangeStart),
    endDate: getLocalDateKey(end),
  };
}

export function formatVisitTooltip(date: string, visited: boolean): string {
  const parsed = new Date(`${normalizeDateKey(date)}T12:00:00`);
  const formatted = parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return visited
    ? `${formatted}: 1 visit`
    : `${formatted}: No visit`;
}
