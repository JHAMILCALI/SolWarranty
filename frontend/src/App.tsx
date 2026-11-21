import { Link, Route, Routes } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { CLUSTER, RPC_URL } from './solana/config';
import { HomePage } from './pages/HomePage';
import { StoreDashboardPage } from './pages/StoreDashboardPage';
import { WarrantyEditorPage } from './pages/WarrantyEditorPage';
import { MyWarrantiesPage } from './pages/MyWarrantiesPage';
import { VerifyWarrantyPage } from './pages/VerifyWarrantyPage';
export function App() {
  return <><header className="site-header"><div className="shell nav"><Link className="brand" to="/">◈ SolWarranty</Link><nav><Link to="/store">Tienda</Link><Link to="/my-warranties">Mis garantías</Link><Link to="/verify">Verificar</Link></nav><WalletMultiButton /></div></header>
    <main className="shell"><div className="network">RPC: {CLUSTER} · {RPC_URL}</div><Routes>
      <Route path="/" element={<HomePage />} /><Route path="/store" element={<StoreDashboardPage />} />
      <Route path="/store/warranties/new" element={<WarrantyEditorPage />} /><Route path="/store/warranties/:id" element={<WarrantyEditorPage />} />
      <Route path="/my-warranties" element={<MyWarrantiesPage />} /><Route path="/verify" element={<VerifyWarrantyPage />} />
      <Route path="/verify/:warrantyPda" element={<VerifyWarrantyPage />} /><Route path="*" element={<p>Ruta inexistente. <Link to="/">Ir al inicio</Link>.</p>} />
    </Routes></main></>;
}
