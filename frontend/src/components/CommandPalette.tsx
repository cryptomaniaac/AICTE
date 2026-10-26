import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, LayoutDashboard, FileText, Users, ClipboardCheck,
  FileSignature, Bell, ScrollText, Play, Moon, Sun, Zap,
  Building2, Sparkles, HelpCircle, History, RotateCcw, FastForward,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { NavPage } from '../types';

interface PaletteItem {
  id: string;
  label: string;
  sub?: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
  isRecent?: boolean;
}

interface CommandPaletteProps {
  onClose: () => void;
  onOpenTour?: () => void;
  onOpenShortcuts?: () => void;
  onToggleReducedMotion?: () => void;
}

const PAGE_ITEMS: { id: NavPage; label: string; icon: React.ElementType }[] = [
  { id: 'ov',  label: 'Overview',          icon: LayoutDashboard },
  { id: 'ap',  label: 'Applications',      icon: FileText },
  { id: 'evc', label: 'EVC Queue',         icon: Users },
  { id: 'un',  label: 'Undertakings',      icon: ClipboardCheck },
  { id: 'dc',  label: 'Lease & Documents', icon: FileSignature },
  { id: 'es',  label: 'Escalations',       icon: Bell },
  { id: 'lg',  label: 'Audit Trail',       icon: ScrollText },
];

export function CommandPalette({
  onClose,
  onOpenTour,
  onOpenShortcuts,
  onToggleReducedMotion,
}: CommandPaletteProps) {
  const {
    setPage,
    theme, setTheme,
    handleSweep,
    apps,
    setSearchQuery,
    setPendingDrawerAppId,
    setTimeTravelDays,
    resetDemoData,
  } = useApp();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Recent commands from localStorage
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('aicte_cmd_recents');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const recordRecent = useCallback((id: string) => {
    try {
      setRecents(prev => {
        const next = [id, ...prev.filter(x => x !== id)].slice(0, 5);
        localStorage.setItem('aicte_cmd_recents', JSON.stringify(next));
        return next;
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const allItems = useMemo<PaletteItem[]>(() => {
    const baseItems: PaletteItem[] = [
      ...PAGE_ITEMS.map(p => ({
        id: `nav-${p.id}`,
        label: `Go to ${p.label}`,
        sub: 'Navigation',
        icon: p.icon,
        action: () => { setPage(p.id); onClose(); },
      })),
      {
        id: 'sweep',
        label: 'Run Alert Sweep',
        sub: 'Action',
        icon: Play,
        action: () => { handleSweep(); onClose(); },
      },
      {
        id: 'theme-toggle',
        label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        sub: 'Appearance',
        icon: theme === 'dark' ? Sun : Moon,
        action: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); onClose(); },
      },
      {
        id: 'export',
        label: 'Export Pendency CSV',
        sub: 'Action',
        icon: Zap,
        action: () => { setPage('lg'); onClose(); },
      },
      {
        id: 'tour',
        label: 'Take Guided Interactive Tour',
        sub: 'Help',
        icon: Sparkles,
        action: () => { onClose(); onOpenTour?.(); },
      },
      {
        id: 'shortcuts',
        label: 'Keyboard Shortcuts Cheat-Sheet',
        sub: 'Help',
        icon: HelpCircle,
        shortcut: '?',
        action: () => { onClose(); onOpenShortcuts?.(); },
      },
      {
        id: 'toggle-motion',
        label: 'Toggle Reduced Motion Mode',
        sub: 'Accessibility',
        icon: Sparkles,
        action: () => { onToggleReducedMotion?.(); onClose(); },
      },
      {
        id: 'time-7d',
        label: 'Time-Travel: Advance timeline +7 days',
        sub: 'Simulation',
        icon: FastForward,
        action: () => { setTimeTravelDays(7); onClose(); },
      },
      {
        id: 'time-14d',
        label: 'Time-Travel: Advance timeline +14 days',
        sub: 'Simulation',
        icon: FastForward,
        action: () => { setTimeTravelDays(14); onClose(); },
      },
      {
        id: 'reset-demo',
        label: 'Reset All Demonstration Records',
        sub: 'Simulation',
        icon: RotateCcw,
        action: () => { resetDemoData(); onClose(); },
      },
    ];

    // Add unique institutions from apps list
    const instSet = new Set<string>();
    const instItems: PaletteItem[] = [];
    for (const a of apps) {
      if (!instSet.has(a.inst)) {
        instSet.add(a.inst);
        instItems.push({
          id: `inst-${a.id}`,
          label: a.inst,
          sub: `Institution · ${a.reg} (${a.id})`,
          icon: Building2,
          action: () => {
            setSearchQuery(a.inst);
            setPage('ap');
            setPendingDrawerAppId(a.id);
            onClose();
          },
        });
      }
    }

    return [...baseItems, ...instItems];
  }, [
    setPage,
    handleSweep,
    setTheme,
    theme,
    onClose,
    onOpenTour,
    onOpenShortcuts,
    onToggleReducedMotion,
    setTimeTravelDays,
    resetDemoData,
    apps,
    setSearchQuery,
    setPendingDrawerAppId,
  ]);

  const items = useMemo(() => {
    if (!query.trim()) {
      // Prioritize recents
      if (recents.length > 0) {
        const recentItems = recents
          .map(rid => allItems.find(i => i.id === rid))
          .filter((i): i is PaletteItem => Boolean(i))
          .map(i => ({ ...i, isRecent: true }));
        const remaining = allItems.filter(i => !recents.includes(i.id));
        return [...recentItems, ...remaining].slice(0, 8);
      }
      return allItems.slice(0, 8);
    }
    const q = query.toLowerCase();
    return allItems
      .filter(i => i.label.toLowerCase().includes(q) || (i.sub ?? '').toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, allItems, recents]);

  // Reset active on items change
  useEffect(() => { setActive(0); }, [items]);

  const run = (item: PaletteItem) => {
    recordRecent(item.id);
    item.action();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && items[active]) { run(items[active]); }
  };

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <div
      className="cmd-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cmd-palette scale-in">
        <div className="cmd-search-row">
          <Search size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} aria-hidden="true" />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search commands, pages, institutions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            aria-label="Command search"
            aria-autocomplete="list"
            aria-controls="cmd-list"
            aria-activedescendant={items[active] ? `cmd-item-${items[active].id}` : undefined}
            role="combobox"
            aria-expanded={items.length > 0}
          />
          <kbd className="cmd-esc" onClick={onClose}>Esc</kbd>
        </div>

        {items.length === 0 ? (
          <div className="cmd-empty">No results for "{query}"</div>
        ) : (
          <ul className="cmd-list" id="cmd-list" role="listbox" ref={listRef}>
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  id={`cmd-item-${item.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={`cmd-item ${i === active ? 'active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(item)}
                >
                  <span className="cmd-item-icon" aria-hidden="true">
                    {item.isRecent ? <History size={14} style={{ color: 'var(--primary)' }} /> : <Icon size={14} />}
                  </span>
                  <span className="cmd-item-label">{item.label}</span>
                  {item.sub && <span className="cmd-item-sub">{item.sub}</span>}
                  {item.shortcut && <kbd className="cmd-item-shortcut">{item.shortcut}</kbd>}
                </li>
              );
            })}
          </ul>
        )}

        <div className="cmd-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
