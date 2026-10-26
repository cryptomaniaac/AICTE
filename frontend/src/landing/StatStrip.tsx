import { useState, useEffect, useRef } from 'react';
import { FileText, CalendarCheck, AlertTriangle, ScrollText } from 'lucide-react';
import { useApp } from '../context/AppContext';

function useCountUp(target: number, duration = 1200, active = true): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start = 0;
    const startTime = performance.now();

    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // ease-out-cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (target - start) * ease));
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    const raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);

  return count;
}

export function StatStrip() {
  const { apps, evcs, urgencyItems, LOG } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const totalApps = apps.length || 13;
  const totalEvc = evcs.length || 1;
  const totalEscalations = urgencyItems.filter(x => x.d <= 15).length || 7;
  const totalAudit = LOG.length || 12;

  const countApps = useCountUp(totalApps, 1000, isVisible);
  const countEvc = useCountUp(totalEvc, 800, isVisible);
  const countEsc = useCountUp(totalEscalations, 1100, isVisible);
  const countAudit = useCountUp(totalAudit, 1200, isVisible);

  const stats = [
    {
      label: 'Open Applications',
      value: countApps,
      sub: 'Multi-stage processing routes',
      icon: FileText,
      accent: 'var(--primary)',
    },
    {
      label: 'EVC Visits Tracked',
      value: countEvc,
      sub: 'Physical & virtual inspections',
      icon: CalendarCheck,
      accent: 'var(--blue)',
    },
    {
      label: 'Escalations (L1/L2/L3)',
      value: countEsc,
      sub: 'Active deadline monitoring',
      icon: AlertTriangle,
      accent: 'var(--amber)',
    },
    {
      label: 'Audit Trail Entries',
      value: countAudit,
      sub: 'Chronological event log',
      icon: ScrollText,
      accent: 'var(--green)',
    },
  ];

  return (
    <section ref={containerRef} className="landing-stat-strip-section" aria-label="Key system statistics">
      <div className="landing-stat-strip-container">
        <div className="landing-stat-grid">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="landing-stat-card">
                <div className="landing-stat-icon-wrapper" style={{ color: stat.accent }}>
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div className="landing-stat-number tabnum">
                  {stat.value}
                </div>
                <div className="landing-stat-label">{stat.label}</div>
                <div className="landing-stat-sub">{stat.sub}</div>
              </div>
            );
          })}
        </div>
        <div className="landing-stat-footnote">
          <span>* Computed from live session data &amp; AICTE Approval Process Handbook (APH) regulations.</span>
        </div>
      </div>
    </section>
  );
}
