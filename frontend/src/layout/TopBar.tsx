import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Menu, Search, Command, Play, Pause, Sparkles, RefreshCw, X } from 'lucide-react';
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
  onOpenTour?: () => void;
}

export function TopBar({
  safeguardDismissed,
  onDismissSafeguard,
  onOpenMenu,
  onOpenCmd,
  onOpenTour,
}: TopBarProps) {
  const {
    role, setRole,
    page, setPage,
    isLive,
    simulationActive, setSimulationActive,
    triggerSimulatedEvent,
    lastUpdatedTimestamp,
    bellUnreadCount, clearBellCount,
    timeTravelDays, setTimeTravelDays,
    resetDemoData,
    searchQuery, setSearchQuery,
  } = useApp();

  const searchRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showLiveMenu, setShowLiveMenu] = useState(false);

  // "Updated Xs ago" ticker connected to lastUpdatedTimestamp
  const [updatedSec, setUpdatedSec] = useState(0);
  useEffect(() => {
    setUpdatedSec(0);
    const iv = setInterval(() => {
      setUpdatedSec(Math.floor((Date.now() - lastUpdatedTimestamp) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [lastUpdatedTimestamp]);

  const updatedLabel = updatedSec < 15
    ? 'Just now'
    : updatedSec < 60
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

  // Close live popover on outside click
  useEffect(() => {
    if (!showLiveMenu) return;
    const clickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowLiveMenu(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [showLiveMenu]);

  const handleBellClick = () => {
    clearBellCount();
    setPage('es');
  };

  return (
    <div>
      {/* Safeguard banner + Time Travel Controls */}
      {!safeguardDismissed && (
        <div className="safeguard-banner" role="status" aria-label="Regulatory Notice">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>
            <span>
              <strong>⚖️ Regulatory Safeguard:</strong> System alerts support processing but do not replace statutory verification or decisions reserved for competent authorities.
            </span>
            <div className="time-travel-bar" style={{ marginLeft: 'auto' }} role="group" aria-label="Simulated Date Controls">
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, paddingLeft: 4 }}>Demo Date:</span>
              {[
                { label: 'Baseline', days: 0 },
                { label: '+7d', days: 7 },
                { label: '+14d', days: 14 },
                { label: '+30d', days: 30 },
              ].map(item => (
                <button
                  key={item.days}
                  className={`time-travel-btn ${timeTravelDays === item.days ? 'active' : ''}`}
                  onClick={() => setTimeTravelDays(item.days)}
                  title={`Fast forward timeline by ${item.days} days`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
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
          {/* Live / Mock badge with popover toggle */}
          <div style={{ position: 'relative' }} ref={popoverRef}>
            <button
              className={`mode-pill ${isLive ? 'live' : 'mock'}`}
              onClick={() => setShowLiveMenu(v => !v)}
              title="Click to view live sync options"
              style={{ cursor: 'pointer', border: 'none', background: 'none' }}
              aria-expanded={showLiveMenu}
              aria-haspopup="dialog"
            >
              <span className={`mode-pill-dot ${isLive || simulationActive ? 'pulse' : ''}`} aria-hidden="true" />
              {isLive ? `Live · ${updatedLabel}` : `Mock · ${updatedLabel}`}
            </button>

            {showLiveMenu && (
              <div className="live-popover" role="dialog" aria-label="Live sync settings">
                <div className="live-popover-header">
                  <span>Data Synchronization</span>
                  <button
                    className="icon-btn"
                    style={{ padding: 2 }}
                    onClick={() => setShowLiveMenu(false)}
                    aria-label="Close sync menu"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="live-popover-status">
                  <span
                    className={`mode-pill-dot ${isLive || simulationActive ? 'pulse' : ''}`}
                    aria-hidden="true"
                  />
                  <span>
                    {isLive
                      ? 'Connected to FastAPI backend'
                      : simulationActive
                      ? 'Mock mode active (auto-simulating events)'
                      : 'Mock simulation paused'}
                  </span>
                </div>
                <div className="live-popover-actions">
                  {!isLive && (
                    <>
                      <button
                        className="btn btn-secondary btn-xs"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => {
                          setSimulationActive(a => !a);
                        }}
                      >
                        {simulationActive ? <Pause size={12} /> : <Play size={12} />}
                        {simulationActive ? 'Pause Simulation' : 'Resume Simulation'}
                      </button>
                      <button
                        className="btn btn-secondary btn-xs"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => {
                          triggerSimulatedEvent();
                        }}
                      >
                        <Sparkles size={12} />
                        Simulate Event Now
                      </button>
                      <button
                        className="btn btn-secondary btn-xs"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => {
                          resetDemoData();
                          setShowLiveMenu(false);
                        }}
                      >
                        <RefreshCw size={12} />
                        Reset All Demo Records
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

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

          {/* Guided Tour Launcher */}
          {onOpenTour && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={onOpenTour}
              aria-label="Start interactive 7-step guided tour"
              title="7-Step Guided Tour: Learn all dashboard functions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                borderRadius: 6,
                padding: '4px 8px',
                color: 'var(--primary)',
                fontWeight: 600,
                border: '1px solid var(--primary-border)',
                background: 'var(--primary-50)',
              }}
            >
              <Sparkles size={13} style={{ color: 'var(--primary)' }} />
              <span>Tour</span>
            </button>
          )}

          {/* Bell with unread badge & pulse */}
          <button
            className={`topbar-bell ${bellUnreadCount > 0 ? 'shake' : ''}`}
            onClick={handleBellClick}
            aria-label={bellUnreadCount > 0 ? `${bellUnreadCount} unread alerts` : 'Alerts'}
            title="Alerts"
            style={{ position: 'relative' }}
          >
            <Bell size={17} aria-hidden="true" />
            {bellUnreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: 'var(--red)',
                  color: 'white',
                  borderRadius: '50%',
                  minWidth: 16,
                  height: 16,
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 2px',
                }}
              >
                {bellUnreadCount > 9 ? '9+' : bellUnreadCount}
              </span>
            )}
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
