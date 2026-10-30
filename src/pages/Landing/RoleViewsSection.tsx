import { useState } from 'react';
import { Building2, UserCheck, Shield, Award, Landmark, FileSearch, CheckCircle2 } from 'lucide-react';

interface RoleProfile {
  id: string;
  roleName: string;
  icon: any;
  summary: string;
  points: { title: string; desc: string }[];
}

const roleProfiles: RoleProfile[] = [
  {
    id: 'institution-admin',
    roleName: 'Institution Admin',
    icon: Building2,
    summary: 'Restricted view for colleges and universities to manage security deposit declarations.',
    points: [
      {
        title: 'Submit instruments with file hashing',
        desc: 'Upload FDR receipts and indemnity bonds, calculating real SHA-256 digests and reviewing simulated OCR extractions.'
      },
      {
        title: 'Track institutional evidence status',
        desc: 'Monitor submission progress from E0 self-declaration through officer scrutiny and bank confirmation.'
      },
      {
        title: 'Initiate renewal or refund',
        desc: 'Submit timely renewal extensions or initiate structured refund requests when the required tenure expires.'
      }
    ]
  },
  {
    id: 'regional-officer',
    roleName: 'Regional Officer',
    icon: UserCheck,
    summary: 'Regional AICTE operations lead managing intake scrutiny and bank outreach.',
    points: [
      {
        title: 'Perform evidence workbench scrutiny',
        desc: 'Examine extracted metadata against declared fields, run the 26-rule engine, and promote valid dockets to E1 Reviewed.'
      },
      {
        title: 'Issue bank attestation requests',
        desc: 'Dispatch secure, tokenized confirmation requests to the holding bank branch when instrument details align.'
      },
      {
        title: 'Act as release maker and set holds',
        desc: 'Initiate formal release cases as the responsible maker and register operational or complaint holds when required.'
      }
    ]
  },
  {
    id: 'checker',
    roleName: 'Checker',
    icon: Shield,
    summary: 'Independent quality assurance ensuring segregation of duties prior to executive approval.',
    points: [
      {
        title: 'Independent maker-checker validation',
        desc: 'Scrutinize dockets submitted by Regional Officers, verifying that pre-flight checks and evidence match policy.'
      },
      {
        title: 'Review bank attestation responses',
        desc: 'Confirm that bank responses confirm unencumbered status and active joint lien before advancing release cases.'
      },
      {
        title: 'Enforce workflow separation',
        desc: 'Prohibit self-approval: check that maker, checker, and eventual approver are strictly separate user identities.'
      }
    ]
  },
  {
    id: 'approving-authority',
    roleName: 'Approving Authority',
    icon: Award,
    summary: 'Senior regulatory authority authorized to sanction releases and manage dispute holds.',
    points: [
      {
        title: 'Sanction gated releases',
        desc: 'Review completed maker-checker packages, confirm all 7 release gates pass, and grant competent authority approval.'
      },
      {
        title: 'Manage institution & instrument holds',
        desc: 'Sole role authorized to release formal holds on institutions facing complaints, litigation, or regulatory inquiries.'
      },
      {
        title: 'Oversee compliance & SLA dashboard',
        desc: 'Track aggregate verified cover across regions, identifying maturity cliffs and institutions with pending renewals.'
      }
    ]
  },
  {
    id: 'bank-verifier',
    roleName: 'Bank Verifier',
    icon: Landmark,
    summary: 'External branch official interface for authenticating security deposits.',
    points: [
      {
        title: 'Direct tokenized verification desk',
        desc: 'Access secure, non-authenticated public desk links specific to requested FDRs without requiring AICTE credentials.'
      },
      {
        title: 'Confirm or dispute FDR lien status',
        desc: 'Attest to principal amount, maturity date, and existence of a valid joint lien in favour of AICTE.'
      },
      {
        title: 'Acknowledge release & fund disposition',
        desc: 'Simulate final branch acknowledgement and transfer instructions upon authorized refund completion.'
      }
    ]
  },
  {
    id: 'auditor',
    roleName: 'Auditor',
    icon: FileSearch,
    summary: 'Read-only governance role verifying platform integrity and cryptographic proofs.',
    points: [
      {
        title: 'Inspect SHA-256 chained event log',
        desc: 'Trace every status change, rule evaluation, and administrative touchpoint with immutable actor attribution.'
      },
      {
        title: 'Verify offline Merkle proofs',
        desc: 'Extract verifiable cryptographic receipts and independently confirm root integrity using standard tools.'
      },
      {
        title: 'Export compliance & empirical reports',
        desc: 'Generate comprehensive CSV and PDF operational dossiers across portfolio holdings without edit permissions.'
      }
    ]
  }
];

export default function RoleViewsSection() {
  const [activeRoleId, setActiveRoleId] = useState('institution-admin');
  const activeRole = roleProfiles.find((r) => r.id === activeRoleId) || roleProfiles[0];

  return (
    <section className="landing-section landing-section-soft" aria-labelledby="roles-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="eyebrow">
            <span className="landing-dot" aria-hidden="true" />
            STAKEHOLDER PERSPECTIVES
          </div>
          <h2 id="roles-heading" className="landing-section-title">
            Tailored workspaces for every role
          </h2>
          <p className="landing-section-subtitle">
            DHAAR adapts its interface and access controls to each stakeholder's responsibilities, strictly enforcing segregation of duties.
          </p>
        </div>

        <div className="landing-roles-layout">
          {/* Role Navigation Tabs */}
          <div className="landing-roles-nav" role="tablist" aria-label="Role workspaces">
            {roleProfiles.map((role) => {
              const isSelected = role.id === activeRoleId;
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`role-panel-${role.id}`}
                  id={`role-tab-${role.id}`}
                  className={`landing-role-tab ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveRoleId(role.id)}
                >
                  <span className="landing-role-tab-icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span>{role.roleName}</span>
                </button>
              );
            })}
          </div>

          {/* Active Role Card */}
          <div
            id={`role-panel-${activeRole.id}`}
            role="tabpanel"
            aria-labelledby={`role-tab-${activeRole.id}`}
            className="panel landing-role-panel"
          >
            <div className="landing-role-header">
              <div className="stat-icon teal">
                <activeRole.icon size={22} aria-hidden="true" />
              </div>
              <div>
                <h3 className="landing-role-title">{activeRole.roleName} Workspace</h3>
                <p className="landing-role-summary">{activeRole.summary}</p>
              </div>
            </div>

            <div className="landing-role-points">
              {activeRole.points.map((pt, idx) => (
                <div className="landing-role-point" key={pt.title}>
                  <div className="landing-point-number" aria-hidden="true">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="landing-point-title">{pt.title}</h4>
                    <p className="landing-point-desc">{pt.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="landing-role-footer">
              <span className="badge badge-teal">Enforced in Demo</span>
              <span>Switch roles anytime using the workspace header selector inside the demo.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
