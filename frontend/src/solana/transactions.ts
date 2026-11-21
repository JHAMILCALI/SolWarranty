import { BN } from '@anchor-lang/core';
import { PublicKey, SystemProgram, type Connection } from '@solana/web3.js';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import { configuredProgramId } from './config';
import { claimPda, storePda, warrantyPda } from './pdas';
import { writeProgram } from './program';
import type { WarrantyInput } from './types';

export function parseHash(value: string): number[] {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) throw new Error('El hash debe tener 64 caracteres hexadecimales SHA-256.');
  return Array.from({ length: 32 }, (_, i) => parseInt(value.slice(i * 2, i * 2 + 2), 16));
}
export function validateInput(input: WarrantyInput): void {
  const size = new TextEncoder().encode(input.productName).length;
  if (size === 0 || size > 64) throw new Error('El producto debe ocupar entre 1 y 64 bytes UTF-8.');
  if (input.durationSeconds < 86_400 || input.durationSeconds > 730 * 86_400) throw new Error('La duración debe ser de 1 a 730 días.');
}

export async function initializeStore(connection: Connection, wallet: AnchorWallet, name: string): Promise<string> {
  if (new TextEncoder().encode(name).length > 48 || !name.trim()) throw new Error('Nombre de tienda inválido (máximo 48 bytes).');
  const program = await writeProgram(connection, wallet);
  return program.methods.initializeStore(name).accounts({
    store: storePda(configuredProgramId(), wallet.publicKey), authority: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  }).rpc();
}

export async function createWarranty(connection: Connection, wallet: AnchorWallet, id: bigint, input: WarrantyInput): Promise<string> {
  validateInput(input);
  const program = await writeProgram(connection, wallet);
  const store = storePda(configuredProgramId(), wallet.publicKey);
  return program.methods.createWarranty(new BN(id.toString()), input.buyer, input.productName,
    input.serialHash, input.receiptHash, new BN(input.durationSeconds)).accounts({
      store, warranty: warrantyPda(configuredProgramId(), store, id), authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    }).rpc();
}

export async function updateWarranty(connection: Connection, wallet: AnchorWallet, warranty: PublicKey, input: WarrantyInput): Promise<string> {
  validateInput(input);
  const program = await writeProgram(connection, wallet);
  return program.methods.updateWarranty(input.buyer, input.productName, input.serialHash,
    input.receiptHash, new BN(input.durationSeconds)).accounts({
      store: storePda(configuredProgramId(), wallet.publicKey), warranty, authority: wallet.publicKey,
    }).rpc();
}

export async function activateWarranty(connection: Connection, wallet: AnchorWallet, warranty: PublicKey): Promise<string> {
  const program = await writeProgram(connection, wallet);
  return program.methods.activateWarranty().accounts({
    store: storePda(configuredProgramId(), wallet.publicKey), warranty, authority: wallet.publicKey,
  }).rpc();
}

export async function closeDraft(connection: Connection, wallet: AnchorWallet, warranty: PublicKey): Promise<string> {
  const program = await writeProgram(connection, wallet);
  return program.methods.closeDraft().accounts({
    store: storePda(configuredProgramId(), wallet.publicKey), warranty, authority: wallet.publicKey,
  }).rpc();
}

export async function createClaim(connection: Connection, wallet: AnchorWallet, store: PublicKey,
  warranty: PublicKey, id: bigint, reason: 'screen' | 'battery' | 'charging' | 'other', hash: number[]): Promise<string> {
  const program = await writeProgram(connection, wallet);
  return program.methods.createClaim(new BN(id.toString()), { [reason]: {} }, hash).accounts({
    store, warranty, claim: claimPda(configuredProgramId(), warranty, id),
    claimant: wallet.publicKey, systemProgram: SystemProgram.programId,
  }).rpc();
}

export async function resolveClaim(connection: Connection, wallet: AnchorWallet, warranty: PublicKey,
  claim: PublicKey, resolution: 'accepted' | 'rejected'): Promise<string> {
  const program = await writeProgram(connection, wallet);
  return program.methods.resolveClaim({ [resolution]: {} }).accounts({
    store: storePda(configuredProgramId(), wallet.publicKey), warranty, claim, authority: wallet.publicKey,
  }).rpc();
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (/User rejected|declined|rejected the request/i.test(error.message)) return 'La wallet rechazó la firma.';
    return error.message;
  }
  return String(error);
}
