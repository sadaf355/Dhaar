import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, Database, ShieldCheck, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDhaarStore } from '../../context/useDhaarStore';
import { verifiedHeldValue, daysToMaturity } from '../../lib/calculations';

export default function Hero() {
  const deposits = useDhaarStore((s) => s.deposits);
  const simulatedDate = useDhaarStore((s) => s.simulatedDate);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Trigger animation once on mount
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Compute live portfolio statistics using Command Center logic
  const totalDeclared = deposits.reduce((acc, d) => acc + d.amount, 0);
  const verifiedHeld = verifiedHeldValue(deposits, simulatedDate);
  const verifiedShare = totalDeclared > 0 ? Math.round((verifiedHeld / totalDeclared) * 100) : 0;
  const upcomingCount = deposits.filter((d) => {
    const days = daysToMaturity(d.maturityDate, simulatedDate);
    return days >= 0 && days <= 150;
  }).length;

  // Grade tier counts
  const e0Count = deposits.filter((d) => d.grade === 'E0').length;
  const e1Count = deposits.filter((d) => d.grade === 'E1').length;
  const e2Count = deposits.filter((d) => d.grade === 'E2').length;
  const assuredCount = deposits.filter((d) => d.grade === 'E3' || (d.grade === 'E2' && d.lien)).length;

  const totalCount = deposits.length || 1;
  const e0Pct = Math.round((e0Count / totalCount) * 100);
  const e1Pct = Math.round((e1Count / totalCount) * 100);
  const e2Pct = Math.round((e2Count / totalCount) * 100);
  const assuredPct = Math.round((assuredCount / totalCount) * 100);

  return (
    <section className="landing-hero-band" aria-label="Hero Overview">
      <div className="landing-container">
        <div className="landing-hero-grid">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="landing-hero-content">
            <div className="landing-hero-eyebrow">
              <span className="landing-hero-dot" aria-hidden="true" />
              AICTE SECURITY DEPOSIT / FDR PORTAL
            </div>

            <h1 className="landing-hero-title">Prove, don't trust.</h1>

            <p className="landing-hero-subtitle">
              One registry for every AICTE security deposit and FDR, showing not just what institutions declare, but what the bank has confirmed.
            </p>

            <div className="landing-hero-actions">
              <Link to="/dashboard" className="btn btn-primary">
                Open the demo <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className="btn btn-secondary landing-hero-btn-ghost">
                See how it works <ChevronDown size={16} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Right Column: Evidence Ladder Panel */}
          <div className="landing-hero-ladder-wrap">
            <div className="landing-hero-ladder-panel">
              <div className="landing-ladder-head">
                <div>
                  <span className="landing-ladder-eyebrow">ASSURANCE PIPELINE</span>
                  <h2 className="landing-ladder-title">Evidence Ladder</h2>
                </div>
                <span className="badge badge-teal">Live Pipeline</span>
              </div>

              <div className="landing-ladder-rows" role="region" aria-label="Evidence ladder distribution">
                {/* Row 1: E0 Declared */}
                <div className={`landing-ladder-row ${animated ? 'animate-in' : ''}`} style={{ animationDelay: '0.1s' }}>
                  <div className="landing-ladder-meta">
                    <span className="grade-dot grade-e0" aria-hidden="true" />
                    <span className="landing-ladder-name">E0 Declared</span>
                    <span className="landing-ladder-desc">Self-reported by institution</span>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <div
                      className="progress-fill fill-e0 landing-ladder-fill"
                      style={{ width: animated ? `${Math.max(e0Pct, 8)}%` : '0%' }}
                    />
                  </div>
                  <div className="landing-ladder-count">{e0Count}</div>
                </div>

                {/* Row 2: E1 Reviewed */}
                <div className={`landing-ladder-row ${animated ? 'animate-in' : ''}`} style={{ animationDelay: '0.25s' }}>
                  <div className="landing-ladder-meta">
                    <span className="grade-dot grade-e1" aria-hidden="true" />
                    <span className="landing-ladder-name">E1 Reviewed</span>
                    <span className="landing-ladder-desc">Document checked by officer</span>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <div
                      className="progress-fill fill-e1 landing-ladder-fill"
                      style={{ width: animated ? `${Math.max(e1Pct, 8)}%` : '0%' }}
                    />
                  </div>
                  <div className="landing-ladder-count">{e1Count}</div>
                </div>

                {/* Row 3: E2 Bank-attested */}
                <div className={`landing-ladder-row ${animated ? 'animate-in' : ''}`} style={{ animationDelay: '0.4s' }}>
                  <div className="landing-ladder-meta">
                    <span className="grade-dot grade-e2" aria-hidden="true" />
                    <span className="landing-ladder-name">E2 Bank-attested</span>
                    <span className="landing-ladder-desc">Bank confirmed with active lien</span>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <div
                      className="progress-fill fill-e2 landing-ladder-fill"
                      style={{ width: animated ? `${Math.max(e2Pct, 8)}%` : '0%' }}
                    />
                  </div>
                  <div className="landing-ladder-count">{e2Count}</div>
                </div>

                {/* Row 4: Assured */}
                <div className={`landing-ladder-row ${animated ? 'animate-in' : ''}`} style={{ animationDelay: '0.55s' }}>
                  <div className="landing-ladder-meta">
                    <span className="grade-dot grade-e3" aria-hidden="true" />
                    <span className="landing-ladder-name">Assured</span>
                    <span className="landing-ladder-desc">Bank attestation within 180 days</span>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <div
                      className="progress-fill fill-e3 landing-ladder-fill"
                      style={{ width: animated ? `${Math.max(assuredPct, 8)}%` : '0%' }}
                    />
                  </div>
                  <div className="landing-ladder-count">{assuredCount}</div>
                </div>
              </div>

              <div className="landing-ladder-foot">
                <span className="badge badge-amber">Illustrative Window</span>
                <span>Freshness window set to 180 days for demo attestation validity.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Hero Deck: 3 Live Store Stat Cards */}
        <div className="landing-hero-stats">
          <div className="stat-card landing-hero-stat-card">
            <div className="stat-top">
              <span>Total Active Records</span>
              <div className="stat-icon teal">
                <Database size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="stat-value">{deposits.length.toLocaleString('en-IN')}</div>
            <div className="stat-bottom">
              <span className="badge badge-amber">demo data</span>
              <span>Across 8 AICTE regions</span>
            </div>
          </div>

          <div className="stat-card landing-hero-stat-card">
            <div className="stat-top">
              <span>Verified-Held Share</span>
              <div className="stat-icon green">
                <ShieldCheck size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="stat-value">{verifiedShare}%</div>
            <div className="stat-bottom">
              <span className="badge badge-amber">demo data</span>
              <span>Only E2+ with active lien</span>
            </div>
          </div>

          <div className="stat-card landing-hero-stat-card">
            <div className="stat-top">
              <span>Upcoming Maturities</span>
              <div className="stat-icon amber">
                <CalendarClock size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="stat-value">{upcomingCount}</div>
            <div className="stat-bottom">
              <span className="badge badge-amber">demo data</span>
              <span>Within 150 days of simulated date</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
