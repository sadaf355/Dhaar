import { Database, Layers, Landmark, CalendarClock, BadgeCheck, Activity } from 'lucide-react';

const features = [
  {
    icon: Database,
    color: 'teal',
    title: 'Central registry',
    desc: 'One authoritative ledger of every AICTE security deposit across institutions, regions, and issuing banks with complete instrument history.'
  },
  {
    icon: Layers,
    color: 'green',
    title: 'Evidence ladder',
    desc: 'Structured four-tier verification framework (E0 Declared, E1 Reviewed, E2 Bank-attested, Assured) distinguishing reported numbers from proven cover.'
  },
  {
    icon: Landmark,
    color: 'blue',
    title: 'Bank confirmation desk',
    desc: 'Closed-loop, tokenized attestation desk allowing authorized bank branch officials to confirm joint lien creation and deposit balances directly.'
  },
  {
    icon: CalendarClock,
    color: 'amber',
    title: 'Maturity and renewal tracking',
    desc: 'Automated 120, 90, 60, and 30-day advance notice alerts with lineage tracking across successive deposit renewals.'
  },
  {
    icon: BadgeCheck,
    color: 'teal',
    title: 'Controlled release and refund',
    desc: 'Seven-gate validation pipeline enforcing maker-checker role separation, hold checks, and strict refund account name matching.'
  },
  {
    icon: Activity,
    color: 'green',
    title: 'Audit trail',
    desc: 'Cryptographically linked SHA-256 event log recording every submission, officer review, bank response, and authority approval.'
  }
];

export default function FeaturesSection() {
  return (
    <section className="landing-section landing-section-soft" aria-labelledby="features-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="eyebrow">
            <span className="landing-dot" aria-hidden="true" />
            CORE CAPABILITIES
          </div>
          <h2 id="features-heading" className="landing-section-title">
            What DHAAR does
          </h2>
          <p className="landing-section-subtitle">
            An operations platform engineered to ensure AICTE security deposits are verifiable, monitored across their full tenure, and released only through closed-loop controls.
          </p>
        </div>

        <div className="landing-features-grid">
          {features.map((item) => (
            <div className="panel landing-feature-card" key={item.title}>
              <div className={`stat-icon ${item.color}`}>
                <item.icon size={20} aria-hidden="true" />
              </div>
              <h3 className="landing-card-title">{item.title}</h3>
              <p className="landing-card-text">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
