import { useState } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActionModal, type ActionPrompt } from '../components/ActionModal';
import { WarrantyForm } from '../components/WarrantyForm';
import { useChainData } from '../hooks/useChainData';
import { useTransaction } from '../hooks/useTransaction';
import { getStore, getWarranty, claimsForWarranty } from '../solana/queries';
import { createWarranty, updateWarranty, activateWarranty, closeDraft, resolveClaim } from '../solana/transactions';
import type { WarrantyInput } from '../solana/types';
import { isDraft } from '../solana/types';

type PendingAction =
  | { kind: 'save'; input: WarrantyInput }
  | { kind: 'activate' | 'close' }
  | { kind: 'resolve'; claim: PublicKey; claimId: string; resolution: 'accepted' | 'rejected' };

function hex(bytes: number[]): string { return Array.from(bytes).map(value => value.toString(16).padStart(2, '0')).join(''); }

export function WarrantyEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreating = !id || id === 'new';
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const store = useChainData(() => wallet ? getStore(connection, wallet.publicKey) : Promise.resolve(null), [connection, wallet?.publicKey.toBase58()]);
  const warranty = useChainData(() => !isCreating && id ? getWarranty(connection, new PublicKey(id)) : Promise.resolve(null), [connection, id]);
  const claims = useChainData(() => warranty.data ? claimsForWarranty(connection, warranty.data.publicKey) : Promise.resolve([]), [connection, warranty.data?.publicKey.toBase58()]);
  const tx = useTransaction();

  const pageState = (message: string, isError = false) => <section className="app-page editor-page">
    <Link className="app-back" to="/store">← VOLVER A TIENDA</Link>
    <div className="app-page-heading"><p className="app-kicker">01 / PANEL DE TIENDA</p><h1>GARANTÍAS<em>.</em></h1></div>
    <p className={`app-state${isError ? ' error' : ''}`} role={isError ? 'alert' : undefined}>{message}</p>
  </section>;

  if (!wallet) return pageState('Conecta la wallet de la tienda.');
  if (store.loading || warranty.loading) return pageState('Leyendo Devnet…');
  if (store.error || warranty.error) return pageState(store.error || warranty.error || 'Error al consultar Devnet.', true);
  if (!store.data) return <section className="app-page editor-page"><Link className="app-back" to="/store">← VOLVER A TIENDA</Link><div className="app-page-heading"><p className="app-kicker">01 / PANEL DE TIENDA</p><h1>PRIMERO, TU <em>TIENDA.</em></h1></div><p className="app-state">Registra primero tu tienda en <Link to="/store">el panel ↗</Link>.</p></section>;
  if (!isCreating && !warranty.data) return pageState('Garantía inexistente.', true);
  if (warranty.data && !warranty.data.account.store.equals(store.data.publicKey)) return pageState('Esta garantía pertenece a otra tienda.', true);

  const current = warranty.data;
  const draft = !current || isDraft(current.account);

  async function confirmPending() {
    const selected = pending;
    setPending(null);
    if (!selected || !wallet || !store.data) return;
    if (selected.kind === 'save') {
      if (current) {
        await tx.run(() => updateWarranty(connection, wallet, current.publicKey, selected.input), warranty.refresh, 'Guardar borrador');
      } else {
        await tx.run(() => createWarranty(connection, wallet, BigInt(store.data!.account.nextWarrantyId.toString()), selected.input), async () => { await store.refresh(); navigate('/store'); }, 'Crear borrador');
      }
    } else if (selected.kind === 'activate' && current) {
      await tx.run(() => activateWarranty(connection, wallet, current.publicKey), warranty.refresh, 'Activar garantía');
    } else if (selected.kind === 'close' && current) {
      await tx.run(() => closeDraft(connection, wallet, current.publicKey), async () => { await store.refresh(); navigate('/store'); }, 'Cerrar borrador');
    } else if (selected.kind === 'resolve' && current) {
      await tx.run(() => resolveClaim(connection, wallet, current.publicKey, selected.claim, selected.resolution), claims.refresh, selected.resolution === 'accepted' ? 'Aceptar reclamación' : 'Rechazar reclamación');
    }
  }

  let prompt: ActionPrompt | null = null;
  if (pending?.kind === 'save') prompt = current ? {
    eyebrow: 'CONFIRMACIÓN / BORRADOR', title: 'GUARDAR CAMBIOS',
    message: `Actualizarás el borrador de “${pending.input.productName}”.`,
    details: ['La wallet de la tienda debe firmar la actualización.', 'Los cambios se guardarán en Solana Devnet.'],
    confirmLabel: 'CONFIRMAR Y FIRMAR',
  } : {
    eyebrow: 'CONFIRMACIÓN / NUEVA GARANTÍA', title: 'CREAR BORRADOR',
    message: `Crearás una garantía para “${pending.input.productName}” vinculada a la wallet indicada.`,
    details: ['Los hashes de esta demo son públicos y pueden editarse antes de crear.', 'La cobertura comenzará cuando actives el borrador.', 'La wallet de la tienda solicitará una firma en Devnet.'],
    confirmLabel: 'CREAR Y FIRMAR',
  };
  if (pending?.kind === 'activate') prompt = {
    eyebrow: 'CONFIRMACIÓN / ACTIVACIÓN', title: 'ACTIVAR GARANTÍA',
    message: 'La cobertura empezará cuando Solana confirme esta operación.',
    details: ['Comprueba que el producto, la wallet del comprador y la duración sean correctos.', 'Después de activarla, la garantía dejará de ser un borrador editable.'],
    confirmLabel: 'ACTIVAR Y FIRMAR',
  };
  if (pending?.kind === 'close') prompt = {
    eyebrow: 'CONFIRMACIÓN / BORRADOR', title: 'CERRAR BORRADOR',
    message: 'Cerrarás este borrador sin activar su cobertura.',
    details: ['Esta acción se registrará en Devnet.', 'Si necesitas otra garantía, podrás crear un nuevo borrador.'],
    confirmLabel: 'CERRAR Y FIRMAR', danger: true,
  };
  if (pending?.kind === 'resolve') prompt = {
    eyebrow: 'CONFIRMACIÓN / RECLAMACIÓN',
    title: pending.resolution === 'accepted' ? 'ACEPTAR RECLAMACIÓN' : 'RECHAZAR RECLAMACIÓN',
    message: `Vas a ${pending.resolution === 'accepted' ? 'aceptar' : 'rechazar'} la reclamación #${pending.claimId}.`,
    details: ['La resolución quedará registrada en Solana Devnet.', 'Tu wallet solicitará una firma para confirmar la decisión.'],
    confirmLabel: pending.resolution === 'accepted' ? 'ACEPTAR Y FIRMAR' : 'RECHAZAR Y FIRMAR',
    danger: pending.resolution === 'rejected',
  };

  const recordPanel = current && <div className="card app-record-card">
    <span className="eyebrow">REGISTRO / #{current.account.warrantyId.toString()}</span>
    <h2>ESTADO DEL REGISTRO<span className="app-period">.</span></h2>
    <span className={`app-status${isDraft(current.account) ? '' : ' is-active'}`}>{isDraft(current.account) ? 'BORRADOR' : 'ACTIVA'}</span>
    <div className="app-record-details"><p><strong>DIRECCIÓN</strong><code>{current.publicKey.toBase58()}</code></p><p><strong>COMPRADOR</strong><code>{current.account.buyer.toBase58()}</code></p></div>
    {isDraft(current.account) && <div className="actions"><button type="button" disabled={tx.busy} onClick={() => setPending({ kind: 'activate' })}>ACTIVAR GARANTÍA ↗</button><button type="button" className="danger" disabled={tx.busy} onClick={() => setPending({ kind: 'close' })}>CERRAR BORRADOR</button></div>}
    <Link to={`/verify/${current.publicKey.toBase58()}`}>VERIFICAR PÚBLICAMENTE ↗</Link>
  </div>;

  return <section className="app-page editor-page">
    <Link className="app-back" to="/store">← VOLVER A TIENDA</Link>
    <div className="app-page-heading"><p className="app-kicker">01 / PANEL DE TIENDA <span>● SOLANA DEVNET</span></p><h1>{current ? `GARANTÍA #${current.account.warrantyId.toString()}` : 'NUEVA GARANTÍA'}<em>.</em></h1><p className="app-lede">{current ? 'Edita, activa o revisa el registro de este producto.' : 'Crea un registro verificable para tu producto.'}</p></div>
    <div className="app-workspace-grid">
      <div className="app-workspace-main">
        {draft && <WarrantyForm key={current?.publicKey.toBase58() || 'new'} busy={tx.busy} submit={async input => { setPending({ kind: 'save', input }); }} initial={current ? {
          buyer: current.account.buyer.toBase58(), productName: current.account.productName,
          serialHash: hex(current.account.serialHash), receiptHash: hex(current.account.receiptHash),
          days: current.account.durationSeconds.toNumber() / 86_400,
        } : undefined} />}
        {!draft && recordPanel}
      </div>
      <aside className="app-workspace-aside">
        {current && draft ? recordPanel : <div className="app-guide-card">
          <div className="app-guide-art"><img src="/img/SolWarranty_isotipo.svg" alt="" /><span>● SOLANA DEVNET</span></div>
          <span className="app-kicker">{current ? 'REGISTRO ACTIVO' : 'GUÍA / NUEVA GARANTÍA'}</span>
          <h2>{current ? 'COBERTURA VERIFICABLE' : 'DE BORRADOR A GARANTÍA'}<span className="app-period">.</span></h2>
          <p>{current ? 'La información de esta garantía ya puede consultarse públicamente. Revisa abajo sus reclamaciones.' : 'Completa los datos, crea el borrador y actívalo cuando compruebes que todo sea correcto.'}</p>
          <ol className="app-guide-steps">
            <li><b>01</b><span>{current ? 'Consulta el registro público' : 'Introduce la wallet y el producto'}</span></li>
            <li><b>02</b><span>{current ? 'Revisa vigencia y estado' : 'Revisa los hashes de la demo'}</span></li>
            <li><b>03</b><span>{current ? 'Gestiona sus reclamaciones' : 'Firma y activa la garantía'}</span></li>
          </ol>
          <div className="app-guide-footer">SOLWARRANTY <span>✳</span> SOLANA DEVNET</div>
        </div>}
      </aside>
    </div>
    {current && <>
      <div className="app-section-heading"><span className="app-kicker">02 / HISTORIAL</span><h2>RECLAMACIONES<span className="app-period">.</span></h2></div>
      {claims.loading && <p className="app-state">Cargando reclamaciones…</p>}
      {claims.error && <p className="error app-state" role="alert">{claims.error}</p>}
      {claims.data?.length === 0 && <p className="app-state">No hay reclamaciones.</p>}
      <div className="grid">{claims.data?.map(entry => <article className="card" key={entry.publicKey.toBase58()}>
        <span className="eyebrow">RECLAMACIÓN / #{entry.account.claimId.toString()}</span>
        <h3>{Object.keys(entry.account.reason)[0]}</h3>
        <p>Estado: {Object.keys(entry.account.status)[0]}</p>
        {'open' in entry.account.status && <div className="actions"><button type="button" disabled={tx.busy} onClick={() => setPending({ kind: 'resolve', claim: entry.publicKey, claimId: entry.account.claimId.toString(), resolution: 'accepted' })}>ACEPTAR</button><button type="button" className="danger" disabled={tx.busy} onClick={() => setPending({ kind: 'resolve', claim: entry.publicKey, claimId: entry.account.claimId.toString(), resolution: 'rejected' })}>RECHAZAR</button></div>}
      </article>)}</div>
    </>}
    <ActionModal prompt={prompt} onClose={() => setPending(null)} onConfirm={() => { void confirmPending(); }} />
  </section>;
}
