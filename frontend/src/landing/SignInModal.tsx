import { useState, useEffect, useRef } from 'react';
import { X, Shield, Building2, Users, ArrowRight, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { navigateTo } from '../router';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const { setRole } = useApp();
  const [selectedRole, setSelectedRole] = useState('Bureau');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const roles = [
    { id: 'Bureau', name: 'Central Bureau Officer', desc: 'All regions oversight & rules', icon: Shield },
    { id: 'North', name: 'Regional Officer (North)', desc: 'North region applications', icon: Building2 },
    { id: 'South', name: 'Regional Officer (South)', desc: 'South region applications', icon: Building2 },
    { id: 'Committee', name: 'Expert Committee Member', desc: 'EVC & SAC inspection panel', icon: Users },
  ];

  const handleContinue = () => {
    setRole(selectedRole);
    onClose();
    navigateTo('/app/overview', { transition: true });
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="signin-modal-title">
      <div
        ref={dialogRef}
        className="signin-modal-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="signin-modal-header">
          <div className="signin-header-title-group">
            <div className="signin-lock-icon">
              <Lock size={16} aria-hidden="true" />
            </div>
            <div>
              <h2 id="signin-modal-title" className="signin-title">Regulatory Sign In</h2>
              <p className="signin-sub">Select your persona to enter the prototype</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close sign in modal">
            <X size={16} />
          </button>
        </div>

        <div className="signin-role-list" role="radiogroup" aria-label="Select administrative persona">
          {roles.map(r => {
            const Icon = r.icon;
            const isSelected = selectedRole === r.id;
            return (
              <button
                key={r.id}
                className={`signin-role-option${isSelected ? ' selected' : ''}`}
                onClick={() => setSelectedRole(r.id)}
                role="radio"
                aria-checked={isSelected}
              >
                <div className="signin-role-icon">
                  <Icon size={16} aria-hidden="true" />
                </div>
                <div className="signin-role-text">
                  <span className="signin-role-name">{r.name}</span>
                  <span className="signin-role-desc">{r.desc}</span>
                </div>
                <div className="signin-role-radio-circle" aria-hidden="true">
                  {isSelected && <span className="radio-inner-dot" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="signin-modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="landing-cta-primary" onClick={handleContinue}>
            <span>Continue to App</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
