# Monitor (`/panel/monitor`, maqueta aprobada `Main.dc.html` y `MovilMonitor.dc.html`)

Primera pantalla de RH y dueño: `/panel` y el login llevan aquí. Es la vista que antes era «Hoy / En vivo» dentro de
Asistencias; Asistencias quedó como historial (Registros › Tabla | Matriz y Horas de ley) y los enlaces viejos con
`?vista=envivo` (o `hoy`) redirigen al Monitor. El dashboard sigue en el menú como «Resumen» (no «Inicio», para no
confundirlo con la primera pantalla). Barra superior: botón «Reloj checador» (junto a Adamia AI) hacia
`/seleccionar-reloj`, el reloj de la empresa que ya usaba RH (elige empresa, revisa el plan y abre `/<slug>` con rostro,
NIP o QR; sin conexión abre el reloj descargado).

## Un estado por persona (en este orden)
1. **No laboran hoy** (plegado, con conteo): descanso, vacaciones, permiso de día, incapacidad, festivo o sin horario,
   si NO checó. Si checó en su descanso, cuenta lo que checó (sin retardo ni «salió antes»: no tenía horario).
2. Sin checadas: **Faltó** (ya pasó la mitad de su jornada) → **No ha llegado** (pasó entrada + tolerancia de la
   empresa; «Debía entrar hace X») → **Por entrar** (grupo «Por entrar»). Un permiso «llega tarde» aprobado corre la
   entrada hasta su `hora_fin` y la mitad de la jornada se mide desde ahí.
3. Con tramo abierto: **Trabajando**, con «Llegó tarde +N» si su primera entrada pasó entrada (o permiso) + tolerancia
   (cuenta en la tarjeta «Llegaron tarde»). Barra trabajado / programado; aviso «debía salir hace…» 15 min después.
4. Todo cerrado y la última salida fue a comer (botón «Salir a comer», o 🧭 una salida dentro de la comida de su
   horario o 30 min antes) → **En comida** «lleva N de M min»; si N > M, urgente «se pasó». Si ya pasó su hora de
   salida y no regresó, esa salida cuenta como la final.
5. Salida final antes de su hora (menos la tolerancia de salida de la empresa) sin permiso que la cubra → **Salió
   antes** (urgente, «faltaron X»). Con permiso «sale antes» desde esa hora, o «sale y regresa» mientras dura (o si
   termina con su jornada) → **Ya salió** («Salió con permiso»).

Turno nocturno: la salida programada menor o igual a la entrada es del día siguiente; se muestra el turno de ayer mientras
siga abierto o no llegue su hora de salida. Varios tramos: se suman los cerrados + el abierto desde su entrada.

## Tarjetas (filtros, `aria-pressed`) — `src/lib/asistencia/monitor.mjs`
| Tarjeta | Quién cuenta | Pie |
|---|---|---|
| En jornada | trabajando o en comida | de N programados |
| Llegaron tarde | primera entrada pasó entrada (o permiso) + tolerancia | promedio +N min |
| No han llegado | no ha llegado o faltó | N ya a media jornada / ya pasó su hora |
| Con permiso | permiso de día (permiso, vacaciones, incapacidad) o permiso por horas aprobado hoy | N por horas · N todo el día |
| En comida | en comida | N excedida(s) |
| Saldrán tarde | horas extra autorizadas para hoy y aún no sale | N h extra autorizadas |
| Por entrar | aún no le toca entrar | la próxima a las … |

## Grupos (uno por persona, en este orden) y razón de la fila
1. **Requiere atención**: faltó, no ha llegado, salió antes, comida excedida y llegó tarde (aunque siga trabajando).
   «Faltó · sin checadas a media jornada», «No ha llegado · debía entrar hace 2 h 12 min», «Salió antes · 10:30 a.m. ·
   faltaron 4 h 30 min», «En comida 67 de 60 min», «Llegó 18 min tarde».
2. **Con permiso**: «Permiso 10:00 a.m.–12:00 p.m. · motivo», «Permiso para salir a las 4:00 p.m.», «Vacaciones».
3. **Saldrán tarde**: «Saldrá 8:00 p.m. · 3 h extra · motivo».
4. **En comida** → **En jornada** (8 y «ver todos») → **Por entrar** → **Ya salieron** (8 y «ver todos») →
   **No laboran hoy** (plegado).

Clic en cualquier parte de la fila abre el día con la misma ventana de Asistencias (`EditarDiaAsistencia` →
`PanelEditarAsistencia`). El nombre abre la ficha. Celular: tarjetas con desplazamiento horizontal (lo que pide acción
primero), filas como tarjetas (toda la tarjeta ≥ 44 px abre el día). Datos: `/checador/asistencias` de ayer y hoy (todos),
recargados con cada checada por SSE (`useRefrescoChecadas`, el mismo de Asistencias); la hora se recalcula cada 30 s.

## Backend (rama `agente/asistencias-hoy-back`)
`/checador/asistencias` agrega `tolerancia_salida_min`, `entrada_tramo_abierto` y `permisos_horas_dia` (todos los
permisos por horas aprobados del día). Sin ese backend la vista funciona con lo de antes (un permiso por día; sin
tolerancia de salida; lo trabajado del tramo abierto tras varios tramos no se cuenta).

## Pruebas
- `scripts/test-asistencias-hoy.mjs` (estados) y `scripts/test-monitor.mjs` (tarjetas, grupos, razones, saldrán tarde,
  enlaces viejos), en CI.
- `scripts/verify-monitor.mjs`: navegador, hora fija 11:12 CDMX, backend simulado (antes `verify-asistencias-hoy.mjs`).

## Pendiente del backend
- ❓ PENDIENTE: «Saldrán tarde» necesita las horas extra autorizadas ANTES de que ocurran. `/checador/asistencias` no las
  manda; el Monitor lee `horas_extra_autorizadas_dia: { hasta: "HH:mm", minutos?, motivo? }` en cada registro (propuesta
  de contrato en `salidaExtraDe`, hoy.mjs). Sin ese campo la tarjeta queda en 0 y el grupo no aparece.
- ❓ PENDIENTE: el motivo de los permisos por horas (`permisos_horas_dia[].motivo`) no viene del backend; sin él la
  fila dice solo el horario del permiso.
- ❓ PENDIENTE: la maqueta muestra «regresa el jueves» en vacaciones y un filtro «Sucursal»; no hay dato de regreso en
  la consulta del día y el filtro de área ya existe.

❓ PENDIENTE: la ventana de comida sin botón (30 min antes) y el aviso de salida a los 15 min son criterios propuestos
(🧭), ajustables si el dueño lo pide.
