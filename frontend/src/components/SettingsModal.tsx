import React, { useState, useEffect, useRef } from 'react';
import {
  X, Settings, Sun, Moon, Volume2, Bell, Shield,
  Database, Download, RefreshCw, Check, SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reducedMotion: boolean;
  onToggleMotion: () => void;
  onOpenAphRules?: () => void;
  onOpenTour?: () => void;
}

type SettingsTab = 'appearance' | 'alerts' | 'data' | 'system';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  reducedMotion,
  onToggleMotion,
  onOpenAphRules,
  onOpenTour,
}) => {
  const {
    theme, setTheme,
    simulationActive, setSimulationActive,
    handleSweep,
    resetDemoData,
    setTimeTravelDays,
    timeTravelDays,
    aphRules,
    role,
    showToast,
    A,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('aicte-sound-alerts') !== 'false';
    } catch {
      return true;
    }
  });
  const [toastsEnabled, setToastsEnabled] = useState(() => {
    try {
      return localStorage.getItem('aicte-toast-alerts') !== 'false';
    } catch {
      return true;
    }
  });
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    try {
      return (localStorage.getItem('aicte-density') as 'comfortable' | 'compact') || 'comfortable';
    } catch {
      return 'comfortable';
    }
  });
  const [warningThreshold, setWarningThreshold] = useState(() => {
    try {
      return localStorage.getItem('aicte-warning-days') || '15';
    } catch {
      return '15';
    }
  });

  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Handle density change
  const handleDensityChange = (newDensity: 'comfortable' | 'compact') => {
    setDensity(newDensity);
    try {
      localStorage.setItem('aicte-density', newDensity);
      if (newDensity === 'compact') {
        document.documentElement.classList.add('density-compact');
      } else {
        document.documentElement.classList.remove('density-compact');
      }
      showToast('Interface Density Updated', `Switched layout density to ${newDensity}.`, 'info');
    } catch {
      /* ignore */
    }
  };

  // Sound toggle
  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('aicte-sound-alerts', String(next));
      showToast(
        next ? 'Audio Alerts Enabled' : 'Audio Alerts Muted',
        next ? 'Chimes will sound when critical L3 breaches occur.' : 'Audio notifications muted.',
        'info',
      );
    } catch {
      /* ignore */
    }
  };

  // Toast toggle
  const handleToastsToggle = () => {
    const next = !toastsEnabled;
    setToastsEnabled(next);
    try {
      localStorage.setItem('aicte-toast-alerts', String(next));
      showToast(
        next ? 'Pop-up Alerts Enabled' : 'Pop-up Alerts Suppressed',
        next ? 'Regulatory event banners will display in top-right.' : 'Alert banners disabled.',
        'info',
      );
    } catch {
      /* ignore */
    }
  };

  // Threshold change
  const handleThresholdChange = (val: string) => {
    setWarningThreshold(val);
    try {
      localStorage.setItem('aicte-warning-days', val);
      showToast('SLA Warning Threshold Updated', `Due Soon items flagged at <= ${val} days.`, 'success');
    } catch {
      /* ignore */
    }
  };

  // Export diagnostic configuration
  const handleExportConfig = () => {
    const configData = {
      system: 'AICTE Approval & Compliance Monitor',
      version: '2.4.0',
      timestamp: new Date().toISOString(),
      role,
      theme,
      density,
      soundEnabled,
      toastsEnabled,
      warningThresholdDays: warningThreshold,
      simulationActive,
      timeTravelDays,
      aphRules,
      totalApplications: A.length,
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aicte_system_settings_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Configuration Exported', 'System diagnostic settings saved as JSON.', 'success');
  };

  // Reset all settings to factory default
  const handleResetAll = () => {
    resetDemoData();
    setTimeTravelDays(0);
    setTheme('light');
    setDensity('comfortable');
    document.documentElement.classList.remove('density-compact');
    setSoundEnabled(true);
    setToastsEnabled(true);
    setWarningThreshold('15');
    try {
      localStorage.setItem('aicte-theme', 'light');
      localStorage.setItem('aicte-density', 'comfortable');
      localStorage.setItem('aicte-sound-alerts', 'true');
      localStorage.setItem('aicte-toast-alerts', 'true');
      localStorage.setItem('aicte-warning-days', '15');
    } catch {
      /* ignore */
    }
    showToast('Settings Reset', 'All preferences restored to default light baseline.', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      className="cmd-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="cmd-palette scale-in"
        style={{
          width: '100%',
          maxWidth: 620,
          borderRadius: 12,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'var(--primary-50)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Settings size={18} />
            </div>
            <div>
              <h2 id="settings-dialog-title" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                System Settings & Preferences
              </h2>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                Configure statutory monitor display, regulatory alert thresholds, and demo state
              </p>
            </div>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close Settings">
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '8px 20px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
        }}>
          {[
            { id: 'appearance' as const, label: 'Appearance & UI', icon: Sun },
            { id: 'alerts' as const,     label: 'SLA & Alerts',    icon: Bell },
            { id: 'data' as const,       label: 'Data & Engine',   icon: Database },
            { id: 'system' as const,     label: 'System & Scope',  icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  background: active ? 'var(--surface)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--muted)',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* TAB 1: APPEARANCE & UI */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Theme Selector */}
              <div>
                <label className="form-label" style={{ marginBottom: 8 }}>Interface Color Theme</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {/* Light Mode Card */}
                  <div
                    onClick={() => setTheme('light')}
                    style={{
                      border: `2px solid ${theme === 'light' ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: '14px',
                      background: '#ffffff',
                      color: '#1e293b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      boxShadow: theme === 'light' ? '0 0 0 2px var(--primary-50)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: '#f1f5f9', color: '#2563eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Sun size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Light Mode</span>
                        {theme === 'light' && <Check size={14} color="#2563eb" />}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Clean high-contrast daytime UI (Default)</div>
                    </div>
                  </div>

                  {/* Dark Mode Card */}
                  <div
                    onClick={() => setTheme('dark')}
                    style={{
                      border: `2px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: '14px',
                      background: '#0f172a',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      boxShadow: theme === 'dark' ? '0 0 0 2px var(--primary-50)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: '#1e293b', color: '#60a5fa',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Moon size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Dark (Abyss)</span>
                        {theme === 'dark' && <Check size={14} color="#60a5fa" />}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Low-glare night supervision mode</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Density */}
              <div>
                <label className="form-label" style={{ marginBottom: 6 }}>Regulatory Table Density</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className={`btn btn-sm ${density === 'comfortable' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleDensityChange('comfortable')}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Comfortable (Standard)
                  </button>
                  <button
                    className={`btn btn-sm ${density === 'compact' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleDensityChange('compact')}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Compact (Dense Rows)
                  </button>
                </div>
                <p className="form-hint">Compact view increases visible queue items on smaller screens.</p>
              </div>

              {/* Reduced Motion Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Reduced Motion</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Disable page slide-ins, micro-transitions, and backdrop canvas animations
                  </div>
                </div>
                <button
                  className={`btn btn-xs ${reducedMotion ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={onToggleMotion}
                  style={{ minWidth: 64, justifyContent: 'center' }}
                >
                  {reducedMotion ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SLA & ALERTS */}
          {activeTab === 'alerts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Audio Chime Notification */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Volume2 size={18} style={{ color: soundEnabled ? 'var(--primary)' : 'var(--muted)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Critical L3 Audio Chimes</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Audible alert when an application breaches statutory SLA by &gt;7 days
                    </div>
                  </div>
                </div>
                <button
                  className={`btn btn-xs ${soundEnabled ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleSoundToggle}
                  style={{ minWidth: 64, justifyContent: 'center' }}
                >
                  {soundEnabled ? 'Active' : 'Muted'}
                </button>
              </div>

              {/* Toast Notification Banners */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bell size={18} style={{ color: toastsEnabled ? 'var(--primary)' : 'var(--muted)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>In-App Toast Banners</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Display temporary dismissible notifications when changes or actions occur
                    </div>
                  </div>
                </div>
                <button
                  className={`btn btn-xs ${toastsEnabled ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleToastsToggle}
                  style={{ minWidth: 64, justifyContent: 'center' }}
                >
                  {toastsEnabled ? 'Active' : 'Off'}
                </button>
              </div>

              {/* Warning Threshold Slider */}
              <div>
                <label className="form-label">SLA Due Soon Proactive Warning Threshold</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {['7', '15', '30'].map(days => (
                    <button
                      key={days}
                      className={`btn btn-sm ${warningThreshold === days ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleThresholdChange(days)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {days} Days Ahead {days === '15' ? '(Standard)' : ''}
                    </button>
                  ))}
                </div>
                <p className="form-hint">
                  Institutions with expiring compliance within this window appear under Level 1 (Due Soon).
                </p>
              </div>

              {/* APH Rules Quick Button */}
              {onOpenAphRules && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'rgba(37,99,235,0.06)',
                  border: '1px solid rgba(37,99,235,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>Statutory APH 2024-27 SLA Rules</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Scrutiny: {aphRules.Scrutiny}d | EVC: {aphRules.EVC}d | SAC/SHC: {aphRules['SAC/SHC']}d
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => { onClose(); onOpenAphRules(); }}
                    style={{ gap: 4 }}
                  >
                    <SlidersHorizontal size={13} /> Edit Rules
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DATA & SIMULATION ENGINE */}
          {activeTab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Real-time simulation switch */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    Autonomous Event Simulation Engine
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Periodically generates live EVC completions, document uploads, and SLA updates
                  </div>
                </div>
                <button
                  className={`btn btn-xs ${simulationActive ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    const next = !simulationActive;
                    setSimulationActive(next);
                    showToast(
                      next ? 'Simulation Started' : 'Simulation Paused',
                      next ? 'Live event stream is now active.' : 'Autonomous simulation is stopped.',
                      'info',
                    );
                  }}
                  style={{ minWidth: 64, justifyContent: 'center' }}
                >
                  {simulationActive ? 'Running' : 'Paused'}
                </button>
              </div>

              {/* Time Travel Info */}
              <div style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    Regulatory Time-Travel Horizon
                  </div>
                  <span className="badge badge-primary" style={{ fontSize: 11 }}>
                    {timeTravelDays === 0 ? 'Baseline (Current)' : `+${timeTravelDays} Days Projection`}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                  Jump forward in time to stress-test escalation escalation ladders and document expiry alerts.
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 7, 14, 30].map(days => (
                    <button
                      key={days}
                      className={`btn btn-xs ${timeTravelDays === days ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setTimeTravelDays(days)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {days === 0 ? 'Baseline' : `+${days}d`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sweep & Reset Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    await handleSweep();
                    showToast('Sweeper Triggered', 'Synchronized real-time status across all regional pipelines.', 'success');
                  }}
                  style={{ justifyContent: 'center', gap: 6 }}
                >
                  <RefreshCw size={13} /> Run Alert Sweep
                </button>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    resetDemoData();
                    setTimeTravelDays(0);
                    showToast('Demo Data Reset', 'Pipeline restored to initial clean mock state.', 'success');
                  }}
                  style={{ justifyContent: 'center', gap: 6 }}
                >
                  <RefreshCw size={13} /> Reset Demo Data
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM & SCOPE */}
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: 'var(--surface-2)',
                borderRadius: 8,
                padding: '14px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>Application Platform:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>AICTE Statutory Approval & Compliance Monitor</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>Build Version:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>v2.4.0-production (APH 2024-27)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>Active Operating Role:</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{role}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>Monitored Institutions:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{A.length} Institutions nationwide</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>Default Opening Mode:</span>
                  <span style={{ fontWeight: 600, color: 'var(--green)' }}>Light Mode (Compliant)</span>
                </div>
              </div>

              {/* Guided Tour Trigger */}
              {onOpenTour && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Interactive Guided Tour</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Re-run the 7-step onboarding tutorial for statutory officers
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => { onClose(); onOpenTour(); }}
                  >
                    Start Tour
                  </button>
                </div>
              )}

              {/* Export Diagnostic State */}
              <div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportConfig}
                  style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                >
                  <Download size={13} /> Export System Diagnostics & Config JSON
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <button
            className="btn btn-ghost btn-xs"
            onClick={handleResetAll}
            style={{ color: 'var(--muted)', fontSize: 11 }}
          >
            Reset All Preferences to Defaults
          </button>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
