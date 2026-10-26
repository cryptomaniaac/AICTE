import { useState, useEffect, useRef } from 'react';
import {
  FileText, Clock, Users, ClipboardCheck, FileSignature,
  Search, Shield, ChevronRight, Sparkles, ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ProductFrameProps {
  onGetStarted: () => void;
}

export function ProductFrame({ onGetStarted }: ProductFrameProps) {
  const { apps, evcs, ul, dl, urgencyItems } = useApp();
  const [tilt, setTilt] = useState({ rx: 6, ry: 0 });
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (e.clientX - cx) / cx; // -1 to 1
        const dy = (e.clientY - cy) / cy; // -1 to 1

        // Subtle 3D tilt
        const rx = 6 - dy * 4;
        const ry = dx * 4;
        setTilt({ rx, ry });
        ticking = false;
      });
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY > 150) {
        // Straighten as user scrolls down
        const progress = Math.min(1, (scrollY - 150) / 300);
        setTilt(prev => ({
          rx: prev.rx * (1 - progress),
          ry: prev.ry * (1 - progress),
        }));
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="landing-product-frame-container"
      onClick={onGetStarted}
      role="region"
      aria-label="Interactive preview of AICTE Approval Monitor. Click to open live application."
    >
      {/* Top Edge Glow Rim Light */}
      <div className="landing-frame-glow-line" aria-hidden="true" />

      {/* 3D Tilted Device Shell */}
      <div
        className="landing-device-shell"
        style={{
          transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        }}
      >
        {/* Device Header Bar */}
        <div className="landing-device-header">
          <div className="landing-window-dots" aria-hidden="true">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>

          <div className="landing-device-url-bar">
            <Shield size={11} className="url-shield-icon" aria-hidden="true" />
            <span className="url-text">https://aicte-monitor.gov.in/app/overview</span>
          </div>

          <div className="landing-device-meta">
            <span className="live-dot-pulse" aria-hidden="true" />
            <span className="live-tag">Live Sync · Bureau</span>
            <span className="open-badge">
              Open App <ExternalLink size={10} aria-hidden="true" />
            </span>
          </div>
        </div>

        {/* Device Screen Content (Live Mock Overview UI) */}
        <div className="landing-device-screen">
          {/* Top Bar Preview */}
          <div className="mini-topbar">
            <div className="mini-topbar-left">
              <span className="mini-title">AICTE Approval &amp; Compliance Monitor</span>
              <span className="mini-badge">Bureau — All Regions</span>
            </div>
            <div className="mini-topbar-right">
              <div className="mini-search">
                <Search size={11} />
                <span>Search institution, ID...</span>
              </div>
            </div>
          </div>

          {/* KPI Cells Grid */}
          <div className="mini-kpi-grid">
            <div className="mini-kpi-card active">
              <div className="mini-kpi-header">
                <FileText size={13} className="mini-kpi-icon" />
                <span>Open applications</span>
              </div>
              <div className="mini-kpi-val">{apps.length || 13}</div>
              <div className="mini-kpi-sub">7 at L1 · 2 at L2</div>
            </div>

            <div className="mini-kpi-card">
              <div className="mini-kpi-header">
                <Clock size={13} className="mini-kpi-icon" />
                <span>Stage overdue</span>
              </div>
              <div className="mini-kpi-val" style={{ color: 'var(--red)' }}>2</div>
              <div className="mini-kpi-sub">Scrutiny 15d SLA</div>
            </div>

            <div className="mini-kpi-card">
              <div className="mini-kpi-header">
                <Users size={13} className="mini-kpi-icon" />
                <span>EVCs due ≤ 15d</span>
              </div>
              <div className="mini-kpi-val">{evcs.length || 1}</div>
              <div className="mini-kpi-sub">Expert visits at risk</div>
            </div>

            <div className="mini-kpi-card">
              <div className="mini-kpi-header">
                <ClipboardCheck size={13} className="mini-kpi-icon" />
                <span>Undertakings at risk</span>
              </div>
              <div className="mini-kpi-val">{ul.filter(u => u.s < 2 && u.d <= 15).length || 4}</div>
              <div className="mini-kpi-sub">Pending affidavits</div>
            </div>

            <div className="mini-kpi-card">
              <div className="mini-kpi-header">
                <FileSignature size={13} className="mini-kpi-icon" />
                <span>Docs expiring</span>
              </div>
              <div className="mini-kpi-val">{dl.filter(d => d.s < 2 && d.d <= 15).length || 4}</div>
              <div className="mini-kpi-sub">Leases ≤ 15 days</div>
            </div>
          </div>

          {/* Deadline Heatmap Preview Strip */}
          <div className="mini-heatmap-panel">
            <div className="mini-panel-header">
              <span className="mini-panel-title">Deadline Load Heatmap — All Regions</span>
              <span className="mini-panel-link">15-day SLA timeline →</span>
            </div>
            <div className="mini-heat-grid">
              {['North', 'South', 'East', 'West'].map((region, rIdx) => (
                <div key={region} className="mini-heat-row">
                  <span className="mini-region-label">{region}</span>
                  <div className="mini-heat-cells">
                    {Array.from({ length: 14 }).map((_, cIdx) => {
                      const heat = (rIdx * 3 + cIdx) % 5;
                      return (
                        <div
                          key={cIdx}
                          className={`mini-heat-cell heat-${heat}`}
                          title={`${region}: Day ${cIdx}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attention Queue Preview Table */}
          <div className="mini-table-panel">
            <div className="mini-panel-header">
              <span className="mini-panel-title">Attention Queue (Urgent Compliance Actions)</span>
              <span className="mini-panel-meta">Showing urgent statutory items</span>
            </div>
            <div className="mini-table-rows">
              {urgencyItems.slice(0, 3).map((item, i) => (
                <div key={i} className="mini-table-row">
                  <span className={`mini-level-chip ${item.d < -7 ? 'l3' : item.d < 0 ? 'l2' : 'l1'}`}>
                    {item.d < -7 ? 'L3' : item.d < 0 ? 'L2' : 'L1'}
                  </span>
                  <span className="mini-row-title">{item.inst}</span>
                  <span className="mini-row-kind">{item.kind} · {item.reg}</span>
                  <span className="mini-row-days">{item.d < 0 ? `${Math.abs(item.d)}d overdue` : `${item.d}d left`}</span>
                  <span className="mini-row-action">Review →</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hover Click Overlay Banner */}
        <div className="landing-frame-click-overlay">
          <div className="frame-overlay-content">
            <Sparkles size={16} />
            <span>Click to enter live working prototype</span>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
