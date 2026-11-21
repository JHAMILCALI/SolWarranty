import { useState, type FormEvent } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useNavigate, useParams } from 'react-router-dom';
import { ClaimForm } from '../components/ClaimForm';
import { TransactionStatus } from '../components/TransactionStatus';
import { useChainData } from '../hooks/useChainData';
import { useTransaction } from '../hooks/useTransaction';
import { getWarranty, getStoreByPda, claimsForWarranty } from '../solana/queries';
import { createClaim } from '../solana/transactions';
import { isActive, isExpired } from '../solana/types';

export function VerifyWarrantyPage() {
  const { warrantyPda } = useParams(); const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [searchError, setSearchError] = useState('');
  const { connection } = useConnection(); const wallet = useAnchorWallet();
  const warranty = useChainData(() => warrantyPda ? getWarranty(connection, new PublicKey(warrantyPda)) : Promise.resolve(null), [connection, warrantyPda]);
  const store = useChainData(() => warranty.data ? getStoreByPda(connection, warranty.data.account.store) : Promise.resolve(null), [connection, warranty.data?.account.store.toBase58()]);
  const claims = useChainData(() => warranty.data ? claimsForWarranty(connection, warranty.data.publicKey) : Promise.resolve([]), [connection, warranty.data?.publicKey.toBase58()]);
  const tx = useTransaction();
  function search(event: FormEvent) { event.preventDefault(); try { setSearchError(''); navigate(`/verify/${new PublicKey(address).toBase58()}`); } catch { setSearchError('La dirección Solana no es válida.'); } }
  if (!warrantyPda) return <section><h1>Verificar garantía</h1><form className="search" onSubmit={search}><input required value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección PDA de la garantía"/><button>Consultar</button></form>{searchError && <p className="error" role="alert">{searchError}</p>}</section>;
  const entry = warranty.data; const w = entry?.account;
  const canClaim = !!(wallet && w && wallet.publicKey.equals(w.buyer) && isActive(w) && !isExpired(w) && w.openClaimCount === 0);
  return <section><h1>Verificación pública</h1>{warranty.loading && <p>Leyendo la cuenta en Devnet…</p>}
    {warranty.error && <p className="error" role="alert">{warranty.error}</p>}
    {!warranty.loading && !warranty.error && !entry && <p>No existe una garantía en esa dirección.</p>}
    {entry && w && <><div className="card details"><span className="eyebrow">Garantía #{w.warrantyId.toString()}</span><h2>{w.productName}</h2>
      <p><strong>Estado:</strong> {isActive(w) ? isExpired(w) ? 'Vencida' : 'Activa' : 'Borrador'}</p>
      <p><strong>Tienda:</strong> {store.data?.account.name || 'Cargando tienda…'} · <code>{w.store.toBase58()}</code></p><p><strong>Comprador:</strong> <code>{w.buyer.toBase58()}</code></p>
      <p><strong>Dirección:</strong> <code>{entry.publicKey.toBase58()}</code></p>
      {isActive(w) && <><p><strong>Activada:</strong> {new Date(w.activatedAt.toNumber() * 1000).toLocaleString()}</p><p><strong>Vence:</strong> {new Date(w.expiresAt.toNumber() * 1000).toLocaleString()}</p></>}
      <p><strong>Reclamaciones abiertas:</strong> {w.openClaimCount}</p></div>
      {canClaim && <ClaimForm busy={tx.busy} submit={async (reason, hash) => {
        if (!wallet) return;
        await tx.run(() => createClaim(connection, wallet, w.store, entry.publicKey, BigInt(w.nextClaimId.toString()), reason, hash), async () => { await warranty.refresh(); await claims.refresh(); });
      }} />}
      <TransactionStatus state={tx.state} />
      <h2>Reclamaciones</h2>{claims.loading && <p>Cargando…</p>}{claims.error && <p className="error">{claims.error}</p>}
      {claims.data?.length === 0 && <p>No hay reclamaciones registradas.</p>}
      {claims.data?.map(c => <div className="card" key={c.publicKey.toBase58()}>#{c.account.claimId.toString()} · {Object.keys(c.account.reason)[0]} · {Object.keys(c.account.status)[0]}{Object.keys(c.account.resolution)[0] !== 'none' && ` · ${Object.keys(c.account.resolution)[0]}`}</div>)}</>}
  </section>;
}
