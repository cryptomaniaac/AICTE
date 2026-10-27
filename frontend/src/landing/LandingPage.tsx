import { useState, useCallback } from 'react';
import { LandingNavbar } from './LandingNavbar';
import { LandingHero } from './LandingHero';
import { StatStrip } from './StatStrip';
import { FeaturesShowcase } from './FeaturesShowcase';
import { CtaBand } from './CtaBand';
import { LandingFooter } from './LandingFooter';
import { FeaturesPage } from './FeaturesPage';
import { HowItWorksPage } from './HowItWorksPage';
import { RolesPage } from './RolesPage';
import { SignInModal } from './SignInModal';
import { DemoModal } from './DemoModal';
import { useApp } from '../context/AppContext';
import { navigateTo, type LandingTab } from '../router';

interface LandingPageProps {
  activeTab: LandingTab;
}

export function LandingPage({ activeTab }: LandingPageProps) {
  const { setRole } = useApp();
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInTab, setSignInTab] = useState<'signin' | 'register' | 'personas'>('signin');
  const [demoOpen, setDemoOpen] = useState(false);
  const [isEnteringApp, setIsEnteringApp] = useState(false);

  const openSignInModal = useCallback((tab: 'signin' | 'register' | 'personas' = 'signin') => {
    setSignInTab(tab);
    setSignInOpen(true);
  }, []);

  const handleGetStarted = useCallback(() => {
    setRole('Bureau');

    const executeTransition = () => {
      // Mark tour as pending for first-time landing entrants
      try {
        if (!localStorage.getItem('aicte_tour_seen')) {
          localStorage.setItem('aicte_trigger_tour', '1');
        }
      } catch {
        /* ignore */
      }
      navigateTo('/app/overview');
    };

    if ('startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void })
        .startViewTransition(executeTransition);
    } else {
      setIsEnteringApp(true);
      setTimeout(() => {
        executeTransition();
      }, 350);
    }
  }, [setRole]);

  return (
    <div className={`landing-wrapper${isEnteringApp ? ' landing-fade-exit' : ''}`}>
      {/* Sticky Top Navbar */}
      <LandingNavbar
        activeTab={activeTab}
        onOpenSignIn={() => openSignInModal('signin')}
        onGetStarted={handleGetStarted}
      />

      {/* Main Tab Content */}
      <main className="landing-main-content">
        {activeTab === 'home' && (
          <>
            <LandingHero
              onGetStarted={handleGetStarted}
              onWatchDemo={() => setDemoOpen(true)}
              onOpenSignIn={() => openSignInModal('signin')}
            />
            <StatStrip />
            <FeaturesShowcase />
            <CtaBand
              onGetStarted={handleGetStarted}
              onOpenSignIn={() => openSignInModal('register')}
            />
          </>
        )}

        {activeTab === 'features' && <FeaturesPage />}

        {activeTab === 'how-it-works' && <HowItWorksPage />}

        {activeTab === 'roles' && <RolesPage />}
      </main>

      {/* Footer */}
      <LandingFooter />

      {/* Sign In & Applicant Registration Modal */}
      <SignInModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        defaultTab={signInTab}
      />

      {/* Interactive Slideshow Demo Modal */}
      <DemoModal
        isOpen={demoOpen}
        onClose={() => setDemoOpen(false)}
      />
    </div>
  );
}

