import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { WarrantyCard } from '../components/WarrantyCard';
import { ActionModal } from '../components/ActionModal';
import { WalletButton } from '../components/WalletButton';
import { useNotifications } from '../components/Notifications';
import { useChainData } from '../hooks/useChainData';
import { useTransaction } from '../hooks/useTransaction';
import { getStore, warrantiesForStore } from '../solana/queries';
import { initializeStore } from '../solana/transactions';

export function StoreDashboardPage() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [name, setName] = useState('');
  const [pendingName, setPendingName] = useState<string | null>(null);
  const store = useChainData(() => wallet ? getStore(connection, wallet.publicKey) : Promise.resolve(null), [connection, wallet?.publicKey.toBase58()]);
  const warranties = useChainData(() => store.data ? warrantiesForStore(connection, store.data.publicKey) : Promise.resolve([]), [connection, store.data?.publicKey.toBase58()]);
  const tx = useTransaction();
  const notify = useNotifications();

  function register(event: FormEvent) {
    event.preventDefault();
    if (!wallet) return;
    const publicName = name.trim();
    if (!publicName) { notify({ kind: 'error', title: 'Nombre requerido', message: 'Escribe el nombre público de la tienda.' }); return; }
    setPendingName(publicName);
  }

  async function confirmRegistration() {
    const selectedName = pendingName;
    setPendingName(null);
    if (!wallet || !selectedName) return;
    await tx.run(() => initializeStore(connection, wallet, selectedName), store.refresh, 'Crear tienda');
  }

  return <section className="app-page store-page">
    <div className="app-page-heading">
      <p className="app-kicker">01 / PANEL DE TIENDA <span>● SOLANA DEVNET</span></p>
      <div className="page-heading">
        <h1>{store.data?.account.name ?? 'TU TIENDA'}<em>.</em></h1>
        {store.data && <Link className="button" to="/store/warranties/new">+ NUEVA GARANTÍA</Link>}
      </div>
      <p className="app-lede">Emite, activa y administra las garantías de tus productos desde una sola wallet.</p>
    </div>
    {!wallet && <div className="app-state app-state-feature"><img src="/img/SolWarranty_isotipo.svg" alt="" /><div><span className="app-kicker">ACCESO / TIENDA</span><h2>CONECTA TU WALLET<span className="app-period">.</span></h2><p>Conecta la wallet administradora para registrar tu tienda y gestionar sus garantías.</p><div style={{ marginTop: '18px' }}><WalletButton /></div></div></div>}
    {wallet && <>
      {store.loading && <p className="app-state">Cargando tienda desde Devnet…</p>}
      {store.error && <p className="error app-state" role="alert">{store.error}</p>}
      {!store.loading && !store.error && !store.data && <div className="app-workspace-grid app-register-grid">
        <form className="form card" onSubmit={register}>
          <span className="eyebrow">01 / NUEVA TIENDA</span><h2>REGISTRA TU TIENDA<span className="app-period">.</span></h2>
          <p className="muted">Este nombre será visible al verificar las garantías que emitas.</p>
          <label>Nombre público<input required maxLength={64} value={name} onChange={event => setName(event.target.value)} placeholder="Nombre de tu tienda" /></label>
          <button disabled={tx.busy}>CREAR TIENDA ↗</button>
        </form>
        <aside className="app-guide-card">
          <div className="app-guide-art"><img src="/img/SolWarranty_isotipo.svg" alt="" /><span>● SOLANA DEVNET</span></div>
          <span className="app-kicker">ANTES DE EMPEZAR</span>
          <h2>TU TIENDA, EN CADENA<span className="app-period">.</span></h2>
          <p>El nombre público aparecerá en cada verificación. La wallet conectada será la administradora de la tienda.</p>
          <div className="app-guide-footer">SOLANA DEVNET <span>●</span> REGISTRO DE DEMOSTRACIÓN</div>
        </aside>
      </div>}
      {store.data && <>
        <div className="app-stats"><div><small>BORRADORES</small><strong>{store.data.account.draftCount}</strong></div><div><small>SIGUIENTE ID</small><strong>{store.data.account.nextWarrantyId.toString()}</strong></div><div><small>RED</small><strong>DEVNET <span>●</span></strong></div></div>
        <div className="app-section-heading"><span className="app-kicker">02 / REGISTROS</span><h2>TUS GARANTÍAS<span className="app-period">.</span></h2></div>
        {warranties.loading && <p className="app-state">Cargando garantías…</p>}
        {warranties.error && <p className="error app-state" role="alert">{warranties.error}</p>}
        {warranties.data?.length === 0 && <p className="app-state">Aún no hay garantías. <Link to="/store/warranties/new">Crea la primera ↗</Link></p>}
        <div className="grid">{warranties.data?.map(w => <WarrantyCard key={w.publicKey.toBase58()} entry={w} storeView />)}</div>
      </>}
    </>}
    <ActionModal prompt={pendingName ? {
      eyebrow: 'CONFIRMACIÓN / TIENDA', title: 'CREAR TIENDA',
      message: `Registrarás “${pendingName}” como nombre público de tu tienda.`,
      details: ['La wallet conectada administrará la tienda.', 'Tu wallet solicitará una firma para guardar el registro en Devnet.'],
      confirmLabel: 'CONFIRMAR Y FIRMAR',
    } : null} onClose={() => setPendingName(null)} onConfirm={() => { void confirmRegistration(); }} />
  </section>;
}
