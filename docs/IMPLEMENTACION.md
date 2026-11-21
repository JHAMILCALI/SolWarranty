# Implementación pendiente y criterios de integración

Esta guía reúne los pasos verificables para completar el contrato y su conexión con el frontend. El código del contrato no se ha compilado ni desplegado; el frontend sí tiene dependencias instaladas con npm y pasó `npm run build`.

## 1. Contrato, antes de conectar la UI

El archivo fuente es [`lib.rs`](../contract/programs/solwarranty/src/lib.rs). En Solana Playground se debe copiar a un proyecto Anchor, fijar la versión efectiva de Anchor y compilar. El `declare_id!` actual es un marcador. Después se ejecutan pruebas sobre `initialize_store`, `create_warranty`, `update_warranty`, `activate_warranty`, `create_claim`, `resolve_claim` y `close_draft`.

La matriz T01–T14 de esta guía es el control de aceptación. Hay que confirmar especialmente los tres invariantes: `next_warranty_id` nunca retrocede; `draft_count` baja solo al activar/cerrar un borrador; `open_claim_count` queda en 0 después de resolver. Los rechazos se prueban con cuentas existentes y firmantes válidos para aislar la regla que se pretende demostrar.

## 2. Artefactos de integración

Tras compilar y desplegar en Devnet, copiar la IDL de ese build a `frontend/public/solwarranty.json`. La propiedad `address` debe coincidir con `VITE_PROGRAM_ID` y con `declare_id!`. El cliente comprueba esa igualdad antes de consultar o enviar transacciones. No mantener IDL de un build anterior tras cambiar el contrato. Si la versión concreta de Playground genera una IDL o API TypeScript diferente, adaptar `program.ts` y `transactions.ts` a esa versión y repetir el flujo completo.

La familia prevista es Anchor `@anchor-lang/core` con `@solana/web3.js` v1. La documentación de Anchor confirma esa combinación, pero las versiones exactas quedan sujetas al build real. El `package-lock.json` registra las versiones instaladas; `npm run build` pasó localmente.

## 3. Rutas y estados de interfaz

| Ruta | Fuente de datos | Mutaciones | Estado vacío/error |
|---|---|---|---|
| `/` | Ninguna | Conectar wallet | Mensaje de alcance |
| `/store` | Store PDA, Warranty filtradas por store | Registrar tienda | Wallet desconectada, tienda inexistente, RPC/IDL fallida |
| `/store/warranties/new` | Store y siguiente ID | Crear borrador | Tienda inexistente, entrada inválida |
| `/store/warranties/:id` | Warranty y Claim filtradas | Editar, activar, cerrar, resolver | PDA inexistente, otra tienda, RPC fallida |
| `/my-warranties` | Warranty filtradas por buyer | Ninguna | Wallet desconectada o lista vacía |
| `/verify/:warrantyPda` | Warranty, Store y Claim | Reclamar si corresponde | Dirección inválida, PDA inexistente, RPC fallida |

Las páginas de lectura usan un `Program` sin wallet. El adaptador de wallet se requiere solo para firmas. Cada mutación espera la confirmación que devuelve `.rpc()`, vuelve a consultar las cuentas y muestra la firma en Explorer. El botón deshabilitado es una ayuda de interfaz; los permisos se aplican dentro del contrato.

## 4. Comprobación manual de punta a punta

1. Configurar Devnet, IDL y Program ID del mismo build. Conectar Wallet A con fondos de prueba.
2. Registrar Store, crear borrador y comprobar el ID y `draft_count` en la lectura actualizada.
3. Editar el borrador y activar. Comparar fechas y estado con la cuenta on-chain.
4. Conectar Wallet B, comprobar el filtro de `/my-warranties` y abrir una Claim en `/verify/:warrantyPda`.
5. Volver a Wallet A, resolver la Claim y comprobar que `open_claim_count` vuelve a 0.
6. Crear y cerrar otro borrador. Comprobar que el siguiente ID no se reutiliza.
7. Ejecutar las pruebas negativas de la matriz siguiente con Wallet C y relaciones cruzadas. Registrar el error Anchor real y los estados antes/después.
8. Comprobar vista móvil, desconexión de wallet, error de RPC y desajuste de IDL/Program ID.

## 5. Matriz de aceptación on-chain

| ID | Escenario | Resultado esperado |
|---|---|---|
| T01 | Wallet A crea Store | Store PDA creada y legible |
| T02 | A crea Warranty Draft | Store vinculada; `next_warranty_id` aumenta |
| T03 | A edita Draft | Misma PDA con campos actualizados |
| T04 | A activa Warranty | Fechas del reloj on-chain; baja `draft_count` |
| T05 | Wallet B abre Claim | Claim vinculada; `open_claim_count == 1` |
| T06 | A resuelve Claim | Resolved; `open_claim_count == 0` |
| T07 | Wallet C edita Warranty de A | Rechazo; datos intactos |
| T08 | Resolver Claim A junto a Warranty B | Rechazo de relación; cuentas intactas |
| T09 | Cerrar Warranty Active | Rechazo; cuenta persiste |
| T10 | Cerrar Warranty Draft | Cuenta cerrada; `draft_count` baja; ID no retrocede |
| T11 | Wallet ajena abre Claim | Rechazo por comprador |
| T12 | Abrir Claim después del vencimiento | Rechazo real por vigencia |
| T13 | Abrir segunda Claim simultánea | Rechazo; contador intacto |
| T14 | Resolver Claim ya resuelta | Rechazo; estado intacto |

Para cada caso registrar estado inicial, acción, resultado esperado, resultado observado, estado final y firma o error Anchor. Un fallo de RPC o un botón deshabilitado no demuestra una regla del contrato.

## 6. Pendientes de entrega

No hay IDL, tests on-chain ejecutados, Program ID ni evidencias de Devnet porque el contrato todavía no se ha compilado o desplegado. Son requisitos para declarar el proyecto completo. Los hashes deben generarse fuera de la cadena y no se deben subir datos privados ni claves.
