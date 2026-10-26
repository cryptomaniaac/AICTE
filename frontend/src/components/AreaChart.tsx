import { useEffect, useId, useRef, useState } from 'react';

export interface AreaPoint {
  day: number;
  date: Date;
  count: number;
}

export interface BrushRange {
  startDay: number;
  endDay: number;
  startDate: Date;
  endDate: Date;
}

interface AreaChartProps {
  data: AreaPoint[];
  height?: number;
  highlightedDay?: number | null;
  onHoverDay?: (day: number | null) => void;
  selectedRange?: { startDay: number; endDay: number } | null;
  onBrushSelect?: (range: BrushRange | null) => void;
}

const PAD = { l: 44, r: 14, t: 18, b: 30 };

function niceDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function fullDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Catmull-Rom → cubic Bézier, with control points clamped inside the plot. */
function smoothPath(pts: { x: number; y: number }[], top: number, bottom: number): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  const clamp = (y: number) => Math.max(top, Math.min(bottom, y));
  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clamp(p2.y - (p3.y - p1.y) / 6);

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

/**
 * Hand-written SVG area chart (no chart library).
 * Soft primary gradient fill, dashed gridlines, hover band + white tooltip card.
 */
export function AreaChart({
  data,
  height = 260,
  highlightedDay,
  onHoverDay,
  selectedRange,
  onBrushSelect,
}: AreaChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [brushStart, setBrushStart] = useState<number | null>(null);
  const [brushCurrent, setBrushCurrent] = useState<number | null>(null);
  const [isBrushing, setIsBrushing] = useState(false);
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Listen for Escape key to clear brush
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBrushSelect?.(null);
        setBrushStart(null);
        setBrushCurrent(null);
        setIsBrushing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBrushSelect]);

  const n = data.length;
  const plotW = Math.max(0, width - PAD.l - PAD.r);
  const plotH = Math.max(0, height - PAD.t - PAD.b);
  const max = Math.max(1, ...data.map(d => d.count));
  const bottom = PAD.t + plotH;

  const xFor = (i: number) => (n <= 1 ? PAD.l + plotW / 2 : PAD.l + (i / (n - 1)) * plotW);
  const yFor = (v: number) => PAD.t + plotH - (v / max) * plotH;

  const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.count) }));
  const line = smoothPath(points, PAD.t, bottom);
  const area = points.length > 1
    ? `${line} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`
    : '';

  // Nice, de-duplicated horizontal gridline values.
  const tickValues = [...new Set([0, Math.ceil(max / 2), max])];

  // About six x-axis labels.
  const tickCount = Math.min(6, n);
  const tickStep = Math.max(1, Math.round((n - 1) / Math.max(1, tickCount - 1)));
  const xTicks = Array.from({ length: n }, (_, i) => i).filter(
    i => i === 0 || i === n - 1 || i % tickStep === 0
  );

  const getIdxFromX = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return 0;
    const x = clientX - rect.left;
    const t = (x - PAD.l) / Math.max(1, plotW);
    return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
  };

  const handlePointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    const idx = getIdxFromX(e.clientX);
    setIsBrushing(true);
    setBrushStart(idx);
    setBrushCurrent(idx);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    const idx = getIdxFromX(e.clientX);
    setHover(idx);
    onHoverDay?.(data[idx]?.day ?? null);

    if (isBrushing) {
      setBrushCurrent(idx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGRectElement>) => {
    if (isBrushing && brushStart !== null && brushCurrent !== null) {
      const minIdx = Math.min(brushStart, brushCurrent);
      const maxIdx = Math.max(brushStart, brushCurrent);
      if (minIdx !== maxIdx) {
        onBrushSelect?.({
          startDay: data[minIdx].day,
          endDay: data[maxIdx].day,
          startDate: data[minIdx].date,
          endDate: data[maxIdx].date,
        });
      } else {
        onBrushSelect?.(null);
      }
    }
    setIsBrushing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerLeave = () => {
    if (!isBrushing) {
      setHover(null);
      onHoverDay?.(null);
    }
  };

  const hoverPoint = hover !== null ? points[hover] : null;
  const hoverData = hover !== null ? data[hover] : null;
  const placeBelow = hoverPoint ? hoverPoint.y < 86 : false;
  const tooltipLeft = hoverPoint ? Math.max(86, Math.min(width - 86, hoverPoint.x)) : 0;

  // Active brush rect calculation
  const activeBrushMin = isBrushing && brushStart !== null && brushCurrent !== null
    ? Math.min(brushStart, brushCurrent)
    : selectedRange
      ? data.findIndex(d => d.day >= selectedRange.startDay)
      : null;

  const activeBrushMax = isBrushing && brushStart !== null && brushCurrent !== null
    ? Math.max(brushStart, brushCurrent)
    : selectedRange
      ? (() => {
          for (let i = data.length - 1; i >= 0; i--) {
            if (data[i].day <= selectedRange.endDay) return i;
          }
          return null;
        })()
      : null;

  const brushBox = activeBrushMin !== null && activeBrushMax !== null && activeBrushMin >= 0 && activeBrushMax >= 0 && activeBrushMin !== activeBrushMax
    ? {
        x: xFor(activeBrushMin) - 4,
        w: Math.max(8, xFor(activeBrushMax) - xFor(activeBrushMin) + 8),
      }
    : null;

  // Highlighted day point from external hover
  const extHighlightedIdx = highlightedDay !== null && highlightedDay !== undefined
    ? data.findIndex(d => d.day === highlightedDay)
    : -1;
  const extPoint = extHighlightedIdx >= 0 ? points[extHighlightedIdx] : null;

  return (
    <div className="area-chart" ref={wrapRef}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label="Items due per day"
        style={{ cursor: isBrushing ? 'col-resize' : 'crosshair' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Dashed horizontal gridlines + y labels */}
        {tickValues.map(v => (
          <g key={v}>
            <line
              x1={PAD.l}
              x2={width - PAD.r}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <text
              x={PAD.l - 10}
              y={yFor(v)}
              dy="0.32em"
              textAnchor="end"
              fontSize="10.5"
              fill="var(--muted)"
            >
              {v}
            </text>
          </g>
        ))}

        {area && <path d={area} fill={`url(#${gradientId})`} />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Brush selection box */}
        {brushBox && (
          <rect
            x={brushBox.x}
            y={PAD.t}
            width={brushBox.w}
            height={plotH}
            fill="var(--primary)"
            opacity="0.15"
            stroke="var(--primary)"
            strokeDasharray="4 3"
            rx="4"
          />
        )}

        {/* External hover ring marker */}
        {extPoint && (
          <g className="cell-ring">
            <circle cx={extPoint.x} cy={extPoint.y} r="9" fill="none" stroke="var(--primary)" strokeWidth="2.5" opacity="0.8" />
            <circle cx={extPoint.x} cy={extPoint.y} r="4" fill="var(--primary)" />
          </g>
        )}

        {/* Hover band + marker */}
        {hoverPoint && (
          <>
            <rect
              x={hoverPoint.x - Math.max(8, (plotW / Math.max(1, n - 1)) * 0.45)}
              y={PAD.t}
              width={Math.max(16, (plotW / Math.max(1, n - 1)) * 0.9)}
              height={plotH}
              fill="var(--primary)"
              opacity="0.07"
              rx="6"
            />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r="8" fill="var(--primary)" opacity="0.14" />
            <circle
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              r="4.5"
              fill="var(--surface)"
              stroke="var(--primary)"
              strokeWidth="2.5"
            />
          </>
        )}

        {/* X labels */}
        {xTicks.map(i => (
          <text
            key={i}
            x={xFor(i)}
            y={height - 8}
            textAnchor="middle"
            fontSize="10.5"
            fill="var(--muted)"
          >
            {niceDate(data[i].date)}
          </text>
        ))}

        {/* Pointer capture overlay for brush and hover */}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={plotW}
          height={plotH}
          fill="transparent"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </svg>

      {hoverPoint && hoverData && !isBrushing && (
        <div
          className="chart-tooltip"
          style={{
            left: tooltipLeft,
            top: hoverPoint.y + (placeBelow ? 16 : -12),
            transform: placeBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
          }}
        >
          <div className="chart-tooltip-date">{fullDate(hoverData.date)}</div>
          <div className="chart-tooltip-value">
            <strong className="tabnum">{hoverData.count}</strong>
            <span>items due</span>
          </div>
        </div>
      )}
    </div>
  );
}
