export type AnalyticsDateFilter = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export interface AnalyticsDateRanges {
  filterStart: Date | null;
  filterEnd: Date | null;
  prevStart: Date | null;
  prevEnd: Date | null;
  currentRangeLabel: string;
  prevRangeLabel: string;
}

const fmtShortDate = (d: Date) =>
  d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtMonthYear = (d: Date) =>
  d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

export function computeAnalyticsDateRanges(
  dateFilter: string,
  startDateParam?: string | null,
  endDateParam?: string | null,
  now: Date = new Date()
): AnalyticsDateRanges {
  let filterStart: Date | null = null;
  let filterEnd: Date | null = null;
  let prevStart: Date | null = null;
  let prevEnd: Date | null = null;
  let currentRangeLabel = 'All Time';
  let prevRangeLabel = 'Previous Period';

  if (dateFilter === 'today') {
    filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    currentRangeLabel = fmtShortDate(filterStart);
    prevRangeLabel = fmtShortDate(prevStart);
  } else if (dateFilter === 'week') {
    const dayOfWeek = now.getDay(); // 0 = Sunday
    filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
    filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59, 999);
    prevStart = new Date(filterStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevEnd = new Date(filterEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    currentRangeLabel = `${fmtShortDate(filterStart)} – ${fmtShortDate(filterEnd)}`;
    prevRangeLabel = `${fmtShortDate(prevStart)} – ${fmtShortDate(prevEnd)}`;
  } else if (dateFilter === 'month') {
    filterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    currentRangeLabel = fmtMonthYear(filterStart);
    prevRangeLabel = fmtMonthYear(prevStart);
  } else if (dateFilter === 'year') {
    filterStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    filterEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    currentRangeLabel = `Year ${now.getFullYear()}`;
    prevRangeLabel = `Year ${now.getFullYear() - 1}`;
  } else if (dateFilter === 'custom' && startDateParam && endDateParam) {
    const s = new Date(startDateParam);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDateParam);
    e.setHours(23, 59, 59, 999);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      filterStart = s;
      filterEnd = e;
      const diff = filterEnd.getTime() - filterStart.getTime();
      prevEnd = new Date(filterStart.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diff);
      currentRangeLabel = `${fmtShortDate(filterStart)} – ${fmtShortDate(filterEnd)}`;
      prevRangeLabel = `${fmtShortDate(prevStart)} – ${fmtShortDate(prevEnd)}`;
    }
  }

  return {
    filterStart,
    filterEnd,
    prevStart,
    prevEnd,
    currentRangeLabel,
    prevRangeLabel,
  };
}

