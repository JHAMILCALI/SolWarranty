import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TransactionStatus } from '../components/TransactionStatus';
import { WarrantyForm } from '../components/WarrantyForm';
import { useChainData } from '../hooks/useChainData';
import { useTransaction } from '../hooks/useTransaction';
import { getStore, getWarranty, claimsForWarranty } from '../solana/queries';
import { createWarranty, updateWarranty, activateWarranty, closeDraft, resolveClaim } from '../solana/transactions';
import type { WarrantyInput } from '../solana/types';
import { isDraft } from '../solana/types';

function hex(bytes: number[]): string { return Array.from(bytes).map(v => v.toString(16).padStart(2, '0')).join(''); }

export function WarrantyEditorPage() {
  const { id } = useParams(); const navigate = useNavigate();
  const isCreating = !id || id === 'new';
  const { connection } = useConnection(); const wallet = useAnchorWallet();
  const store = useChainData(() => wallet ? getStore(connection, wallet.publicKey) : Promise.resolve(null), [connection, wallet?.publicKey.toBase58()]);
  const warranty = useChainData(() => !isCreating && id ? getWarranty(connection, new PublicKey(id)) : Promise.resolve(null), [connection, id]);
  const claims = useChainData(() => warranty.data ? claimsForWarranty(connection, warranty.data.publicKey) : Promise.resolve([]), [connection, warranty.data?.publicKey.toBase58()]);
  const tx = useTransaction();
  if (!wallet) return <p>Conecta la wallet de la tienda.</p>;
  if (store.loading || warranty.loading) return <p>Leyendo Devnet…</p>;
  if (store.error || warranty.error) return <p className="error" role="alert">{store.error || warranty.error}</p>;
  if (!store.data) return <p>Registra primero tu tienda en <Link to="/store">el panel</Link>.</p>;
  if (!isCreating && !warranty.data) return <p>Garantía inexistente.</p>;
  if (warranty.data && !warranty.data.account.store.equals(store.data.publicKey)) return <p>Esta garantía pertenece a otra tienda.</p>;
  const current = warranty.data;
  async function save(input: WarrantyInput) {
    if (!wallet || !store.data) return;
    if (current) {
      await tx.run(() => updateWarranty(connection, wallet, current.publicKey, input), warranty.refresh);
    } else {
      await tx.run(() => createWarranty(connection, wallet, BigInt(store.data!.account.nextWarrantyId.toString()), input), async () => { await store.refresh(); navigate('/store'); });
    }
  }
  async function change(action: 'activate' | 'close') {
    if (!wallet || !current) return;
    await tx.run(() => action === 'activate' ? activateWarranty(connection, wallet, current.publicKey) : closeDraft(connection, wallet, current.publicKey), async () => {
      await store.refresh();
      if (action === 'close') navigate('/store'); else await warranty.refresh();
    });
  }
  return <section><Link to="/store">← Volver a tienda</Link><h1>{current ? `Garantía #${current.account.warrantyId.toString()}` : 'Nueva garantía'}</h1>
    {(!current || isDraft(current.account)) && <WarrantyForm key={current?.publicKey.toBase58() || 'new'} busy={tx.busy} submit={save} initial={current ? {
      buyer: current.account.buyer.toBase58(), productName: current.account.productName,
      serialHash: hex(current.account.serialHash), receiptHash: hex(current.account.receiptHash),
      days: current.account.durationSeconds.toNumber() / 86_400,
    } : undefined} />}
    {current && <div className="card"><p>Dirección: <code>{current.publicKey.toBase58()}</code></p><p>Comprador: <code>{current.account.buyer.toBase58()}</code></p><p>Estado: {isDraft(current.account) ? 'Borrador' : 'Activa'}</p>
      {isDraft(current.account) && <div className="actions"><button disabled={tx.busy} onClick={() => change('activate')}>Activar garantía</button><button className="danger" disabled={tx.busy} onClick={() => change('close')}>Cerrar borrador</button></div>}
      <Link to={`/verify/${current.publicKey.toBase58()}`}>Verificar públicamente →</Link></div>}
    <TransactionStatus state={tx.state} />
    {current && <><h2>Reclamaciones</h2>{claims.loading && <p>Cargando…</p>}{claims.error && <p className="error">{claims.error}</p>}
      {claims.data?.length === 0 && <p>No hay reclamaciones.</p>}{claims.data?.map(entry => <article className="card" key={entry.publicKey.toBase58()}><h3>Reclamación #{entry.account.claimId.toString()}</h3><p>Motivo: {Object.keys(entry.account.reason)[0]}</p><p>Estado: {Object.keys(entry.account.status)[0]}</p>{'open' in entry.account.status && <div className="actions"><button disabled={tx.busy} onClick={() => wallet && tx.run(() => resolveClaim(connection, wallet, current.publicKey, entry.publicKey, 'accepted'), claims.refresh)}>Aceptar</button><button disabled={tx.busy} onClick={() => wallet && tx.run(() => resolveClaim(connection, wallet, current.publicKey, entry.publicKey, 'rejected'), claims.refresh)}>Rechazar</button></div>}</article>)}</>}
  </section>;
}
