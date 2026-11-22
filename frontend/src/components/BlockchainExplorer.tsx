import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Connection } from '@solana/web3.js';
import { useChainData } from '../hooks/useChainData';
import { getAllStores, getAllWarranties } from '../solana/queries';
import { isActive, isDraft, isExpired, type WarrantyAccount } from '../solana/types';
import '../styles/explorer.css';

interface BlockchainExplorerProps {
  connection: Connection;
}

type StatusFilter = 'all' | 'active' | 'expired' | 'draft';

export function BlockchainExplorer({ connection }: BlockchainExplorerProps) {
  const warrantiesQuery = useChainData(() => getAllWarranties(connection), [connection]);
  const storesQuery = useChainData(() => getAllStores(connection), [connection]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Mapeo rápido de PublicKey de Tienda a su Nombre público
  const storeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of storesQuery.data ?? []) {
      map.set(s.publicKey.toBase58(), s.account.name);
    }
    return map;
  }, [storesQuery.data]);

  const warranties = warrantiesQuery.data ?? [];

  // Métricas globales
  const stats = useMemo(() => {
    let active = 0;
    let expired = 0;
    let draft = 0;
    let totalClaims = 0;

    for (const item of warranties) {
      const w = item.account;
      if (isActive(w)) {
        if (isExpired(w)) expired++;
        else active++;
      } else if (isDraft(w)) {
        draft++;
      }
      totalClaims += w.openClaimCount || 0;
    }

    const uniqueStores = new Set(warranties.map(item => item.account.store.toBase58())).size;

    return {
      total: warranties.length,
      active,
      expired,
      draft,
      uniqueStores: uniqueStores || (storesQuery.data?.length ?? 0),
      totalClaims,
    };
  }, [warranties, storesQuery.data]);

  // Filtrado de garantías según búsqueda y estado
  const filteredWarranties = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return warranties
      .filter(item => {
        const w = item.account;
        const pda = item.publicKey.toBase58().toLowerCase();
        const buyer = w.buyer.toBase58().toLowerCase();
        const storePda = w.store.toBase58().toLowerCase();
        const storeName = (storeMap.get(w.store.toBase58()) || '').toLowerCase();
        const prod = w.productName.toLowerCase();
        const id = w.warrantyId.toString();

        // Filtro de estado
        if (statusFilter === 'active' && (!isActive(w) || isExpired(w))) return false;
        if (statusFilter === 'expired' && !isExpired(w)) return false;
        if (statusFilter === 'draft' && !isDraft(w)) return false;

        // Filtro de texto
        if (!query) return true;
        return (
          prod.includes(query) ||
          pda.includes(query) ||
          buyer.includes(query) ||
          storePda.includes(query) ||
          storeName.includes(query) ||
          id === query
        );
      })
      .sort((a, b) => {
        // Orden descendente por ID seguro con BN
        return b.account.warrantyId.gt(a.account.warrantyId)
          ? 1
          : b.account.warrantyId.lt(a.account.warrantyId)
          ? -1
          : 0;
      });
  }, [warranties, searchQuery, statusFilter, storeMap]);

  function copyToClipboard(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => {
      setCopiedKey(current => (current === label ? null : current));
    }, 2000);
  }

  function formatTimeRemaining(w: WarrantyAccount): string {
    if (isDraft(w)) return 'No activada';
    if (isExpired(w)) return 'Expirada';
    const expiresAtMs = w.expiresAt.toNumber() * 1000;
    const diffMs = expiresAtMs - Date.now();
    if (diffMs <= 0) return 'Expirada';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days > 365) {
      const years = (days / 365).toFixed(1);
      return `~${years} años (${new Date(expiresAtMs).toLocaleDateString()})`;
    }
    if (days > 30) {
      const months = Math.floor(days / 30);
      return `~${months} meses (${new Date(expiresAtMs).toLocaleDateString()})`;
    }
    if (days > 0) return `${days} días (${new Date(expiresAtMs).toLocaleDateString()})`;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    return `${hours}h restantes`;
  }

  const isLoading = warrantiesQuery.loading || storesQuery.loading;

  return (
    <section className="blockchain-explorer" aria-label="Explorador de Garantías Blockchain">
      {/* Encabezado estilo Explorer */}
      <div className="explorer-header-bar">
        <div className="explorer-title-group">
          <div className="explorer-live-badge">
            <span className="live-dot" />
            <span>SOLANA DEVNET LIVE LEDGER</span>
          </div>
          <h2 className="explorer-main-title">
            EXPLORADOR DE <mark>GARANTÍAS</mark>
          </h2>
          <p className="explorer-subtitle">
            Transacciones y contratos inteligentes verificados en la red pública de Solana.
          </p>
        </div>

        <div className="explorer-actions">
          <button
            type="button"
            className="explorer-refresh-btn"
            onClick={() => {
              void warrantiesQuery.refresh();
              void storesQuery.refresh();
            }}
            disabled={isLoading}
            title="Sincronizar con el último bloque de Solana Devnet"
          >
            <span className={`refresh-icon ${isLoading ? 'spinning' : ''}`}>↻</span>
            <span>{isLoading ? 'SINCRONIZANDO…' : 'ACTUALIZAR DATOS'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards estilo Etherscan / Solscan */}
      <div className="explorer-stats-grid">
        <div className="explorer-stat-card">
          <div className="stat-label">TOTAL GARANTÍAS</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-meta">Registros on-chain verificados</div>
        </div>

        <div className="explorer-stat-card is-active-stat">
          <div className="stat-label">
            <span className="mini-dot green" /> ACTIVAS EN VIGENCIA
          </div>
          <div className="stat-value text-green">{stats.active}</div>
          <div className="stat-meta">Listas para cobertura o reclamo</div>
        </div>

        <div className="explorer-stat-card">
          <div className="stat-label">TIENDAS REGISTRADAS</div>
          <div className="stat-value">{stats.uniqueStores}</div>
          <div className="stat-meta">Emisores con autoridad PDA</div>
        </div>

        <div className="explorer-stat-card">
          <div className="stat-label">RECLAMACIONES ABIERTAS</div>
          <div className="stat-value">{stats.totalClaims}</div>
          <div className="stat-meta">Incidentes en curso</div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda en Vivo */}
      <div className="explorer-toolbar">
        <div className="explorer-tabs" role="tablist">
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            TODAS <span className="tab-count">{stats.total}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'active' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            <span className="mini-dot green" /> ACTIVAS <span className="tab-count">{stats.active}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'expired' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('expired')}
          >
            VENCIDAS <span className="tab-count">{stats.expired}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'draft' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('draft')}
          >
            BORRADORES <span className="tab-count">{stats.draft}</span>
          </button>
        </div>

        <div className="explorer-quick-search">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filtrar por producto, tienda o dirección PDA…"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Limpiar filtro"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Contenedor de la Tabla Estilo Etherscan */}
      <div className="explorer-table-card">
        <div className="table-top-meta">
          <span>
            MOSTRANDO <strong>{filteredWarranties.length}</strong> DE <strong>{stats.total}</strong> REGISTROS
          </span>
          <span className="table-chain-badge">SOLANA DEVNET PROGRAM: <code>7uYr...Fp4</code></span>
        </div>

        {warrantiesQuery.error && (
          <div className="explorer-state-box error">
            <p>Error de conexión con Solana Devnet: {warrantiesQuery.error}</p>
            <button type="button" onClick={() => void warrantiesQuery.refresh()}>
              REINTENTAR
            </button>
          </div>
        )}

        {isLoading && warranties.length === 0 && (
          <div className="explorer-state-box loading">
            <div className="explorer-spinner" />
            <p>Leyendo registros de garantías desde la blockchain de Solana…</p>
          </div>
        )}

        {!isLoading && filteredWarranties.length === 0 && !warrantiesQuery.error && (
          <div className="explorer-state-box empty">
            <p>
              {searchQuery || statusFilter !== 'all'
                ? 'No se encontraron garantías que coincidan con los filtros aplicados.'
                : 'Aún no hay garantías públicas registradas en este programa de Devnet.'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                LIMPIAR FILTROS
              </button>
            )}
          </div>
        )}

        {/* Tabla Desktop */}
        <div className="explorer-table-wrapper">
          <table className="etherscan-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>DIRECCIÓN PDA (CUENTA)</th>
                <th>PRODUCTO</th>
                <th>TIENDA</th>
                <th>COMPRADOR</th>
                <th>ESTADO</th>
                <th>VIGENCIA</th>
                <th>RECLAMOS</th>
                <th style={{ textAlign: 'right' }}>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filteredWarranties.map(entry => {
                const w = entry.account;
                const pdaStr = entry.publicKey.toBase58();
                const buyerStr = w.buyer.toBase58();
                const storeStr = w.store.toBase58();
                const storeName = storeMap.get(storeStr) || `${storeStr.slice(0, 4)}...${storeStr.slice(-4)}`;
                const active = isActive(w) && !isExpired(w);
                const expired = isExpired(w);
                const draft = isDraft(w);

                return (
                  <tr key={pdaStr} className="explorer-row">
                    {/* ID */}
                    <td className="col-id">
                      <span className="warranty-id-badge">#{w.warrantyId.toString()}</span>
                    </td>

                    {/* PDA Cuenta */}
                    <td className="col-pda">
                      <div className="address-cell">
                        <Link
                          to={`/verify/${pdaStr}`}
                          className="address-link pda-link"
                          title={`Ver detalle de PDA: ${pdaStr}`}
                        >
                          {pdaStr.slice(0, 6)}...{pdaStr.slice(-6)}
                        </Link>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => copyToClipboard(pdaStr, `pda-${pdaStr}`)}
                          title="Copiar dirección PDA"
                        >
                          {copiedKey === `pda-${pdaStr}` ? '✓' : '⧉'}
                        </button>
                        <a
                          href={`https://explorer.solana.com/address/${pdaStr}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ext-explorer-link"
                          title="Ver en Solana Explorer"
                        >
                          ↗
                        </a>
                      </div>
                    </td>

                    {/* Producto */}
                    <td className="col-product">
                      <div className="product-cell">
                        <span className="product-icon">📦</span>
                        <strong className="product-name">{w.productName}</strong>
                      </div>
                    </td>

                    {/* Tienda */}
                    <td className="col-store">
                      <div className="store-cell" title={`Store PDA: ${storeStr}`}>
                        <span className="store-badge">{storeName}</span>
                      </div>
                    </td>

                    {/* Comprador */}
                    <td className="col-buyer">
                      <div className="address-cell">
                        <span className="address-text" title={buyerStr}>
                          {buyerStr.slice(0, 4)}...{buyerStr.slice(-4)}
                        </span>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => copyToClipboard(buyerStr, `buyer-${buyerStr}`)}
                          title="Copiar dirección de comprador"
                        >
                          {copiedKey === `buyer-${buyerStr}` ? '✓' : '⧉'}
                        </button>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="col-status">
                      {active && (
                        <span className="status-pill status-active">
                          <span className="dot" /> ACTIVA
                        </span>
                      )}
                      {expired && (
                        <span className="status-pill status-expired">
                          <span className="dot" /> VENCIDA
                        </span>
                      )}
                      {draft && (
                        <span className="status-pill status-draft">
                          <span className="dot" /> BORRADOR
                        </span>
                      )}
                    </td>

                    {/* Vigencia */}
                    <td className="col-validity">
                      <span className="validity-text">{formatTimeRemaining(w)}</span>
                    </td>

                    {/* Reclamos */}
                    <td className="col-claims">
                      {w.openClaimCount > 0 ? (
                        <span className="claim-badge open">{w.openClaimCount} abierta</span>
                      ) : (
                        <span className="claim-badge none">0</span>
                      )}
                    </td>

                    {/* Acción */}
                    <td className="col-action" style={{ textAlign: 'right' }}>
                      <Link to={`/verify/${pdaStr}`} className="verify-action-link">
                        VERIFICAR ↗
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil / Cards responsivas */}
        <div className="explorer-mobile-list">
          {filteredWarranties.map(entry => {
            const w = entry.account;
            const pdaStr = entry.publicKey.toBase58();
            const buyerStr = w.buyer.toBase58();
            const storeStr = w.store.toBase58();
            const storeName = storeMap.get(storeStr) || `${storeStr.slice(0, 4)}...${storeStr.slice(-4)}`;
            const active = isActive(w) && !isExpired(w);
            const expired = isExpired(w);
            const draft = isDraft(w);

            return (
              <div key={pdaStr} className="mobile-explorer-card">
                <div className="card-header-row">
                  <div className="card-id-block">
                    <span className="warranty-id-badge">#{w.warrantyId.toString()}</span>
                    <strong className="mobile-product-title">{w.productName}</strong>
                  </div>
                  <div>
                    {active && <span className="status-pill status-active"><span className="dot" /> ACTIVA</span>}
                    {expired && <span className="status-pill status-expired"><span className="dot" /> VENCIDA</span>}
                    {draft && <span className="status-pill status-draft"><span className="dot" /> BORRADOR</span>}
                  </div>
                </div>

                <div className="card-data-grid">
                  <div className="data-item">
                    <label>DIRECCIÓN PDA</label>
                    <div className="address-row">
                      <Link to={`/verify/${pdaStr}`} className="address-link">
                        {pdaStr.slice(0, 8)}...{pdaStr.slice(-8)}
                      </Link>
                      <button
                        type="button"
                        className="copy-btn"
                        onClick={() => copyToClipboard(pdaStr, `pda-m-${pdaStr}`)}
                      >
                        {copiedKey === `pda-m-${pdaStr}` ? '✓' : '⧉'}
                      </button>
                    </div>
                  </div>

                  <div className="data-item">
                    <label>TIENDA EMISORA</label>
                    <span className="store-badge">{storeName}</span>
                  </div>

                  <div className="data-item">
                    <label>COMPRADOR</label>
                    <div className="address-row">
                      <span>{buyerStr.slice(0, 6)}...{buyerStr.slice(-6)}</span>
                      <button
                        type="button"
                        className="copy-btn"
                        onClick={() => copyToClipboard(buyerStr, `buyer-m-${buyerStr}`)}
                      >
                        {copiedKey === `buyer-m-${buyerStr}` ? '✓' : '⧉'}
                      </button>
                    </div>
                  </div>

                  <div className="data-item">
                    <label>VIGENCIA</label>
                    <span>{formatTimeRemaining(w)}</span>
                  </div>
                </div>

                <div className="card-footer-row">
                  <span className="mobile-claims-info">
                    Reclamaciones: <strong>{w.openClaimCount}</strong>
                  </span>
                  <Link to={`/verify/${pdaStr}`} className="verify-action-link">
                    VERIFICAR REGISTRO ↗
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
