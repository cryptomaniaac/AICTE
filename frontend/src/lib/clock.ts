/**
 * Clock & time-travel helpers for AICTE Approval Monitor.
 * Provides the reference demo date, time offset management, and date formatters.
 */

export const BASE_DEMO_DATE = new Date('2026-10-25T09:00:00+05:30');

export function getSimulatedDate(offsetDays: number = 0): Date {
  const d = new Date(BASE_DEMO_DATE.getTime());
  d.setDate(d.getDate() + offsetDays);
  return d;
}

export function formatDemoDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDemoDateTime(date: Date): string {
  return `${formatDemoDate(date)} · ${date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
}
