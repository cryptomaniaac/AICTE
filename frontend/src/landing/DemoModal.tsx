import { useState, useEffect, useRef } from 'react';
import {
  X, Play, Pause, ChevronLeft, ChevronRight, ExternalLink,
  FileText, Clock, Users, ClipboardCheck, AlertTriangle, ScrollText
} from 'lucide-react';
import { navigateTo } from '../router';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  caption: string;
  icon: React.ElementType;
  badge: string;
  appPath: string;
  highlight: string;
}

const SLIDES: Slide[] = [
  {
    id: 'overview',
    title: 'Executive Overview & SLA Heatmap',
    subtitle: 'National Bureau Command Center',
    caption: 'Consolidates all statutory metrics across 4 regions with a 14-day deadline load heatmap, stage breakdown donut, and live activity alerts.',
    icon: Clock,
    badge: '15-Day Regional Heatmap',
    appPath: '/app/overview',
    highlight: 'Real-time countdowns highlight overdue stages in red before statutory breach occurs.',
  },
  {
    id: 'applications',
    title: 'Applications & Stage Classification',
    subtitle: 'Automated Multi-Stage Routing',
    caption: 'Classifies applications into APH route types (S, SE, ES, SES). Features deficiency tracking, stage advancement, and instant drawer inspection.',
    icon: FileText,
    badge: 'Smart Route Engine',
    appPath: '/app/applications',
    highlight: 'Deep-linkable drawer with complete institutional parameters and stage timeline.',
  },
  {
    id: 'evc',
    icon: Users,
    title: 'EVC Inspection Coordination',
    subtitle: 'Expert Visit Committee Queue',
    caption: 'Tracks physical and virtual inspection visits. Officers assign panel experts, manage visit windows, and record committee clearance decisions.',
    badge: 'Inspection Panel Management',
    appPath: '/app/evc',
    highlight: 'Optimistic rescheduling modal with instant calendar timeline update.',
  },
  {
    id: 'undertakings',
    icon: ClipboardCheck,
    title: 'Undertakings & Document Assurance',
    subtitle: 'Statutory Conditions & Leases',
    caption: 'Monitors time-bound affidavits (fire-safety NOCs, faculty appointments) and leases due to expire within 15 days.',
    badge: 'Condition Verification',
    appPath: '/app/undertakings',
    highlight: 'Bulk verification actions and CSV export for compliance verification.',
  },
  {
    id: 'escalations',
    icon: AlertTriangle,
    title: 'Tiered Escalation Matrix',
    subtitle: 'L1 / L2 / L3 Early Warning System',
    caption: 'Categorizes applications by urgency level. L1 flags upcoming deadlines (≤15d), L2 flags overdue stages, and L3 warns of critical breaches.',
    badge: 'Three-Tier Alert Matrix',
    appPath: '/app/escalations',
    highlight: 'One-click alert sweep triggers immediate notification dispatch.',
  },
  {
    id: 'audit',
    icon: ScrollText,
    title: 'Tamper-Evident Audit Trail',
    subtitle: 'Immutable Regulatory Log',
    caption: 'Every administrative action, committee decision, and document upload is logged with an immutable timestamp and actor attribution.',
    badge: 'Verifiable Compliance Journal',
    appPath: '/app/audit',
    highlight: 'Meets full statutory audit requirements with instant CSV generation.',
  },
];

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') nextSlide();
      else if (e.key === 'ArrowLeft') prevSlide();
      else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    timerRef.current = setInterval(() => {
      setCurrentIdx(i => (i + 1) % SLIDES.length);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  const slide = SLIDES[currentIdx];
  const Icon = slide.icon;

  const nextSlide = () => setCurrentIdx(i => (i + 1) % SLIDES.length);
  const prevSlide = () => setCurrentIdx(i => (i - 1 + SLIDES.length) % SLIDES.length);

  const handleLaunch = () => {
    onClose();
    navigateTo(slide.appPath, { transition: true });
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="demo-modal-title">
      <div
        className="demo-slideshow-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="demo-modal-header">
          <div className="demo-header-info">
            <span className="demo-step-indicator">Feature {currentIdx + 1} of {SLIDES.length}</span>
            <span className="demo-badge">{slide.badge}</span>
          </div>

          <div className="demo-header-controls">
            <button
              className="icon-btn"
              onClick={() => setIsPlaying(p => !p)}
              title={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
              aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close demo modal">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Slide Body */}
        <div className="demo-slide-body">
          <div className="demo-visual-preview">
            <div className="demo-preview-canvas">
              <div className="demo-screen-mockup">
                <div className="mockup-top">
                  <div className="mockup-dots">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                  </div>
                  <span className="mockup-url">https://aicte-monitor.gov.in{slide.appPath}</span>
                </div>

                <div className="mockup-content">
                  <div className="mockup-icon-splash">
                    <Icon size={44} className="mockup-hero-icon" aria-hidden="true" />
                  </div>
                  <div className="mockup-main-text">
                    <h3 className="mockup-title">{slide.title}</h3>
                    <p className="mockup-sub">{slide.subtitle}</p>
                    <div className="mockup-highlight-pill">
                      <span>{slide.highlight}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide Description */}
          <div className="demo-slide-meta">
            <h2 id="demo-modal-title" className="demo-slide-title">{slide.title}</h2>
            <p className="demo-slide-caption">{slide.caption}</p>

            <div className="demo-slide-actions">
              <button className="landing-cta-primary" onClick={handleLaunch}>
                <span>Launch {slide.title}</span>
                <ExternalLink size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation & Progress */}
        <div className="demo-modal-footer">
          <button className="demo-nav-arrow" onClick={prevSlide} aria-label="Previous slide">
            <ChevronLeft size={18} />
          </button>

          {/* Progress Indicator Dots */}
          <div className="demo-dots-row" role="tablist" aria-label="Slide thumbnails">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                className={`demo-dot${idx === currentIdx ? ' active' : ''}`}
                onClick={() => setCurrentIdx(idx)}
                aria-label={`Jump to slide ${idx + 1}: ${s.title}`}
                role="tab"
                aria-selected={idx === currentIdx}
              />
            ))}
          </div>

          <button className="demo-nav-arrow" onClick={nextSlide} aria-label="Next slide">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
