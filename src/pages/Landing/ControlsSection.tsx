import { CheckCircle2, Clock, ShieldAlert, Lock, UserCheck, Link as LinkIcon, FileCode2 } from 'lucide-react';

const controls = [
  {
    icon: UserCheck,
    title: 'Maker, checker and authority separation',
    desc: 'The Regional Officer acts as maker, a distinct Checker validates the package, and only an Approving Authority can finalize release. No single actor can approve their own request.'
  },
  {
    icon: Lock,
    title: 'Hold and refund-name blockers',
    desc: 'Active legal, vigilance, or dispute holds at either the instrument or institution level automatically lock workflow progression. Refund accounts must strictly match the institution trust master.'
  },
  {
    icon: ShieldAlert,
    title: 'No officer shortcut to E2',
    desc: 'AICTE officers cannot self-certify or manually promote an instrument to E2 bank-attested status. The upgrade requires direct, cryptographically authenticated response from the holding bank.'
  },
  {
    icon: LinkIcon,
    title: 'Hash-linked audit trail',
    desc: 'Every administrative decision, rule check, and status transition appends a SHA-256 hashed event chained to the previous entry, verifiable offline via Merkle root validation.'
  },
  {
    icon: FileCode2,
    title: '26-rule catalogue that says "Not testable"',
    desc: 'Rather than fabricating simulated 100% pass rates, rules requiring real bank SFTP feeds, live core-banking APIs, or judiciary registries explicitly report "Not testable" until production data exists.'
  }
];

export default function ControlsSection() {
  return (
    <section id="controls" className="landing-section" aria-labelledby="controls-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="eyebrow">
            <span className="landing-dot" aria-hidden="true" />
            GOVERNANCE & FRAUD PREVENTION
          </div>
          <h2 id="controls-heading" className="landing-section-title">
            Controls built into every transaction
          </h2>
          <p className="landing-section-subtitle">
            DHAAR replaces subjective discretion with verifiable gates. Workflows enforce segregation of duties, automated dispute blockers, and cryptographic audit proofs.
          </p>
        </div>

        <div className="landing-controls-grid">
          {/* Left Column: 5 Controls */}
          <div className="landing-controls-list">
            {controls.map((c) => (
              <div className="panel landing-control-card" key={c.title}>
                <div className="stat-icon teal">
                  <c.icon size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="landing-control-title">{c.title}</h3>
                  <p className="landing-control-desc">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Static Mock of the Real Release Gate Styling */}
          <div className="panel landing-gates-panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">RELEASE GATE PIPELINE</span>
                <h3 className="landing-card-title">Release Validation Gates</h3>
                <p>Standard 7-gate validation required prior to fund refund or NOC generation</p>
              </div>
              <span className="badge badge-amber">Gate Mock</span>
            </div>

            <div className="release-gates">
              {/* Gate 1 */}
              <div className="release-gate">
                <span className="gate-done" role="img" aria-label="Passed">
                  <CheckCircle2 size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>Evidence, term & Assured status</strong>
                  <p>E2/E3, joint lien present, completed tenure, no open findings, and fresh attestation.</p>
                </div>
                <span className="badge badge-green">Passed</span>
              </div>

              {/* Gate 2 */}
              <div className="release-gate">
                <span className="gate-done" role="img" aria-label="Passed">
                  <CheckCircle2 size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>Hold / dispute check</strong>
                  <p>Checked against active instrument- and institution-level hold registers; no active holds.</p>
                </div>
                <span className="badge badge-green">Passed</span>
              </div>

              {/* Gate 3 */}
              <div className="release-gate">
                <span className="gate-done" role="img" aria-label="Passed">
                  <CheckCircle2 size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>Refund account verification</strong>
                  <p>Masked account holder name verified against registered Trust title.</p>
                </div>
                <span className="badge badge-green">Passed</span>
              </div>

              {/* Gate 4 */}
              <div className="release-gate">
                <span className="gate-done" role="img" aria-label="Passed">
                  <CheckCircle2 size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>Maker / checker review</strong>
                  <p>Regional Officer completed maker scrutiny; independent Checker verified docket.</p>
                </div>
                <span className="badge badge-green">Passed</span>
              </div>

              {/* Gate 5 */}
              <div className="release-gate">
                <span className="gate-pending" role="img" aria-label="Pending">
                  <Clock size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>Competent authority approval</strong>
                  <p>Approving Authority authorization pending formal review of checker package.</p>
                </div>
                <span className="badge badge-amber">Pending</span>
              </div>

              {/* Gate 6 */}
              <div className="release-gate">
                <span className="gate-pending" role="img" aria-label="Pending">
                  <Clock size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>Bank acknowledgement</strong>
                  <p>Bank confirmation of lien removal and fund transfer instruction.</p>
                </div>
                <span className="badge">Pending</span>
              </div>

              {/* Gate 7 */}
              <div className="release-gate">
                <span className="gate-pending" role="img" aria-label="Pending">
                  <Clock size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>Refund reconciliation</strong>
                  <p>Final closure only after verified financial settlement confirmation.</p>
                </div>
                <span className="badge">Pending</span>
              </div>
            </div>

            <div className="panel-footnote">
              <span className="badge badge-teal">Immutable Gates</span>
              <span>All gates must pass before an NOC preview can be produced or refund reconciled.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
