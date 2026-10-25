import type {
  AppRecord,
  AphRulesConfig,
  UndertakingRecord,
  DocumentRecord,
  UrgencyItem,
  AlertLevel,
} from '../types';

/* ============================================================
   lib/metrics.ts — single source of truth for every count
   shown on KPI cards, sidebar badges and summary lines.
   Pure functions only: data in (already role-scoped in the
   app context), number/list out. No React, no fetch.
   ============================================================ */

// ── Routing & SLA definitions (moved here from AppContext) ──
export const ROUTES: Record<string, string[]> = {
  S:   ['Scrutiny'],
  SE:  ['Scrutiny', 'EVC'],
  ES:  ['EVC', 'SAC/SHC'],
  E:   ['EVC'],
  SES: ['Scrutiny', 'EVC', 'SAC/SHC'],
};

export const DEFAULT_SLA: Record<string, number> = {
  Scrutiny: 15,
  EVC:      30,
  'SAC/SHC': 20,
};

/** Items due within this horizon (inclusive) count as "due soon / at risk". */
export const DUE_SOON_DAYS = 15;

// ── Pure record helpers ─────────────────────────────────────
export function getStage(a: AppRecord): string | null {
  return ROUTES[a.rt]?.[a.i] ?? null;
}

export function getDaysLeft(a: AppRecord, rules: AphRulesConfig): number {
  const s = getStage(a);
  if (!s) return 0;
  const sla = rules[s as 'Scrutiny' | 'EVC' | 'SAC/SHC'] ?? DEFAULT_SLA[s] ?? 15;
  return sla - a.age;
}

/** L3 = overdue > 7d · L2 = overdue · L1 = due within 15d · none = comfortable */
export function alertLevel(d: number): AlertLevel {
  if (d < -7)  return 'L3';
  if (d < 0)   return 'L2';
  if (d <= DUE_SOON_DAYS) return 'L1';
  return 'none';
}

export function formatDays(d: number): string {
  if (d < 0) return `${Math.abs(d)}d overdue`;
  return `${d}d left`;
}

// ── Metrics ─────────────────────────────────────────────────
/** Applications in scope that are in a processing stage (not yet forwarded). */
export function openApplications(apps: AppRecord[]): number {
  return apps.filter(a => getStage(a) !== null).length;
}

/** Applications whose current stage has run past its APH limit. */
export function stageOverdue(
  apps: AppRecord[],
  daysLeft: (a: AppRecord) => number,
): number {
  return apps.filter(a => daysLeft(a) < 0).length;
}

/** EVC queue items with the visit due within DUE_SOON_DAYS (or overdue). */
export function evcItems(evcs: AppRecord[]): number {
  return evcs.filter(a => a.evc <= DUE_SOON_DAYS).length;
}

/** Undertakings still pending (not verified) due within DUE_SOON_DAYS or overdue. */
export function undertakingsAtRisk(ul: UndertakingRecord[]): number {
  return ul.filter(u => u.s < 2 && u.d <= DUE_SOON_DAYS).length;
}

/** Leases/documents still pending that expire within DUE_SOON_DAYS or are expired. */
export function docsExpiring(dl: DocumentRecord[]): number {
  return dl.filter(x => x.s < 2 && x.d <= DUE_SOON_DAYS).length;
}

/** Urgency items that have reached L2 (overdue) or L3 (overdue > 7d). */
export function escalationsCount(items: UrgencyItem[]): number {
  return items.filter(x => {
    const lvl = alertLevel(x.d);
    return lvl === 'L2' || lvl === 'L3';
  }).length;
}

const LEVEL_RANK: Record<AlertLevel, number> = { L3: 0, L2: 1, L1: 2, none: 3 };

/** L3 first, then L2, then L1; within a level, most days overdue first. */
export function needsAttentionItems(items: UrgencyItem[]): UrgencyItem[] {
  return [...items].sort((a, b) => {
    const byLevel = LEVEL_RANK[alertLevel(a.d)] - LEVEL_RANK[alertLevel(b.d)];
    if (byLevel !== 0) return byLevel;
    return a.d - b.d;
  });
}

// ── Tooltip copy: how each number is counted ────────────────
export const METRIC_HELP = {
  openApplications:
    'Applications within your role\'s scope that are in a processing stage (Scrutiny, EVC or SAC/SHC). Files forwarded for a decision are not counted.',
  stageOverdue:
    'Applications whose current stage has run past its APH limit (SLA days minus days in stage, counted when below zero).',
  evcItems:
    `EVC queue items with the expert-visit due within ${DUE_SOON_DAYS} days, including overdue visits.`,
  undertakingsAtRisk:
    `Undertakings still pending (not verified) that are due within ${DUE_SOON_DAYS} days or already overdue.`,
  docsExpiring:
    `Leases and documents still pending (not renewed) that expire within ${DUE_SOON_DAYS} days or are already expired.`,
  escalations:
    'Open items at escalation level L2 (overdue — regional officer) or L3 (overdue by more than 7 days — Bureau). L1 reminders are not included.',
  needsAttention:
    'Urgency items across all sources, sorted L3 first, then by most days overdue.',
} as const;
