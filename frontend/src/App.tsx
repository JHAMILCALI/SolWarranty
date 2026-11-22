import { useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { WalletButton } from './components/WalletButton';
import { NotificationsProvider } from './components/Notifications';
import { CLUSTER, RPC_URL } from './solana/config';
import { HomePage } from './pages/HomePage';
import { StoreDashboardPage } from './pages/StoreDashboardPage';
import { WarrantyEditorPage } from './pages/WarrantyEditorPage';
import { MyWarrantiesPage } from './pages/MyWarrantiesPage';
import { VerifyWarrantyPage } from './pages/VerifyWarrantyPage';
import './styles/app.css';

const navigation = [
  { to: '/store', number: '01', label: 'TIENDA' },
  { to: '/my-warranties', number: '02', label: 'MIS GARANTÍAS' },
  { to: '/verify', number: '03', label: 'VERIFICAR' },
];

export function App() {
  const location = useLocation();
  const landing = location.pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);

  return <NotificationsProvider><div className={landing ? 'landing-frame' : 'app-ui'}>
    {!landing && <header className="app-header">
      <div className="app-container app-header-inner">
        <Link className="app-brand" to="/" aria-label="SolWarranty, ir al inicio">
          <img src="/img/SolWarranty_logo.svg" alt="SolWarranty" />
        </Link>
        <nav className={`app-nav${menuOpen ? ' is-open' : ''}`} aria-label="Navegación principal">
          {navigation.map(item => <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'is-active' : undefined}>
            <small>{item.number} /</small> {item.label}
          </NavLink>)}
        </nav>
        <div className="app-header-wallet"><WalletButton /></div>
        <button className="app-menu-toggle" type="button" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
          <span /><span />
        </button>
      </div>
    </header>}
    <main className={landing ? 'landing-root' : 'app-main app-container'}>
      {!landing && <div className="app-network" title={`RPC: ${RPC_URL}`}>
        <span className="app-network-dot" /> SOLANA {CLUSTER.toUpperCase()} <span className="app-network-divider">/</span> ENTORNO DE PRUEBA
      </div>}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/store" element={<StoreDashboardPage />} />
        <Route path="/store/warranties/new" element={<WarrantyEditorPage />} />
        <Route path="/store/warranties/:id" element={<WarrantyEditorPage />} />
        <Route path="/my-warranties" element={<MyWarrantiesPage />} />
        <Route path="/verify" element={<VerifyWarrantyPage />} />
        <Route path="/verify/:warrantyPda" element={<VerifyWarrantyPage />} />
        <Route path="*" element={<section className="app-page"><p className="app-kicker">ERROR / 404</p><h1>RUTA <em>INEXISTENTE.</em></h1><Link className="button" to="/">VOLVER AL INICIO ↗</Link></section>} />
      </Routes>
    </main>
    {!landing && <footer className="app-footer">
      <div className="app-container app-footer-inner">
        <Link to="/" aria-label="SolWarranty, ir al inicio"><img src="/img/SolWarranty_logo.svg" alt="SolWarranty" /></Link>
        <span>GARANTÍAS QUE PUEDES VERIFICAR.</span>
        <span>© 2026 SOLWARRANTY / SOLANA DEVNET</span>
      </div>
    </footer>}
  </div></NotificationsProvider>;
}
