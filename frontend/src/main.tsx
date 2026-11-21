import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { App } from './App';
import { RPC_URL } from './solana/config';
import '@solana/wallet-adapter-react-ui/styles.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ConnectionProvider endpoint={RPC_URL}><WalletProvider wallets={[new PhantomWalletAdapter()]} autoConnect><WalletModalProvider><BrowserRouter><App /></BrowserRouter></WalletModalProvider></WalletProvider></ConnectionProvider></React.StrictMode>);
