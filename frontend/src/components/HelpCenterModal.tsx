import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, LifeBuoy, Compass, Keyboard, SlidersHorizontal, Search,
  ChevronDown, ChevronUp, Send, Phone, Mail, MapPin,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTour?: () => void;
  onOpenShortcuts?: () => void;
  onOpenAphRules?: () => void;
}

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  badge?: string;
}

const FAQ_DATABASE: FaqItem[] = [
  {
    id: 'sla-calc',
    category: 'SLA Escalations',
    question: 'How is the statutory SLA timeline calculated for each stage?',
    answer: 'Timelines follow AICTE Approval Process Handbook (APH 2024–27). Each stage has a fixed statutory SLA window: Scrutiny (15 calendar days), EVC (30 days), and SAC/SHC (20 days). When elapsed days exceed the statutory window, the system automatically tags the item with an overdue warning (L2 for 1–7 days, L3 for >7 days overdue).',
    badge: 'Statutory Core',
  },
  {
    id: 'l3-showcause',
    category: 'SLA Escalations',
    question: 'What happens when an item reaches Level 3 (Critical Breach)?',
    answer: 'Items overdue by >7 days are highlighted in red across all dashboards and escalated to the AICTE Bureau Head and Member Secretary. The direct statutory action button allows one-click generation of a formal Show-Cause Notice under Chapter 1 of the APH.',
    badge: 'Critical Action',
  },
  {
    id: 'evc-reschedule',
    category: 'EVC Queue',
    question: 'Can an EVC (Expert Visit Committee) inspection be rescheduled?',
    answer: 'Yes, Regional Officers and Bureau administrators can grant a statutory extension or reschedule via the "Reschedule" button in the EVC Queue table. Any reschedule is logged with timestamp, user ID, and reason into the immutable Audit Trail.',
    badge: 'Inspection',
  },
  {
    id: 'lease-rules',
    category: 'Lease & Documents',
    question: 'What are the minimum statutory validity rules for land leases?',
    answer: 'Under AICTE Norms, technical institutions must either own campus land outright or maintain a legally registered lease deed for a minimum of 30 continuous years. Lease records expiring within 180 days are flagged in amber; expired leases trigger immediate L3 escalation.',
    badge: 'Land Norms',
  },
  {
    id: 'undertakings-adherence',
    category: 'Undertakings',
    question: 'Why are Anti-Ragging and Fee Committee undertakings mandatory?',
    answer: 'In compliance with Supreme Court orders and AICTE Regulations 2009, institutions must submit verified undertakings on non-judicial stamp paper. Deficient undertakings block advancement to the subsequent approval stage until resolved.',
    badge: 'Compliance',
  },
  {
    id: 'time-travel',
    category: 'Simulation',
    question: 'How does the Time Travel demo control work?',
    answer: 'The Demo Date selector in the Top Bar allows regulatory supervisors to jump forward in time (+7d, +14d, +30d). This projects future statutory expirations across all registered applications without modifying the underlying database baseline.',
    badge: 'Demo Mode',
  },
];

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenTour,
  onOpenShortcuts,
  onOpenAphRules,
}) => {
  const { showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('sla-calc');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Support inquiry form state
  const [inquiryAppId, setInquiryAppId] = useState('');
  const [inquiryCategory, setInquiryCategory] = useState('SLA Clarification');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState<string | null>(null);

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

  const categories = useMemo(() => {
    const set = new Set(FAQ_DATABASE.map(f => f.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredFaqs = useMemo(() => {
    return FAQ_DATABASE.filter(f => {
      const matchCat = activeCategory === 'All' || f.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryMessage.trim()) return;

    const fakeTicket = `AICTE-REQ-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketSubmitted(fakeTicket);
    showToast(
      'Regulatory Inquiry Logged',
      `Docket #${fakeTicket} generated. AICTE Nodal Bureau desk notified.`,
      'success',
    );
    setInquiryMessage('');
    setInquiryAppId('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="cmd-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="helpcenter-dialog-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="cmd-palette scale-in"
        style={{
          width: '100%',
          maxWidth: 680,
          borderRadius: 12,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh',
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
              <LifeBuoy size={18} />
            </div>
            <div>
              <h2 id="helpcenter-dialog-title" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                AICTE Help Center & Regulatory Handbook
              </h2>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                Standard operating procedures, SLA matrices, guided tutorials, and nodal contacts
              </p>
            </div>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close Help Center">
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Action Navigation Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {/* Tour Card */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px 14px',
                background: 'var(--surface-2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8,
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', marginBottom: 4 }}>
                  <Compass size={16} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Interactive Tour</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
                  7-step guided walkthrough of the approval console
                </div>
              </div>
              <button
                className="btn btn-primary btn-xs"
                onClick={() => { onClose(); onOpenTour?.(); }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Start Tour
              </button>
            </div>

            {/* Shortcuts Card */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px 14px',
                background: 'var(--surface-2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', marginBottom: 4 }}>
                  <Keyboard size={16} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Key Shortcuts</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
                  Fast navigation hotkeys (⌘K, ?, G D, Esc)
                </div>
              </div>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => { onClose(); onOpenShortcuts?.(); }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                View Hotkeys
              </button>
            </div>

            {/* APH Rules Card */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px 14px',
                background: 'var(--surface-2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', marginBottom: 4 }}>
                  <SlidersHorizontal size={16} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>APH Rules</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
                  Statutory SLA thresholds (Scrutiny, EVC, SAC)
                </div>
              </div>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => { onClose(); onOpenAphRules?.(); }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                APH Matrix
              </button>
            </div>
          </div>

          {/* Search Bar & Category Filter */}
          <div>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search regulations, SOPs, and troubleshooting guides…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 34, height: 36, fontSize: 12, borderRadius: 8 }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`btn btn-xs ${activeCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: activeCategory === cat ? 600 : 500,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ Accordion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Frequently Consulted Statutory Guidelines ({filteredFaqs.length})
            </div>

            {filteredFaqs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                No regulatory guidelines match &quot;{searchQuery}&quot;. Try broadening your keywords.
              </div>
            ) : (
              filteredFaqs.map(item => {
                const isExpanded = expandedFaq === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--surface)',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isExpanded ? null : item.id)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isExpanded ? 'var(--surface-2)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                          {item.question}
                        </span>
                        {item.badge && (
                          <span className="badge badge-primary" style={{ fontSize: 10, padding: '1px 6px' }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                      ) : (
                        <ChevronDown size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                      )}
                    </button>

                    {isExpanded && (
                      <div style={{
                        padding: '12px 14px',
                        fontSize: 12,
                        color: 'var(--muted)',
                        lineHeight: 1.55,
                        borderTop: '1px solid var(--border)',
                        background: 'var(--surface)',
                      }}>
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Support Ticket Submission Form */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '14px 16px',
            background: 'var(--surface-2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Send size={14} style={{ color: 'var(--primary)' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                Direct Inquiry to AICTE Nodal Bureau
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 12px 0' }}>
              Have an urgent query regarding statutory SLA, EVC report dispute, or compliance status? Log a docket directly.
            </p>

            {ticketSubmitted ? (
              <div style={{
                padding: '12px',
                borderRadius: 6,
                background: 'rgba(22,163,74,0.1)',
                border: '1px solid rgba(22,163,74,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <div style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>
                  <strong>Inquiry Logged: {ticketSubmitted}</strong>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Your request has been routed to the Regional Scrutiny Officer.
                  </div>
                </div>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => setTicketSubmitted(null)}
                >
                  New Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitInquiry} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Application ID (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. A-2621"
                      value={inquiryAppId}
                      onChange={e => setInquiryAppId(e.target.value)}
                      style={{ height: 32, fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label className="form-label">Query Subject</label>
                    <select
                      className="form-select select-sm"
                      value={inquiryCategory}
                      onChange={e => setInquiryCategory(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="SLA Clarification">SLA Clarification</option>
                      <option value="EVC Reschedule">EVC Inspection Schedule</option>
                      <option value="Document Rejection">Document Rejection Appeal</option>
                      <option value="Technical Glitch">Technical Support</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Inquiry Message</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    placeholder="Describe the regulatory clarification or system inquiry in detail…"
                    value={inquiryMessage}
                    onChange={e => setInquiryMessage(e.target.value)}
                    style={{ height: 'auto', padding: '8px 10px', fontSize: 12, resize: 'vertical' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                    <Send size={12} /> Submit Query to Bureau
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Contact Details & Official Addresses */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            fontSize: 11,
            color: 'var(--muted)',
            paddingTop: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <Phone size={13} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--text)' }}>Nodal Helpline</strong>
                <div>011-29581000 / 1050</div>
                <div>(09:30–17:30 IST)</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <Mail size={13} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--text)' }}>Official Email</strong>
                <div>helpdesk@aicte-india.org</div>
                <div>approval@aicte-india.org</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <MapPin size={13} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--text)' }}>HQ New Delhi</strong>
                <div>Nelson Mandela Marg,</div>
                <div>Vasant Kunj, ND-110070</div>
              </div>
            </div>
          </div>
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
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            AICTE Approval Process Handbook (APH) 2024–27
          </span>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Close Help Center
          </button>
        </div>
      </div>
    </div>
  );
};
