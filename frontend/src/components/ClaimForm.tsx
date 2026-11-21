import { useState, type FormEvent } from 'react';
import { parseHash } from '../solana/transactions';
export function ClaimForm({ submit, busy }: { submit: (reason: 'screen' | 'battery' | 'charging' | 'other', hash: number[]) => Promise<void>; busy: boolean }) {
  const [reason, setReason] = useState<'screen' | 'battery' | 'charging' | 'other'>('screen');
  const [hash, setHash] = useState(''); const [error, setError] = useState('');
  async function onSubmit(event: FormEvent) {
    event.preventDefault(); setError('');
    try { await submit(reason, hash ? parseHash(hash) : Array(32).fill(0)); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  return <form className="form card" onSubmit={onSubmit}><h3>Presentar reclamación</h3>
    <label>Motivo<select value={reason} onChange={e => setReason(e.target.value as typeof reason)}><option value="screen">Pantalla</option><option value="battery">Batería</option><option value="charging">Carga</option><option value="other">Otro</option></select></label>
    <label>Hash SHA-256 de descripción (opcional)<input value={hash} onChange={e => setHash(e.target.value)} pattern="[0-9a-fA-F]{64}" placeholder="64 caracteres hexadecimales" /></label>
    {error && <p className="error" role="alert">{error}</p>}<button disabled={busy}>Crear reclamación</button>
  </form>;
}
