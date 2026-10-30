import { useDhaarStore } from '../../context/useDhaarStore';
import TopBar from './TopBar';
import Hero from './Hero';
import ProblemSection from './ProblemSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';
import TrustModelSection from './TrustModelSection';
import ControlsSection from './ControlsSection';
import RoleViewsSection from './RoleViewsSection';
import RealityCheckSection from './RealityCheckSection';
import VideoPlaceholderSection from './VideoPlaceholderSection';
import FaqSection from './FaqSection';
import LandingFooter from './LandingFooter';

export default function Landing() {
  const theme = useDhaarStore((s) => s.theme);
  const dark = theme === 'dark';

  return (
    <div className={`landing-root ${dark ? 'app dark' : 'app'}`}>
      {/* Accessible skip to main content */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* 1. Top Bar */}
      <TopBar />

      <main id="main-content" className="landing-main">
        {/* 2. Hero (navy band with evidence ladder and live stats) */}
        <Hero />

        {/* 3. The problem */}
        <ProblemSection />

        {/* 4. What DHAAR does */}
        <FeaturesSection />

        {/* 5. How it works */}
        <HowItWorksSection />

        {/* 6. Trust model */}
        <TrustModelSection />

        {/* 7. Controls built in */}
        <ControlsSection />

        {/* 8. Role views */}
        <RoleViewsSection />

        {/* 9. What is real and what is simulated */}
        <RealityCheckSection />

        {/* 10. Walkthrough video placeholder */}
        <VideoPlaceholderSection />

        {/* 11. FAQ accordion */}
        <FaqSection />
      </main>

      {/* 12. Closing band and footer */}
      <LandingFooter />
    </div>
  );
}
