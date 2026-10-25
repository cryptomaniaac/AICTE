import { useEffect, useRef, useState } from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

const PAGE_TITLES: Record<string, string> = {
  ov: 'Overview',
  ap: 'Applications',
  evc: 'EVC Queue',
  un: 'Undertakings',
  dc: 'Lease & Documents',
  es: 'Escalations',
  lg: 'Audit Trail',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Bureau:    'Bureau — all regions',
  South:     'Regional · South only',
  North:     'Regional · North only',
  West:      'Regional · West only',
  East:      'Regional · East only',
  Committee: 'Committee — EVC & SAC/SHC',
};

const ROLE_INITIALS: Record<string, string> = {
  Bureau: 'BU', South: 'RS', North: 'RN', West: 'RW', East: 'RE', Committee: 'CM',
};

interface TopBarProps {
  safeguardDismissed: boolean;
  onDismissSafeguard: () => void;
  onOpenMenu: () => void;
}

export function TopBar({ safeguardDismissed, onDismissSafeguard, onOpenMenu }: TopBarProps) {
  const {
    role, setRole,
    page, setPage,
    isLive,
    searchQuery, setSearchQuery,
  } = useApp();

  const searchRef = useRef<HTMLInputElement>(null);

  const [hasUnread] = useState(() => {
    try { return localStorage.getItem('aicte-bell-read') !== '1'; } catch { return true; }
  });

  // "/" shortcut focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div>
      {/* Safeguard banner */}
      {!safeguardDismissed && (
        <div className="safeguard-banner" role="status" aria-label="Regulatory Notice">
          <strong>⚖️ Regulatory Safeguard:</strong>
          {' '}System alerts support processing but do not replace statutory verification or decisions reserved for competent authorities.
          <button onClick={onDismissSafeguard} aria-label="Dismiss regulatory notice">×</button>
        </div>
      )}

      {/* Top bar */}
      <header className="topbar">
        <button
          className="mobile-menu-btn"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          title="Open navigation"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <span className="topbar-title">{PAGE_TITLES[page] || 'Dashboard'}</span>

        <div className="topbar-spacer" />

        {/* Search */}
        <div className="topbar-search">
          <Search className="topbar-search-icon" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search here..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search institutions and applications"
          />
          <kbd aria-hidden="true">⌘K</kbd>
        </div>

        <div className="topbar-controls">
          {/* Live / Mock badge */}
          <span
            className={`mode-pill ${isLive ? 'live' : 'mock'}`}
            title={isLive ? 'Connected to FastAPI backend' : 'Running on local mock data'}
          >
            <span className="mode-pill-dot" aria-hidden="true" />
            {isLive ? 'Live API' : 'Mock mode'}
          </span>

          {/* Role selector (shows scope) */}
          <select
            className="role-select"
            value={role}
            onChange={e => setRole(e.target.value)}
            aria-label="Switch active role"
            title={ROLE_DESCRIPTIONS[role]}
          >
            <option value="Bureau">Bureau</option>
            <option value="South">Regional · South</option>
            <option value="North">Regional · North</option>
            <option value="West">Regional · West</option>
            <option value="East">Regional · East</option>
            <option value="Committee">Committee (EVC / SAC)</option>
          </select>

          {/* Role scope label */}
          <span
            className="role-scope-badge"
            aria-label={`Active scope: ${ROLE_DESCRIPTIONS[role]}`}
            title={ROLE_DESCRIPTIONS[role]}
          >
            Scope: {role === 'Bureau'
              ? 'all regions'
              : role === 'Committee'
              ? 'committee'
              : `${role.toLowerCase()} region`}
          </span>

          {/* Bell (dropdown arrives with the alerts step; navigates to Escalations for now) */}
          <button
            className="topbar-bell"
            onClick={() => setPage('es')}
            aria-label={hasUnread ? 'Alerts, unread notifications' : 'Alerts'}
            title="Alerts"
          >
            <Bell size={17} aria-hidden="true" />
            {hasUnread && <span className="topbar-bell-dot" aria-hidden="true" />}
          </button>

          {/* Avatar with initials */}
          <div
            className="topbar-avatar"
            title={ROLE_DESCRIPTIONS[role]}
            aria-label={`Signed in as ${role}`}
          >
            {ROLE_INITIALS[role] || 'AC'}
          </div>
        </div>
      </header>
    </div>
  );
}
