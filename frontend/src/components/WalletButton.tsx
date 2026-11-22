import { BaseWalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletButton() {
  return <BaseWalletMultiButton labels={{
    'change-wallet': 'Cambiar wallet',
    connecting: 'Conectando…',
    'copy-address': 'Copiar dirección',
    copied: 'Copiada',
    disconnect: 'Desconectar',
    'has-wallet': 'Conectar wallet',
    'no-wallet': 'Conectar wallet',
  }} />;
}
