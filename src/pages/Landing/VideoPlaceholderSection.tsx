import { PlayCircle, Film } from 'lucide-react';

export default function VideoPlaceholderSection() {
  return (
    <section className="landing-section landing-section-soft" aria-labelledby="video-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="eyebrow">
            <span className="landing-dot" aria-hidden="true" />
            PRODUCT DEMO
          </div>
          <h2 id="video-heading" className="landing-section-title">
            Watch the DHAAR walkthrough
          </h2>
          <p className="landing-section-subtitle">
            A comprehensive tour of the deposit lifecycle: submission, evidence review, bank attestation desk, and controlled release.
          </p>
        </div>

        <div className="panel landing-video-panel">
          <div className="landing-video-frame" role="img" aria-label="Product demo video placeholder">
            <div className="landing-video-overlay">
              <div className="landing-video-badge">
                <Film size={16} aria-hidden="true" />
                <span>3-Minute Guided Walkthrough</span>
              </div>
              <div className="landing-video-play-btn" aria-hidden="true">
                <PlayCircle size={56} />
              </div>
              <h3 className="landing-video-title">Demo video coming soon</h3>
              <p className="landing-video-desc">
                High-definition screen recording highlighting the SIH26265 evaluation workflow is currently in production.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
