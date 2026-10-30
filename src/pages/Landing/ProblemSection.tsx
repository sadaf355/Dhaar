import { FolderArchive, FileQuestion, ClockAlert } from 'lucide-react';

export default function ProblemSection() {
  return (
    <section id="problem" className="landing-section" aria-labelledby="problem-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="eyebrow">
            <span className="landing-dot" aria-hidden="true" />
            THE SYSTEMIC PROBLEM
          </div>
          <h2 id="problem-heading" className="landing-section-title">
            Why AICTE security deposit management needs verification
          </h2>
          <p className="landing-section-subtitle">
            Current regulatory oversight relies predominantly on self-declarations and physical fixed deposit receipts, creating structural exposure across regional operations.
          </p>
        </div>

        <div className="landing-problem-grid">
          {/* Card 1 */}
          <div className="panel landing-problem-card">
            <div className="stat-icon amber">
              <FolderArchive size={20} aria-hidden="true" />
            </div>
            <h3 className="landing-card-title">Scattered records</h3>
            <p className="landing-card-text">
              Physical fixed deposit receipts, decentralized regional branch registers, and siloed spreadsheets make it difficult to establish a single, verifiable institutional position across AICTE jurisdictions.
            </p>
            <div className="landing-problem-footer">
              <span className="badge badge-amber">Operational Silos</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="panel landing-problem-card">
            <div className="stat-icon red">
              <FileQuestion size={20} aria-hidden="true" />
            </div>
            <h3 className="landing-card-title">Declared is not proven</h3>
            <p className="landing-card-text">
              Uploading a scanned bank receipt proves what an institution declares, not what the issuing branch has recorded. Without active bank attestation, unencumbered funds or missing joint liens remain undetected.
            </p>
            <div className="landing-problem-footer">
              <span className="badge badge-red">Trust Gap</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="panel landing-problem-card">
            <div className="stat-icon blue">
              <ClockAlert size={20} aria-hidden="true" />
            </div>
            <h3 className="landing-card-title">Missed deadlines</h3>
            <p className="landing-card-text">
              Deposits mature or roll over automatically without structured pre-maturity workflows. Without proactive alerts, tracking required extensions, roll-over mandates, and eligible releases becomes reactive.
            </p>
            <div className="landing-problem-footer">
              <span className="badge badge-blue">Timeline Friction</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
