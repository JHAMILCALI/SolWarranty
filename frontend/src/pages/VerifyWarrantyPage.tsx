import { useEffect, useState, type FormEvent } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClaimForm } from '../components/ClaimForm';
import { ActionModal } from '../components/ActionModal';
import { BlockchainExplorer } from '../components/BlockchainExplorer';
import { useNotifications } from '../components/Notifications';
import { useChainData } from '../hooks/useChainData';
import { useTransaction } from '../hooks/useTransaction';
import { getWarranty, getStoreByPda, claimsForWarranty } from '../solana/queries';
import { createClaim } from '../solana/transactions';
import { isActive, isExpired } from '../solana/types';

export function VerifyWarrantyPage() {
  const { warrantyPda } = useParams();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [searchError, setSearchError] = useState('');
  const [pendingClaim, setPendingClaim] = useState<{ reason: 'screen' | 'battery' | 'charging' | 'other'; hash: number[] } | null>(null);
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const warranty = useChainData(() => warrantyPda ? getWarranty(connection, new PublicKey(warrantyPda)) : Promise.resolve(null), [connection, warrantyPda]);
  const store = useChainData(() => warranty.data ? getStoreByPda(connection, warranty.data.account.store) : Promise.resolve(null), [connection, warranty.data?.account.store.toBase58()]);
  const claims = useChainData(() => warranty.data ? claimsForWarranty(connection, warranty.data.publicKey) : Promise.resolve([]), [connection, warranty.data?.publicKey.toBase58()]);
  const tx = useTransaction();
  const notify = useNotifications();

  useEffect(() => {
    if (!warrantyPda || warranty.loading) return;
    if (warranty.error) notify({ kind: 'error', title: 'No se pudo verificar', message: warranty.error });
    else if (!warranty.data) notify({ kind: 'info', title: 'Garantía no encontrada', message: 'No existe una garantía en esa dirección de Devnet.' });
    else notify({ kind: 'success', title: 'Garantía encontrada', message: `Registro de “${warranty.data.account.productName}” consultado en Devnet.` });
  }, [warrantyPda, warranty.loading, warranty.error, warranty.data, notify]);

  function search(event: FormEvent) {
    event.preventDefault();
    try {
      setSearchError('');
      notify({ kind: 'info', title: 'Consultando garantía', message: 'Buscando el registro público en Solana Devnet.' });
      navigate(`/verify/${new PublicKey(address.trim()).toBase58()}`);
    } catch {
      setSearchError('La dirección Solana no es válida.');
      notify({ kind: 'error', title: 'Dirección inválida', message: 'Pega una dirección Solana válida para consultar la garantía.' });
    }
  }

  if (!warrantyPda) return <section className="app-page verify-page">
    <div className="verify-hero">
      <div className="verify-hero-copy">
        <p className="app-kicker">03 / VERIFICACIÓN PÚBLICA <span>● SOLANA DEVNET</span></p>
        <h1>LA CONFIANZA<br />SE <mark>COMPRUEBA.</mark></h1>
        <p className="app-lede">Consulta el estado, la tienda y la vigencia de una garantía digital directamente desde la blockchain.</p>
      </div>
      <div className="verify-art" aria-hidden="true">
        <div className="verify-orbit verify-orbit-one" />
        <div className="verify-orbit verify-orbit-two" />
        <img src="/img/SolWarranty_isotipo.svg" alt="" />
        <span className="verify-art-cross">+</span>
      </div>
      <span className="verify-hero-bottom">REGISTROS PÚBLICOS / SIN FIRMA REQUERIDA</span>
    </div>
    <div className="verify-search-panel">
      <div>
        <span className="app-kicker">01 / CONSULTAR REGISTRO</span>
        <h2>BUSCA UNA GARANTÍA<span className="app-period">.</span></h2>
        <p>Pega la dirección PDA que recibiste al crear o activar la garantía.</p>
      </div>
      <form className="search" onSubmit={search}>
        <label htmlFor="warranty-address">DIRECCIÓN DE LA GARANTÍA / PDA</label>
        <div className="search-row">
          <input id="warranty-address" required value={address} onChange={event => setAddress(event.target.value)} placeholder="Pega aquí la dirección Solana" spellCheck={false} autoComplete="off" />
          <button type="submit">VERIFICAR <span aria-hidden="true">↗</span></button>
        </div>
        {searchError && <p className="error" role="alert">{searchError}</p>}
      </form>
    </div>
    <BlockchainExplorer connection={connection} />
  </section>;

  const entry = warranty.data;
  const w = entry?.account;
  const canClaim = !!(wallet && w && wallet.publicKey.equals(w.buyer) && isActive(w) && !isExpired(w) && w.openClaimCount === 0);

  async function confirmClaim() {
    const selected = pendingClaim;
    setPendingClaim(null);
    if (!selected || !wallet || !entry || !w) return;
    await tx.run(() => createClaim(connection, wallet, w.store, entry.publicKey, BigInt(w.nextClaimId.toString()), selected.reason, selected.hash), async () => { await warranty.refresh(); await claims.refresh(); }, 'Crear reclamación');
  }

  return <section className="app-page verify-detail-page">
    <Link className="app-back" to="/verify">← NUEVA CONSULTA</Link>
    <div className="app-page-heading">
      <p className="app-kicker">03 / VERIFICACIÓN PÚBLICA <span>● SOLANA DEVNET</span></p>
      <h1>REGISTRO <em>PÚBLICO.</em></h1>
      <p className="app-lede">Información leída directamente de la blockchain.</p>
    </div>
    {warranty.loading && <p className="app-state">Leyendo la cuenta en Devnet…</p>}
    {warranty.error && <p className="error app-state" role="alert">{warranty.error}</p>}
    {!warranty.loading && !warranty.error && !entry && <p className="app-state">No existe una garantía en esa dirección.</p>}
    {entry && w && <>
      <div className="card details">
        <div className="app-detail-top"><span className="eyebrow">GARANTÍA / #{w.warrantyId.toString()}</span><span className={`app-status ${isActive(w) && !isExpired(w) ? 'is-active' : ''}`}>{isActive(w) ? isExpired(w) ? 'VENCIDA' : 'ACTIVA' : 'BORRADOR'}</span></div>
        <h2>{w.productName}</h2>
        <div className="app-detail-grid">
          <p><strong>TIENDA</strong><span>{store.data?.account.name || 'Cargando tienda…'}</span></p>
          <p><strong>COMPRADOR</strong><code>{w.buyer.toBase58()}</code></p>
          <p><strong>DIRECCIÓN DE GARANTÍA</strong><code>{entry.publicKey.toBase58()}</code></p>
          <p><strong>DIRECCIÓN DE TIENDA</strong><code>{w.store.toBase58()}</code></p>
          {isActive(w) && <><p><strong>ACTIVADA</strong><span>{new Date(w.activatedAt.toNumber() * 1000).toLocaleString()}</span></p><p><strong>VENCE</strong><span>{new Date(w.expiresAt.toNumber() * 1000).toLocaleString()}</span></p></>}
          <p><strong>RECLAMACIONES ABIERTAS</strong><span>{w.openClaimCount}</span></p>
        </div>
      </div>
      {canClaim && <div className="app-workspace-grid app-claim-grid">
        <ClaimForm busy={tx.busy} submit={async (reason, hash) => { setPendingClaim({ reason, hash }); }} />
        <aside className="app-guide-card">
          <div className="app-guide-art"><img src="/img/SolWarranty_isotipo.svg" alt="" /><span>● SOLANA DEVNET</span></div>
          <span className="app-kicker">GUÍA / RECLAMACIÓN</span>
          <h2>UN PROBLEMA. UN SEGUIMIENTO<span className="app-period">.</span></h2>
          <p>Selecciona el motivo, revisa la solicitud y fírmala con la wallet del comprador. La tienda podrá aceptar o rechazar la reclamación.</p>
          <div className="app-guide-footer">REGISTRO PÚBLICO <span>✳</span> SOLWARRANTY</div>
        </aside>
      </div>}
      <div className="app-section-heading"><span className="app-kicker">02 / HISTORIAL</span><h2>RECLAMACIONES<span className="app-period">.</span></h2></div>
      {claims.loading && <p className="app-state">Cargando reclamaciones…</p>}
      {claims.error && <p className="error app-state">{claims.error}</p>}
      {claims.data?.length === 0 && <p className="app-state">No hay reclamaciones registradas.</p>}
      <div className="grid">{claims.data?.map(c => <div className="card" key={c.publicKey.toBase58()}><span className="eyebrow">RECLAMACIÓN / #{c.account.claimId.toString()}</span><h3>{Object.keys(c.account.reason)[0]}</h3><p>Estado: {Object.keys(c.account.status)[0]}</p>{Object.keys(c.account.resolution)[0] !== 'none' && <p>Resolución: {Object.keys(c.account.resolution)[0]}</p>}</div>)}</div>
    </>}
    <ActionModal prompt={pendingClaim ? {
      eyebrow: 'CONFIRMACIÓN / RECLAMACIÓN', title: 'PRESENTAR RECLAMACIÓN',
      message: `Vas a registrar una reclamación por ${({ screen: 'pantalla', battery: 'batería', charging: 'carga', other: 'otro motivo' } as const)[pendingClaim.reason]}.`,
      details: ['La wallet del comprador solicitará una firma en Devnet.', 'La tienda podrá revisar y resolver la solicitud.'],
      confirmLabel: 'CREAR Y FIRMAR',
    } : null} onClose={() => setPendingClaim(null)} onConfirm={() => { void confirmClaim(); }} />
  </section>;
}
