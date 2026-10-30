import { useState } from 'react';
import { Upload, CheckCircle2, Building, Eye, RefreshCw, ShieldCheck } from 'lucide-react';

const steps = [
  {
    num: 1,
    title: 'Submit',
    role: 'Institution Admin',
    icon: Upload,
    desc: 'Institution enters FDR details, uploads scanned receipt and indemnity bond, and records declared joint lien.'
  },
  {
    num: 2,
    title: 'Review',
    role: 'Regional Officer',
    icon: Eye,
    desc: 'Regional Officer reviews evidence against pre-flight consistency checks, verifying initial data before bank outreach.'
  },
  {
    num: 3,
    title: 'Bank confirms',
    role: 'Bank Verifier',
    icon: Building,
    desc: 'Issuing bank branch opens a secure attestation desk and explicitly confirms active lien, maturity, and unencumbered balance.'
  },
  {
    num: 4,
    title: 'Monitor',
    role: 'System & Officers',
    icon: CheckCircle2,
    desc: 'Automated SLA engine tracks time-bounded Assured freshness, flagging upcoming maturities and roll-over deadlines.'
  },
  {
    num: 5,
    title: 'Renew or release',
    role: 'Institution & Regional Officer',
    icon: RefreshCw,
    desc: 'Upon tenure completion or institutional update, renewal lineage is established or a formal release case is initiated.'
  },
  {
    num: 6,
    title: 'Close with bank acknowledgement',
    role: 'Approving Authority & Bank',
    icon: ShieldCheck,
    desc: 'Competent Authority approves gated release, bank acknowledges refund disposition, and case is formally reconciled.'
  }
];

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <section id="how-it-works" className="landing-section" aria-labelledby="how-it-works-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="eyebrow">
            <span className="landing-dot" aria-hidden="true" />
            LIFECYCLE WORKFLOW
          </div>
          <h2 id="how-it-works-heading" className="landing-section-title">
            How DHAAR works
          </h2>
          <p className="landing-section-subtitle">
            A six-stage operational workflow transitioning deposits from intake to independent bank confirmation, continuous monitoring, and closed-loop release.
          </p>
        </div>

        {/* 6-step Stepper Header */}
        <div className="panel landing-stepper-panel">
          <div className="wizard-steps landing-wizard-steps" role="tablist" aria-label="Workflow steps">
            {steps.map((s) => {
              const isCurrent = activeStep === s.num;
              const isComplete = activeStep > s.num;
              return (
                <button
                  key={s.num}
                  role="tab"
                  aria-selected={isCurrent}
                  aria-controls={`step-panel-${s.num}`}
                  id={`step-tab-${s.num}`}
                  className={`wizard-step ${isCurrent ? 'current' : isComplete ? 'complete' : ''}`}
                  onClick={() => setActiveStep(s.num)}
                >
                  <span className="step-number" aria-hidden="true">
                    {s.num}
                  </span>
                  <span>
                    <strong>{s.title}</strong>
                    <small>{s.role}</small>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Step Detail Card */}
          <div className="landing-stepper-detail">
            {steps.map((s) => {
              if (s.num !== activeStep) return null;
              const Icon = s.icon;
              return (
                <div
                  key={s.num}
                  id={`step-panel-${s.num}`}
                  role="tabpanel"
                  aria-labelledby={`step-tab-${s.num}`}
                  className="landing-step-content"
                >
                  <div className="landing-step-main">
                    <div className="stat-icon teal">
                      <Icon size={22} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="landing-step-tagline">
                        <span className="badge badge-teal">Step {s.num} of 6</span>
                        <span className="badge badge-amber">{s.role}</span>
                      </div>
                      <h3 className="landing-step-title">{s.title}</h3>
                      <p className="landing-step-desc">{s.desc}</p>
                    </div>
                  </div>

                  <div className="landing-step-nav">
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={activeStep === 1}
                      onClick={() => setActiveStep((prev) => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={activeStep === 6}
                      onClick={() => setActiveStep((prev) => Math.min(prev + 1, 6))}
                    >
                      Next step
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
