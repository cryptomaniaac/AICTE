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
    title: '1. Omni Search & Command Palette',
    description: 'Find any institution, file, or press ⌘K (Ctrl+K) from anywhere to trigger workflows, simulate alerts, and jump between screens.',
  },
  {
    targetSelector: '.kpi-grid',
    title: '2. Real-Time Urgency KPIs',
    description: 'Tracks live statutory SLAs (Open, Stage Overdue, EVC Due ≤15d, Undertakings, Expiring Leases). Click any KPI cell to cross-filter the queue.',
  },
  {
    targetSelector: '.overview-grid',
    title: '3. Deadline Heatmap & Trend Charts',
    description: 'Interactive analytics: hover or click blocks in the Deadline Load heatmap, brush-drag the timeline, or select Donut slices to isolate risk.',
  },
  {
    targetSelector: '.table-wrap',
    title: '4. Attention Queue & Workflows',
    description: 'High-power operational table: right-click for contextual actions, Shift-click for batch selection, and click Advance/Return to execute decisions.',
  },
  {
    targetSelector: '.role-select',
    title: '5. Role-Based Access Control (RBAC)',
    description: 'Switch between Central Bureau, Regional Offices (South, North, West, East), or Committee (EVC/SAC) to inspect regional jurisdictions.',
  },
  {
    targetSelector: '.mode-pill',
    title: '6. Live Simulation & Time-Travel Engine',
    description: 'Real-time WebSocket sync badge. Click here to trigger simulated events, advance timeline (+7d / +14d), or pause background monitoring.',
  },
  {
    targetSelector: '.safeguard-banner',
    title: '7. Statutory Safeguards & Compliance Notice',
    description: 'Ensures algorithmic AICTE alerts optimize operational workflows while all statutory decisions remain strictly reserved for authorized officers.',
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
