import { Landmark, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDhaarStore } from '../../context/useDhaarStore';

export default function TopBar() {
  const theme = useDhaarStore((s) => s.theme);
  const setTheme = useDhaarStore((s) => s.setTheme);
  const dark = theme === 'dark';

  return (
    <header className="landing-topbar" role="banner">
      <div className="landing-topbar-container">
        <Link to="/" className="landing-brand">
          <div className="brand-mark">
            <Landmark size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="brand-name">
              DHAAR<span>•</span>
            </div>
            <div className="brand-sub">DEPOSIT ASSURANCE</div>
          </div>
        </Link>

        <nav className="landing-nav" aria-label="Landing page navigation">
          <a href="#problem" className="landing-nav-link">Problem</a>
          <a href="#how-it-works" className="landing-nav-link">How it works</a>
          <a href="#trust-model" className="landing-nav-link">Trust model</a>
          <a href="#controls" className="landing-nav-link">Controls</a>
          <a href="#faq" className="landing-nav-link">FAQ</a>
        </nav>

        <div className="landing-topbar-actions">
          <span className="demo-pill" title="Demo mode indicator">
            <span aria-hidden="true" /> DEMO MODE
          </span>

          <button
            className="icon-button"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            title="Toggle color theme"
            aria-label="Toggle color theme"
          >
            {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>

          <Link to="/dashboard" className="btn btn-primary btn-sm">
            Open demo
          </Link>
        </div>
      </div>
    </header>
  );
}
