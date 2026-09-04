import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTH_NAMES } from '@/lib/constants';

const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

interface MonthFilterProps {
  value?: string;
  onChange: (val: string | undefined) => void;
  allowAll?: boolean;
}

export function MonthFilter({ value, onChange, allowAll = true }: MonthFilterProps) {
  const selectedYear = value ? value.slice(0, 4) : 'all';
  const selectedMonth = value ? value.slice(5, 7) : 'all';

  const handleYear = (y: string) => {
    if (y === 'all') { onChange(undefined); return; }
    if (selectedMonth === 'all') { onChange(undefined); return; }
    onChange(`${y}-${selectedMonth}`);
  };

  const handleMonth = (m: string) => {
    if (m === 'all') { onChange(undefined); return; }
    const y = selectedYear === 'all' ? String(new Date().getFullYear()) : selectedYear;
    onChange(`${y}-${m}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedYear} onValueChange={handleYear}>
        <SelectTrigger className="w-[110px] font-mono text-sm">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="all">All Years</SelectItem>}
          {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={selectedMonth} onValueChange={handleMonth}>
        <SelectTrigger className="w-[130px] font-mono text-sm">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="all">All Months</SelectItem>}
          {MONTH_NAMES.map((name, i) => {
            const m = String(i + 1).padStart(2, '0');
            return <SelectItem key={m} value={m}>{name}</SelectItem>;
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
