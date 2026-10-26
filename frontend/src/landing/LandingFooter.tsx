import { Sparkles } from 'lucide-react';
import { navigateTo } from '../router';

export function LandingFooter() {
  return (
    <footer className="landing-footer" aria-label="Site footer">
      {/* Indian National Tricolour Accent Line */}
      <div className="landing-tricolour-bar" aria-hidden="true">
        <span className="tricolour-saffron" />
        <span className="tricolour-white" />
        <span className="tricolour-green" />
      </div>

      <div className="landing-footer-container">
        <div className="landing-footer-top">
          <div className="landing-footer-brand">
            <div className="footer-logo">
              <Sparkles size={16} className="footer-logo-sparkle" />
              <span>AICTE Monitor</span>
            </div>
            <p className="footer-desc">
              Smart India Hackathon 2026 (SIH26262) prototype for the All India Council for Technical Education.
            </p>
          </div>

          <div className="landing-footer-links">
            <div className="footer-col">
              <span className="footer-col-title">Navigation</span>
              <button onClick={() => navigateTo('/')} className="footer-link">Home</button>
              <button onClick={() => navigateTo('/features')} className="footer-link">Features</button>
              <button onClick={() => navigateTo('/how-it-works')} className="footer-link">How it works</button>
              <button onClick={() => navigateTo('/roles')} className="footer-link">Roles</button>
            </div>

            <div className="footer-col">
              <span className="footer-col-title">Live Modules</span>
              <button onClick={() => navigateTo('/app/overview')} className="footer-link">Overview Dashboard</button>
              <button onClick={() => navigateTo('/app/applications')} className="footer-link">Applications</button>
              <button onClick={() => navigateTo('/app/evc')} className="footer-link">EVC Queue</button>
              <button onClick={() => navigateTo('/app/escalations')} className="footer-link">Escalations Matrix</button>
            </div>
          </div>
        </div>

        <div className="landing-footer-divider" />

        {/* Regulatory Safeguard Notice */}
        <div className="landing-regulatory-safeguard" role="note">
          <span className="safeguard-badge">Statutory Notice</span>
          <p className="safeguard-text">
            <strong>Regulatory Safeguard:</strong> System alerts support processing but do not replace statutory verification or decisions reserved for competent authorities. Prototype with demo data, not live AICTE records.
          </p>
        </div>

        <div className="landing-footer-bottom">
          <span className="footer-copy">
            SIH 2026 Problem Statement SIH26262 · Built with high regulatory adherence.
          </span>
          <span className="footer-status">
            Prototype Engine v1.0 · APH Regulations 2026
          </span>
        </div>
      </div>
    </footer>
  );
}
