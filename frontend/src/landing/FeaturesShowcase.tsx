import { useState, useEffect, useRef } from 'react';
import {
  GitMerge, Clock, Users, ClipboardCheck, AlertTriangle, ScrollText,
  ArrowRight, CheckCircle2, ChevronRight
} from 'lucide-react';
import { navigateTo } from '../router';

interface FeatureItem {
  id: string;
  icon: React.ElementType;
  title: string;
  shortDesc: string;
  benefit: string;
  badge: string;
  appPath: string;
  visualType: 'routing' | 'sla' | 'evc' | 'undertakings' | 'escalation' | 'audit';
}

const FEATURES: FeatureItem[] = [
  {
    id: 'routing',
    icon: GitMerge,
    title: 'Smart Route Classification',
    shortDesc: 'Automates application workflows across S, SE, ES, E, and SES pathways.',
    benefit: 'Eliminates manual stage assignment with strict APH rule adherence.',
    badge: 'Route S · SE · ES · SES',
    appPath: '/app/applications',
    visualType: 'routing',
  },
  {
    id: 'sla',
    icon: Clock,
    title: 'SLA & Delay Monitoring',
    shortDesc: 'Continuous statutory timeline calculation against prescribed limits.',
    benefit: 'Pinpoints bottlenecks with 15-day regional deadline load heatmaps.',
    badge: '15d Scrutiny · 30d EVC',
    appPath: '/app/overview',
    visualType: 'sla',
  },
  {
    id: 'evc',
    icon: Users,
    title: 'EVC Inspection Scheduling',
    shortDesc: 'Tracks and coordinates physical and virtual expert committee visits.',
    benefit: 'Optimistic rescheduling and instant panel notification routing.',
    badge: 'Panel Assigned · Timeline Tracked',
    appPath: '/app/evc',
    visualType: 'evc',
  },
  {
    id: 'undertakings',
    icon: ClipboardCheck,
    title: 'Undertakings & Lease Tracking',
    shortDesc: 'Monitors fire NOCs, land mutation, corpus deposits, and expiring leases.',
    benefit: 'Warns before institutional certificates expire and halt approvals.',
    badge: 'Affidavits · Land Mutation · Corpus',
    appPath: '/app/undertakings',
    visualType: 'undertakings',
  },
  {
    id: 'escalation',
    icon: AlertTriangle,
    title: 'L1 / L2 / L3 Escalations',
    shortDesc: 'Three-tiered statutory alerts escalate from regional notice to bureau.',
    benefit: 'Ensures zero applications fall through cracks before final cutoffs.',
    badge: 'L1 ≤15d · L2 Overdue · L3 Critical',
    appPath: '/app/escalations',
    visualType: 'escalation',
  },
  {
    id: 'audit',
    icon: ScrollText,
    title: 'Tamper-Evident Audit Trail',
    shortDesc: 'Chronological compliance log recording every action and actor.',
    benefit: 'Meets statutory regulatory standards with verifiable event logging.',
    badge: 'Complete Traceability · Verifiable Log',
    appPath: '/app/audit',
    visualType: 'audit',
  },
];

export function FeaturesShowcase() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % FEATURES.length);
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const activeFeature = FEATURES[activeIdx];

  const handleSelect = (idx: number) => {
    setActiveIdx(idx);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const renderVisual = (type: FeatureItem['visualType']) => {
    switch (type) {
      case 'routing':
        return (
          <div className="preview-card-inner">
            <div className="preview-card-tag">Route Pipeline Demo</div>
            <div className="preview-pipeline">
              <div className="pipeline-step done">
                <span className="step-num">1</span>
                <span className="step-name">Application Received</span>
                <span className="step-sub">Online Portal (SE)</span>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-step current">
                <span className="step-num">2</span>
                <span className="step-name">Scrutiny Review</span>
                <span className="step-sub">Day 9 / 15d SLA</span>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-step pending">
                <span className="step-num">3</span>
                <span className="step-name">EVC Inspection</span>
                <span className="step-sub">30d statutory SLA</span>
              </div>
            </div>
            <div className="preview-card-info">
              <span className="info-item">Institution: Vellore Technical Academy</span>
              <span className="info-item">Route: SE (Scrutiny + EVC)</span>
            </div>
          </div>
        );

      case 'sla':
        return (
          <div className="preview-card-inner">
            <div className="preview-card-tag">Statutory Deadline Load</div>
            <div className="preview-heatmap-mini">
              {['North', 'South', 'East', 'West'].map((reg, r) => (
                <div key={reg} className="preview-heat-row">
                  <span className="preview-reg">{reg}</span>
                  <div className="preview-cells">
                    {[1, 0, 2, 4, 3, 1, 0, 2].map((cnt, c) => (
                      <span key={c} className={`cell-block heat-${(cnt + r) % 5}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="preview-card-info">
              <span className="info-item" style={{ color: 'var(--red)' }}>● 2 Overdue Stages</span>
              <span className="info-item" style={{ color: 'var(--amber)' }}>● 7 Approaching SLA Limit</span>
            </div>
          </div>
        );

      case 'evc':
        return (
          <div className="preview-card-inner">
            <div className="preview-card-tag">Inspection Coordination</div>
            <div className="preview-evc-box">
              <div className="evc-header">
                <Users size={16} className="evc-icon" />
                <div>
                  <div className="evc-title">Kalinga Institute of Technology</div>
                  <div className="evc-sub">Visit Window: Due in 6 days (Physical Panel)</div>
                </div>
              </div>
              <div className="evc-committee">
                <span className="chip chip-grey">Prof. R. Sharma (Convener)</span>
                <span className="chip chip-grey">Dr. A. Verma (Expert)</span>
              </div>
            </div>
            <div className="preview-card-info">
              <span className="info-item">Panel Readiness: 100%</span>
              <span className="info-item">Reschedule Safe Window: Active</span>
            </div>
          </div>
        );

      case 'undertakings':
        return (
          <div className="preview-card-inner">
            <div className="preview-card-tag">Compliance Tracking</div>
            <div className="preview-un-list">
              <div className="un-item">
                <span className="chip chip-l3">OVERDUE</span>
                <span className="un-text">Fire-safety NOC Renewal · Nandi Institute</span>
              </div>
              <div className="un-item">
                <span className="chip chip-l1">9d LEFT</span>
                <span className="un-text">Faculty Appointment Evidence · Himalaya Poly</span>
              </div>
              <div className="un-item">
                <span className="chip chip-l1">14d LEFT</span>
                <span className="un-text">Corpus Fund Proof · Deccan Institute</span>
              </div>
            </div>
          </div>
        );

      case 'escalation':
        return (
          <div className="preview-card-inner">
            <div className="preview-card-tag">Tiered Escalation Matrix</div>
            <div className="preview-esc-grid">
              <div className="esc-col l1">
                <span className="esc-badge">L1 Warning</span>
                <span className="esc-val">7 Items</span>
                <span className="esc-sub">≤ 15d statutory window</span>
              </div>
              <div className="esc-col l2">
                <span className="esc-badge">L2 Overdue</span>
                <span className="esc-val">2 Items</span>
                <span className="esc-sub">Exceeded stage SLA</span>
              </div>
              <div className="esc-col l3">
                <span className="esc-badge">L3 Critical</span>
                <span className="esc-val">2 Items</span>
                <span className="esc-sub">&gt; 7 days overdue</span>
              </div>
            </div>
          </div>
        );

      case 'audit':
        return (
          <div className="preview-card-inner">
            <div className="preview-card-tag">Live Compliance Audit Trail</div>
            <div className="preview-audit-list">
              <div className="audit-entry">
                <span className="audit-time">Just now</span>
                <span className="audit-who">Compliance Bureau</span>
                <span className="audit-text">SLA review sweep executed (13 in scope)</span>
              </div>
              <div className="audit-entry">
                <span className="audit-time">10:45 AM</span>
                <span className="audit-who">EVC Committee</span>
                <span className="audit-text">Inspection cleared for A-2614 (Kaveri Mgmt)</span>
              </div>
              <div className="audit-entry">
                <span className="audit-time">09:12 AM</span>
                <span className="audit-who">Institution Portal</span>
                <span className="audit-text">Application A-2623 submitted under Route SE</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <section
      className="landing-features-showcase-section"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-labelledby="features-showcase-heading"
    >
      <div className="landing-section-header">
        <span className="landing-section-tag">System Capabilities</span>
        <h2 id="features-showcase-heading" className="landing-section-title">
          Built for regulatory rigor and statutory speed
        </h2>
        <p className="landing-section-sub">
          Explore how the AICTE monitor handles end-to-end approval lifecycles across bureau and regional officers.
        </p>
      </div>

      <div className="landing-showcase-grid">
        {/* Left Column: Interactive Feature List */}
        <div className="landing-showcase-tabs" role="tablist">
          {FEATURES.map((item, idx) => {
            const Icon = item.icon;
            const isActive = idx === activeIdx;
            return (
              <button
                key={item.id}
                className={`landing-showcase-tab-btn${isActive ? ' active' : ''}`}
                onClick={() => handleSelect(idx)}
                role="tab"
                aria-selected={isActive}
              >
                <div className="showcase-tab-icon">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div className="showcase-tab-content">
                  <div className="showcase-tab-top">
                    <span className="showcase-tab-title">{item.title}</span>
                    <span className="showcase-tab-badge">{item.badge}</span>
                  </div>
                  <p className="showcase-tab-desc">{item.shortDesc}</p>
                </div>

                {/* Progress bar line for active item */}
                {isActive && (
                  <div
                    className={`showcase-tab-progress${isPaused ? ' paused' : ''}`}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Column: Visual Preview Card */}
        <div className="landing-showcase-preview" aria-live="polite">
          <div className="landing-preview-card">
            <div className="preview-card-header">
              <div className="preview-card-title-group">
                <h3 className="preview-title">{activeFeature.title}</h3>
                <p className="preview-benefit">{activeFeature.benefit}</p>
              </div>
              <button
                className="preview-try-btn"
                onClick={() => navigateTo(activeFeature.appPath, { transition: true })}
              >
                Try in app <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>

            <div className="preview-visual-frame">
              {renderVisual(activeFeature.visualType)}
            </div>

            <div className="preview-card-footer">
              <div className="preview-card-status">
                <CheckCircle2 size={13} style={{ color: 'var(--green)' }} aria-hidden="true" />
                <span>Live in current working prototype</span>
              </div>
              <button
                className="preview-deep-link"
                onClick={() => navigateTo(activeFeature.appPath, { transition: true })}
              >
                Open {activeFeature.title} <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
