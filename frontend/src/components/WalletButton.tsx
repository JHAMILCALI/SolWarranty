import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useNotifications } from './Notifications';

interface WalletButtonProps {
  className?: string;
  label?: string;
}

export function WalletButton({ className = '', label }: WalletButtonProps) {
  const { connection } = useConnection();
  const { publicKey, wallet, disconnect, connecting, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const notify = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Consulta y suscripción en tiempo real al saldo de SOL en Devnet
  useEffect(() => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    let isMounted = true;
    const fetchBalance = async () => {
      try {
        const lamports = await connection.getBalance(publicKey, 'confirmed');
        if (isMounted) setBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        if (isMounted) setBalance(null);
      }
    };

    void fetchBalance();

    let subId: number | null = null;
    try {
      subId = connection.onAccountChange(
        publicKey,
        account => {
          if (isMounted) setBalance(account.lamports / LAMPORTS_PER_SOL);
        },
        'confirmed'
      );
    } catch {
      // Ignorar si el RPC no soporta suscripción
    }

    return () => {
      isMounted = false;
      if (subId !== null) {
        try {
          connection.removeAccountChangeListener(subId);
        } catch {
          // Ignorar error al limpiar
        }
      }
    };
  }, [connection, publicKey, connected]);

  // Cerrar el menú al hacer click fuera o presionar Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleCopyAddress() {
    if (!publicKey) return;
    void navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    notify({
      kind: 'info',
      title: 'Dirección copiada',
      message: 'La clave pública de tu wallet está en el portapapeles.',
    });
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAirdrop() {
    if (!publicKey) return;
    setAirdropping(true);
    notify({
      kind: 'pending',
      title: 'Airdrop en curso',
      message: 'Solicitando 1 SOL de prueba a Solana Devnet…',
    });

    try {
      const signature = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
      const newBal = await connection.getBalance(publicKey, 'confirmed');
      setBalance(newBal / LAMPORTS_PER_SOL);
      notify({
        kind: 'success',
        title: '¡1 SOL recibido!',
        message: 'Tu saldo en Devnet se ha actualizado correctamente.',
        signature,
      });
    } catch {
      notify({
        kind: 'error',
        title: 'Airdrop limitado por Devnet',
        message: 'Solana Devnet limita la frecuencia del grifo. Si necesitas fondos, usa faucet.solana.com.',
      });
    } finally {
      setAirdropping(false);
    }
  }

  // Estado: Conectando
  if (connecting) {
    return (
      <button type="button" className={`sw-wallet-btn is-connecting ${className}`} disabled>
        <span className="sw-wallet-spinner" aria-hidden="true" />
        <span>CONECTANDO…</span>
      </button>
    );
  }

  // Estado: Desconectado
  if (!connected || !publicKey) {
    return (
      <button
        type="button"
        className={`sw-wallet-btn is-disconnected ${className}`}
        onClick={() => setVisible(true)}
      >
        <span className="sw-wallet-dot-idle" />
        <span className="sw-wallet-icon-glyph">◈</span>
        <span className="sw-wallet-text">{label || 'CONECTAR WALLET'}</span>
      </button>
    );
  }

  const pdaStr = publicKey.toBase58();
  const truncatedAddr = `${pdaStr.slice(0, 4)}...${pdaStr.slice(-4)}`;

  // Estado: Conectado con Píldora Web3 y Menú Desplegable
  return (
    <div className={`sw-wallet-container ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`sw-wallet-btn is-connected ${isOpen ? 'is-menu-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={`Conectado: ${pdaStr}`}
      >
        {/* Píldora de Saldo en Devnet */}
        <div className="sw-wallet-balance-tag">
          <span className="sw-wallet-dot-live" />
          <span className="sw-wallet-balance-num">
            {balance !== null ? `${balance.toFixed(2)} SOL` : '0.00 SOL'}
          </span>
        </div>

        {/* Separador */}
        <span className="sw-wallet-divider" />

        {/* Identidad de la Wallet */}
        <div className="sw-wallet-user-tag">
          {wallet?.adapter.icon ? (
            <img src={wallet.adapter.icon} alt="" className="sw-wallet-avatar-img" />
          ) : (
            <span className="sw-wallet-avatar-fallback">⧖</span>
          )}
          <span className="sw-wallet-address">{truncatedAddr}</span>
          <span className="sw-wallet-chevron" aria-hidden="true">
            {isOpen ? '▴' : '▾'}
          </span>
        </div>
      </button>

      {/* Menú Flotante de la Wallet (Popover Moderno) */}
      {isOpen && (
        <div className="sw-wallet-dropdown" role="dialog" aria-label="Detalles de la wallet conectada">
          {/* Cabecera del usuario */}
          <div className="sw-dropdown-header">
            <div className="sw-dropdown-identity">
              {wallet?.adapter.icon && (
                <img src={wallet.adapter.icon} alt="" className="sw-dropdown-wallet-icon" />
              )}
              <div className="sw-dropdown-name-group">
                <strong>{wallet?.adapter.name || 'Solana Wallet'}</strong>
                <span className="sw-dropdown-network-pill">
                  <span className="sw-wallet-dot-live" /> DEVNET
                </span>
              </div>
            </div>
            <button
              type="button"
              className="sw-dropdown-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar menú de wallet"
            >
              ×
            </button>
          </div>

          {/* Bloque de dirección con copiado */}
          <div className="sw-dropdown-address-card">
            <span className="sw-dropdown-mono-address" title={pdaStr}>
              {pdaStr}
            </span>
            <div className="sw-dropdown-address-actions">
              <button
                type="button"
                className="sw-dropdown-pill-btn"
                onClick={handleCopyAddress}
              >
                {copied ? '✓ COPIADO' : '⧉ COPIAR DIRECCIÓN'}
              </button>
              <a
                href={`https://explorer.solana.com/address/${pdaStr}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="sw-dropdown-pill-link"
              >
                SOLSCAN / EXPLORER ↗
              </a>
            </div>
          </div>

          {/* Bloque de saldo y airdrop rápido */}
          <div className="sw-dropdown-balance-box">
            <div className="sw-balance-details">
              <small>SALDO DEVNET</small>
              <strong>{balance !== null ? `${balance.toFixed(4)} SOL` : 'Cargando…'}</strong>
            </div>
            <button
              type="button"
              className="sw-airdrop-btn"
              onClick={() => { void handleAirdrop(); }}
              disabled={airdropping}
              title="Solicitar 1 SOL de prueba gratuito en Solana Devnet"
            >
              {airdropping ? 'PIDIENDO…' : '+ 1 SOL (AIRDROP)'}
            </button>
          </div>

          {/* Enlaces de acceso rápido */}
          <div className="sw-dropdown-nav">
            <Link
              to="/my-warranties"
              className="sw-dropdown-nav-row"
              onClick={() => setIsOpen(false)}
            >
              <span>📜 Mis Garantías Registradas</span>
              <span className="sw-nav-arrow">↗</span>
            </Link>
            <Link
              to="/store"
              className="sw-dropdown-nav-row"
              onClick={() => setIsOpen(false)}
            >
              <span>🏪 Mi Panel de Tienda</span>
              <span className="sw-nav-arrow">↗</span>
            </Link>
            <Link
              to="/verify"
              className="sw-dropdown-nav-row"
              onClick={() => setIsOpen(false)}
            >
              <span>🔍 Explorador On-Chain</span>
              <span className="sw-nav-arrow">↗</span>
            </Link>
          </div>

          {/* Acciones de desconexión y cambio */}
          <div className="sw-dropdown-footer">
            <button
              type="button"
              className="sw-footer-btn"
              onClick={() => {
                setIsOpen(false);
                setVisible(true);
              }}
            >
              Cambiar wallet
            </button>
            <button
              type="button"
              className="sw-footer-btn is-danger"
              onClick={() => {
                setIsOpen(false);
                void disconnect();
              }}
            >
              Desconectar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
