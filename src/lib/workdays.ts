import { eachDayOfInterval, isWeekend } from "date-fns";

const TURKISH_HOLIDAYS: Set<string> = new Set([
  "01-01", "04-23", "05-01", "05-19",
  "07-15", "08-30", "10-29",
]);

function isHoliday(date: Date): boolean {
  const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return TURKISH_HOLIDAYS.has(key);
}

export function calculateWorkdays(startDate: Date, endDate: Date): number {
  if (startDate > endDate) return 0;
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter((d) => !isWeekend(d) && !isHoliday(d)).length;
}
