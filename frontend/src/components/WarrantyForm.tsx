import { useState, type FormEvent } from 'react';
import { PublicKey } from '@solana/web3.js';
import { parseHash } from '../solana/transactions';
import type { WarrantyInput } from '../solana/types';

export function WarrantyForm({ initial, submit, busy }: {
  initial?: { buyer: string; productName: string; serialHash: string; receiptHash: string; days: number };
  submit: (value: WarrantyInput) => Promise<void>; busy: boolean;
}) {
  const [buyer, setBuyer] = useState(initial?.buyer || '');
  const [product, setProduct] = useState(initial?.productName || '');
  const [serial, setSerial] = useState(initial?.serialHash || '');
  const [receipt, setReceipt] = useState(initial?.receiptHash || '');
  const [days, setDays] = useState(initial?.days || 365);
  const [error, setError] = useState('');
  async function onSubmit(event: FormEvent) {
    event.preventDefault(); setError('');
    try { await submit({ buyer: new PublicKey(buyer), productName: product.trim(), serialHash: parseHash(serial), receiptHash: parseHash(receipt), durationSeconds: days * 86_400 }); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  return <form onSubmit={onSubmit} className="form card">
    <label>Wallet del comprador<input required value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="Dirección Solana" /></label>
    <label>Producto público<input required maxLength={64} value={product} onChange={e => setProduct(e.target.value)} /></label>
    <label>Hash SHA-256 del serial (hex)<input required pattern="[0-9a-fA-F]{64}" value={serial} onChange={e => setSerial(e.target.value)} /></label>
    <label>Hash SHA-256 del comprobante (hex)<input required pattern="[0-9a-fA-F]{64}" value={receipt} onChange={e => setReceipt(e.target.value)} /></label>
    <label>Duración en días<input required type="number" min="1" max="730" value={days} onChange={e => setDays(Number(e.target.value))} /></label>
    <p className="muted">Solo envía hashes, nunca el serial ni la factura. Los datos en cadena son públicos.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <button disabled={busy} type="submit">{busy ? 'Procesando…' : initial ? 'Guardar borrador' : 'Crear borrador'}</button>
  </form>;
}
