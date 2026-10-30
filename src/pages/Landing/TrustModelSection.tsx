import { useState } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

type GradeKey = 'E0' | 'E1' | 'E2' | 'Assured';

interface GradeDetails {
  key: GradeKey;
  label: string;
  badgeTone: 'default' | 'blue' | 'green' | 'teal';
  meaning: string;
  grantAuthority: string;
  countsTowardCover: boolean;
  coverReason: string;
  dotClass: string;
}

const grades: Record<GradeKey, GradeDetails> = {
  E0: {
    key: 'E0',
    label: 'Declared',
    badgeTone: 'default',
    meaning: 'Deposit details submitted by the institution into the registry, with scanned documents attached. No external validation has occurred.',
    grantAuthority: 'Institution Admin upon initial submission',
    countsTowardCover: false,
    coverReason: 'Self-reported declarations do not provide assurance of fund existence or bank lien creation.',
    dotClass: 'grade-e0'
  },
  E1: {
    key: 'E1',
    label: 'Reviewed',
    badgeTone: 'blue',
    meaning: 'An AICTE Regional Officer has reviewed the uploaded deposit certificate, verified pre-flight checklist items, and confirmed consistency.',
    grantAuthority: 'AICTE Regional Officer / Scrutiny Checker',
    countsTowardCover: false,
    coverReason: 'Officer visual check verifies document presence, but cannot confirm if the bank has encumbered the funds.',
    dotClass: 'grade-e1'
  },
  E2: {
    key: 'E2',
    label: 'Bank-attested',
    badgeTone: 'green',
    meaning: 'The issuing bank branch has explicitly verified the deposit number, principal amount, maturity date, and existence of a joint lien.',
    grantAuthority: 'Issuing Bank Branch Verifier via secure confirmation desk',
    countsTowardCover: true,
    coverReason: 'Direct confirmation by the holding bank with joint lien establishes legally enforceable deposit cover.',
    dotClass: 'grade-e2'
  },
  Assured: {
    key: 'Assured',
    label: 'Assured Fresh',
    badgeTone: 'teal',
    meaning: 'The deposit holds an active E2 bank attestation that was confirmed or re-attested within the mandatory freshness window (e.g. 180 days).',
    grantAuthority: 'Periodic automated attestation lifecycle check backed by issuing bank response',
    countsTowardCover: true,
    coverReason: 'Validates that the deposit has not been liquidated, premature-closed, or encumbered by external third parties.',
    dotClass: 'grade-e3'
  }
};

export default function TrustModelSection() {
  const [selectedGrade, setSelectedGrade] = useState<GradeKey>('E2');
  const details = grades[selectedGrade];

  return (
    <section id="trust-model" className="landing-section landing-section-soft" aria-labelledby="trust-model-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="eyebrow">
            <span className="landing-dot" aria-hidden="true" />
            EVIDENCE LADDER ARCHITECTURE
          </div>
          <h2 id="trust-model-heading" className="landing-section-title">
            The DHAAR Trust Model
          </h2>
          <p className="landing-section-subtitle">
            DHAAR replaces binary trust with an explicit evidence grade. Every deposit is continuously classified based on its source of verification.
          </p>
        </div>

        {/* Rule Banner */}
        <div className="notice-banner amber-banner landing-rule-banner" role="note">
          <div className="notice-symbol">
            <AlertTriangle size={18} aria-hidden="true" />
          </div>
          <div>
            <strong>Core Verification Rule</strong>
            <p>
              Only E2 and above, with a joint lien and a fresh confirmation, counts as verified cover.
            </p>
          </div>
        </div>

        {/* Interactive Grade Selector Card */}
        <div className="panel landing-trust-panel">
          <div className="landing-trust-tabs" role="tablist" aria-label="Evidence Grades">
            {(Object.keys(grades) as GradeKey[]).map((key) => {
              const item = grades[key];
              const isSelected = selectedGrade === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls="grade-details-panel"
                  id={`tab-grade-${key}`}
                  className={`landing-trust-tab ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedGrade(key)}
                >
                  <span className={`grade-dot ${item.dotClass}`} aria-hidden="true" />
                  <strong>{key}</strong>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div
            id="grade-details-panel"
            role="tabpanel"
            aria-labelledby={`tab-grade-${selectedGrade}`}
            className="landing-trust-details"
          >
            <div className="landing-trust-details-head">
              <div className="landing-trust-title-row">
                <span className={`grade-dot ${details.dotClass}`} style={{ width: 10, height: 10 }} aria-hidden="true" />
                <h3 className="landing-trust-title">
                  {details.key} — {details.label}
                </h3>
              </div>
              <div>
                {details.countsTowardCover ? (
                  <span className="badge badge-green">Counts toward verified cover</span>
                ) : (
                  <span className="badge badge-red">Does not count toward verified cover</span>
                )}
              </div>
            </div>

            <div className="landing-trust-grid">
              <div className="landing-trust-cell">
                <span className="landing-trust-label">Meaning</span>
                <p className="landing-trust-value">{details.meaning}</p>
              </div>

              <div className="landing-trust-cell">
                <span className="landing-trust-label">Who can grant it</span>
                <p className="landing-trust-value">
                  <strong>{details.grantAuthority}</strong>
                </p>
              </div>

              <div className="landing-trust-cell full-width">
                <span className="landing-trust-label">Verified cover policy rationale</span>
                <p className="landing-trust-value">
                  {details.coverReason}
                </p>
              </div>
            </div>

            <div className="landing-trust-footnote">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                Verified-held calculations strictly exclude E0 and E1 instruments from institutional coverage metrics.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
