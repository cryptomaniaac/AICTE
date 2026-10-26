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
  highlightedKey?: string | null;
  onHover?: (key: string | null) => void;
}

const VIEW_SIZE = 240;
const CX = VIEW_SIZE / 2; // 120
const CY = VIEW_SIZE / 2; // 120
const STROKE = 22;
const R = 88; // 88 + 11 = 99px, leaving 21px padding inside 240px canvas
const CIRC = 2 * Math.PI * R;
const GAP = 7; // px between rounded-cap segments

/**
 * Hand-written SVG donut gauge: thick ring, rounded caps, donut shades.
 * The centre shows the total; the legend below filters the attention table.
 */
export function Donut({ slices, total, active, onSelect, highlightedKey, onHover }: DonutProps) {
  const visible = slices.filter(s => s.value > 0);
  let offset = 0;

  return (
    <div className="donut" onMouseLeave={() => onHover?.(null)}>
      <div className="donut-ring">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          role="img"
          aria-label={`Applications by stage. Total ${total} open applications.`}
          style={{ overflow: 'visible' }}
        >
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />

          <g transform={`rotate(-90 ${CX} ${CY})`}>
            {visible.map(slice => {
              const share = slice.value / Math.max(1, total);
              const len = share * CIRC;
              const dash = Math.max(2, len - GAP);
              const isRing = highlightedKey === slice.key;
              const segment = (
                <circle
                  key={slice.key}
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isRing ? STROKE + 4 : STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${CIRC - dash}`}
                  strokeDashoffset={-offset}
                  opacity={active && active !== slice.key ? 0.35 : 1}
                  className={isRing ? 'donut-slice-ring' : ''}
                  style={{
                    transition: 'opacity 0.2s ease, stroke-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelect(slice.key)}
                  onMouseEnter={() => onHover?.(slice.key)}
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
