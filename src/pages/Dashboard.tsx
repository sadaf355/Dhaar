import { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CircleAlert,
  Clock3,
  FileCheck2,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Database,
  Layers,
  Activity,
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDhaarStore } from '../context/useDhaarStore';
import { DEMO_USERS } from '../data/users';
import { money, shortMoney } from '../lib/format';
import Badge from '../components/Badge';
import { isVerifiedHeld, verifiedHeldValue, daysToMaturity } from '../lib/calculations';
import { computeEmpiricalMeasures } from '../lib/empiricalMetrics';

export default function Dashboard() {
  const { t } = useTranslation();
  const allDeposits = useDhaarStore(s => s.deposits);
  const currentUserId = useDhaarStore(s => s.currentUserId);
  const currentUser = DEMO_USERS.find(u => u.id === currentUserId);
  const isCohortLoaded = useDhaarStore(s => s.isCohortLoaded);
  const cohortMeta = useDhaarStore(s => s.cohortMeta);
  const loadCohort = useDhaarStore(s => s.loadCohort);
  const unloadCohort = useDhaarStore(s => s.unloadCohort);

  const deposits = useMemo(() => {
    if (currentUser?.role === 'Institution Admin' && currentUser.institutionCode) {
      return allDeposits.filter(d => d.institutionCode === currentUser.institutionCode);
    }
    return allDeposits;
  }, [allDeposits, currentUser]);

  const events = useDhaarStore(s => s.events);
  const simulatedDate = useDhaarStore(s => s.simulatedDate);
  const total = deposits.reduce((a, d) => a + d.amount, 0);
  const verified = deposits.filter(d => isVerifiedHeld(d, simulatedDate, deposits));
  const held = verifiedHeldValue(deposits, simulatedDate);
  const attention = deposits.filter(d => d.status === 'Attention required' || d.status === 'Under review').length;
  const near = deposits.filter(d => {
    const days = daysToMaturity(d.maturityDate, simulatedDate);
    return days >= 0 && days <= 120;
  }).length;

  const empirical = useMemo(() => {
    return computeEmpiricalMeasures(allDeposits, events, simulatedDate);
  }, [allDeposits, events, simulatedDate]);

  const stats = [
    {
      label: t('dashboard.totalSecured') || 'Total declared deposits',
      value: shortMoney(total),
      meta: `${deposits.length.toLocaleString('en-IN')} instruments tracked`,
      icon: Banknote,
      color: 'teal',
      change: 'Calculated',
      up: true
    },
    {
      label: t('dashboard.verifiedHeld') || 'Verified held value',
      value: shortMoney(held),
      meta: `${verified.length.toLocaleString('en-IN')} eligible instruments`,
      icon: ShieldCheck,
      color: 'green',
      change: 'Freshness checked',
      up: true
    },
    {
      label: t('dashboard.attentionRequired') || 'Cases needing action',
      value: String(attention),
      meta: 'Require officer review',
      icon: CircleAlert,
      color: 'amber',
      change: 'Open workflow',
      up: false
    },
    {
      label: 'Maturities in 120 days',
      value: String(near),
      meta: 'Plan renewal or release',
      icon: CalendarClock,
      color: 'blue',
      change: `As of ${simulatedDate}`,
      up: false
    }
  ];

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <Sparkles size={14} /> SECURITY DEPOSIT INTELLIGENCE
          </div>
          <h1>
            Good morning, {currentUser ? currentUser.name : 'Administrator'} <span className="wave">✦</span>
          </h1>
          <p className="page-subtitle">
            {t('dashboard.subtitle') || 'Your security deposit position, evidence quality, and next actions — in one place.'}
          </p>
        </div>
        <div className="heading-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isCohortLoaded ? (
            <button className="btn btn-secondary" onClick={unloadCohort} title="Revert to small default seed">
              <RotateCcw size={15} /> {t('dashboard.unloadCohort') || 'Revert to Small Seed'}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => loadCohort()} title="Load 1,800 synthetic instruments & 1,000 institutions">
              <Database size={15} /> {t('dashboard.loadCohort') || 'Load Synthetic Cohort (1.8k)'}
            </button>
          )}
          <Link className="btn btn-primary" to="/submit">
            <Plus size={17} /> Submit instrument
          </Link>
        </div>
      </section>

      {/* Cohort Notification Banner */}
      {isCohortLoaded && (
        <div className="notice-banner" style={{ background: 'var(--surface-accent-subtle, #f0fdf4)', borderColor: '#86efac' }}>
          <div className="notice-symbol" style={{ color: '#16a34a' }}>
            <Layers size={20} />
          </div>
          <div>
            <strong>Synthetic Scale Cohort Loaded ({cohortMeta?.instrumentsCount.toLocaleString('en-IN')} Instruments)</strong>
            <p>
              Simulating 1,000 institutions and 1,800 instruments across 8 regions and 20 banks, with 12 labelled fault classes.
              Benchmark the rule engine in a Web Worker on the <Link to="/demo-qa" style={{ textDecoration: 'underline' }}>Demo QA & Benchmark</Link> page.
            </p>
          </div>
          <span className="badge badge-green">1.8k SCALE DEMO</span>
        </div>
      )}

      <div className="notice-banner">
        <div className="notice-symbol">
          <ShieldCheck size={19} />
        </div>
        <div>
          <strong>Evidence-first assurance</strong>
          <p>
            Only bank-attested instruments with valid lien and date checks count toward verified held value. This prototype uses simulated data.
          </p>
        </div>
        <span className="notice-tag">CONTROL ACTIVE</span>
      </div>

      {/* Top Level Metric Cards */}
      <section className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <div className={`stat-icon ${s.color}`}>
                <s.icon size={18} />
              </div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-bottom">
              <span>{s.meta}</span>
              <span className={`stat-change ${s.up ? 'positive' : 'neutral'}`}>
                {s.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {s.change}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Empirical Operational Measures Derived from Event Log */}
      <section className="panel" style={{ padding: '16px 20px' }}>
        <div className="panel-head" style={{ marginBottom: '14px' }}>
          <div>
            <div className="eyebrow">TELEMETRY & MEASURES</div>
            <h2 style={{ fontSize: '1.05rem', margin: '0' }}>Empirical Process Measures (Derived from Event Log)</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
              Timestamped measures computed from simulated audit trail events rather than static claims.
            </p>
          </div>
          <Link to="/impact" className="btn btn-ghost btn-sm">
            View Impact & Assumptions <ArrowRight size={14} />
          </Link>
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div className="stat-card" style={{ padding: '12px 14px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Avg Turnaround to E2</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '4px 0' }}>
              {empirical.turnaroundDaysAverage} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>days</span>
            </div>
            <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Median: {empirical.turnaroundDaysMedian}d ({empirical.turnaroundSampleCount} samples)
            </small>
          </div>
          <div className="stat-card" style={{ padding: '12px 14px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Advance Notice at 1st Alert</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '4px 0' }}>
              {empirical.advanceNoticeDaysAverage} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>days</span>
            </div>
            <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Before maturity across active ladder
            </small>
          </div>
          <div className="stat-card" style={{ padding: '12px 14px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lineage Coverage Gap Rate</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '4px 0' }}>
              {empirical.coverageGapRatePercent}%
            </div>
            <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Across renewal predecessors
            </small>
          </div>
          <div className="stat-card" style={{ padding: '12px 14px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Officer Touches Per Case</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '4px 0' }}>
              {empirical.officerTouchesPerCase} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>actions</span>
            </div>
            <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              RO, Checker & Authority events
            </small>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel overview-panel">
          <div className="panel-head">
            <div>
              <h2>Evidence portfolio</h2>
              <p>Instrument quality across your current registry</p>
            </div>
            <Link to="/registry" className="text-link">
              View registry <ArrowRight size={14} />
            </Link>
          </div>
          <div className="portfolio-total">
            <div>
              <span>Declared portfolio value</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="portfolio-chip">
              <TrendingUp size={15} /> Live demo data
            </div>
          </div>
          <div className="evidence-bars">
            {(['E0', 'E1', 'E2', 'E3'] as const).map((g, i) => {
              const count = deposits.filter(d => d.grade === g).length;
              const pct = deposits.length ? (count / deposits.length) * 100 : 0;
              return (
                <div className="evidence-row" key={g}>
                  <div className="evidence-label">
                    <span className={`grade-dot grade-${g.toLowerCase()}`} />
                    <strong>{g}</strong>
                    <span>{['Declared', 'Document checked', 'Bank attested', 'System verified'][i]}</span>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill fill-${g.toLowerCase()}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="evidence-count">{count.toLocaleString('en-IN')}</div>
                </div>
              );
            })}
          </div>
          <div className="panel-footnote">
            <Badge tone="teal">Assured is time-dependent</Badge>
            <span>Evidence grades do not replace eligibility and freshness checks.</span>
          </div>
        </section>

        <section className="panel actions-panel">
          <div className="panel-head">
            <div>
              <h2>Priority actions</h2>
              <p>Items to review next</p>
            </div>
            <span className="count-bubble">{attention}</span>
          </div>
          {deposits
            .filter(d => d.finding || d.status === 'Matured')
            .slice(0, 3)
            .map(d => (
              <div className="action-item" key={d.id}>
                <div className={`action-icon ${d.status === 'Matured' ? 'red' : 'amber'}`}>
                  {d.status === 'Matured' ? <Clock3 size={17} /> : <CircleAlert size={17} />}
                </div>
                <div className="action-copy">
                  <strong>{d.finding || 'Maturity review required'}</strong>
                  <span>
                    {d.id} · {d.institution}
                  </span>
                </div>
                <Link to="/verification" className="action-arrow">
                  <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          {attention === 0 && <div className="empty-inline">No priority actions in this demo.</div>}
          <Link to="/verification" className="btn btn-secondary btn-wide">
            Open verification queue <ArrowRight size={15} />
          </Link>
        </section>
      </div>

      <div className="bottom-grid">
        <section className="panel table-panel">
          <div className="panel-head">
            <div>
              <h2>Recently updated instruments</h2>
              <p>Latest submissions and evidence changes</p>
            </div>
            <Link to="/registry" className="text-link">
              See all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Instrument</th>
                  <th>Institution</th>
                  <th>Amount</th>
                  <th>Evidence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deposits.slice(0, 5).map(d => (
                  <tr key={d.id}>
                    <td>
                      <strong className="instrument-id">{d.id}</strong>
                      <small>{d.fdrNo}</small>
                    </td>
                    <td>{d.institution}</td>
                    <td className="amount-cell">{money(d.amount)}</td>
                    <td>
                      <Badge tone={d.grade === 'E2' || d.grade === 'E3' ? 'green' : d.grade === 'E1' ? 'blue' : 'neutral'}>
                        {d.grade}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        tone={
                          d.status === 'Active'
                            ? 'green'
                            : d.status === 'Released'
                            ? 'teal'
                            : d.status === 'Matured'
                            ? 'red'
                            : d.status === 'Under review'
                            ? 'blue'
                            : 'amber'
                        }
                      >
                        {d.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-head">
            <div>
              <h2>Activity stream</h2>
              <p>Recent actions in the workspace</p>
            </div>
            <Link to="/audit" className="text-link">
              Audit log <ArrowRight size={14} />
            </Link>
          </div>
          <div className="timeline">
            {events.slice(0, 4).map(e => (
              <div className="timeline-item" key={e.id}>
                <div className={`timeline-marker ${e.kind}`}>
                  {e.kind === 'success' ? <BadgeCheck size={14} /> : e.kind === 'warning' ? <CircleAlert size={14} /> : <FileCheck2 size={14} />}
                </div>
                <div className="timeline-copy">
                  <strong>{e.title}</strong>
                  <span>{e.detail}</span>
                  <small>{e.time}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
