import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '.topbar-search',
    title: 'Omni Search & Quick Actions',
    description: 'Quickly find any institution, file, or press ⌘K from anywhere to trigger workflows and switch views.',
  },
  {
    targetSelector: '.kpi-grid',
    title: 'Real-Time Urgency KPIs',
    description: 'Live SLA countdown counters track statutory deadlines with smooth animated transitions.',
  },
  {
    targetSelector: '.charts-grid',
    title: 'Bidirectionally Linked Views',
    description: 'Hover any donut slice or regional heatmap cell to instantly highlight matching rows in the table.',
  },
  {
    targetSelector: '.table-wrap',
    title: 'High-Power Table & Batch Actions',
    description: 'Right-click any row for contextual actions, Shift-click for range selection, and expand rows for audit steps.',
  },
  {
    targetSelector: '.view-toggle-bar',
    title: 'Kanban Board & Calendar Drag-Drop',
    description: 'Switch between List, Board, and Calendar views to drag cards across stages and reschedule inspections.',
  },
  {
    targetSelector: '.mode-pill',
    title: 'Live Synchronization Engine',
    description: 'Autonomous background simulation keeps pendencies fresh with real-time alerts and toast notifications.',
  },
  {
    targetSelector: '.safeguard-banner',
    title: 'Regulatory & Statutory Safety',
    description: 'AICTE alerts optimize workflows while statutory decision-making is strictly preserved for competent officers.',
  },
];

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuidedTour({ isOpen, onClose }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const currentStep = TOUR_STEPS[stepIndex];

  const updatePosition = useCallback(() => {
    if (!isOpen || !currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && stepIndex < TOUR_STEPS.length - 1) setStepIndex(s => s + 1);
      if (e.key === 'ArrowLeft' && stepIndex > 0) setStepIndex(s => s - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, stepIndex, onClose]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      try { localStorage.setItem('aicte_tour_seen', 'true'); } catch { /* ignore */ }
      onClose();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) setStepIndex(s => s - 1);
  };

  const handleSkip = () => {
    try { localStorage.setItem('aicte_tour_seen', 'true'); } catch { /* ignore */ }
    onClose();
  };

  // Calculate card position near highlighted element
  let cardTop = window.innerHeight / 2 - 120;
  let cardLeft = window.innerWidth / 2 - 160;

  if (rect) {
    cardLeft = Math.max(20, Math.min(window.innerWidth - 340, rect.left + rect.width / 2 - 160));
    if (rect.bottom + 260 < window.innerHeight) {
      cardTop = rect.bottom + 12;
    } else if (rect.top - 260 > 0) {
      cardTop = rect.top - 240;
    } else {
      cardTop = Math.max(20, rect.top);
    }
  }

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dark backdrop cutout around rect */}
      {rect ? (
        <div
          style={{
            position: 'fixed',
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
            zIndex: 10000,
            pointerEvents: 'none',
            border: '2px solid var(--primary)',
            transition: 'all 240ms cubic-bezier(.2,.8,.2,1)',
          }}
        />
      ) : (
        <div className="tour-spotlight-backdrop" />
      )}

      {/* Tour card */}
      <div
        className="tour-card"
        style={{
          top: cardTop,
          left: cardLeft,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="tour-step-badge">
            <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </div>
          <button className="icon-btn" onClick={handleSkip} aria-label="Skip tour" title="Skip tour">
            <X size={13} />
          </button>
        </div>

        <h3 className="tour-title">{currentStep.title}</h3>
        <p className="tour-desc">{currentStep.description}</p>

        <div className="tour-actions">
          <button
            className="btn btn-secondary btn-xs"
            onClick={handleSkip}
            style={{ color: 'var(--muted)' }}
          >
            Skip
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {stepIndex > 0 && (
              <button className="btn btn-secondary btn-xs" onClick={handlePrev} aria-label="Previous step">
                <ChevronLeft size={13} /> Back
              </button>
            )}
            <button className="btn btn-primary btn-xs" onClick={handleNext}>
              {stepIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next'}
              {stepIndex < TOUR_STEPS.length - 1 && <ChevronRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
