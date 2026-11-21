import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { WarrantyCard } from '../components/WarrantyCard';
import { TransactionStatus } from '../components/TransactionStatus';
import { useChainData } from '../hooks/useChainData';
import { useTransaction } from '../hooks/useTransaction';
import { getStore, warrantiesForStore } from '../solana/queries';
import { initializeStore } from '../solana/transactions';

export function StoreDashboardPage() {
  const { connection } = useConnection(); const wallet = useAnchorWallet();
  const [name, setName] = useState('');
  const store = useChainData(() => wallet ? getStore(connection, wallet.publicKey) : Promise.resolve(null), [connection, wallet?.publicKey.toBase58()]);
  const warranties = useChainData(() => store.data ? warrantiesForStore(connection, store.data.publicKey) : Promise.resolve([]), [connection, store.data?.publicKey.toBase58()]);
  const tx = useTransaction();
  async function register(event: FormEvent) {
    event.preventDefault();
    if (!wallet) return;
    await tx.run(() => initializeStore(connection, wallet, name), store.refresh);
  }
  if (!wallet) return <section><h1>Panel de tienda</h1><p>Conecta la wallet administradora para continuar.</p></section>;
  return <section>
    <div className="page-heading"><div><span className="eyebrow">Administración</span><h1>{store.data?.account.name ?? 'Mi tienda'}</h1></div>{store.data && <Link className="button" to="/store/warranties/new">Nueva garantía</Link>}</div>
    {store.loading && <p>Cargando tienda desde Devnet…</p>}
    {store.error && <p className="error" role="alert">{store.error}</p>}
    {!store.loading && !store.error && !store.data && <form className="form card" onSubmit={register}><h2>Registrar tienda</h2><label>Nombre público<input required value={name} onChange={e => setName(e.target.value)} /></label><button disabled={tx.busy}>Crear tienda</button></form>}
    <TransactionStatus state={tx.state} />
    {store.data && <><p>{store.data.account.draftCount} borradores · siguiente ID {store.data.account.nextWarrantyId.toString()}</p>
      {warranties.loading && <p>Cargando garantías…</p>}
      {warranties.error && <p className="error" role="alert">{warranties.error}</p>}
      {warranties.data?.length === 0 && <p>Aún no hay garantías.</p>}
      <div className="grid">{warranties.data?.map(w => <WarrantyCard key={w.publicKey.toBase58()} entry={w} storeView />)}</div></>}
  </section>;
}
