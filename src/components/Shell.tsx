import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, Building2, ChevronDown, CircleHelp, FileCheck2, FilePlus2, Files, Gauge, Landmark, Menu, Moon, Search, Settings2, ShieldCheck, Sun, Users, X, RotateCcw, ScanSearch, CalendarClock, BadgeCheck, FlaskConical, ClipboardCheck, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDhaarStore } from '../context/useDhaarStore';
import { DEMO_USERS } from '../data/users';
import { maturityNotifications } from '../lib/calculations';
import GlobalSearchModal from './GlobalSearchModal';

const nav = [
  { label: 'OVERVIEW', items: [{ to: '/dashboard', label: 'Command Center', icon: Gauge }, { to: '/institutions', label: 'Institutions', icon: Building2 }, { to: '/registry', label: 'Deposit registry', icon: Files }] },
  { label: 'WORKSPACE', items: [{ to: '/submit', label: 'Submit an instrument', icon: FilePlus2 }, { to: '/verification', label: 'Verification queue', icon: FileCheck2 }, { to: '/evidence', label: 'Evidence workbench', icon: ScanSearch }, { to: '/bank-desk', label: 'Bank confirmation desk', icon: Landmark }] },
  { label: 'MONITORING', items: [{ to: '/compliance', label: 'Compliance & maturity', icon: CalendarClock }, { to: '/alerts', label: 'Alerts & SLA ladder', icon: Bell }, { to: '/release', label: 'Release & refunds', icon: BadgeCheck }, { to: '/reports', label: 'Operational reports', icon: FileCheck2 }] },
  { label: 'INSIGHTS & DELIVERY', items: [{ to: '/impact', label: 'DHAAR Impact Lab', icon: FlaskConical }, { to: '/demo-qa', label: 'Demo readiness & QA', icon: ClipboardCheck }] },
  { label: 'GOVERNANCE', items: [{ to: '/parameters', label: 'APH parameters', icon: Settings2 }, { to: '/audit', label: 'Activity & audit', icon: Activity }, { to: '/settings', label: 'Settings', icon: Settings2 }] }
];

export default function Shell() {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const theme = useDhaarStore((s) => s.theme);
  const setTheme = useDhaarStore((s) => s.setTheme);
  const dark = theme === 'dark';
  const role = useDhaarStore((s) => s.role);
  const currentUserId = useDhaarStore((s) => s.currentUserId);
  const setCurrentUser = useDhaarStore((s) => s.setCurrentUser);
  const currentUser = DEMO_USERS.find((u) => u.id === currentUserId) || DEMO_USERS[0];

  const loc = useLocation();
  const navigate = useNavigate();
  const reset = useDhaarStore((s) => s.resetDemo);
  const deposits = useDhaarStore((s) => s.deposits);
  const simulatedDate = useDhaarStore((s) => s.simulatedDate);
  const alertCount = maturityNotifications(deposits, simulatedDate).length;
  const pendingVerification = deposits.filter((d) => d.grade === 'E0' || d.status === 'Under review' || d.status === 'Attention required').length;
  const title = nav.flatMap((g) => g.items).find((i) => i.to === loc.pathname)?.label || 'Command Center';

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Landmark size={22} />
          </div>
          <div>
            <div className="brand-name">
              DHAAR<span>•</span>
            </div>
            <div className="brand-sub">DEPOSIT ASSURANCE</div>
          </div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="workspace-chip">
          <div className="workspace-icon">
            <ShieldCheck size={17} />
          </div>
          <div>
            <strong>AICTE Operations</strong>
            <small>Demo workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>

        <nav>
          {nav.map((group) => {
            const visible = group.items.filter((item) =>
              role === 'Auditor'
                ? ['/dashboard', '/registry', '/institutions', '/impact', '/audit'].includes(item.to)
                : role === 'Bank Verifier'
                ? ['/bank-desk', '/registry', '/audit'].includes(item.to)
                : role === 'Checker'
                ? ['/verification', '/evidence', '/bank-desk', '/release', '/registry', '/audit'].includes(item.to)
                : role === 'Approving Authority'
                ? ['/release', '/compliance', '/registry', '/audit'].includes(item.to)
                : role === 'Accounts Officer'
                ? ['/release', '/registry', '/audit'].includes(item.to)
                : role === 'Regional Officer'
                ? ['/dashboard', '/institutions', '/registry', '/verification', '/evidence', '/bank-desk', '/compliance', '/release', '/audit'].includes(item.to)
                : true
            );
            return (
              visible.length > 0 && (
                <div className="nav-group" key={group.label}>
                  <div className="nav-label">{group.label}</div>
                  {visible.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/dashboard'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                      {item.to === '/verification' && pendingVerification > 0 && (
                        <span className="nav-count">{pendingVerification}</span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <CircleHelp size={17} />
            </div>
            <div>
              <strong>Need a hand?</strong>
              <p>Explore the demo workflow</p>
            </div>
          </div>
          <div className="profile-row">
            <div className="avatar">{initials}</div>
            <div className="profile-info">
              <strong>{currentUser.name}</strong>
              <span>
                {currentUser.role} · {currentUser.organization}
              </span>
            </div>
            <button
              className="icon-button"
              title="Reset demo data"
              onClick={() => {
                if (confirm('Reset all demo changes?')) reset();
              }}
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              <span>DHAAR</span>
              <span className="crumb-slash">/</span>
              <strong>{title}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div
              className="search-box"
              onClick={() => setSearchModalOpen(true)}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSearchModalOpen(true);
              }}
            >
              <Search size={16} />
              <span style={{ flex: 1, color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' }}>
                {t('shell.searchPlaceholder') || 'Search anything (Ctrl+K)'}
              </span>
              <kbd>⌘ K</kbd>
            </div>

            {/* Language Switcher */}
            <button
              className="icon-button"
              onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}
              title={i18n.language === 'en' ? 'Switch to Hindi (हिन्दी)' : 'Switch to English'}
              aria-label="Toggle Language"
            >
              <Languages size={17} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, marginLeft: 2 }}>
                {i18n.language === 'en' ? 'HI' : 'EN'}
              </span>
            </button>

            {/* Demo identity banner */}
            <span className="demo-pill" title="Demo identity, not authentication">
              <span /> DEMO IDENTITY, NOT AUTHENTICATION
            </span>

            <button className="icon-button" onClick={() => setTheme(dark ? 'light' : 'dark')} title="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              className="icon-button notification-button"
              title={`Open ${alertCount} maturity notifications`}
              aria-label={`Open ${alertCount} maturity notifications`}
              onClick={() => navigate('/compliance')}
            >
              <Bell size={18} />
              {alertCount > 0 && <i />}
            </button>

            {/* 8 Named Synthetic Users Demo Switcher */}
            <div className="role-select user-switcher" title="Switch synthetic demo user">
              <Users size={15} />
              <select
                value={currentUserId}
                onChange={(e) => setCurrentUser(e.target.value)}
                aria-label="Demo user switcher"
              >
                {DEMO_USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role} {u.bank ? `(${u.bank})` : u.institutionCode ? `(${u.institutionCode})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet context={{ role, currentUserId }} />
        </div>

        <GlobalSearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />

        <footer className="footer">
          <span>
            <span className="footer-dot" /> All demo data stored locally in this browser
          </span>
          <span>
            DHAAR · Deposit Holding, Assurance & Audit Registry <b>v0.1</b>
          </span>
        </footer>
      </main>
    </div>
  );
}
