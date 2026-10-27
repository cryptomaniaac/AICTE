import { useState, useEffect, useRef } from 'react';
import {
  X,
  Shield,
  Building2,
  Users,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  User,
  Phone,
  Sparkles,
  AlertCircle,
  LogIn,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { navigateTo } from '../router';
import { registerApplicant, loginApplicant, type ApplicantProfile } from '../api';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'register' | 'personas';
}

type ModalTab = 'signin' | 'register' | 'personas';

export function SignInModal({ isOpen, onClose, defaultTab = 'signin' }: SignInModalProps) {
  const { setRole, setCurrentUser, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<ModalTab>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regInstitution, setRegInstitution] = useState('');
  const [regRegion, setRegRegion] = useState<'North' | 'South' | 'East' | 'West'>('North');
  const [regRoute, setRegRoute] = useState<string>('SES');
  const [regPhone, setRegPhone] = useState('');

  // Quick Persona State
  const [selectedPersona, setSelectedPersona] = useState('Bureau');

  const dialogRef = useRef<HTMLDivElement>(null);

  // Sync default tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setErrorMessage(null);
    }
  }, [isOpen, defaultTab]);

  // Keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickPersonas = [
    { id: 'Bureau', name: 'Central Bureau Officer', desc: 'All regions oversight, rules & sweeps', icon: Shield, email: 'bureau@aicte.gov.in' },
    { id: 'North', name: 'Regional Officer (North)', desc: 'Northern region institutions & scrutiny', icon: Building2, email: 'north@aicte.gov.in' },
    { id: 'South', name: 'Regional Officer (South)', desc: 'Southern region institutions & timelines', icon: Building2, email: 'south@aicte.gov.in' },
    { id: 'Committee', name: 'Expert Committee Member', desc: 'EVC & SAC inspection panel evaluations', icon: Users, email: 'committee@aicte.gov.in' },
    { id: 'Applicant', name: 'Demo Applicant (Nandi Institute)', desc: 'Pre-registered institution portal view', icon: User, email: 'ramesh@nandi.edu.in' },
  ];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signInEmail.trim()) {
      setErrorMessage('Please enter your email or persona handle.');
      return;
    }
    if (!signInPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginApplicant({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      setCurrentUser(res.applicant);
      showToast('Sign In Successful', res.message || `Welcome back, ${res.applicant.name}!`, 'success');
      onClose();
      navigateTo('/app/overview', { transition: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim()) {
      setErrorMessage('Please enter your full name or representative title.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('Please enter a valid institution email address.');
      return;
    }
    if (regPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    if (!regInstitution.trim()) {
      setErrorMessage('Please enter your educational institution name.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerApplicant({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        institution_name: regInstitution.trim(),
        region: regRegion,
        route_type: regRoute,
        phone: regPhone.trim() || undefined,
        role: 'Institution',
      });

      setCurrentUser(res.applicant);
      showToast(
        'Registration Complete',
        `Welcome ${res.applicant.name}! Application ${res.applicant.application_id || ''} has been registered with AICTE.`,
        'success'
      );
      onClose();
      navigateTo('/app/overview', { transition: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonaSelect = (p: typeof quickPersonas[0]) => {
    if (p.id === 'Applicant') {
      const mockApplicant: ApplicantProfile = {
        id: 2611,
        name: 'Dr. Ramesh Sharma',
        email: 'ramesh@nandi.edu.in',
        institution_name: 'Nandi Institute of Technology',
        institution_id: 'INST-2611',
        region: 'South',
        route_type: 'SE',
        role: 'Institution',
        application_id: 'A-2611',
        created_at: '25 Oct · 09:15',
      };
      setCurrentUser(mockApplicant);
      setRole('South');
      showToast('Applicant Access Granted', 'Signed in as Dr. Ramesh Sharma (Nandi Institute of Technology)', 'info');
    } else {
      setRole(p.id);
      showToast('Persona Switched', `Entered prototype as ${p.name}`, 'info');
    }
    onClose();
    navigateTo('/app/overview', { transition: true });
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
    >
      <div
        ref={dialogRef}
        className="signin-modal-card auth-modal-expanded"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="signin-modal-header">
          <div className="signin-header-title-group">
            <div className="signin-lock-icon">
              <Shield size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 id="signin-modal-title" className="signin-title">
                AICTE Regulatory & Applicant Portal
              </h2>
              <p className="signin-sub">
                Official Approval Workflow, Compliance & Evaluation Gateway
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="auth-tab-bar" role="tablist" aria-label="Authentication modes">
          <button
            className={`auth-tab-btn${activeTab === 'signin' ? ' active' : ''}`}
            onClick={() => { setActiveTab('signin'); setErrorMessage(null); }}
            role="tab"
            aria-selected={activeTab === 'signin'}
          >
            <LogIn size={14} aria-hidden="true" />
            <span>Sign In</span>
          </button>
          <button
            className={`auth-tab-btn${activeTab === 'register' ? ' active' : ''}`}
            onClick={() => { setActiveTab('register'); setErrorMessage(null); }}
            role="tab"
            aria-selected={activeTab === 'register'}
          >
            <UserPlus size={14} aria-hidden="true" />
            <span>Register Applicant</span>
          </button>
          <button
            className={`auth-tab-btn${activeTab === 'personas' ? ' active' : ''}`}
            onClick={() => { setActiveTab('personas'); setErrorMessage(null); }}
            role="tab"
            aria-selected={activeTab === 'personas'}
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>1-Click Personas</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={15} className="error-icon" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN FORM */}
        {activeTab === 'signin' && (
          <form className="auth-form" onSubmit={handleSignIn}>
            <div className="form-group">
              <label className="form-label" htmlFor="signin-email">
                Official Email / Handle
              </label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="signin-email"
                  type="email"
                  className="auth-input"
                  placeholder="name@institution.edu.in"
                  value={signInEmail}
                  onChange={e => setSignInEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-with-link">
                <label className="form-label" htmlFor="signin-password">
                  Password
                </label>
                <button
                  type="button"
                  className="link-btn-subtle"
                  onClick={() => {
                    setSignInEmail('ramesh@nandi.edu.in');
                    setSignInPassword('Admin@123');
                    showToast('Demo Credentials Filled', 'ramesh@nandi.edu.in / Admin@123', 'info');
                  }}
                >
                  Fill Demo Account
                </button>
              </div>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Enter your password"
                  value={signInPassword}
                  onChange={e => setSignInPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-eye-btn"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="auth-demo-tip">
              <Sparkles size={13} className="tip-icon" />
              <span>
                <strong>Quick evaluators:</strong> Try <code>ramesh@nandi.edu.in</code> / <code>Admin@123</code> or switch to the <em>1-Click Personas</em> tab.
              </span>
            </div>

            <div className="signin-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveTab('register')}
              >
                Create Account
              </button>
              <button
                type="submit"
                className="landing-cta-primary"
                disabled={loading}
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In & Access App</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTER APPLICANT FORM */}
        {activeTab === 'register' && (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="auth-form-row">
              <div className="form-group flex-1">
                <label className="form-label" htmlFor="reg-name">
                  Representative / Applicant Name *
                </label>
                <div className="input-with-icon">
                  <User size={15} className="input-icon" aria-hidden="true" />
                  <input
                    id="reg-name"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Dr. Rajesh Verma"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group flex-1">
                <label className="form-label" htmlFor="reg-email">
                  Official Email *
                </label>
                <div className="input-with-icon">
                  <Mail size={15} className="input-icon" aria-hidden="true" />
                  <input
                    id="reg-email"
                    type="email"
                    className="auth-input"
                    placeholder="director@apex-tech.edu.in"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="auth-form-row">
              <div className="form-group flex-1">
                <label className="form-label" htmlFor="reg-inst">
                  Institution Name *
                </label>
                <div className="input-with-icon">
                  <Building2 size={15} className="input-icon" aria-hidden="true" />
                  <input
                    id="reg-inst"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Apex Institute of Technology"
                    value={regInstitution}
                    onChange={e => setRegInstitution(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group flex-1">
                <label className="form-label" htmlFor="reg-phone">
                  Contact Phone (Optional)
                </label>
                <div className="input-with-icon">
                  <Phone size={15} className="input-icon" aria-hidden="true" />
                  <input
                    id="reg-phone"
                    type="tel"
                    className="auth-input"
                    placeholder="+91 98765 43210"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">
                Create Password *
              </label>
              <div className="input-with-icon">
                <Lock size={15} className="input-icon" aria-hidden="true" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Min. 4 characters"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-eye-btn"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Region Selector Pills */}
            <div className="form-group">
              <label className="form-label">
                AICTE Regional Jurisdiction *
              </label>
              <div className="region-selector-pills" role="radiogroup" aria-label="Select region">
                {(['North', 'South', 'East', 'West'] as const).map(reg => (
                  <button
                    key={reg}
                    type="button"
                    className={`region-pill-btn${regRegion === reg ? ' selected' : ''}`}
                    onClick={() => setRegRegion(reg)}
                    role="radio"
                    aria-checked={regRegion === reg}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            {/* Route Selector */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-route">
                Approval Route Type
              </label>
              <select
                id="reg-route"
                className="auth-select"
                value={regRoute}
                onChange={e => setRegRoute(e.target.value)}
              >
                <option value="SES">SES · Full Approval Route (Scrutiny → EVC → SAC/SHC)</option>
                <option value="SE">SE · Scrutiny + EVC Inspection</option>
                <option value="ES">ES · EVC Inspection + SAC/SHC</option>
                <option value="S">S · Scrutiny Only (Fast-track)</option>
                <option value="E">E · EVC Inspection Only</option>
              </select>
            </div>

            <div className="auth-db-notice">
              <CheckCircle2 size={14} className="notice-icon" />
              <span>
                Applicant data and institutional records are stored directly into the backend database.
              </span>
            </div>

            <div className="signin-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveTab('signin')}
              >
                Already registered? Sign In
              </button>
              <button
                type="submit"
                className="landing-cta-primary"
                disabled={loading}
              >
                {loading ? (
                  <span>Registering...</span>
                ) : (
                  <>
                    <span>Register & Access Monitor</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: QUICK PERSONA ACCESS */}
        {activeTab === 'personas' && (
          <div className="auth-personas-pane">
            <p className="personas-hint">
              Instantly enter the live application monitor with pre-configured administrative permissions:
            </p>

            <div className="signin-role-list" role="radiogroup" aria-label="Select administrative persona">
              {quickPersonas.map(r => {
                const Icon = r.icon;
                const isSelected = selectedPersona === r.id;
                return (
                  <button
                    key={r.id}
                    className={`signin-role-option${isSelected ? ' selected' : ''}`}
                    onClick={() => {
                      setSelectedPersona(r.id);
                      handlePersonaSelect(r);
                    }}
                    role="radio"
                    aria-checked={isSelected}
                  >
                    <div className="signin-role-icon">
                      <Icon size={16} aria-hidden="true" />
                    </div>
                    <div className="signin-role-text">
                      <div className="persona-name-row">
                        <span className="signin-role-name">{r.name}</span>
                        {r.id === 'Bureau' && <span className="persona-badge bureau">All Regions</span>}
                        {r.id === 'Applicant' && <span className="persona-badge inst">Applicant View</span>}
                      </div>
                      <span className="signin-role-desc">{r.desc}</span>
                    </div>
                    <div className="signin-role-radio-circle" aria-hidden="true">
                      {isSelected && <span className="radio-inner-dot" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
