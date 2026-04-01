import { useMemo } from 'react';

type MonthPickerVariant = 'light' | 'dark';

interface MonthPickerProps {
  id?: string;
  value: string;
  onChange: (month: string) => void;
  minYear?: number;
  maxYear?: number;
  variant?: MonthPickerVariant;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const;

function parseMonthValue(value: string) {
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
    };
  }

  return {
    year: Number(match[1]),
    month: match[2],
  };
}

function clampYear(year: number, minYear: number, maxYear: number) {
  return Math.max(minYear, Math.min(maxYear, year));
}

function toMonthKey(year: number, month: string) {
  return `${year}-${month}`;
}

export default function MonthPicker({
  id,
  value,
  onChange,
  minYear = 2015,
  maxYear = 2035,
  variant = 'light',
}: MonthPickerProps) {
  const parsed = parseMonthValue(value);
  const currentYear = clampYear(parsed.year, minYear, maxYear);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let year = maxYear; year >= minYear; year -= 1) {
      years.push(year);
    }
    return years;
  }, [minYear, maxYear]);

  const selectClassName =
    variant === 'dark'
      ? 'w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2.5 text-sm text-white focus:border-white/70 focus:outline-none focus:ring-2 focus:ring-white/40'
      : 'w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
      <select
        id={id}
        aria-label="Select month"
        value={parsed.month}
        onChange={(event) => {
          onChange(toMonthKey(currentYear, event.target.value));
        }}
        className={selectClassName}
      >
        {MONTHS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Select year"
        value={String(currentYear)}
        onChange={(event) => {
          onChange(toMonthKey(Number(event.target.value), parsed.month));
        }}
        className={selectClassName}
      >
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
