import { useState, useEffect, useRef } from 'react';
import {
  GitMerge, Clock, Users, ClipboardCheck, AlertTriangle, ArrowRight, CheckCircle2, Shield
} from 'lucide-react';
import { navigateTo } from '../router';

interface Step {
  num: number;
  title: string;
  subtitle: string;
  desc: string;
  badge: string;
  appPath: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  {
    num: 1,
    title: 'Application arrives & routes automatically',
    subtitle: 'Rule-driven route classification (S, SE, ES, E, SES)',
    desc: 'When an institution submits through the National Approval Portal, the engine classifies required stages according to AICTE handbook criteria. New institutions follow SE, extensions follow S, and special cases follow SES, eliminating manual routing delays.',
    badge: 'Stage 1 · Automated Intake',
    appPath: '/app/applications',
    icon: GitMerge,
  },
  {
    num: 2,
    title: 'Delays are monitored continuously against statutory SLA',
    subtitle: 'Dynamic countdown telemetry & regional load heatmaps',
    desc: 'Each stage limit (e.g. Scrutiny 15 days, EVC 30 days) is monitored continuously against real calendar days. The regional heatmap plots applications by days-remaining across North, South, East, and West regions, instantly revealing bottlenecks.',
    badge: 'Stage 2 · Live SLA Telemetry',
    appPath: '/app/overview',
    icon: Clock,
  },
  {
    num: 3,
    title: 'EVC inspection is scheduled & coordinated',
    subtitle: 'Physical or virtual Expert Visit Committee assignment',
    desc: 'Eligible applications automatically queue for Expert Visit Committee (EVC) scheduling. Bureau and regional officers allocate expert panels, verify convener availability, reschedule inspections within compliance windows, and record clearances directly.',
    badge: 'Stage 3 · Inspection Coordination',
    appPath: '/app/evc',
    icon: Users,
  },
  {
    num: 4,
    title: 'Undertakings & lease validity are tracked',
    subtitle: 'Time-bound legal affidavits & expiring institutional documents',
    desc: 'Compliance conditions such as fire-safety NOCs, land mutations, faculty appointments, and corpus deposits are tracked with independent expiry counters. The system alerts compliance teams 15 days before certificates lapse.',
    badge: 'Stage 4 · Document Assurance',
    appPath: '/app/undertakings',
    icon: ClipboardCheck,
  },
  {
    num: 5,
    title: 'Alerts escalate L1, L2, L3 & sync to audit trail',
    subtitle: 'Tiered escalation matrix & tamper-evident regulatory journal',
    desc: 'As deadlines approach, items trigger L1 notices (due ≤15d), L2 overdue alerts (stage limit exceeded), and L3 critical warnings (>7d overdue). Every notification, officer decision, and status advance is written to the immutable audit trail.',
    badge: 'Stage 5 · Statutory Escalation & Audit',
    appPath: '/app/escalations',
    icon: AlertTriangle,
  },
];

export function HowItWorksPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      const totalH = rect.height;
      const current = windowH - rect.top;
      const pct = Math.max(0, Math.min(1, current / totalH));
      setScrollProgress(pct);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-subpage-container" role="main" aria-labelledby="how-it-works-title">
      <div className="subpage-header">
        <div className="subpage-badge">
          <Shield size={12} aria-hidden="true" />
          <span>Statutory Lifecycle</span>
        </div>
        <h1 id="how-it-works-title" className="subpage-title">
          How the approval monitor works end-to-end
        </h1>
        <p className="subpage-lead">
          From initial portal submission to final council decision, every step is automated, tracked against statutory timelines, and fully auditable.
        </p>
      </div>

      <div ref={containerRef} className="timeline-container">
        {/* Scroll Progress Line */}
        <div className="timeline-rail" aria-hidden="true">
          <div
            className="timeline-rail-fill"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>

        {/* 5 Vertical Timeline Steps */}
        <div className="timeline-steps">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isFilled = scrollProgress >= (idx + 0.3) / STEPS.length;
            return (
              <div key={step.num} className={`timeline-step-row${isFilled ? ' filled' : ''}`}>
                {/* Step Marker */}
                <div className="timeline-step-marker" aria-hidden="true">
                  <div className="marker-circle">
                    {isFilled ? <CheckCircle2 size={16} /> : <span>{step.num}</span>}
                  </div>
                </div>

                {/* Step Card */}
                <div className="timeline-step-card">
                  <div className="timeline-card-header">
                    <div className="timeline-badge-row">
                      <span className="timeline-step-badge">{step.badge}</span>
                    </div>
                    <h2 className="timeline-step-title">{step.title}</h2>
                    <p className="timeline-step-subtitle">{step.subtitle}</p>
                  </div>

                  <p className="timeline-step-desc">{step.desc}</p>

                  <div className="timeline-card-action">
                    <button
                      className="timeline-try-btn"
                      onClick={() => navigateTo(step.appPath, { transition: true })}
                    >
                      <Icon size={14} aria-hidden="true" />
                      <span>Try this in the app</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
