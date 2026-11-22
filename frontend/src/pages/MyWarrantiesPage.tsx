import { Link } from 'react-router-dom';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { WarrantyCard } from '../components/WarrantyCard';
import { WalletButton } from '../components/WalletButton';
import { useChainData } from '../hooks/useChainData';
import { warrantiesForBuyer } from '../solana/queries';

export function MyWarrantiesPage() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const result = useChainData(() => wallet ? warrantiesForBuyer(connection, wallet.publicKey) : Promise.resolve([]), [connection, wallet?.publicKey.toBase58()]);

  return <section className="app-page warranties-page">
    <div className="app-page-heading">
      <p className="app-kicker">02 / ESPACIO DEL COMPRADOR <span>● SOLANA DEVNET</span></p>
      <h1>MIS <em>GARANTÍAS.</em></h1>
      <p className="app-lede">Tus productos, su cobertura y el historial de reclamaciones, vinculados a tu wallet.</p>
    </div>
    {!wallet && <div className="app-state app-state-feature"><img src="/img/SolWarranty_isotipo.svg" alt="" /><div><span className="app-kicker">ACCESO / COMPRADOR</span><h2>TU WALLET. TUS GARANTÍAS<span className="app-period">.</span></h2><p>Conecta tu wallet de comprador para consultar las garantías asociadas.</p><div style={{ marginTop: '18px' }}><WalletButton /></div></div></div>}
    {wallet && result.loading && <p className="app-state">Buscando en Devnet…</p>}
    {wallet && result.error && <p className="error app-state" role="alert">{result.error}</p>}
    {wallet && result.data?.length === 0 && <p className="app-state">No hay garantías asociadas a esta wallet. <Link to="/verify">Verificar una dirección ↗</Link></p>}
    <div className="grid">{wallet && result.data?.map(w => <WarrantyCard key={w.publicKey.toBase58()} entry={w} />)}</div>
  </section>;
}
