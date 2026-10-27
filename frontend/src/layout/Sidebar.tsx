import React, { useRef, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardCheck,
  FileSignature,
  Bell,
  ScrollText,
  SlidersHorizontal,
  Settings,
  LifeBuoy,
  Sun,
  Moon,
  Zap,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { navigateTo } from '../router';
import {
  openApplications,
  evcItems,
  undertakingsAtRisk,
  docsExpiring,
  escalationsCount,
  METRIC_HELP,
} from '../lib/metrics';
import type { NavPage, Theme } from '../types';

interface NavItem {
  id: NavPage;
  label: string;
  icon: React.ElementType;
  badgeColor?: 'orange' | 'grey';
  badgeHelp?: string;
  getBadge?: (ctx: ReturnType<typeof useApp>) => number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'ov',  label: 'Overview',          icon: LayoutDashboard },
  { id: 'ap',  label: 'Applications',      icon: FileText,       badgeColor: 'grey',   badgeHelp: METRIC_HELP.openApplications,   getBadge: ctx => openApplications(ctx.apps) },
  { id: 'evc', label: 'EVC Queue',         icon: Users,          badgeColor: 'grey',   badgeHelp: METRIC_HELP.evcItems,           getBadge: ctx => evcItems(ctx.evcs) },
  { id: 'un',  label: 'Undertakings',      icon: ClipboardCheck, badgeColor: 'grey',   badgeHelp: METRIC_HELP.undertakingsAtRisk, getBadge: ctx => undertakingsAtRisk(ctx.ul) },
  { id: 'dc',  label: 'Lease & Documents', icon: FileSignature,  badgeColor: 'grey',   badgeHelp: METRIC_HELP.docsExpiring,       getBadge: ctx => docsExpiring(ctx.dl) },
  { id: 'es',  label: 'Escalations',       icon: Bell,           badgeColor: 'orange', badgeHelp: METRIC_HELP.escalations,        getBadge: ctx => escalationsCount(ctx.urgencyItems) },
  { id: 'lg',  label: 'Audit Trail',       icon: ScrollText },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  reducedMotion: boolean;
  onToggleMotion: () => void;
  onOpenSettings?: () => void;
  onOpenHelpCenter?: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  reducedMotion,
  onToggleMotion,
  onOpenSettings,
  onOpenHelpCenter,
}: SidebarProps) {
  const ctx = useApp();
  const { page, setPage, theme, setTheme } = ctx;

  // Track nav items to position the sliding active indicator
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ top: 0, opacity: 0 });
  const activeIdx = NAV_ITEMS.findIndex(i => i.id === page);

  useEffect(() => {
    const el = navRefs.current[activeIdx];
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setPillStyle({
      top: rect.top - parentRect.top,
      height: rect.height,
      opacity: 1,
    });
  }, [activeIdx, collapsed]);

  const handleNav = (id: NavPage) => {
    setPage(id);
    onMobileClose();
  };

  // Theme toggle with view-transition if available
  const handleTheme = (next: Theme) => {
    if ('startViewTransition' in document && !reducedMotion) {
      (document as unknown as { startViewTransition: (cb: () => void) => void })
        .startViewTransition(() => setTheme(next));
    } else {
      setTheme(next);
    }
  };

  return (
    <>
      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="drawer-overlay" style={{ zIndex: 99 }} onClick={onMobileClose} aria-hidden="true" />
      )}

      <nav
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        aria-label="Primary navigation"
        style={{ transition: `width var(--dur-slow) var(--ease)` }}
      >
        {/* Logo with Return to Home */}
        <div
          className="sidebar-logo clickable"
          onClick={() => navigateTo('/', { transition: true })}
          title="Return to Landing Page"
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigateTo('/', { transition: true });
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="sidebar-logo-mark" aria-hidden="true">A</div>
          <div className="sidebar-logo-text">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: 13, lineHeight: 1.2, fontWeight: 700 }}>AICTE Monitor</span>
              <span className="sidebar-home-chip" title="Landing Page">Home ↗</span>
            </div>
            <div className="sidebar-logo-sub">Approval &amp; Compliance</div>
          </div>
        </div>

        {/* Main nav with sliding active indicator */}
        <div className="sidebar-nav" style={{ position: 'relative' }}>
          {/* Sliding pill */}
          <div
            className="sidebar-active-pill"
            style={{
              ...pillStyle,
              transition: reducedMotion ? 'none' : `top var(--dur) var(--ease), height var(--dur) var(--ease), opacity var(--dur-fast) var(--ease)`,
            }}
            aria-hidden="true"
          />

          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const badge = item.getBadge ? item.getBadge(ctx) : 0;
            const isActive = page === item.id;

            return (
              <button
                key={item.id}
                ref={el => { navRefs.current[idx] = el; }}
                className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed-item' : ''}`}
                onClick={() => handleNav(item.id)}
                aria-label={`${item.label}${badge > 0 ? ` (${badge})` : ''}`}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                style={{ position: 'relative', zIndex: 1 }}
              >
                <Icon aria-hidden="true" />
                <span className="sidebar-item-label">{item.label}</span>
                {badge > 0 && (
                  <span
                    className={`sidebar-badge ${item.badgeColor === 'orange' ? 'orange' : 'grey'} tabnum`}
                    title={item.badgeHelp}
                    aria-hidden="true"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* OTHERS */}
        <div className="sidebar-others">
          <div className="sidebar-group-label" aria-hidden="true">Other</div>
          {[
            { label: 'APH Rules',   icon: SlidersHorizontal },
            { label: 'Settings',    icon: Settings },
            { label: 'Help Center', icon: LifeBuoy },
            { label: 'Portal Home', icon: ExternalLink },
            { label: 'Sign Out',    icon: LogOut },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`sidebar-item other-item ${collapsed ? 'collapsed-item' : ''}`}
                onClick={() => {
                  if (item.label === 'APH Rules') {
                    ctx.setIsAphModalOpen(true);
                    onMobileClose();
                  } else if (item.label === 'Settings') {
                    onOpenSettings?.();
                    onMobileClose();
                  } else if (item.label === 'Help Center') {
                    onOpenHelpCenter?.();
                    onMobileClose();
                  } else if (item.label === 'Portal Home') {
                    navigateTo('/');
                    onMobileClose();
                  } else if (item.label === 'Sign Out') {
                    ctx.logoutUser();
                    onMobileClose();
                  }
                }}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
              >
                <Icon aria-hidden="true" />
                <span className="sidebar-item-label">{item.label}</span>
              </button>
            );
          })}

        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            className={`sidebar-item ${collapsed ? 'collapsed-item' : ''}`}
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ width: 'calc(100% - 12px)' }}
          >
            {collapsed
              ? <ChevronRight size={16} aria-hidden="true" />
              : <><ChevronLeft size={16} aria-hidden="true" /><span className="sidebar-item-label">Collapse</span></>
            }
          </button>
          <div className="sidebar-demo">Prototype - demo data</div>
        </div>

        {/* APPEARANCE + REDUCE MOTION */}
        <div className="sidebar-appearance">
          <div className="sidebar-group-label" aria-hidden="true">Appearance</div>
          <div className="appearance-switch" role="group" aria-label="Colour appearance">
            <button
              className={`appearance-seg ${theme === 'light' ? 'active' : ''}`}
              onClick={() => handleTheme('light')}
              aria-pressed={theme === 'light'}
              aria-label="Light appearance"
            >
              <Sun size={13} aria-hidden="true" /> Light
            </button>
            <button
              className={`appearance-seg ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleTheme('dark')}
              aria-pressed={theme === 'dark'}
              aria-label="Dark appearance"
            >
              <Moon size={13} aria-hidden="true" /> Dark
            </button>
          </div>

          {/* Reduce motion toggle */}
          <button
            className={`sidebar-item other-item ${collapsed ? 'collapsed-item' : ''}`}
            onClick={onToggleMotion}
            aria-pressed={reducedMotion}
            aria-label={reducedMotion ? 'Reduced motion on — click to enable animations' : 'Enable reduced motion'}
            title={collapsed ? 'Reduce motion' : undefined}
            style={{ marginTop: 4 }}
          >
            <Zap size={15} aria-hidden="true" style={{ opacity: reducedMotion ? 0.4 : 1 }} />
            <span className="sidebar-item-label" style={{ opacity: reducedMotion ? 0.6 : 1 }}>
              {reducedMotion ? 'Motion: off' : 'Reduce motion'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
