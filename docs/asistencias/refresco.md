# Asistencias y Monitor al día sin recargar (25/11/2026)

Incidente: `docs/incidentes/INC-008-asistencias-sin-refresco.md`. Backend: `hr360-checkin-backend/docs/refresco-asistencias.md`.

## Un solo punto: el refrescador

`src/lib/asistencia/refrescoAsistencias.js` (lógica pura en `refresco.mjs`, pruebas `scripts/test-refresco-asistencias.mjs`).
Revalida **todas** las claves SWR que dependen de las asistencias con `mutate(esClaveAsistencia)` de SWR (solo las que
están montadas piden algo; las demás se piden al volver a montarse):

| Prefijo | Qué es |
|---|---|
| `/checador/asistencias` | tabla de Asistencias y Monitor; periodo completo `["/checador/asistencias#periodo", filtros]` (tarjetas, filtros por columna, matriz); día abierto desde Nómina (`EditarDiaAsistencia`); historial `/:id/cambios` |
| `/checador/reloj/asistencia`, `/checador/reloj/asistencia-por-empleado` | checadas del día en el panel de edición |
| `/checador/cuenta-horas` | `CuentaHorasContext`, «Horas por reponer» (y su contador en la pestaña), detalle de la cuenta |
| `/checador/horas-extra` | `useHorasExtraDia`, diálogos de reposición |
| `/checador/reportes/horas-ley` | pestaña «Horas de ley» (`VistaHoras`) |
| `/checador/mi-equipo/hoy` | monitor del jefe (app del empleado) |

Fuera: `/checador/asistencias/:id/reloj` (el reloj del día toma su borrador de la primera carga; se vuelve a pedir al
abrirlo) y los catálogos (festivos, tipos, motivos, empleados).

`filterOptionsRows` (periodo completo) dejó de ser un `useEffect` que cargaba una vez: ahora es una clave SWR con
`keepPreviousData`, así entra en la misma recarga.

## Cuándo recarga

1. **Guardado en este navegador** (cualquier pantalla): el interceptor de respuestas de `lib/axios.js` (instancia y
   `axios` global) reconoce las escrituras 2xx a `/checador/asistencias…`, `/reloj/actualizar`, `/bulk-incident`,
   `/horas-extra`, `/cuenta-horas`, `/solicitudes-permiso`, `/turnos-extra` y recarga todo una vez. Los `onGuardado` /
   `mutateAsistencia` de las pantallas (`conRefrescoAsistencias`) se unen a esa recarga en vez de pedir otra.
2. **Otros usuarios o pestañas**: `useRefrescoChecadas` (Asistencias y Monitor, una conexión SSE por pantalla) escucha
   `checada` (con su aviso «Nueva checada…») y `asistencia` (aviso discreto «Asistencias actualizadas», máx. 1 cada 8 s
   y nunca justo después de un guardado propio). Con «Todas las empresas» se suscribe a las empresas del usuario.
   Los eventos se juntan 1 s (hora pico, masivos).
3. **Respaldo si el SSE se cae**: al volver a la pestaña (si hubo avisos mientras estaba oculta, si el canal calló o si
   pasó 1 min) y un sondeo cada 60 s **solo con la pestaña a la vista y solo si no llegó `ping` en 75 s**.

## No pisa ediciones

Con cambios sin guardar (la guardia `CambiosPendientes` → `window.__adamiaCambiosPendientes`: reloj del día, panel de
edición con horas extra, ficha…) lo automático (SSE, foco, sondeo, cola) queda **pendiente** y se hace al cerrar la
edición. Con la pestaña oculta, igual: se recarga al volver. El guardado propio sí recarga (es la persona guardando).

## Peticiones por ciclo (medidas en `scripts/verify-refresco-asistencias.mjs`)

- Escritorio (vista «Todos los registros»): **3** — tabla, cuenta de horas, «Horas por reponer». Igual para guardado,
  evento `asistencia` y `checada`. Antes: 1 (solo la tabla; lo demás se quedaba viejo).
- Celular / tabla paginada: **5** — tabla, conteo del periodo, periodo completo, cuenta de horas, por reponer.
- Monitor: **2** — registros (ayer y hoy) y cuenta de horas.
- Pestaña «Horas de ley» abierta: +1 (`horas-ley`). Panel de edición abierto: +checadas del día y horas extra.
- Un guardado + su `onGuardado` + el eco SSE = una sola vuelta. Ráfaga de 25 eventos = una vuelta.
