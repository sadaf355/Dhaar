import { ArrowRight, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingFooter() {
  return (
    <footer className="landing-footer-wrapper" role="contentinfo">
      {/* Closing Call to Action Band */}
      <div className="landing-cta-band">
        <div className="landing-container">
          <div className="landing-cta-content">
            <div className="brand-mark landing-cta-brand-mark">
              <Landmark size={24} aria-hidden="true" />
            </div>
            <h2 className="landing-cta-title">Explore the DHAAR Prototype</h2>
            <p className="landing-cta-subtitle">
              Test live portfolio analytics, run the 26-rule compliance engine, and experience bank attestation workflows.
            </p>
            <div className="landing-cta-actions">
              <Link to="/dashboard" className="btn btn-primary">
                Open the demo <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Official Prototype Disclaimer Footer */}
      <div className="landing-bottom-footer">
        <div className="landing-container landing-footer-flex">
          <div className="landing-footer-left">
            <span className="footer-dot" aria-hidden="true" />
            <span>
              Built for Smart India Hackathon 2026 · <b>SIH26265</b> · AICTE Regulation Bureau. Independent student prototype, not an official AICTE product.
            </span>
          </div>
          <div className="landing-footer-right">
            <span className="badge badge-amber">Demo Environment</span>
            <span>All figures illustrative</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
