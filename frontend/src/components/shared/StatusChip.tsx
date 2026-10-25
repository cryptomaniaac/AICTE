import { alertLevel, formatDays } from '../../context/AppContext';

interface StatusChipProps {
  days: number;
  closed?: boolean;
  closedLabel?: string;
}

export function StatusChip({ days, closed, closedLabel = 'Closed' }: StatusChipProps) {
  if (closed) {
    return <span className="chip chip-green">{closedLabel}</span>;
  }
  if (days < 0) {
    return <span className="chip chip-red">{formatDays(days)}</span>;
  }
  if (days <= 15) {
    return <span className="chip chip-amber">{formatDays(days)}</span>;
  }
  return <span className="chip chip-grey">{formatDays(days)}</span>;
}

interface LevelChipProps {
  days: number;
}

export function LevelChip({ days }: LevelChipProps) {
  const lvl = alertLevel(days);
  if (lvl === 'L3') return <span className="chip chip-l3" aria-label="Level 3 escalation — Bureau">L3 · Bureau</span>;
  if (lvl === 'L2') return <span className="chip chip-l2" aria-label="Level 2 escalation — Regional">L2 · Regional</span>;
  if (lvl === 'L1') return <span className="chip chip-l1" aria-label="Level 1 escalation — Institution">L1 · Institution</span>;
  return <span className="chip chip-grey">—</span>;
}

interface StageChipsProps {
  route: string;
  currentIndex: number;
  routes: Record<string, string[]>;
}

export function StageChips({ route, currentIndex, routes }: StageChipsProps) {
  const stages = routes[route] || [];
  return (
    <span>
      {stages.map((s, j) => {
        const cls = j < currentIndex ? 'done' : j === currentIndex ? 'active' : '';
        return <span key={j} className={`stage-chip ${cls}`}>{s}</span>;
      })}
    </span>
  );
}
