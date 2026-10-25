export type Region = 'North' | 'South' | 'East' | 'West';

export type Role = 'Bureau' | 'South' | 'North' | 'West' | 'East' | 'Committee';

export type TabType = 'ov' | 'ap' | 'evc' | 'un' | 'dc' | 'es' | 'lg';

export interface Institution {
  id: string;
  name: string;
  region: Region;
}

export interface Application {
  id: string;
  institution_id: string;
  route_type: string; // S, SE, ES, E, SES
  current_stage_index: number;
  age_in_days: number;
  evc_timeline_status: number;
  institution?: Institution;
}

export interface Undertaking {
  id: number;
  institution_id: string;
  condition_text: string;
  due_days: number;
  status: number; // 0=Pending, 1=Submitted, 2=Verified
  institution?: Institution;
}

export interface LeaseAndDocument {
  id: number;
  institution_id: string;
  document_type: string;
  expiry_days: number;
  status: number; // 0=Pending/Expired, 1=Submitted, 2=Renewed
  institution?: Institution;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  event_description: string;
}

export interface OverviewMetrics {
  open_applications: number;
  stage_overdue: number;
  evcs_due_soon: number;
  undertakings_at_risk: number;
  documents_expiring: number;
}

export interface AphRulesConfig {
  Scrutiny: number;
  EVC: number;
  'SAC/SHC': number;
}

// ─── Frontend-only types ────────────────────────────────────────────────────

/** Normalised internal app record used by all UI components */
export interface AppRecord {
  id: string;
  inst: string;
  reg: string;
  rt: string;
  i: number;
  age: number;
  evc: number;
}

/** Normalised internal undertaking record */
export interface UndertakingRecord {
  id: number;
  inst: string;
  reg: string;
  t: string;   // condition text
  d: number;   // days left (negative = overdue)
  s: number;   // 0 Pending 1 Submitted 2 Verified
}

/** Normalised internal document record */
export interface DocumentRecord {
  id: number;
  inst: string;
  reg: string;
  t: string;   // document type
  d: number;   // days to expiry (negative = expired)
  s: number;   // 0 Pending 1 Submitted 2 Renewed
}

/** Normalised audit log record */
export interface LogRecord {
  t: string;
  who: string;
  x: string;
}

/** Urgency item for "Needs attention today" panel */
export interface UrgencyItem {
  kind: 'Stage' | 'EVC' | 'Undertaking' | 'Document';
  stage?: string;
  inst: string;
  reg: string;
  d: number;   // days (negative = overdue)
  appId?: string;
  recordId?: number;
}

export type Theme = 'light' | 'dark';

export type NavPage = 'ov' | 'ap' | 'evc' | 'un' | 'dc' | 'es' | 'lg';

export type AlertLevel = 'L1' | 'L2' | 'L3' | 'none';

export type SeverityColor = 'critical' | 'warning' | 'success' | 'info' | 'neutral';
