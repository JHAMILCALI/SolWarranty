// Convierte una IDL antigua (Anchor 0.29, Solana Playground) al formato nuevo que exige @anchor-lang/core >= 0.30.
// Uso: node scripts/convert-idl.mjs <idl-antigua.json> public/solwarranty.json <PROGRAM_ID>
import { createHash } from 'crypto';
import fs from 'fs';
const [src, dst, address] = process.argv.slice(2);
const old = JSON.parse(fs.readFileSync(src, 'utf8'));
const snake = s => s.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const disc = s => [...createHash('sha256').update(s).digest().subarray(0, 8)];
const ty = t => {
  if (t === 'publicKey') return 'pubkey';
  if (typeof t === 'string') return t;
  if (t.defined) return { defined: { name: t.defined } };
  if (t.array) return { array: [ty(t.array[0]), t.array[1]] };
  if (t.vec) return { vec: ty(t.vec) };
  if (t.option) return { option: ty(t.option) };
  throw new Error('tipo no soportado: ' + JSON.stringify(t));
};
const SYS = '11111111111111111111111111111111';
const idl = {
  address,
  metadata: { name: old.name, version: old.version, spec: '0.1.0' },
  instructions: old.instructions.map(i => ({
    name: snake(i.name), discriminator: disc(`global:${snake(i.name)}`),
    accounts: i.accounts.map(a => ({
      name: snake(a.name), ...(a.isMut && { writable: true }), ...(a.isSigner && { signer: true }),
      ...(a.name === 'systemProgram' && { address: SYS }),
    })),
    args: i.args.map(a => ({ name: snake(a.name), type: ty(a.type) })),
  })),
  accounts: old.accounts.map(a => ({ name: a.name, discriminator: disc(`account:${a.name}`) })),
  errors: old.errors.map(e => ({ code: e.code, name: e.name, msg: e.msg })),
  types: [...old.accounts, ...old.types].map(t => ({
    name: t.name,
    type: t.type.kind === 'struct'
      ? { kind: 'struct', fields: t.type.fields.map(f => ({ name: snake(f.name), type: ty(f.type) })) }
      : { kind: 'enum', variants: t.type.variants.map(v => ({ name: v.name })) },
  })),
};
fs.writeFileSync(dst, JSON.stringify(idl, null, 2) + '\n');
