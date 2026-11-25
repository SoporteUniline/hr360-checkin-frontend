# Asistencias → «Horas por reponer» (25/11/2026)

Pestaña aprobada por el dueño (maqueta `Main.dc.html`; solo el contenido de la pestaña, el menú no cambia).
Se abre con `/panel/registro-asistencia?vista=reponer` y lleva el número de personas que deben.

## Pantalla (`src/app/panel/registro-asistencia/horas-reponer/`)
- **Resumen:** total que te deben (con personas), «Más de 30 días» (rojo si hay alguien), repuesto este mes,
  rebajado / condonado este mes.
- **Filtros:** búsqueda (nombre o área, sin acentos), área, «Solo más de 30 días», «Exportar Excel» (lo filtrado).
- **Tabla** (tarjetas en celular): persona y área, debe, desde (+ «hace N días», rojo desde 30), por qué, lo último,
  «Registrar reposición» y «⋯» (Rebajar en nómina · Condonar · Ver en Panel empleado).
- **Fila desplegada:** movimientos del más viejo al más nuevo con «Cancelar» en cada permiso con solicitud y «Deshacer»
  en cada cierre vigente, saldo y «Qué hacer con lo que debe».

## Datos y acciones (backend, `docs/horas-por-reponer.md` del backend)
| Acción | Endpoint |
|---|---|
| Lista y resumen | `GET /checador/cuenta-horas/por-reponer?empresa=all|ID` |
| Movimientos | `GET /checador/cuenta-horas/:id_empleado` |
| Registrar reposición | `PUT /checador/horas-extra/empleado/:id` con forma «Reposición de tiempo por tiempo» |
| Rebajar / Condonar | `POST /checador/cuenta-horas/:id/cierres` |
| Deshacer | `POST /checador/cuenta-horas/cierres/:id/deshacer` |
| Cancelar permiso | `PATCH /checador/solicitudes-permiso/:id/estado` `{ estado: "Cancelado" }` |

Lógica pura: `src/lib/asistencia/horasPorReponer.mjs` (la regla de cierre la usa también la Cuenta del Panel empleado).

## Pruebas
- `scripts/test-horas-por-reponer.mjs` (CI, «Asistencias — cálculo…»).
- `scripts/verify-horas-reponer.mjs` (navegador, backend simulado, 1440 y 390).

## «Rebajar en nómina» en la nómina (26/11/2026)
El backend descuenta cada «Rebajar» en la nómina («Horas no repuestas (2 h)», misma tarifa por hora que las horas sin
goce; una sola vez; periodo del día del cierre o el siguiente si ese ya está autorizado — backend
`docs/horas-por-reponer.md`). Cada cierre «rebaja» de `GET /checador/cuenta-horas/:id` trae `nomina` o null.
- Movimientos (pestaña, Panel empleado → Permisos y la cuenta del empleado en su inicio): debajo del «Rebajado» dice
  «Se descontará en la próxima nómina», «Va en la nómina del 16 al 22 nov 2026 (borrador) · $37.50», «En la nómina del …,
  por autorizar · …» o «Descontado en la nómina del … · …» (`textoNominaCierre` en `src/lib/asistencia/permisoHoras.mjs`).
- Ya no se ofrece «Deshacer» si esa nómina está por autorizar o autorizada (`bloqueado`); el backend responde 409.
- Pruebas: `scripts/test-permiso-horas.mjs`, `scripts/test-horas-por-reponer.mjs`, `scripts/verify-horas-reponer.mjs` y
  `scripts/verify-permisos-horas.mjs`.
