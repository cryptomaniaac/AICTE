import { useState } from 'react';
import { ArrowRight, Shield, Building2, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { navigateTo } from '../router';

interface CtaBandProps {
  onGetStarted: () => void;
  onOpenSignIn?: () => void;
}

export function CtaBand({ onGetStarted, onOpenSignIn }: CtaBandProps) {
  const { setRole } = useApp();
  const [selectedRole, setSelectedRole] = useState('Bureau');

  const roles = [
    { id: 'Bureau', label: 'Bureau Officer', desc: 'All regions & bureau sweep', icon: Shield },
    { id: 'North', label: 'Regional (North)', desc: 'North region applications', icon: Building2 },
    { id: 'South', label: 'Regional (South)', desc: 'South region applications', icon: Building2 },
    { id: 'Committee', label: 'Expert Committee', desc: 'EVC & SAC inspections', icon: Users },
  ];

  const handleEnter = (roleId: string) => {
    setRole(roleId);
    navigateTo('/app/overview', { transition: true });
  };

  return (
    <section className="landing-cta-band-section" aria-labelledby="cta-band-heading">
      <div className="landing-cta-band-card">
        <div className="cta-band-glow-orb" aria-hidden="true" />
        <div className="cta-band-content">
          <span className="cta-band-tag">Instant Access</span>
          <h2 id="cta-band-heading" className="cta-band-title">
            Open the live prototype
          </h2>
          <p className="cta-band-sub">
            Test real-time routing, SLA countdowns, and automated inspection queuing across any administrative persona.
          </p>

          {/* Persona Picker Strip */}
          <div className="cta-role-picker" role="radiogroup" aria-label="Select administrative role">
            {roles.map(r => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  className={`cta-role-card${isSelected ? ' selected' : ''}`}
                  onClick={() => setSelectedRole(r.id)}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <Icon size={16} className="role-icon" aria-hidden="true" />
                  <div className="role-text">
                    <span className="role-label">{r.label}</span>
                    <span className="role-desc">{r.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="cta-band-actions">
            <button
              className="landing-cta-primary large"
              onClick={() => handleEnter(selectedRole)}
            >
              Enter as {roles.find(r => r.id === selectedRole)?.label || 'Bureau Officer'} <ArrowRight size={16} />
            </button>
            {onOpenSignIn && (
              <button
                className="landing-cta-signin large"
                onClick={onOpenSignIn}
              >
                Applicant Portal & Sign In
              </button>
            )}
            <button
              className="landing-cta-secondary"
              onClick={onGetStarted}
            >
              Default Overview (Bureau)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

