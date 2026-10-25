import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, LayoutDashboard, FileText, Users, ClipboardCheck, FileSignature, Bell, ScrollText, Play, Moon, Sun, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { NavPage } from '../types';

interface PaletteItem {
  id: string;
  label: string;
  sub?: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  onClose: () => void;
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

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const { setPage, theme, setTheme, handleSweep } = useApp();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape / backdrop click
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const allItems = useMemo<PaletteItem[]>(() => [
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
      label: 'Export CSV',
      sub: 'Action',
      icon: Zap,
      action: () => { setPage('lg'); onClose(); },
    },
  ], [setPage, handleSweep, setTheme, theme, onClose]);

  const items = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 8);
    const q = query.toLowerCase();
    return allItems.filter(i => i.label.toLowerCase().includes(q) || (i.sub ?? '').toLowerCase().includes(q));
  }, [query, allItems]);

  // Reset active on items change
  useEffect(() => { setActive(0); }, [items]);

  const run = (item: PaletteItem) => item.action();

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
                  <span className="cmd-item-icon" aria-hidden="true"><Icon size={14} /></span>
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
