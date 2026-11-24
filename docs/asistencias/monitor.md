# Monitor (`/panel/monitor`, vista «Tablero» de la maqueta aprobada `Monitor.dc.html`)

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

## Contadores (filtros, `aria-pressed`) — `src/lib/asistencia/tablero.mjs`
Tocar uno filtra el tablero; tocarlo otra vez (o «ver todos») lo quita. Cuentan con la búsqueda y el área aplicadas.
| Contador | Quién cuenta | Pie | En rojo |
|---|---|---|---|
| Trabajando | tramo abierto (incluye hora extra) | N en hora extra | — |
| En comida | en comida | N ya se pasó / nadie se ha pasado | alguien se pasó |
| Ya salieron | ya salió o salió antes | N salió antes (sin permiso o con uno que lo cubre) | — |
| Por entrar | aún no le toca (o en su tolerancia) | el próximo a las … / ya es su hora / nadie más hoy | — |
| No han llegado | no ha llegado o faltó | ya pasó su hora / todos llegaron | hay alguien |
| Llegaron tarde | retardo, o llegó después de su hora dentro de un permiso «llega tarde» | N con permiso | — |
| Con permiso / día | permiso por horas aprobado hoy, o columna «Descanso / permiso de día» | N por horas · N de día | — |

🧭 Criterio: **hora extra** = sigue trabajando después de su salida programada; si ya pasó el aviso «debía salir hace…»
(15 min tras su salida o tras la hora extra autorizada) no se presume hora extra: la tarjeta dice «Sin checar salida ·
debía salir hace N» — porque un olvido de checar no debe contarse como hora extra.

## Tablero: 6 columnas (una por persona), con su número; vacías dicen «Nadie»
Por entrar · Trabajando · En comida · Ya salieron · No han llegado · Descanso / permiso de día. Cada tarjeta: iniciales,
nombre (abre la ficha), área, una línea y chips; barra de avance en Trabajando (trabajado / programado; morada en hora
extra) y En comida (lleva / le toca; roja si se pasó). Iconos y colores de los desplegables (`iconosAsistencia.js`).
| Columna | Línea | Chips |
|---|---|---|
| Trabajando | Entró 9:18 a.m. · sale 6:00 p.m. · lleva 1 h 54 min | Llegó tarde +18 min / con permiso, Hora extra desde …, Sale en … (última media hora), Sin checar salida, Extra autorizada hasta …, Come … |
| En comida | Salió a comer 10:05 a.m. · lleva 1 h 7 min de 1 h | Se pasó 7 min / Regresa a las … |
| Ya salieron | Salió 10:30 a.m. · trabajó 3 h 30 min | Salió antes −4 h 30 min / Salió antes con permiso |
| Por entrar | Entra 12:00 p.m. · en 48 min / ya es su hora / en su tolerancia | Llega tarde con permiso |
| No han llegado | Debía entrar 9:00 a.m. · van 2 h 12 min (· media jornada si faltó) | Sin checar |
| Descanso / permiso de día | Vacaciones, Día de Descanso, Sin horario hoy… | — |
Además: el permiso por horas con su motivo si ningún chip lo dijo y «Debe N» (cuenta de horas) como antes.
Orden dentro de cada columna: por hora (entra antes, lleva más esperando, salió más tarde) y luego nombre.

Tocar cualquier parte de la tarjeta abre el reloj del día (`RelojDiaDialog`, la misma ventana de Asistencias).
**Celular:** no hay tablero lateral: las columnas pasan a secciones apiladas en el orden de lo urgente (No han llegado,
En comida, Trabajando, Por entrar, Ya salieron, Descanso); contadores con desplazamiento horizontal (lo urgente
primero); tarjetas ≥ 44 px. Pantallas medianas (1024–1359 px): 3 columnas; desde 1360 px: las 6.
Se conserva: aviso de encuestas pendientes, «Ver historial en Asistencias» y el botón «Reloj checador» de la barra.
Datos: `/checador/asistencias` de ayer y hoy (todos), recargados con cada checada por SSE (`useRefrescoChecadas`); la
hora se recalcula cada 30 s.

El «Monitor de mi equipo» del empleado sigue con las tarjetas y grupos de `monitor.mjs` (sin cambios).

## Backend (rama `agente/asistencias-hoy-back`)
`/checador/asistencias` agrega `tolerancia_salida_min`, `entrada_tramo_abierto` y `permisos_horas_dia` (todos los
permisos por horas aprobados del día). Sin ese backend la vista funciona con lo de antes (un permiso por día; sin
tolerancia de salida; lo trabajado del tramo abierto tras varios tramos no se cuenta).

## Pruebas
- `scripts/test-asistencias-hoy.mjs` (estados) y `scripts/test-monitor.mjs` (tarjetas y grupos del Monitor de equipo,
  razones, saldrán tarde, enlaces viejos y el Tablero: columnas, contadores, pies, líneas y chips), en CI.
- `scripts/verify-monitor.mjs`: navegador, hora fija 11:12 CDMX, backend simulado: contadores y filtro, columnas con sus
  personas, chips, tarjeta → reloj, celular en secciones, sin desborde a 1440 y 390.

## Pendiente del backend
- ❓ PENDIENTE: «Saldrán tarde» necesita las horas extra autorizadas ANTES de que ocurran. `/checador/asistencias` no las
  manda; el Monitor lee `horas_extra_autorizadas_dia: { hasta: "HH:mm", minutos?, motivo? }` en cada registro (propuesta
  de contrato en `salidaExtraDe`, hoy.mjs). Sin ese campo no aparece el chip «Extra autorizada hasta …».
- ❓ PENDIENTE: el motivo de los permisos por horas (`permisos_horas_dia[].motivo`) no viene del backend; sin él la
  fila dice solo el horario del permiso.
- ❓ PENDIENTE: la maqueta muestra «regresa el jueves» en vacaciones y un filtro «Sucursal»; no hay dato de regreso en
  la consulta del día y el filtro de área ya existe.

❓ PENDIENTE: la ventana de comida sin botón (30 min antes) y el aviso de salida a los 15 min son criterios propuestos
(🧭), ajustables si el dueño lo pide.
