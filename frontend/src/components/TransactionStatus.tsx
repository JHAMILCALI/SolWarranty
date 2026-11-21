import { explorerUrl } from '../solana/config';
export type TransactionState = { phase: 'idle' | 'pending' | 'confirmed' | 'failed'; signature?: string; message?: string };
export function TransactionStatus({ state }: { state: TransactionState }) {
  if (state.phase === 'idle') return null;
  return <div className={`transaction ${state.phase}`} role="status">
    {state.phase === 'pending' && 'Esperando firma y confirmación en Devnet…'}
    {state.phase === 'confirmed' && 'Transacción confirmada. Datos leídos de nuevo desde Devnet.'}
    {state.phase === 'failed' && (state.message || 'La transacción falló.')}
    {state.signature && <> <a href={explorerUrl(state.signature)} target="_blank" rel="noreferrer">Ver en Explorer ↗</a></>}
  </div>;
}
