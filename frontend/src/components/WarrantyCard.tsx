import { Link } from 'react-router-dom';
import type { AccountEntry, WarrantyAccount } from '../solana/types';
import { isActive, isExpired } from '../solana/types';
export function WarrantyCard({ entry, storeView = false }: { entry: AccountEntry<WarrantyAccount>; storeView?: boolean }) {
  const w = entry.account;
  return <article className="card">
    <span className="eyebrow">Garantía #{w.warrantyId.toString()}</span>
    <h3>{w.productName}</h3>
    <p><strong>Estado:</strong> {isActive(w) ? isExpired(w) ? 'Vencida' : 'Activa' : 'Borrador'}</p>
    <p><strong>Comprador:</strong> <code>{w.buyer.toBase58()}</code></p>
    {isActive(w) && <p><strong>Vence:</strong> {new Date(w.expiresAt.toNumber() * 1000).toLocaleDateString()}</p>}
    <Link to={storeView ? `/store/warranties/${entry.publicKey.toBase58()}` : `/verify/${entry.publicKey.toBase58()}`}>Ver detalle →</Link>
  </article>;
}
