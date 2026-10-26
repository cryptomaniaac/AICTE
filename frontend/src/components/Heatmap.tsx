import { Fragment, useMemo } from 'react';
import type { UrgencyItem } from '../types';

export const HEATMAP_REGIONS = ['North', 'South', 'East', 'West'] as const;

export interface HeatSelection {
  region: string;
  day: number | 'overdue';
}

interface HeatmapProps {
  items: UrgencyItem[];
  active: HeatSelection | null;
  onSelect: (selection: HeatSelection | null) => void;
  highlighted?: HeatSelection | null;
  onHover?: (selection: HeatSelection | null) => void;
}

const DAY_COLUMNS = 14; // today + next 13 days
const COLUMNS = DAY_COLUMNS + 1; // + overdue

function columnDay(index: number): number | 'overdue' {
  return index === 0 ? 'overdue' : index - 1;
}

function columnLabel(index: number): string {
  if (index === 0) return 'Overdue';
  const day = index - 1;
  if (day === 0) return 'Today';
  if (day === DAY_COLUMNS - 1) return `+${day}`;
  return day % 2 === 0 ? `+${day}` : '';
}

function heatLevel(count: number): number {
  if (count <= 0) return 1;
  if (count === 1) return 2;
  if (count === 2) return 3;
  if (count === 3) return 4;
  return 5;
}

const LEGEND: { label: string; level: number }[] = [
  { label: '0', level: 1 },
  { label: '1', level: 2 },
  { label: '2', level: 3 },
  { label: '3', level: 4 },
  { label: '4+', level: 5 },
];

const TEMPLATE = '54px repeat(15, minmax(0, 1fr))';

/**
 * Deadline-load heatmap: rows = region, columns = overdue + next 14 days.
 * Cell shade comes from the 5-step heat scale by item count.
 * Clicking a non-empty cell filters the attention table (toggle to clear).
 */
export function Heatmap({ items, active, onSelect, highlighted, onHover }: HeatmapProps) {
  const counts = useMemo(() => {
    const map: Record<string, number[]> = {};
    HEATMAP_REGIONS.forEach(r => {
      map[r] = Array<number>(COLUMNS).fill(0);
    });

    items.forEach(item => {
      const row = map[item.reg];
      if (!row) return;
      if (item.d < 0) {
        row[0] += 1;
      } else if (item.d < DAY_COLUMNS) {
        row[item.d + 1] += 1;
      }
    });

    return map;
  }, [items]);

  const total = useMemo(
    () => HEATMAP_REGIONS.reduce((sum, r) => sum + (counts[r]?.reduce((a, b) => a + b, 0) ?? 0), 0),
    [counts]
  );

  return (
    <div className="heatmap" onMouseLeave={() => onHover?.(null)}>
      <div className="heatmap-grid" style={{ gridTemplateColumns: TEMPLATE }}>
        {HEATMAP_REGIONS.map(region => (
          <Fragment key={region}>
            <span className="heatmap-row-label">{region}</span>
            {Array.from({ length: COLUMNS }, (_, i) => {
              const day = columnDay(i);
              const count = counts[region]?.[i] ?? 0;
              const isActive = active?.region === region && active.day === day;
              const isRing = highlighted?.region === region && highlighted.day === day;
              const label = i === 0 ? 'overdue' : day === 0 ? 'due today' : `due in ${day} days`;
              return (
                <button
                  key={i}
                  type="button"
                  className={`heatmap-cell heat-${heatLevel(count)} ${isActive ? 'active' : ''} ${isRing ? 'cell-ring' : ''}`}
                  disabled={count === 0}
                  onClick={() => onSelect(isActive ? null : { region, day })}
                  onMouseEnter={() => count > 0 && onHover?.({ region, day })}
                  aria-label={`${region}, ${label}: ${count} item${count === 1 ? '' : 's'}`}
                  aria-pressed={isActive}
                  title={`${region} · ${label}: ${count} item${count === 1 ? '' : 's'}`}
                />
              );
            })}
          </Fragment>
        ))}

        {/* Column labels underneath the grid */}
        <span aria-hidden="true" />
        {Array.from({ length: COLUMNS }, (_, i) => (
          <span key={`label-${i}`} className="heatmap-col-label" aria-hidden="true">
            {columnLabel(i)}
          </span>
        ))}
      </div>

      <div className="heatmap-footer">
        <span className="heatmap-total tabnum">{total} items in view</span>
        <div className="heatmap-legend" aria-label="Heat scale: number of items">
          {LEGEND.map(step => (
            <span key={step.label} className="heatmap-legend-item">
              <span className={`heatmap-legend-swatch heat-${step.level}`} aria-hidden="true" />
              <span className="heatmap-legend-value tabnum">{step.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
