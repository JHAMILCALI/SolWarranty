import { useCallback, useEffect, useRef, useState } from 'react';

export function useChainData<T>(load: () => Promise<T>, dependencies: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    try { const value = await load(); if (request === sequence.current) { setData(value); setError(null); } }
    catch (e) { if (request === sequence.current) { setError(e instanceof Error ? e.message : String(e)); setData(null); } }
    finally { if (request === sequence.current) setLoading(false); }
  // Dependencias corresponden a la conexión y la dirección de wallet/PDA.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  useEffect(() => { void refresh(); return () => { sequence.current++; }; }, [refresh]);
  return { data, loading, error, refresh };
}
