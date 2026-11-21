import { AnchorProvider, Program, type Idl } from '@anchor-lang/core';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import type { Connection } from '@solana/web3.js';
import { configuredProgramId } from './config';

let idlPromise: Promise<Idl> | undefined;
export function loadIdl(): Promise<Idl> {
  configuredProgramId();
  idlPromise ??= fetch('/solwarranty.json').then(async response => {
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error('Falta frontend/public/solwarranty.json: copia la IDL del build desplegado.');
    const idl = await response.json() as Idl;
    const configured = configuredProgramId().toBase58();
    if (idl.address !== configured) throw new Error('La dirección de la IDL y VITE_PROGRAM_ID no coinciden.');
    return idl;
  }).catch(error => { idlPromise = undefined; throw error; });
  return idlPromise;
}

export async function readProgram(connection: Connection): Promise<Program> {
  return new Program(await loadIdl(), { connection });
}
export async function writeProgram(connection: Connection, wallet: AnchorWallet | undefined): Promise<Program> {
  if (!wallet) throw new Error('Conecta una wallet para firmar.');
  return new Program(await loadIdl(), new AnchorProvider(connection, wallet, { commitment: 'confirmed' }));
}
