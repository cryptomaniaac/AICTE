import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonKPIStrip() {
  return (
    <div className="kpi-strip" aria-label="Loading dashboard metrics">
      {[0,1,2,3,4].map(i => (
        <div key={i} className="panel" style={{ padding: 16 }}>
          <Skeleton style={{ width: 32, height: 32, borderRadius: 8, marginBottom: 10 }} />
          <Skeleton style={{ width: 48, height: 28, marginBottom: 6 }} />
          <Skeleton style={{ width: '70%', height: 13 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-wrap" aria-label="Loading data">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton style={{ width: '60%', height: 11 }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j}><Skeleton style={{ width: `${50 + Math.random() * 40}%`, height: 13 }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
