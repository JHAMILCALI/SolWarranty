import type { Connection, GetProgramAccountsFilter, PublicKey } from '@solana/web3.js';
import type { Program } from '@anchor-lang/core';
import { configuredProgramId } from './config';
import { storePda } from './pdas';
import { readProgram } from './program';
import type { AccountEntry, ClaimAccount, StoreAccount, WarrantyAccount } from './types';

// La IDL se carga en ejecución; estos son los únicos nombres de cuenta que
// el cliente espera del build desplegado.
type AccountReader<T> = {
  fetchNullable(address: PublicKey): Promise<T | null>;
  all(filters: GetProgramAccountsFilter[]): Promise<AccountEntry<T>[]>;
};
function accountReaders(program: Program) {
  return program.account as unknown as {
    store: AccountReader<StoreAccount>;
    warranty: AccountReader<WarrantyAccount>;
    claim: AccountReader<ClaimAccount>;
  };
}

export async function getStore(connection: Connection, authority: PublicKey): Promise<AccountEntry<StoreAccount> | null> {
  const program = await readProgram(connection);
  const publicKey = storePda(configuredProgramId(), authority);
  const account = await accountReaders(program).store.fetchNullable(publicKey);
  return account ? { publicKey, account } : null;
}
export async function getStoreByPda(connection: Connection, publicKey: PublicKey): Promise<AccountEntry<StoreAccount> | null> {
  const program = await readProgram(connection);
  const account = await accountReaders(program).store.fetchNullable(publicKey);
  return account ? { publicKey, account } : null;
}
export async function getWarranty(connection: Connection, publicKey: PublicKey): Promise<AccountEntry<WarrantyAccount> | null> {
  const program = await readProgram(connection);
  const account = await accountReaders(program).warranty.fetchNullable(publicKey);
  return account ? { publicKey, account } : null;
}
export async function warrantiesForStore(connection: Connection, store: PublicKey): Promise<AccountEntry<WarrantyAccount>[]> {
  const program = await readProgram(connection);
  return accountReaders(program).warranty.all([{ memcmp: { offset: 8, bytes: store.toBase58() } }]);
}
export async function warrantiesForBuyer(connection: Connection, buyer: PublicKey): Promise<AccountEntry<WarrantyAccount>[]> {
  const program = await readProgram(connection);
  return accountReaders(program).warranty.all([{ memcmp: { offset: 40, bytes: buyer.toBase58() } }]);
}
export async function getAllWarranties(connection: Connection): Promise<AccountEntry<WarrantyAccount>[]> {
  const program = await readProgram(connection);
  return accountReaders(program).warranty.all([]);
}
export async function getAllStores(connection: Connection): Promise<AccountEntry<StoreAccount>[]> {
  const program = await readProgram(connection);
  return accountReaders(program).store.all([]);
}
export async function claimsForWarranty(connection: Connection, warranty: PublicKey): Promise<AccountEntry<ClaimAccount>[]> {
  const program = await readProgram(connection);
  return accountReaders(program).claim.all([{ memcmp: { offset: 8, bytes: warranty.toBase58() } }]);
}
