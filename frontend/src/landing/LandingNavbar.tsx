import { useState, useRef, useEffect } from 'react';
import { Sparkles, Sun, Moon, Menu, X, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { navigateTo, type LandingTab } from '../router';

interface LandingNavbarProps {
  activeTab: LandingTab;
  onOpenSignIn: () => void;
  onGetStarted: () => void;
}

export function LandingNavbar({ activeTab, onOpenSignIn, onGetStarted }: LandingNavbarProps) {
  const { theme, toggleTheme } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: LandingTab; label: string; path: string }[] = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'features', label: 'Features', path: '/features' },
    { id: 'how-it-works', label: 'How it works', path: '/how-it-works' },
    { id: 'roles', label: 'Roles', path: '/roles' },
  ];

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ left: 0, width: 0, opacity: 0 });

  const activeIdx = tabs.findIndex(t => t.id === activeTab);

  useEffect(() => {
    const el = tabRefs.current[activeIdx];
    if (el) {
      const parent = el.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        setPillStyle({
          left: rect.left - parentRect.left,
          width: rect.width,
          opacity: 1,
        });
      }
    }
  }, [activeIdx]);

  const handleTabClick = (path: string) => {
    setMobileMenuOpen(false);
    navigateTo(path, { transition: true });
  };

  return (
    <header className="landing-navbar-wrapper">
      <nav className="landing-navbar" aria-label="Landing site navigation">
        {/* Logo */}
        <button
          className="landing-logo-btn"
          onClick={() => handleTabClick('/')}
          aria-label="AICTE Monitor Home"
        >
          <div className="landing-logo-icon" aria-hidden="true">
            <Sparkles size={16} />
          </div>
          <span className="landing-logo-text">AICTE Monitor</span>
        </button>

        {/* Desktop Nav Tabs with sliding pill */}
        <div className="landing-nav-tabs" role="tablist">
          <div
            className="landing-tabs-sliding-pill"
            style={{
              ...pillStyle,
              transition: 'left var(--dur) var(--ease), width var(--dur) var(--ease), opacity var(--dur-fast) var(--ease)',
            }}
            aria-hidden="true"
          />
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                ref={el => { tabRefs.current[idx] = el; }}
                className={`landing-nav-tab${isActive ? ' active' : ''}`}
                onClick={() => handleTabClick(tab.path)}
                role="tab"
                aria-selected={isActive}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="landing-nav-actions">
          <button
            className="landing-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button
            className="landing-signin-btn"
            onClick={onOpenSignIn}
          >
            Sign in
          </button>

          <button
            className="landing-getstarted-btn"
            onClick={onGetStarted}
          >
            Get Started <ArrowRight size={14} className="landing-btn-arrow" />
          </button>

          {/* Mobile hamburger */}
          <button
            className="landing-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="landing-mobile-drawer" role="dialog" aria-label="Mobile navigation">
          <div className="landing-mobile-nav-list">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`landing-mobile-nav-link${tab.id === activeTab ? ' active' : ''}`}
                onClick={() => handleTabClick(tab.path)}
              >
                {tab.label}
              </button>
            ))}
            <div className="landing-mobile-drawer-divider" />
            <button
              className="landing-mobile-signin-btn"
              onClick={() => { setMobileMenuOpen(false); onOpenSignIn(); }}
            >
              Sign in
            </button>
            <button
              className="landing-mobile-getstarted-btn"
              onClick={() => { setMobileMenuOpen(false); onGetStarted(); }}
            >
              Get Started <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
