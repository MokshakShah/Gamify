'use client';

import { useMemo, useState } from 'react';

import {
  buildContributionGrid,
  formatVisitTooltip,
} from '@/lib/rewards/contribution-grid';
import { getLocalDateKey } from '@/lib/rewards/date-key';

type VisitContributionGraphProps = {
  visitDates: string[];
};

const DAY_LABELS: Record<number, string> = {
  1: 'Mon',
  3: 'Wed',
  5: 'Fri',
};

const COLORS = {
  empty: '#ebedf0',
  visited: '#40c463',
  today: '#216e39',
} as const;

export function VisitContributionGraph({ visitDates }: VisitContributionGraphProps) {
  const grid = useMemo(() => buildContributionGrid(visitDates), [visitDates]);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const today = getLocalDateKey();

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-[#fafafa] p-4 sm:p-5">
      <p className="mb-4 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{grid.totalVisits}</span>{' '}
        active {grid.totalVisits === 1 ? 'day' : 'days'} in the past year
        <span className="ml-2 text-xs text-gray-400">(max 1 per day)</span>
      </p>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Month labels */}
        <div className="mb-1 grid pl-7" style={{ gridTemplateColumns: `repeat(${grid.weeks.length}, minmax(0, 1fr))`, gap: '3px' }}>
          {grid.monthLabels.map(({ label, weekIndex }) => (
            <span
              key={`${label}-${weekIndex}`}
              className="col-start-1 text-[10px] text-gray-500"
              style={{ gridColumnStart: weekIndex + 1 }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 gap-1">
          {/* Day labels */}
          <div className="flex w-6 shrink-0 flex-col justify-between py-0.5 text-[10px] leading-none text-gray-500">
            {Array.from({ length: 7 }, (_, dayOfWeek) => (
              <span key={dayOfWeek} className="flex h-0 flex-1 items-center">
                {DAY_LABELS[dayOfWeek] ?? ''}
              </span>
            ))}
          </div>

          {/* Full-width heatmap */}
          <div
            className="grid min-w-0 flex-1"
            style={{
              gridTemplateColumns: `repeat(${grid.weeks.length}, minmax(0, 1fr))`,
              gap: '3px',
            }}
          >
            {grid.weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex min-w-0 flex-col gap-[3px]">
                {week.map((day) => {
                  const isToday = day.date === today;
                  const inRange =
                    day.date >= grid.startDate && day.date <= grid.endDate;

                  if (!inRange) {
                    return (
                      <div key={day.date} className="aspect-square w-full" aria-hidden />
                    );
                  }

                  const fill = day.visited
                    ? isToday
                      ? COLORS.today
                      : COLORS.visited
                    : COLORS.empty;

                  return (
                    <button
                      key={day.date}
                      type="button"
                      aria-label={formatVisitTooltip(day.date, day.visited)}
                      className="aspect-square w-full min-w-0 rounded-[2px] transition-transform hover:scale-110 hover:ring-1 hover:ring-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      style={{ backgroundColor: fill }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          text: formatVisitTooltip(day.date, day.visited),
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onFocus={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          text: formatVisitTooltip(day.date, day.visited),
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        });
                      }}
                      onBlur={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Binary legend — one visit per day */}
      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-gray-500">
        <span>Less</span>
        <span
          className="inline-block rounded-[2px]"
          style={{ width: 11, height: 11, backgroundColor: COLORS.empty }}
        />
        <span
          className="inline-block rounded-[2px]"
          style={{ width: 11, height: 11, backgroundColor: COLORS.visited }}
        />
        <span>More</span>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
