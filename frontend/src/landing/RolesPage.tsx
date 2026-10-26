import {
  Shield, Building2, Users, FileSignature, ArrowRight, Check, Compass
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { navigateTo } from '../router';

interface RoleCard {
  id: string;
  roleValue: string;
  title: string;
  badge: string;
  scope: string;
  icon: React.ElementType;
  description: string;
  responsibilities: string[];
}

const ROLES: RoleCard[] = [
  {
    id: 'bureau',
    roleValue: 'Bureau',
    title: 'Central Bureau Officer',
    badge: 'National Scope',
    scope: 'All Regions (North, South, East, West)',
    icon: Shield,
    description: 'National regulatory oversight with administrative permissions to execute alert sweeps, configure statutory APH handbook limits, and export complete audit trails.',
    responsibilities: [
      'Unrestricted visibility across all 4 regulatory regions',
      'Execution of national statutory delay sweeps',
      'Configuring APH handbook timelines (Scrutiny, EVC, SAC)',
      'Escalation oversight for critical L3 overdue breaches',
    ],
  },
  {
    id: 'regional-north',
    roleValue: 'North',
    title: 'Regional Officer — North',
    badge: 'Regional Scope',
    scope: 'Northern Technical Institutions',
    icon: Building2,
    description: 'Scoped strictly to Northern region institutions. Handles regional scrutiny reviews, monitors local college SLA compliance, and acts on deficiency responses.',
    responsibilities: [
      'Filtered regional view for North jurisdiction',
      'Local scrutiny verification and stage progression',
      'Tracking regional undertakings (fire safety, land NOCs)',
      'Regional CSV export for council briefings',
    ],
  },
  {
    id: 'regional-south',
    roleValue: 'South',
    title: 'Regional Officer — South',
    badge: 'Regional Scope',
    scope: 'Southern Technical Institutions',
    icon: Building2,
    description: 'Dedicated regional portal for Southern engineering campuses and polytechnics. Prioritizes local scrutiny deadlines and monitors expert visits.',
    responsibilities: [
      'Filtered regional view for South jurisdiction',
      'Managing high-density institutional portfolios',
      'Direct coordination with regional inspection panels',
      'Document expiration monitoring for Southern colleges',
    ],
  },
  {
    id: 'committee',
    roleValue: 'Committee',
    title: 'Expert Committee (EVC / SAC)',
    badge: 'Panel Scope',
    scope: 'Active EVC & SAC/SHC Stages Only',
    icon: Users,
    description: 'Tailored persona for technical experts, university professors, and committee conveners assigned to conduct physical or virtual campus inspections.',
    responsibilities: [
      'Zero clutter: only sees applications in EVC and SAC stages',
      'Direct clearance actions for verified campuses',
      'Committee rescheduling within the 30-day statutory window',
      'Deficiency reporting directly to the Central Bureau',
    ],
  },
  {
    id: 'institution',
    roleValue: 'Bureau', // Maps to bureau overview with filtered demonstration
    title: 'Institution Representative',
    badge: 'Applicant Portal',
    scope: 'College Compliance Interface',
    icon: FileSignature,
    description: 'Applicant perspective for engineering colleges and polytechnics submitting compliance documents, lease renewals, and legal affidavits.',
    responsibilities: [
      'Tracking stage progression (Scrutiny → EVC → Approval)',
      'Uploading renewed certificates and registered lease deeds',
      'Viewing compliance deficiency flags in real time',
      'Submitting time-bound undertaking affidavits',
    ],
  },
];

export function RolesPage() {
  const { setRole } = useApp();

  const handleEnterRole = (roleValue: string) => {
    setRole(roleValue);
    navigateTo('/app/overview', { transition: true });
  };

  return (
    <div className="landing-subpage-container" role="main" aria-labelledby="roles-page-title">
      <div className="subpage-header">
        <div className="subpage-badge">
          <Compass size={12} aria-hidden="true" />
          <span>Role-Based Access Control</span>
        </div>
        <h1 id="roles-page-title" className="subpage-title">
          Regulatory personas tailored for every stakeholder
        </h1>
        <p className="subpage-lead">
          Role-based filtering automatically constrains data scope, available actions, and escalation alerts to each officer’s statutory mandate.
        </p>
      </div>

      <div className="roles-grid">
        {ROLES.map(role => {
          const Icon = role.icon;
          return (
            <article key={role.id} className="role-card-item">
              <div className="role-card-top">
                <div className="role-card-icon-wrap">
                  <Icon size={22} aria-hidden="true" />
                </div>
                <div className="role-card-badges">
                  <span className="role-scope-badge">{role.badge}</span>
                </div>
              </div>

              <div className="role-card-body">
                <h2 className="role-card-name">{role.title}</h2>
                <div className="role-card-jurisdiction">{role.scope}</div>
                <p className="role-card-desc">{role.description}</p>

                <div className="role-card-checklist">
                  <span className="checklist-heading">Key Capabilities</span>
                  {role.responsibilities.map((r, i) => (
                    <div key={i} className="checklist-item">
                      <Check size={14} className="check-icon" aria-hidden="true" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="role-card-footer">
                <button
                  className="role-enter-btn"
                  onClick={() => handleEnterRole(role.roleValue)}
                >
                  <span>Enter as {role.title}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
