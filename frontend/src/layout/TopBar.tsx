import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Menu, Search, Command } from 'lucide-react';
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
  onOpenCmd: () => void;
}

export function TopBar({ safeguardDismissed, onDismissSafeguard, onOpenMenu, onOpenCmd }: TopBarProps) {
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

  // "Updated Xs ago" ticker
  const [updatedSec, setUpdatedSec] = useState(0);
  const updatedRef = useRef(Date.now());
  useEffect(() => {
    const iv = setInterval(() => {
      setUpdatedSec(Math.floor((Date.now() - updatedRef.current) / 1000));
    }, 10_000);
    return () => clearInterval(iv);
  }, []);

  const updatedLabel = updatedSec < 30
    ? 'Just now'
    : updatedSec < 120
    ? `${updatedSec}s ago`
    : `${Math.floor(updatedSec / 60)}m ago`;

  // Debounced search (150ms)
  const [rawSearch, setRawSearch] = useState(searchQuery);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setRawSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchQuery(val), 150);
  }, [setSearchQuery]);

  // "/" focuses search, Cmd+K opens palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
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

        {/* Search — click or "/" to focus */}
        <div className="topbar-search" role="search">
          <Search className="topbar-search-icon" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search here..."
            value={rawSearch}
            onChange={e => handleSearch(e.target.value)}
            aria-label="Search institutions and applications"
          />
          <kbd aria-hidden="true" onClick={onOpenCmd} style={{ cursor: 'pointer' }}>
            <Command size={10} style={{ display: 'inline' }} /> K
          </kbd>
        </div>

        <div className="topbar-controls">
          {/* Live / Mock badge */}
          <span
            className={`mode-pill ${isLive ? 'live' : 'mock'}`}
            title={isLive ? `Connected to FastAPI backend · ${updatedLabel}` : 'Running on local mock data'}
          >
            <span className={`mode-pill-dot ${isLive ? 'pulse' : ''}`} aria-hidden="true" />
            {isLive ? `Live · ${updatedLabel}` : 'Mock'}
          </span>

          {/* Role selector */}
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

          {/* Bell */}
          <button
            className="topbar-bell"
            onClick={() => setPage('es')}
            aria-label={hasUnread ? 'Alerts, unread notifications' : 'Alerts'}
            title="Alerts"
          >
            <Bell size={17} aria-hidden="true" />
            {hasUnread && <span className={`topbar-bell-dot ${isLive ? 'pulse' : ''}`} aria-hidden="true" />}
          </button>

          {/* Avatar */}
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
