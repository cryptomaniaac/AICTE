import { Sparkles, ArrowRight, Play, LogIn } from 'lucide-react';
import { ProductFrame } from './ProductFrame';

interface LandingHeroProps {
  onGetStarted: () => void;
  onWatchDemo: () => void;
  onOpenSignIn: () => void;
}

export function LandingHero({ onGetStarted, onWatchDemo, onOpenSignIn }: LandingHeroProps) {

  return (
    <section className="landing-hero" aria-labelledby="hero-heading">
      {/* Background Arc & Star Particles */}
      <div className="landing-arc-container" aria-hidden="true">
        {/* Soft radial glow */}
        <div className="landing-arc-glow" />

        {/* Horizon Arc SVG */}
        <svg
          className="landing-arc-svg"
          viewBox="0 0 1440 460"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="arcGlowGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
              <stop offset="40%" stopColor="var(--primary-100)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="arcStrokeGrad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
              <stop offset="25%" stopColor="var(--primary)" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#7AA2FF" stopOpacity="1" />
              <stop offset="75%" stopColor="var(--primary)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
            <filter id="arcBlur" x="-10%" y="-20%" width="120%" height="140%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* Diffuse glow beam */}
          <ellipse
            cx="720"
            cy="460"
            rx="640"
            ry="320"
            fill="url(#arcGlowGrad)"
          />

          {/* Glowing rim underlay */}
          <path
            d="M 80 460 A 720 340 0 0 1 1360 460"
            stroke="url(#arcStrokeGrad)"
            strokeWidth="8"
            fill="none"
            filter="url(#arcBlur)"
            opacity="0.8"
          />

          {/* Sharp bright rim stroke */}
          <path
            d="M 120 460 A 680 320 0 0 1 1320 460"
            stroke="url(#arcStrokeGrad)"
            strokeWidth="2.5"
            fill="none"
          />
        </svg>

        {/* Ambient celestial star sparkles */}
        <div className="landing-stars">
          <span className="star-dot s1" style={{ top: '24%', left: '18%' }} />
          <span className="star-dot s2" style={{ top: '38%', left: '26%' }} />
          <span className="star-dot s3" style={{ top: '16%', left: '46%' }} />
          <span className="star-dot s4" style={{ top: '32%', left: '72%' }} />
          <span className="star-dot s5" style={{ top: '20%', left: '84%' }} />
          <span className="star-dot s6" style={{ top: '44%', left: '80%' }} />
          <span className="star-dot s7" style={{ top: '50%', left: '38%' }} />
          <span className="star-dot s8" style={{ top: '48%', left: '60%' }} />
        </div>
      </div>

      {/* Hero Content Stack */}
      <div className="landing-hero-content">
        {/* Badge Pill */}
        <div className="landing-badge-pill" role="note">
          <Sparkles size={13} className="landing-badge-icon" aria-hidden="true" />
          <span>SIH 2026 Prototype</span>
        </div>

        {/* Two-Line Headline */}
        <h1 id="hero-heading" className="landing-hero-title">
          <span className="title-line-1">Every approval, every deadline,</span>
          <span className="title-line-2">one live view.</span>
        </h1>

        {/* 3-Line Subtext */}
        <p className="landing-hero-subtext">
          Automates application routing, monitors delays in real time, schedules expert inspections and warns before compliance deadlines pass.
        </p>

        {/* CTA Button Duo */}
        <div className="landing-hero-actions">
          <button
            className="landing-cta-primary"
            onClick={onGetStarted}
            aria-label="Get started with AICTE Approval Monitor"
          >
            Get Started <ArrowRight size={16} aria-hidden="true" />
          </button>

          <button
            className="landing-cta-signin"
            onClick={onOpenSignIn}
            aria-label="Applicant Sign In or Register"
          >
            <LogIn size={15} aria-hidden="true" />
            Applicant Sign In
          </button>

          <button
            className="landing-cta-secondary"
            onClick={onWatchDemo}
            aria-label="Watch interactive demo walk-through"
          >
            <Play size={14} className="play-icon" aria-hidden="true" />
            Watch Demo
          </button>
        </div>

      </div>

      {/* Product Preview Frame at the bottom of hero */}
      <ProductFrame onGetStarted={onGetStarted} />
    </section>
  );
}
