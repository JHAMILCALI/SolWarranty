import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { WarrantyCard } from '../components/WarrantyCard';
import { useChainData } from '../hooks/useChainData';
import { warrantiesForBuyer } from '../solana/queries';
export function MyWarrantiesPage() {
  const { connection } = useConnection(); const wallet = useAnchorWallet();
  const result = useChainData(() => wallet ? warrantiesForBuyer(connection, wallet.publicKey) : Promise.resolve([]), [connection, wallet?.publicKey.toBase58()]);
  return <section><h1>Mis garantías</h1>{!wallet && <p>Conecta tu wallet de comprador para consultar garantías asociadas.</p>}
    {wallet && result.loading && <p>Buscando en Devnet…</p>}
    {wallet && result.error && <p className="error" role="alert">{result.error}</p>}
    {wallet && result.data?.length === 0 && <p>No hay garantías asociadas a esta wallet.</p>}
    <div className="grid">{wallet && result.data?.map(w => <WarrantyCard key={w.publicKey.toBase58()} entry={w} />)}</div>
  </section>;
}
