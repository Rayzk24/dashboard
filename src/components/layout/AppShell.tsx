import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppData } from '../../app/AppDataProvider';
import { dateLabel } from '../../lib/format';
import { logicalDayKey } from '../../lib/habits';

const navigation = [
  { to: '/', label: 'Accueil', icon: LayoutDashboard },
  { to: '/habits', label: 'Habitudes', icon: ListChecks },
  { to: '/freelance', label: 'Freelance', icon: Users },
  { to: '/personnel', label: 'Personnel', icon: UserRound },
];

export function AppShell({ onSignOut }: { onSignOut: () => void }) {
  const { error, refresh, saving, settings } = useAppData();
  const navigate = useNavigate();
  const day = logicalDayKey(
    new Date(),
    Number(settings?.day_rollover_hour ?? 5),
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <button className="brand" onClick={() => navigate('/')}>
            <span className="brand-mark">R</span>
            <span>
              {settings?.display_name || 'Rayzk'}<b>.</b>
            </span>
          </button>
          <nav>{navigation.map((item) => <NavItem key={item.to} {...item} />)}</nav>
        </div>
        <div className="sidebar-foot">
          <div className="sidebar-profile">
            <span className="profile-avatar">
              {(settings?.display_name || 'Rayzk').slice(0, 1).toUpperCase()}
            </span>
            <span>
              <b>{settings?.display_name || 'Rayzk'}</b>
              <small>Compte personnel</small>
            </span>
          </div>
          <NavLink to="/settings" className="nav-item">
            <Settings size={19} />
            <span>Réglages</span>
          </NavLink>
          <button className="nav-item" onClick={onSignOut}>
            <LogOut size={19} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <p>{dateLabel(day)}</p>
            <small className={`sync-status ${error ? 'error' : saving ? 'saving' : 'ready'}`}>
              <i />
              {saving
                ? 'Enregistrement…'
                : error
                  ? 'Erreur de synchronisation'
                  : 'Synchronisé'}
            </small>
          </div>
          <button className="mobile-settings" onClick={() => navigate('/settings')} aria-label="Ouvrir les réglages">
            <Settings size={19} />
          </button>
        </header>
        {error ? (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button className="text-link" onClick={() => void refresh()}>
              Réessayer
            </button>
          </div>
        ) : null}
        <Outlet />
      </main>
      <nav className="mobile-nav">
        {navigation.map((item) => <NavItem key={item.to} {...item} />)}
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      <Icon size={19} />
      <span>{label}</span>
    </NavLink>
  );
}
