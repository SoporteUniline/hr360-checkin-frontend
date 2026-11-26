# Integraciones: API v1 por empresa (frontend) · 26/12/2026

Backend y contrato: `docs/api-integracion.md` y `docs/openapi-integracion-v1.json` del repositorio del backend.

## Pantallas
| Ruta | Quién | Qué |
|---|---|---|
| `/panel/integraciones` (Ajustes → Integraciones) | Solo el dueño de la cuenta (`DUENO` en `src/lib/permisos/permisos.mjs`; el servidor responde 403 `SOLO_DUENO` a cualquier otro) | Crear llave (nombre, permisos, vigencia), verla UNA vez con «Copiar», lista (prefijo, permisos, estado, último uso, vencimiento), revocar con confirmación, bitácora de las últimas 30 peticiones, enlace a la documentación. |
| `/desarrolladores` (pública) | Cualquiera | Documentación de la v1: inicio rápido, autenticación, permisos, empleados (campos), asistencias, paginación, límites, errores, idempotencia, endpoints viejos. Ejemplos `curl` con la base `NEXT_PUBLIC_RUTA_BACKEND/integracion/v1`. |

Piezas: `src/components/integraciones/` (`IntegracionesEmpresa`, `DialogoNuevaLlave`, `ListaLlaves`), reglas y textos en
`src/lib/integraciones/integraciones.mjs` (sin red ni React). Menú lateral y buscador (`nav-main.jsx`, `CommandPalette.jsx`).

## Reglas
- La llave completa solo vive en el estado del diálogo «Copia tu llave ahora»: no se guarda en el navegador
  (sin localStorage, sessionStorage ni cookies) y el servidor no la vuelve a dar.
- Revocar pide confirmación y es inmediato. Una llave revocada ya no muestra «Revocar».
- La empresa es la elegida en el selector (la del dueño); el servidor la revisa contra `usuarios_empresas`.
- Móvil: tarjetas (sin tablas), botones ≥ 44 px, texto ≥ 13 px, bloques de código con salto de línea.
- `SelectorEmpresa` (compartido, `src/components/nomina/comun.jsx`): ahora mide 44 px en el teléfono (`h-11 sm:h-9`).

## Pruebas
- `node --test scripts/test-integraciones.mjs` (en el CI): permisos iguales al servidor, validación, estados, fechas,
  ruta solo del dueño, ejemplos con la llave en la cabecera (nunca en la URL), errores y campos sin prohibidos, la llave
  no se guarda en el navegador.
- `scripts/verify-integraciones.mjs` (Playwright, backend simulado) a 1440 y 390: lista, crear con validación, llave
  una vez y copiar, revocar, bitácora, documentación, acceso → «Solo para el dueño». Uso:
  `NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build` y
  `CAPTURAS=… PLAYWRIGHT_MODULE_PATH=… node scripts/verify-integraciones.mjs`.
