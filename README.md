# SolWarranty

Prototipo académico de garantías verificables en Solana Devnet. La [guía de implementación](docs/IMPLEMENTACION.md) recoge el trabajo y los criterios pendientes. Ruta de entrega: **proyecto propio**.

## Estado actual

El repositorio incluye un único archivo de contrato Anchor (`contract/programs/solwarranty/src/lib.rs`) y una aplicación React + Vite preparada para conectarse al programa. El frontend se instaló con npm y `npm run build` pasó. El programa está desplegado en **Devnet** con Program ID `7uYrQU8oTEK7JaPfAcZPQSQcJLMs2BmxfmVkc1iSbFp4` y el frontend apunta a él (`frontend/.env.example` y `frontend/public/solwarranty.json`). La IDL se reconstruyó desde `lib.rs` porque el programa no publicó su IDL en la cadena; una simulación de `initialize_store` contra Devnet fue aceptada. **Aún no se han ejecutado las pruebas on-chain completas (matriz T01–T14) ni hay firmas Devnet documentadas.** Si el binario desplegado difiere de `lib.rs`, reemplazar `solwarranty.json` por la IDL de ese build.

## Arquitectura

- `Store` PDA: `['store', authority]`.
- `Warranty` PDA: `['warranty', store, warranty_id u64 little endian]`.
- `Claim` PDA: `['claim', warranty, claim_id u64 little endian]`.
- El contrato controla permisos, relaciones, vigencia y cierre exclusivo de borradores. Las garantías activas y las reclamaciones resueltas permanecen en cadena.
- El frontend consulta cuentas directamente por RPC. Las consultas de garantías usan filtros por `store` o `buyer`; no descargan todas las cuentas para filtrar en el navegador.
- El verificador público usa un cliente Anchor de solo lectura. Las operaciones usan un `AnchorProvider` con la wallet conectada.

## Estructura del frontend

| Ubicación | Responsabilidad |
|---|---|
| `src/solana/config.ts` | RPC, red, Program ID y enlace Explorer |
| `src/solana/program.ts` | Carga de la IDL y clientes de lectura/escritura |
| `src/solana/pdas.ts` | Derivación de PDAs con semillas del contrato |
| `src/solana/queries.ts` | Lectura de Store, Warranty y Claim |
| `src/solana/transactions.ts` | Validación de entradas y siete instrucciones P0 |
| `src/hooks/` | Carga/refresco de datos y estado de transacción |
| `src/pages/` | Inicio, tienda, editor, comprador y verificación |
| `src/components/` | Formularios, tarjeta y estado de transacción |

## Integración tras el build en Solana Playground

1. Crear un proyecto Anchor llamado `solwarranty` en Solana Playground. Copiar el contenido de `contract/programs/solwarranty/src/lib.rs` a `src/lib.rs` del proyecto. Playground asignará el `declare_id!` real al compilar.
2. Compilar y probar el programa. Corregir cualquier diferencia de versión de Anchor antes de desplegar.
3. Desplegar a **Devnet**. Guardar Program ID y firma de despliegue verificables.
4. Copiar la IDL generada por **ese mismo build** a `frontend/public/solwarranty.json`. Debe contener `address` igual al Program ID desplegado y nombres de instrucciones/cuentas usados por este cliente.
5. Copiar `frontend/.env.example` a `frontend/.env` y sustituir `VITE_PROGRAM_ID` por el ID real. `VITE_SOLANA_RPC_URL` debe apuntar a Devnet.
6. Para ejecutar el frontend: `cd frontend`, `npm ci`, `npm run dev`. El `package-lock.json` está versionado y `npm run build` pasó localmente.
7. Con wallets de tienda y comprador con SOL de Devnet, completar el flujo: registrar tienda → crear borrador → editar → activar → reclamar → resolver. Crear otro borrador y cerrarlo. Registrar firmas y errores del programa.

La app detecta la falta de IDL y el desacuerdo entre `IDL.address` y `VITE_PROGRAM_ID`; muestra el error en las páginas que consultan la cadena. No hay claves privadas ni credenciales en las variables `VITE_*`.

## Reglas de negocio importantes

La duración admitida es de 1 a 730 días. El nombre del producto ocupa 1–64 bytes UTF-8, el de la tienda como máximo 48 bytes. Los campos de serie, recibo y descripción se envían como hashes de 32 bytes; no introducir datos personales. El ID de garantía y el de reclamación son contadores monótonos. Cerrar un borrador reduce `draft_count`, pero **no reutiliza** su ID. Solo hay una reclamación abierta por garantía. La vigencia se calcula desde el reloj on-chain; el frontend solo la representa.

## Pruebas y entrega pendiente

Antes de declarar listo el proyecto, ejecutar la [matriz T01–T14](docs/IMPLEMENTACION.md), incluyendo wallets no autorizadas, relación cruzada Claim/Warranty, reclamación vencida y cierre válido/inválido. Documentar para cada caso estado inicial, resultado observado y estado final. Añadir la IDL, las firmas y el Program ID reales. No inventar evidencias de Devnet.
