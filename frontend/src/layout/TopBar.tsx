import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bell, Menu, Search, Command, Play, Pause, Sparkles, RefreshCw, X, User,
  LogOut, ExternalLink, Server, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { useApp, alertLevel } from '../context/AppContext';
import { navigateTo } from '../router';
import api from '../api';

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
  Bureau:      'Bureau — all regions',
  South:       'Regional · South only',
  North:       'Regional · North only',
  West:        'Regional · West only',
  East:        'Regional · East only',
  Committee:   'Committee — EVC & SAC/SHC',
  Institution: 'Applicant Institution Portal',
  Applicant:   'Applicant Institution Portal',
};

const ROLE_INITIALS: Record<string, string> = {
  Bureau: 'BU', South: 'RS', North: 'RN', West: 'RW', East: 'RE', Committee: 'CM',
  Institution: 'IN', Applicant: 'AP',
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
    currentUser, logoutUser,
    urgencyItems,
    latestLiveEvent,
    handleSweep,
    checkBackendConnection,
    setPendingDrawerAppId,
    actionLoading,
  } = useApp();

  const searchRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showLiveMenu, setShowLiveMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

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

  // Close live popover, notification menu, and user dropdown on outside click
  useEffect(() => {
    if (!showLiveMenu && !showUserMenu && !showNotificationMenu) return;
    const clickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowLiveMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotificationMenu(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [showLiveMenu, showUserMenu, showNotificationMenu]);

  const handleBellClick = () => {
    clearBellCount();
    setShowNotificationMenu(v => !v);
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
              title={isLive ? 'Connected to live backend — click for sync options' : 'Demo Mode — using realistic sample data. Click for details.'}
              style={{ cursor: 'pointer', border: 'none', background: 'none' }}
              aria-expanded={showLiveMenu}
              aria-haspopup="dialog"
            >
              <span className={`mode-pill-dot ${isLive || simulationActive ? 'pulse' : ''}`} aria-hidden="true" />
              {isLive ? `Live · ${updatedLabel}` : simulationActive ? `Demo · Simulating` : `Demo Mode`}
            </button>

            {showLiveMenu && (
              <div className="live-popover" role="dialog" aria-label="Live sync settings">
                <div className="live-popover-header">
                  <span>Data Synchronization & Status</span>
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
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>
                      {isLive ? '✅ Live FastAPI Backend Connected' : '🎭 Demo Mode Active'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {isLive
                        ? 'Connected to live AICTE FastAPI backend with database persistence.'
                        : 'Running with realistic statutory AICTE sample records (no backend needed).'}
                    </div>
                  </div>
                </div>

                {/* When will it be Live guide */}
                {!isLive && (
                  <div style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '9px 11px',
                    fontSize: 11,
                    color: 'var(--text-2)',
                    marginBottom: 10,
                    lineHeight: 1.45,
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Server size={12} /> When will it be Live?
                    </div>
                    <div>The dashboard automatically goes <strong>Live</strong> as soon as the FastAPI backend starts responding:</div>
                    <div style={{ margin: '6px 0', padding: '4px 6px', background: 'var(--surface)', borderRadius: 4, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>Local Terminal:</div>
                      <code style={{ fontSize: 10.5, color: 'var(--text)' }}>cd backend && python -m uvicorn main:app --reload</code>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                      For Vercel/Cloud: deploy the backend and set <code>VITE_API_URL</code> in environment variables.
                    </div>
                  </div>
                )}

                <div className="live-popover-actions">
                  <button
                    className="btn btn-primary btn-xs"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                    onClick={async () => {
                      await checkBackendConnection();
                    }}
                    disabled={actionLoading === 'check-health'}
                  >
                    <RefreshCw size={12} className={actionLoading === 'check-health' ? 'spin' : ''} />
                    {actionLoading === 'check-health' ? 'Connecting to Backend…' : isLive ? 'Re-sync Live Backend' : 'Check Backend Connection Now'}
                  </button>
                  <button
                    className="btn btn-secondary btn-xs"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                    onClick={() => {
                      setSimulationActive(a => !a);
                    }}
                  >
                    {simulationActive ? <Pause size={12} /> : <Play size={12} />}
                    {simulationActive ? 'Pause Background Events' : 'Start Auto Events'}
                  </button>
                  <button
                    className="btn btn-secondary btn-xs"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                    onClick={async () => {
                      if (isLive) {
                        try {
                          await api.triggerSimulatedBackendEvent();
                        } catch {
                          triggerSimulatedEvent();
                        }
                      } else {
                        triggerSimulatedEvent();
                      }
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
            title={ROLE_DESCRIPTIONS[role] || role}
          >
            <option value="Bureau">Bureau</option>
            <option value="South">Regional · South</option>
            <option value="North">Regional · North</option>
            <option value="West">Regional · West</option>
            <option value="East">Regional · East</option>
            <option value="Committee">Committee (EVC / SAC)</option>
            {currentUser ? (
              <option value={currentUser.role || 'Institution'}>
                {currentUser.name} ({currentUser.region})
              </option>
            ) : (
              <option value="Institution">Applicant Institution</option>
            )}
          </select>

          {/* Role scope label */}
          <span
            className="role-scope-badge"
            aria-label={`Active scope: ${ROLE_DESCRIPTIONS[role] || role}`}
            title={ROLE_DESCRIPTIONS[role] || role}
          >
            Scope: {role === 'Bureau'
              ? 'all regions'
              : role === 'Committee'
              ? 'committee'
              : role === 'Institution' || role === 'Applicant'
              ? (currentUser?.region ? `${currentUser.region.toLowerCase()} region` : 'institution')
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

          {/* Bell with unread badge & notification popover */}
          <div style={{ position: 'relative' }} ref={bellRef}>
            <button
              className={`topbar-bell ${bellUnreadCount > 0 ? 'shake' : ''}`}
              onClick={handleBellClick}
              aria-label={bellUnreadCount > 0 ? `${bellUnreadCount} unread alerts` : 'Statutory Alerts'}
              title="Statutory Alerts & Notifications"
              aria-expanded={showNotificationMenu}
              aria-haspopup="dialog"
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

            {showNotificationMenu && (
              <div className="notification-popover" role="dialog" aria-label="Statutory Notifications">
                <div className="notification-popover-header">
                  <div className="notification-popover-title">
                    <Bell size={14} style={{ color: 'var(--primary)' }} />
                    <span>Statutory Notifications</span>
                    {urgencyItems.length > 0 && (
                      <span className="chip chip-grey" style={{ fontSize: 10, padding: '1px 6px' }}>
                        {urgencyItems.length} active
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => clearBellCount()}
                      style={{ fontSize: 11 }}
                      title="Clear badge"
                    >
                      Clear
                    </button>
                    <button
                      className="icon-btn"
                      style={{ padding: 2 }}
                      onClick={() => setShowNotificationMenu(false)}
                      aria-label="Close notifications"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <div className="notification-popover-list">
                  {/* Latest live event if present */}
                  {latestLiveEvent && (
                    <div
                      className="notif-item event"
                      onClick={() => {
                        if (latestLiveEvent.appId) {
                          setPendingDrawerAppId(latestLiveEvent.appId);
                          setPage('ap');
                        }
                        setShowNotificationMenu(false);
                      }}
                    >
                      <div className="notif-item-body">
                        <div className="notif-item-header">
                          <span className="chip chip-blue" style={{ fontSize: 10 }}>Live Event</span>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{latestLiveEvent.timestamp}</span>
                        </div>
                        <div className="notif-item-title">{latestLiveEvent.title}</div>
                        <div className="notif-item-desc">{latestLiveEvent.desc}</div>
                      </div>
                    </div>
                  )}

                  {/* List top urgent items */}
                  {urgencyItems.slice(0, 6).map((item, idx) => {
                    const level = alertLevel(item.d);
                    const isOverdue = item.d <= 0;
                    const levelClass = level.toLowerCase();
                    return (
                      <div
                        key={`notif-${item.appId || item.recordId || idx}`}
                        className={`notif-item ${levelClass}`}
                        onClick={() => {
                          if (item.appId) {
                            setPendingDrawerAppId(item.appId);
                            setPage('ap');
                          } else {
                            setPage('ap');
                            setSearchQuery(item.inst);
                          }
                          setShowNotificationMenu(false);
                        }}
                      >
                        <div className="notif-item-body">
                          <div className="notif-item-header">
                            <span className={`chip chip-${levelClass}`} style={{ fontSize: 10, fontWeight: 700 }}>
                              {level === 'L3' ? 'L3 Critical' : level === 'L2' ? 'L2 Overdue' : 'L1 Reminder'} · {item.kind}
                            </span>
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: isOverdue ? 'var(--red)' : 'var(--amber)' }}>
                              {isOverdue ? `${Math.abs(item.d)}d overdue` : `${item.d}d left`}
                            </span>
                          </div>
                          <div className="notif-item-title">{item.inst}</div>
                          <div className="notif-item-desc">
                            {item.reg} Region · {item.stage || item.kind} statutory compliance checkpoint
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {urgencyItems.length === 0 && !latestLiveEvent && (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)' }}>
                      <CheckCircle2 size={28} style={{ color: 'var(--green)', margin: '0 auto 8px', display: 'block' }} />
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>All Deadlines Compliant</div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>No overdue items or SLA breaches detected</div>
                    </div>
                  )}
                </div>

                <div className="notification-popover-footer">
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={async () => {
                      await handleSweep();
                    }}
                    disabled={actionLoading === 'sweep'}
                  >
                    <Play size={11} /> {actionLoading === 'sweep' ? 'Sweeping…' : 'Run Alert Sweep'}
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setPage('es');
                      setShowNotificationMenu(false);
                    }}
                    style={{ fontWeight: 600, color: 'var(--primary)', gap: 4 }}
                  >
                    Escalations Ladder <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Account Avatar & Popover */}
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button
              className="topbar-user-btn"
              onClick={() => setShowUserMenu(o => !o)}
              aria-label="User profile and account settings"
              aria-expanded={showUserMenu}
              title={currentUser ? `${currentUser.name} (${currentUser.institution_name})` : `Signed in as ${role}`}
            >
              <div className="topbar-avatar">
                {currentUser
                  ? currentUser.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                  : ROLE_INITIALS[role] || 'AC'}
              </div>
              {currentUser && (
                <span className="topbar-user-badge">
                  {currentUser.name.split(' ')[0]}
                </span>
              )}
            </button>

            {showUserMenu && (
              <div className="topbar-user-dropdown" role="menu">
                <div className="user-dropdown-header">
                  <div className="user-dropdown-avatar">
                    <User size={18} />
                  </div>
                  <div className="user-dropdown-info">
                    <div className="user-dropdown-name">
                      {currentUser ? currentUser.name : (ROLE_DESCRIPTIONS[role] || role)}
                    </div>
                    <div className="user-dropdown-email">
                      {currentUser ? currentUser.email : `${role.toLowerCase()}@aicte.gov.in`}
                    </div>
                    {currentUser?.institution_name && (
                      <div className="user-dropdown-inst">
                        {currentUser.institution_name} · <span className="region-tag">{currentUser.region}</span>
                      </div>
                    )}
                    {currentUser?.application_id && (
                      <div className="user-dropdown-appid">
                        App ID: <code>{currentUser.application_id}</code>
                      </div>
                    )}
                  </div>
                </div>

                <div className="user-dropdown-divider" />

                <div className="user-dropdown-actions">
                  <button
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigateTo('/');
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>AICTE Landing Home</span>
                  </button>

                  <button
                    className="user-dropdown-item text-danger"
                    onClick={() => {
                      setShowUserMenu(false);
                      logoutUser();
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out & Return</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </header>
    </div>
  );
}
