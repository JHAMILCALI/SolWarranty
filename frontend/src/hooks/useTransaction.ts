import { useState } from 'react';
import { errorMessage } from '../solana/transactions';
import type { TransactionState } from '../components/TransactionStatus';

export function useTransaction() {
  const [state, setState] = useState<TransactionState>({ phase: 'idle' });
  async function run(action: () => Promise<string>, refresh: () => Promise<unknown>): Promise<void> {
    setState({ phase: 'pending' });
    try {
      const signature = await action();
      await refresh();
      setState({ phase: 'confirmed', signature });
    } catch (error) {
      setState({ phase: 'failed', message: errorMessage(error) });
    }
  }
  return { state, run, busy: state.phase === 'pending' };
}
