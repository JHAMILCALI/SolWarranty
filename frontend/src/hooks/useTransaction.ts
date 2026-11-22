import { useState } from 'react';
import { errorMessage } from '../solana/transactions';
import { useNotifications } from '../components/Notifications';

export type TransactionState = { phase: 'idle' | 'pending' | 'confirmed' | 'failed'; signature?: string; message?: string };

export function useTransaction() {
  const [state, setState] = useState<TransactionState>({ phase: 'idle' });
  const notify = useNotifications();
  async function run(action: () => Promise<string>, refresh: () => Promise<unknown>, label = 'Operación'): Promise<void> {
    setState({ phase: 'pending' });
    notify({ kind: 'pending', title: `${label} en curso`, message: 'Confirma la solicitud en tu wallet y espera la respuesta de Solana Devnet.' });
    try {
      const signature = await action();
      setState({ phase: 'confirmed', signature });
      try {
        await refresh();
        notify({ kind: 'success', title: `${label} confirmada`, message: 'La transacción se registró correctamente en Solana Devnet.', signature });
      } catch {
        notify({ kind: 'info', title: `${label} confirmada`, message: 'La transacción se registró, pero no se pudieron actualizar los datos de esta pantalla. Recarga la página para verlos.', signature });
      }
    } catch (error) {
      const message = errorMessage(error);
      setState({ phase: 'failed', message });
      notify({ kind: 'error', title: `${label} no se completó`, message });
    }
  }
  return { state, run, busy: state.phase === 'pending' };
}
