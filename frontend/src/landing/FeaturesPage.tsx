import {
  GitMerge, Clock, Users, ClipboardCheck, AlertTriangle, ScrollText,
  ArrowRight, Sparkles
} from 'lucide-react';
import { navigateTo } from '../router';

interface FeatureCard {
  id: string;
  icon: React.ElementType;
  title: string;
  tagline: string;
  benefit: string;
  appPath: string;
  badge: string;
  previewClass: string;
  details: string[];
}

const CARDS: FeatureCard[] = [
  {
    id: 'smart-routing',
    icon: GitMerge,
    title: 'Smart Route Classification',
    tagline: 'Multi-stage approval pipeline mapping',
    benefit: 'Eliminates misrouted submissions by automatically dispatching across S, SE, ES, E, and SES pathways.',
    appPath: '/app/applications',
    badge: 'APH Routing Engine',
    previewClass: 'preview-smart-routing',
    details: [
      'Automatic stage indexing (Scrutiny → EVC → SAC/SHC)',
      'Instant route validation based on institution type',
      'Deficiency flagging and stage reversion tracking',
    ],
  },
  {
    id: 'sla-monitoring',
    icon: Clock,
    title: 'SLA & Delay Monitoring',
    tagline: 'Statutory countdowns per stage limit',
    benefit: 'Surfaces processing bottlenecks instantly through regional heatmaps and days-left counters.',
    appPath: '/app/overview',
    badge: 'Real-Time Telemetry',
    previewClass: 'preview-sla-heat',
    details: [
      'Prescribed APH limits: Scrutiny 15d · EVC 30d · SAC 20d',
      'Interactive 14-day regional load heatmaps',
      'Configurable statutory SLA rules with immediate recalculation',
    ],
  },
  {
    id: 'evc-scheduling',
    icon: Users,
    title: 'EVC Inspection Coordination',
    tagline: 'Physical and virtual committee management',
    benefit: 'Automates expert visit assignments with optimistic rescheduling and real-time committee clearances.',
    appPath: '/app/evc',
    badge: 'Expert Visit Queue',
    previewClass: 'preview-evc-sched',
    details: [
      'Two-expert panel allocation with convener assignment',
      'SLA risk tracking for visits scheduled within 15 days',
      'One-click inspection clearances advancing application stage',
    ],
  },
  {
    id: 'undertakings',
    icon: ClipboardCheck,
    title: 'Undertakings & Lease Tracking',
    tagline: 'Institutional legal condition compliance',
    benefit: 'Monitors time-bound affidavits, fire NOCs, and expiring land leases before approvals lapse.',
    appPath: '/app/undertakings',
    badge: 'Document Assurance',
    previewClass: 'preview-un-tracker',
    details: [
      'Affidavit status tracking (Pending → Submitted → Verified)',
      'Land mutation and corpus fund deposit verification',
      'Automated expiry alerts 15 days before lease expiration',
    ],
  },
  {
    id: 'escalations',
    icon: AlertTriangle,
    title: 'L1 / L2 / L3 Escalation Alerts',
    tagline: 'Multi-tier executive intervention matrix',
    benefit: 'Categorizes urgency by statutory severity to trigger timely administrative sweeps.',
    appPath: '/app/escalations',
    badge: 'Tiered Severity Matrix',
    previewClass: 'preview-esc-matrix',
    details: [
      'L1: Due within 15 days statutory horizon',
      'L2: Overdue beyond prescribed stage limit',
      'L3: Critical breach (>7 days past SLA deadline)',
    ],
  },
  {
    id: 'audit-trail',
    icon: ScrollText,
    title: 'Tamper-Evident Audit Trail',
    tagline: 'Verifiable chronological compliance journal',
    benefit: 'Maintains complete regulatory transparency with unalterable timestamped event logs.',
    appPath: '/app/audit',
    badge: 'Regulatory Journal',
    previewClass: 'preview-audit-log',
    details: [
      'Actor attribution (Bureau officer, Institution, Committee)',
      'Automated logging of every stage transition and verification',
      'CSV export ready for statutory reporting and legal audits',
    ],
  },
];

export function FeaturesPage() {
  return (
    <div className="landing-subpage-container" role="main" aria-labelledby="features-page-title">
      <div className="subpage-header">
        <div className="subpage-badge">
          <Sparkles size={12} aria-hidden="true" />
          <span>Complete Feature Matrix</span>
        </div>
        <h1 id="features-page-title" className="subpage-title">
          Built to enforce technical education standards at scale
        </h1>
        <p className="subpage-lead">
          Every capability in the monitor addresses statutory bottlenecks defined in the AICTE Approval Process Handbook (APH).
        </p>
      </div>

      <div className="features-card-grid">
        {CARDS.map(card => {
          const Icon = card.icon;
          return (
            <article key={card.id} className="feature-grid-card">
              <div className="feature-card-header">
                <div className="feature-card-icon-box">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <span className="feature-card-badge">{card.badge}</span>
              </div>

              <div className="feature-card-content">
                <h2 className="feature-card-title">{card.title}</h2>
                <p className="feature-card-tagline">{card.tagline}</p>
                <p className="feature-card-benefit">{card.benefit}</p>

                <ul className="feature-card-bullets">
                  {card.details.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="feature-card-footer">
                <button
                  className="feature-try-link"
                  onClick={() => navigateTo(card.appPath, { transition: true })}
                >
                  <span>Try this in the app</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
