import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export default function RealityCheckSection() {
  return (
    <section className="landing-section" aria-labelledby="reality-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="eyebrow">
            <span className="landing-dot" aria-hidden="true" />
            PROTOTYPE TRANSPARENCY
          </div>
          <h2 id="reality-heading" className="landing-section-title">
            What is real and what is simulated
          </h2>
          <p className="landing-section-subtitle">
            DHAAR is an independent SIH 2026 prototype. We clearly delineate implemented local logic from integrations that require live government and banking systems.
          </p>
        </div>

        <div className="panel amber-banner landing-reality-panel">
          <div className="landing-reality-head">
            <div className="notice-symbol">
              <AlertTriangle size={20} aria-hidden="true" />
            </div>
            <div>
              <h3 className="landing-reality-title">Operational Honesty Notice</h3>
              <p className="landing-reality-desc">
                This prototype runs entirely in the browser using simulated state and seeded demonstration cohorts. No actual banks or official AICTE servers are contacted.
              </p>
            </div>
          </div>

          <div className="landing-reality-columns">
            {/* Column 1: Working in this prototype */}
            <div className="landing-reality-col working">
              <div className="landing-col-header">
                <span className="badge badge-green">Working in this prototype</span>
                <h4>Fully Implemented Logic</h4>
              </div>

              <ul className="checklist-list landing-reality-list">
                <li>
                  <span className="checked" aria-hidden="true">
                    <CheckCircle2 size={14} />
                  </span>
                  <div>
                    <strong>Evidence ladder state machine:</strong>
                    <span> E0 (Declared) to E1 (Reviewed), E2 (Bank-attested), and Assured freshness transitions.</span>
                  </div>
                </li>

                <li>
                  <span className="checked" aria-hidden="true">
                    <CheckCircle2 size={14} />
                  </span>
                  <div>
                    <strong>26-rule compliance engine:</strong>
                    <span> Deterministic checking of amounts, joint names, IFSC, dates, and honest 'Not testable' flags.</span>
                  </div>
                </li>

                <li>
                  <span className="checked" aria-hidden="true">
                    <CheckCircle2 size={14} />
                  </span>
                  <div>
                    <strong>SLA & maturity alerts:</strong>
                    <span> 120, 90, 60, and 30-day advance notice ladder tied to simulated platform date.</span>
                  </div>
                </li>

                <li>
                  <span className="checked" aria-hidden="true">
                    <CheckCircle2 size={14} />
                  </span>
                  <div>
                    <strong>Seven-gate release pipeline:</strong>
                    <span> Strict maker-checker role separation, hold blocking, and refund-account name verification.</span>
                  </div>
                </li>

                <li>
                  <span className="checked" aria-hidden="true">
                    <CheckCircle2 size={14} />
                  </span>
                  <div>
                    <strong>SHA-256 audit chain:</strong>
                    <span> Immutable hash-linked event logging with verifiable offline Merkle root proofs.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Column 2: Simulated or planned */}
            <div className="landing-reality-col simulated">
              <div className="landing-col-header">
                <span className="badge badge-amber">Simulated or planned</span>
                <h4>Production Dependencies</h4>
              </div>

              <ul className="checklist-list landing-reality-list">
                <li>
                  <span className="landing-pending-icon" aria-hidden="true">
                    <Clock size={14} />
                  </span>
                  <div>
                    <strong>Bank responses:</strong>
                    <span> Simulated via interactive public desk links; production requires SFTP or core banking APIs.</span>
                  </div>
                </li>

                <li>
                  <span className="landing-pending-icon" aria-hidden="true">
                    <Clock size={14} />
                  </span>
                  <div>
                    <strong>OCR & document forensics:</strong>
                    <span> Evaluated with realistic mock extraction fixtures; production requires ML document models.</span>
                  </div>
                </li>

                <li>
                  <span className="landing-pending-icon" aria-hidden="true">
                    <Clock size={14} />
                  </span>
                  <div>
                    <strong>Real authentication & SSO:</strong>
                    <span> Uses local demo role switcher; production requires Parichay / DigiLocker / Aadhaar e-Sign.</span>
                  </div>
                </li>

                <li>
                  <span className="landing-pending-icon" aria-hidden="true">
                    <Clock size={14} />
                  </span>
                  <div>
                    <strong>Bank / PFMS / NeSL integrations:</strong>
                    <span> Financial settlement and e-Stamping interfaces require formal government gateway integrations.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
