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
