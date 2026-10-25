import React from 'react';
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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
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
  /** Orange pill for Escalations; none on ordinary items. */
  badgeColor?: 'orange' | 'grey';
  badgeHelp?: string;
  getBadge?: (ctx: ReturnType<typeof useApp>) => number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'ov',  label: 'Overview',           icon: LayoutDashboard },
  { id: 'ap',  label: 'Applications',       icon: FileText,        badgeColor: 'grey',  badgeHelp: METRIC_HELP.openApplications,   getBadge: ctx => openApplications(ctx.apps) },
  { id: 'evc', label: 'EVC Queue',          icon: Users,           badgeColor: 'grey',  badgeHelp: METRIC_HELP.evcItems,           getBadge: ctx => evcItems(ctx.evcs) },
  { id: 'un',  label: 'Undertakings',       icon: ClipboardCheck,  badgeColor: 'grey',  badgeHelp: METRIC_HELP.undertakingsAtRisk, getBadge: ctx => undertakingsAtRisk(ctx.ul) },
  { id: 'dc',  label: 'Lease & Documents',  icon: FileSignature,   badgeColor: 'grey',  badgeHelp: METRIC_HELP.docsExpiring,       getBadge: ctx => docsExpiring(ctx.dl) },
  { id: 'es',  label: 'Escalations',        icon: Bell,            badgeColor: 'orange', badgeHelp: METRIC_HELP.escalations,       getBadge: ctx => escalationsCount(ctx.urgencyItems) },
  { id: 'lg',  label: 'Audit Trail',        icon: ScrollText },
];

const OTHER_ITEMS: { label: string; icon: React.ElementType; onClick?: () => void }[] = [
  { label: 'APH Rules',   icon: SlidersHorizontal, onClick: undefined }, // wired below
  { label: 'Settings',    icon: Settings },
  { label: 'Help Center', icon: LifeBuoy },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const ctx = useApp();
  const { page, setPage, theme, setTheme } = ctx;

  const handleNav = (id: NavPage) => {
    setPage(id);
    onMobileClose();
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
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark" aria-hidden="true">A</div>
          <div className="sidebar-logo-text">
            <div style={{ fontSize: 13, lineHeight: 1.2, fontWeight: 700 }}>AICTE Monitor</div>
            <div className="sidebar-logo-sub">Approval &amp; Compliance</div>
          </div>
        </div>

        {/* Main nav */}
        <div className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const badge = item.getBadge ? item.getBadge(ctx) : 0;
            const isActive = page === item.id;

            return (
              <button
                key={item.id}
                className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed-item' : ''}`}
                onClick={() => handleNav(item.id)}
                aria-label={`${item.label}${badge > 0 ? ` (${badge})` : ''}`}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
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
          {OTHER_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`sidebar-item other-item ${collapsed ? 'collapsed-item' : ''}`}
                onClick={() => { if (item.label === 'APH Rules') { ctx.setIsAphModalOpen(true); onMobileClose(); } }}
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
              ? <SlidersHorizontal size={16} aria-hidden="true" />
              : <><SlidersHorizontal size={16} aria-hidden="true" /><span className="sidebar-item-label">Collapse</span></>
            }
          </button>
          <div className="sidebar-demo">Prototype - demo data</div>
        </div>

        {/* APPEARANCE switch */}
        <div className="sidebar-appearance">
          <div className="sidebar-group-label" aria-hidden="true">Appearance</div>
          <div className="appearance-switch" role="group" aria-label="Colour appearance">
            <button
              className={`appearance-seg ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light' as Theme)}
              aria-pressed={theme === 'light'}
              aria-label="Light appearance"
            >
              <Sun size={13} aria-hidden="true" /> Light
            </button>
            <button
              className={`appearance-seg ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark' as Theme)}
              aria-pressed={theme === 'dark'}
              aria-label="Dark appearance"
            >
              <Moon size={13} aria-hidden="true" /> Dark
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
