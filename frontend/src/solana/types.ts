import type { BN } from '@anchor-lang/core';
import type { PublicKey } from '@solana/web3.js';

export type StoreAccount = { authority: PublicKey; name: string; nextWarrantyId: BN; draftCount: number; bump: number };
export type WarrantyAccount = {
  store: PublicKey; buyer: PublicKey; warrantyId: BN; productName: string;
  serialHash: number[]; receiptHash: number[]; durationSeconds: BN;
  activatedAt: BN; expiresAt: BN; status: { draft?: object; active?: object };
  nextClaimId: BN; openClaimCount: number; bump: number;
};
export type ClaimAccount = {
  warranty: PublicKey; claimant: PublicKey; claimId: BN;
  reason: Record<string, object>; descriptionHash: number[];
  status: { open?: object; resolved?: object }; resolution: Record<string, object>;
  createdAt: BN; resolvedAt: BN; bump: number;
};
export type AccountEntry<T> = { publicKey: PublicKey; account: T };
export type WarrantyInput = {
  buyer: PublicKey; productName: string; serialHash: number[];
  receiptHash: number[]; durationSeconds: number;
};
export const isDraft = (w: WarrantyAccount) => 'draft' in w.status;
export const isActive = (w: WarrantyAccount) => 'active' in w.status;
export const isExpired = (w: WarrantyAccount) => isActive(w) && Date.now() > w.expiresAt.toNumber() * 1000;
