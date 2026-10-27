import type { Application, Undertaking, LeaseAndDocument, AuditLog, OverviewMetrics, Role, AphRulesConfig } from './types';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? window.location.origin
    : 'http://127.0.0.1:8000');

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data = await res.json();
      if (data?.status === 'healthy' || data?.status === 'ok') return true;
    }
    const fallback = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    const fbType = fallback.headers.get('content-type') || '';
    if (fallback.ok && fbType.includes('application/json')) {
      const data = await fallback.json();
      return data?.status === 'healthy' || data?.status === 'ok';
    }
    return false;
  } catch {
    // If proxied path failed, try direct backend port as fallback ONLY when running on http/localhost
    if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
      try {
        const direct = await fetch('http://127.0.0.1:8000/api/health', { signal: AbortSignal.timeout(2000) });
        const dirType = direct.headers.get('content-type') || '';
        if (direct.ok && dirType.includes('application/json')) {
          const data = await direct.json();
          return data?.status === 'healthy' || data?.status === 'ok';
        }
        return false;
      } catch {
        return false;
      }
    }
    return false;
  }
}
export const checkHealth = checkBackendHealth;

export async function getLiveStatus(): Promise<{ status: string; version: number; timestamp: string; last_event: string; total_applications: number }> {
  const res = await fetch(`${API_BASE}/api/live/status`, { signal: AbortSignal.timeout(3000) });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.includes('application/json')) throw new Error('Live status unavailable or invalid format');
  return res.json();
}

export async function triggerSimulatedBackendEvent(): Promise<{ status: string; event: string; version: number; app_id?: string; record_id?: string }> {
  const res = await fetch(`${API_BASE}/api/triggers/simulated-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.includes('application/json')) throw new Error('Failed to trigger simulated event');
  return res.json();
}

export async function fetchOverviewMetrics(role?: Role | string): Promise<OverviewMetrics> {
  const url = new URL(`${API_BASE}/api/overview-metrics`);
  if (role) url.searchParams.append('role', role);
  const res = await fetch(url.toString());
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.includes('application/json')) throw new Error('Failed to fetch overview metrics');
  return res.json();
}
export const getOverviewMetrics = fetchOverviewMetrics;

type RoleOrParams = Role | string | { role?: string; region?: string };

export async function fetchApplications(roleOrParams?: RoleOrParams, regionParam?: string): Promise<Application[]> {
  const url = new URL(`${API_BASE}/api/applications`);
  if (typeof roleOrParams === 'object' && roleOrParams !== null) {
    if (roleOrParams.role) url.searchParams.append('role', roleOrParams.role);
    if (roleOrParams.region) url.searchParams.append('region', roleOrParams.region);
  } else if (typeof roleOrParams === 'string') {
    url.searchParams.append('role', roleOrParams);
    if (regionParam) url.searchParams.append('region', regionParam);
  } else if (regionParam) {
    url.searchParams.append('region', regionParam);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
}
export const getApplications = fetchApplications;

export async function advanceApplication(appId: string, actor: string = 'Bureau officer'): Promise<Application> {
  const res = await fetch(`${API_BASE}/api/applications/${appId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to advance application');
  return res.json();
}

export async function revertApplication(appId: string, reason: string = 'Deficiency', actor: string = 'Bureau officer'): Promise<Application> {
  const res = await fetch(`${API_BASE}/api/applications/${appId}/revert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, actor }),
  });
  if (!res.ok) throw new Error('Failed to revert application');
  return res.json();
}
export const returnApplication = revertApplication;

export async function rescheduleEVC(appId: string, evcDays: number, actor: string = 'Bureau officer'): Promise<Application> {
  const res = await fetch(`${API_BASE}/api/applications/${appId}/reschedule-evc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evc_days: evcDays, actor }),
  });
  if (!res.ok) throw new Error('Failed to reschedule EVC inspection');
  return res.json();
}


export async function fetchUndertakings(roleOrParams?: RoleOrParams): Promise<Undertaking[]> {
  const url = new URL(`${API_BASE}/api/undertakings`);
  if (typeof roleOrParams === 'object' && roleOrParams !== null) {
    if (roleOrParams.role) url.searchParams.append('role', roleOrParams.role);
    if (roleOrParams.region) url.searchParams.append('region', roleOrParams.region);
  } else if (typeof roleOrParams === 'string') {
    url.searchParams.append('role', roleOrParams);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch undertakings');
  return res.json();
}
export const getUndertakings = fetchUndertakings;

export async function uploadUndertaking(id: number, actor: string = 'Institution'): Promise<Undertaking> {
  const res = await fetch(`${API_BASE}/api/undertakings/${id}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to upload undertaking evidence');
  return res.json();
}

export async function verifyUndertaking(id: number, actor: string = 'Bureau officer'): Promise<Undertaking> {
  const res = await fetch(`${API_BASE}/api/undertakings/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to verify undertaking');
  return res.json();
}

export async function batchActionUndertakings(
  itemIds: number[],
  actionType: 'upload' | 'verify',
  actor: string = 'Bureau officer'
): Promise<{ status: string; processed_count: number }> {
  const res = await fetch(`${API_BASE}/api/undertakings/batch-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_ids: itemIds, action_type: actionType, actor }),
  });
  if (!res.ok) throw new Error('Failed to process batch undertakings');
  return res.json();
}


export async function actionUndertaking(id: number, actor: string = 'Bureau officer'): Promise<Undertaking> {
  const res = await fetch(`${API_BASE}/api/undertakings/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to update undertaking');
  return res.json();
}

export async function fetchLeasesAndDocuments(roleOrParams?: RoleOrParams): Promise<LeaseAndDocument[]> {
  const url = new URL(`${API_BASE}/api/documents`);
  if (typeof roleOrParams === 'object' && roleOrParams !== null) {
    if (roleOrParams.role) url.searchParams.append('role', roleOrParams.role);
    if (roleOrParams.region) url.searchParams.append('region', roleOrParams.region);
  } else if (typeof roleOrParams === 'string') {
    url.searchParams.append('role', roleOrParams);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}
export const getLeasesAndDocuments = fetchLeasesAndDocuments;

export async function uploadDocument(id: number, actor: string = 'Institution'): Promise<LeaseAndDocument> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to upload document');
  return res.json();
}

export async function verifyDocument(id: number, actor: string = 'Bureau officer'): Promise<LeaseAndDocument> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to verify and renew document');
  return res.json();
}

export async function actionLeaseAndDocument(id: number, actor: string = 'Bureau officer'): Promise<LeaseAndDocument> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to update document');
  return res.json();
}
export const actionDocument = actionLeaseAndDocument;

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/api/audit-logs`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}
export const getAuditLogs = fetchAuditLogs;

export async function runAlertSweep(actor: string = 'Bureau officer'): Promise<{ status: string; alerts_count: number; alerts: any[] }> {
  const res = await fetch(`${API_BASE}/api/triggers/alert-sweep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to execute alert sweep');
  return res.json();
}

export async function resetDatabase(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/seed?force=true`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset and seed database');
}

export async function getAphRules(): Promise<AphRulesConfig> {
  const res = await fetch(`${API_BASE}/api/config/aph-rules`);
  if (!res.ok) throw new Error('Failed to fetch APH rules');
  return res.json();
}

export async function updateAphRules(rules: AphRulesConfig, actor: string = 'Bureau officer'): Promise<AphRulesConfig> {
  const res = await fetch(`${API_BASE}/api/config/aph-rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Scrutiny: rules.Scrutiny,
      EVC: rules.EVC,
      'SAC/SHC': rules['SAC/SHC'],
      actor,
    }),
  });
  if (!res.ok) throw new Error('Failed to update APH rules');
  return res.json();
}

export async function downloadPendencyReportCsv(role?: string, region?: string): Promise<void> {
  const url = new URL(`${API_BASE}/api/reports/pendency-csv`);
  if (role && role !== 'Bureau') url.searchParams.append('role', role);
  if (region) url.searchParams.append('region', region);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to download pendency CSV');
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `AICTE_Pendency_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

// ----------------- Applicant Profile & Authentication -----------------
export interface ApplicantProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  institution_name: string;
  institution_id?: string;
  region: 'North' | 'South' | 'East' | 'West';
  route_type: string;
  role: string;
  application_id?: string;
  created_at: string;
}

export interface AuthResult {
  status: string;
  message: string;
  token: string;
  applicant: ApplicantProfile;
}

export interface ApplicantRegisterPayload {
  name: string;
  email: string;
  password: string;
  institution_name: string;
  region: 'North' | 'South' | 'East' | 'West';
  route_type: string;
  phone?: string;
  role?: string;
}

export interface ApplicantLoginPayload {
  email: string;
  password: string;
}

// Built-in demo applicants — always available without a backend (Vercel / static deployments)
const DEMO_APPLICANTS: Record<string, { profile: ApplicantProfile; password: string }> = {
  'ramesh@nandi.edu.in': {
    password: 'Admin@123',
    profile: {
      id: 2611,
      name: 'Dr. Ramesh Sharma',
      email: 'ramesh@nandi.edu.in',
      institution_name: 'Nandi Institute of Technology',
      institution_id: 'INST-2611',
      region: 'South',
      route_type: 'SE',
      role: 'Institution',
      application_id: 'A-2611',
      created_at: '25 Oct · 09:15',
    },
  },
  'priya@himalaya.edu.in': {
    password: 'Admin@123',
    profile: {
      id: 2613,
      name: 'Prof. Priya Nair',
      email: 'priya@himalaya.edu.in',
      institution_name: 'Himalaya Polytechnic',
      institution_id: 'INST-2613',
      region: 'North',
      route_type: 'ES',
      role: 'Institution',
      application_id: 'A-2613',
      created_at: '25 Oct · 10:30',
    },
  },
  'bureau@aicte.gov.in': {
    password: 'Admin@123',
    profile: {
      id: 1,
      name: 'Bureau Officer',
      email: 'bureau@aicte.gov.in',
      institution_name: 'AICTE Central Bureau',
      institution_id: undefined,
      region: 'North',
      route_type: 'SES',
      role: 'Bureau',
      application_id: undefined,
      created_at: '25 Oct · 08:00',
    },
  },
};

function getCachedApplicants(): ApplicantProfile[] {
  try {
    const stored = localStorage.getItem('aicte_cached_applicants');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCachedApplicant(applicant: ApplicantProfile) {
  try {
    const list = getCachedApplicants();
    const filtered = list.filter(a => a.email.toLowerCase() !== applicant.email.toLowerCase());
    localStorage.setItem('aicte_cached_applicants', JSON.stringify([applicant, ...filtered]));
  } catch {
    /* ignore */
  }
}

/** Look up an email in demo applicants list (case-insensitive). */
function findDemoApplicant(email: string, password?: string) {
  const entry = DEMO_APPLICANTS[email.toLowerCase().trim()];
  if (!entry) return null;
  if (password !== undefined && entry.password !== password) return null;
  return entry.profile;
}

export async function registerApplicant(payload: ApplicantRegisterPayload): Promise<AuthResult> {
  const url = `${API_BASE}/api/auth/register`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data: AuthResult = await res.json();
      saveCachedApplicant(data.applicant);
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.detail || 'Registration failed on server');
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('network')) {
      throw err;
    }
    // Fallback if backend server is starting up or in purely static deployment
    const mockApplicant: ApplicantProfile = {
      id: Math.floor(Math.random() * 9000) + 1000,
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone?.trim(),
      institution_name: payload.institution_name.trim(),
      institution_id: `INST-${Math.floor(Math.random() * 800) + 2630}`,
      region: payload.region,
      route_type: payload.route_type,
      role: payload.role || 'Institution',
      application_id: `A-${Math.floor(Math.random() * 800) + 2630}`,
      created_at: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    };
    saveCachedApplicant(mockApplicant);
    return {
      status: 'success',
      message: 'Registered successfully (client mode).',
      token: `aicte_token_${Date.now()}`,
      applicant: mockApplicant,
    };
  }
}

export async function loginApplicant(payload: ApplicantLoginPayload): Promise<AuthResult> {
  const url = `${API_BASE}/api/auth/login`;
  const emailKey = payload.email.toLowerCase().trim();

  // ── Try live backend first ────────────────────────────────────────────────
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data: AuthResult = await res.json();
      saveCachedApplicant(data.applicant);
      return data;
    }
    // Server reachable but returned an error (e.g. 401) — fall through to offline checks
  } catch {
    // Network / CORS / timeout — fall through to offline checks
  }

  // ── Offline fallback 1: built-in demo accounts ───────────────────────────
  const demoProfile = findDemoApplicant(emailKey, payload.password);
  if (demoProfile) {
    saveCachedApplicant(demoProfile);
    return {
      status: 'success',
      message: `Welcome back, ${demoProfile.name}!`,
      token: `aicte_token_demo_${Date.now()}`,
      applicant: demoProfile,
    };
  }

  // ── Offline fallback 2: previously registered applicants in localStorage ──
  const cached = getCachedApplicants();
  const found = cached.find(a => a.email.toLowerCase() === emailKey);
  if (found) {
    return {
      status: 'success',
      message: `Welcome back, ${found.name}!`,
      token: `aicte_token_${Date.now()}`,
      applicant: found,
    };
  }

  // ── No match anywhere ─────────────────────────────────────────────────────
  // If the email exists as a demo account but password was wrong, give a clear hint
  if (DEMO_APPLICANTS[emailKey]) {
    throw new Error('Incorrect password for this demo account. Try Admin@123.');
  }
  throw new Error('Invalid email or password. Try the demo credentials (ramesh@nandi.edu.in / Admin@123) or register a new account.');
}

export async function fetchApplicants(): Promise<ApplicantProfile[]> {
  try {
    const res = await fetch(`${API_BASE}/api/applicants`, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    /* fallback to cached */
  }
  return getCachedApplicants();
}

export default {
  getApplications,
  fetchApplications,
  advanceApplication,
  revertApplication,
  returnApplication,
  rescheduleEVC,
  getUndertakings,
  fetchUndertakings,
  uploadUndertaking,
  verifyUndertaking,
  batchActionUndertakings,
  actionUndertaking,
  getLeasesAndDocuments,
  fetchLeasesAndDocuments,
  uploadDocument,
  verifyDocument,
  actionDocument,
  actionLeaseAndDocument,
  getAuditLogs,
  fetchAuditLogs,
  runAlertSweep,
  getOverviewMetrics,
  fetchOverviewMetrics,
  checkHealth,
  checkBackendHealth,
  getLiveStatus,
  triggerSimulatedBackendEvent,
  resetDatabase,
  getAphRules,
  updateAphRules,
  downloadPendencyReportCsv,
  registerApplicant,
  loginApplicant,
  fetchApplicants,
};



