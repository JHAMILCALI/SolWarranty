import { Link } from 'react-router-dom';
import type { AccountEntry, WarrantyAccount } from '../solana/types';
import { isActive, isExpired } from '../solana/types';
export function WarrantyCard({ entry, storeView = false }: { entry: AccountEntry<WarrantyAccount>; storeView?: boolean }) {
  const w = entry.account;
  const active = isActive(w) && !isExpired(w);
  return <article className="card warranty-card">
    <div className="app-detail-top"><span className="eyebrow">GARANTÍA / #{w.warrantyId.toString()}</span><span className={`app-status${active ? ' is-active' : ''}`}>{isActive(w) ? isExpired(w) ? 'VENCIDA' : 'ACTIVA' : 'BORRADOR'}</span></div>
    <h3>{w.productName}</h3>
    <p><strong>COMPRADOR</strong><br /><code>{w.buyer.toBase58()}</code></p>
    {isActive(w) && <p><strong>VENCE</strong><br />{new Date(w.expiresAt.toNumber() * 1000).toLocaleDateString()}</p>}
    <Link to={storeView ? `/store/warranties/${entry.publicKey.toBase58()}` : `/verify/${entry.publicKey.toBase58()}`}>VER DETALLE ↗</Link>
  </article>;
}
