type StatRingProps = {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  color?: string;
};

export function StatRing({
  label,
  value,
  max = 365,
  suffix = '',
  color = '#ffa116',
}: StatRingProps) {
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative h-[88px] w-[88px]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88" aria-hidden>
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="#e8e8e8"
            strokeWidth="6"
          />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold leading-none text-gray-900">
            {value}
            {suffix}
          </span>
        </div>
      </div>
      <span className="max-w-[88px] text-xs leading-tight text-gray-500">{label}</span>
    </div>
  );
}
