import { PublicKey } from '@solana/web3.js';

export const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const CLUSTER = import.meta.env.VITE_SOLANA_CLUSTER || 'devnet';
const programIdText = import.meta.env.VITE_PROGRAM_ID || '7uYrQU8oTEK7JaPfAcZPQSQcJLMs2BmxfmVkc1iSbFp4';

export function configuredProgramId(): PublicKey {
  if (!programIdText || programIdText.startsWith('REEMPLAZAR')) {
    throw new Error('Configura VITE_PROGRAM_ID con el ID real del programa desplegado en Devnet.');
  }
  try { return new PublicKey(programIdText); }
  catch { throw new Error('VITE_PROGRAM_ID no es una dirección Solana válida.'); }
}

export function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
}
