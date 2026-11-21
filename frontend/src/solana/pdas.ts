import { PublicKey } from '@solana/web3.js';

function u64le(value: bigint): Uint8Array {
  if (value < 0n || value > 0xffff_ffff_ffff_ffffn) throw new Error('ID fuera de rango u64.');
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) bytes[i] = Number((value >> BigInt(i * 8)) & 255n);
  return bytes;
}

export function storePda(programId: PublicKey, authority: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([new TextEncoder().encode('store'), authority.toBytes()], programId)[0];
}
export function warrantyPda(programId: PublicKey, store: PublicKey, id: bigint): PublicKey {
  return PublicKey.findProgramAddressSync([new TextEncoder().encode('warranty'), store.toBytes(), u64le(id)], programId)[0];
}
export function claimPda(programId: PublicKey, warranty: PublicKey, id: bigint): PublicKey {
  return PublicKey.findProgramAddressSync([new TextEncoder().encode('claim'), warranty.toBytes(), u64le(id)], programId)[0];
}
