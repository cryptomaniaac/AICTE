import type { ReactNode } from 'react';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  icon: ReactNode;
}

interface DonutProps {
  slices: DonutSlice[];
  total: number;
  active: string | null;
  onSelect: (key: string) => void;
}

const SIZE = 216;
const STROKE = 24;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const GAP = 8; // px between rounded-cap segments

/**
 * Hand-written SVG donut gauge: thick ring, rounded caps, donut shades.
 * The centre shows the total; the legend below filters the attention table.
 */
export function Donut({ slices, total, active, onSelect }: DonutProps) {
  const visible = slices.filter(s => s.value > 0);
  let offset = 0;

  return (
    <div className="donut">
      <div className="donut-ring">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Applications by stage. Total ${total} open applications.`}
        >
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />

          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {visible.map(slice => {
              const share = slice.value / Math.max(1, total);
              const len = share * CIRC;
              const dash = Math.max(2, len - GAP);
              const segment = (
                <circle
                  key={slice.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${CIRC - dash}`}
                  strokeDashoffset={-offset}
                  opacity={active && active !== slice.key ? 0.35 : 1}
                  style={{ transition: 'opacity .15s', cursor: 'pointer' }}
                  onClick={() => onSelect(slice.key)}
                >
                  <title>{`${slice.label}: ${slice.value} (${(share * 100).toFixed(1)}%)`}</title>
                </circle>
              );
              offset += len;
              return segment;
            })}
          </g>
        </svg>

        <div className="donut-center">
          <span className="donut-center-icon" aria-hidden="true">◎</span>
          <span className="donut-center-value tabnum">{total}</span>
          <span className="donut-center-label">Open applications</span>
        </div>
      </div>

      <div className="donut-legend" role="group" aria-label="Filter attention table by stage">
        {slices.map(slice => {
          const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0';
          return (
            <button
              key={slice.key}
              className={`donut-legend-row ${active === slice.key ? 'active' : ''}`}
              onClick={() => onSelect(slice.key)}
              aria-pressed={active === slice.key}
              aria-label={`${slice.label}: ${slice.value} applications, ${pct} percent. Filters the attention table.`}
            >
              <span className="donut-legend-icon" style={{ color: slice.color }} aria-hidden="true">
                {slice.icon}
              </span>
              <span className="donut-legend-name">{slice.label}</span>
              <span className="donut-legend-pct tabnum">{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
