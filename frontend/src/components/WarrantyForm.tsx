import { useEffect, useState, type FormEvent } from 'react';
import { PublicKey } from '@solana/web3.js';
import { parseHash } from '../solana/transactions';
import type { WarrantyInput } from '../solana/types';

async function generateDemoHash(): Promise<string> {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const digest = await crypto.subtle.digest('SHA-256', random);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

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
  const [generating, setGenerating] = useState(!initial);
  useEffect(() => {
    if (initial) return;
    let active = true;
    Promise.all([generateDemoHash(), generateDemoHash()]).then(([serialHash, receiptHash]) => {
      if (!active) return;
      setSerial(value => value || serialHash);
      setReceipt(value => value || receiptHash);
    }).catch(() => {
      if (active) setError('No se pudieron generar los hashes de demostración. Puedes introducirlos manualmente.');
    }).finally(() => {
      if (active) setGenerating(false);
    });
    return () => { active = false; };
  }, [initial]);
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
    <p className="muted">Para la demo se generan hashes únicos automáticamente. Puedes editarlos. No corresponden a un serial ni a un comprobante reales; los hashes guardados en cadena son públicos.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <button disabled={busy || generating} type="submit">{generating ? 'Generando hashes…' : busy ? 'Procesando…' : initial ? 'Guardar borrador' : 'Crear borrador'}</button>
  </form>;
}
