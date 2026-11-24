# Monitor (`/panel/monitor`, maqueta aprobada `Monitor.dc.html`: Tablero · Línea del día · Lista)

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

## Selector de vista: Tablero · Línea del día · Lista
Arriba del contenido (escritorio: junto a «Ver historial en Asistencias»; celular: bajo el título, 3 botones ≥ 44 px).
**Tablero** es la vista por defecto. La elección se recuerda por usuario en este navegador (`localStorage`,
`adamia.monitor.vista.<id_usuario>`, con try/catch: sin almacenamiento queda el Tablero; un valor desconocido también).
Se lee al montar, así que la primera pintura es el Tablero y cambia en cuanto se lee.
Contadores-filtro, búsqueda, área, «Toca una persona para abrir su reloj del día» (`RelojDiaDialog`), aviso de encuestas,
«Ver historial en Asistencias» y el botón «Reloj checador» son los mismos en las tres vistas: las tres reciben las mismas
personas filtradas. Línea y Lista van en el **orden de urgencia del Tablero** (el de sus secciones en celular: No han
llegado → En comida → Trabajando → Por entrar → Ya salieron → Descanso; dentro de cada una, el orden de su columna).
Lógica pura en `src/lib/asistencia/vistasMonitor.mjs` (sobre `estadoHoy`, `columnasTablero` y `fichaTablero`, sin
recalcular estados ni textos); pantallas en `LineaDia.jsx`, `ListaHoy.jsx` y lo común en `comunes.jsx`.

### Línea del día
Una fila por persona: avatar y nombre fijos a la izquierda (el nombre abre la ficha), una barra sobre el eje de horas y,
en escritorio, el chip de estado a la derecha (en celular va bajo el nombre).
- **Eje:** desde la entrada (programada o real) más temprana hasta la salida (programada, extra autorizada o real) más
  tardía o la hora actual, con 30 min de margen y redondeado a la hora; mínimo 4 h. Marcas cada 1 h (día ≤ 12 h), 2 h
  (≤ 24 h) o 3 h. Se calcula con todo el día (no con lo filtrado), para que no brinque al filtrar. Un turno nocturno de
  ayer que sigue vivo alarga el eje desde la noche de ayer (la marca dice la hora del día: «10 p.m.», «12 a.m.»…).
- **Barra:** su horario en gris tenue (no en vacaciones/descanso/sin horario); la extra autorizada en violeta tenue;
  encima lo real: trabajo **azul** si sigue en su jornada (trabajando o en comida) y **gris** si ya salió; comida en
  **ámbar** (botón «Salir a comer» o salida dentro de la comida del horario, el criterio de `estadoHoy`); lo que pasó de
  su comida en **rojo**; trabajo después de su salida programada en **violeta** (hora extra). 🧭 Si ya pasó el aviso
  «debía salir hace…» sin checar salida, lo de después va **rayado en rojo** («Sin checar salida»), no como hora extra
  (mismo criterio del Tablero). Un hueco que no es comida (sale y regresa) no se pinta. Cada tramo dice sus horas al
  pasar el mouse («Comida 2:00 p.m.–2:30 p.m. · 30 min»).
- **Ahora:** línea roja vertical en cada fila y etiqueta con la hora en el eje (las marcas que se enciman se ocultan).
- **Estado** (chip): Trabajando, Hora extra, Sin checar salida, En comida (· se pasó), Salió / Salió antes / Salió con
  permiso, Por entrar, No ha llegado, Faltó, o el tipo de día (Vacaciones, Día de Descanso…).
- Leyenda abajo. Tocar cualquier parte de la fila (también la barra) abre el reloj del día.
- **Celular / eje largo:** el eje se desplaza a lo ancho dentro de su caja (52 px por hora) con la columna del nombre
  fija; la página no desborda. Si el eje no cabe, abre con «ahora» a la vista (a 2/3 del ancho); solo al abrir o si
  cambia el día, para no pelear con el desplazamiento de la persona. En escritorio (~28 px por hora) un día de 24 h cabe.

### Lista
Un renglón compacto por persona: avatar, nombre y área · horario («9:00 a.m.–6:00 p.m.» o «Sin horario hoy») · la línea
y los chips de su tarjeta del Tablero (con «Debe N») · chip de estado. Celular: una tarjeta por persona (nombre y estado
arriba; horario, línea y chips debajo), a todo el ancho y sin desbordes.

El «Monitor de mi equipo» del empleado sigue con las tarjetas y grupos de `monitor.mjs` (sin cambios).

## Backend (rama `agente/asistencias-hoy-back`)
`/checador/asistencias` agrega `tolerancia_salida_min`, `entrada_tramo_abierto` y `permisos_horas_dia` (todos los
permisos por horas aprobados del día). Sin ese backend la vista funciona con lo de antes (un permiso por día; sin
tolerancia de salida; lo trabajado del tramo abierto tras varios tramos no se cuenta).

## Pruebas
- `scripts/test-asistencias-hoy.mjs` (estados) y `scripts/test-monitor.mjs` (tarjetas y grupos del Monitor de equipo,
  razones, saldrán tarde, enlaces viejos y el Tablero: columnas, contadores, pies, líneas y chips), en CI.
  `scripts/test-monitor.mjs` también cubre `vistasMonitor.mjs`: vista válida y clave por usuario, orden de urgencia,
  chip de estado y horario, eje (margen, redondeo, marcas, día corto, turno nocturno), tramos y posiciones.
- `scripts/verify-monitor.mjs`: navegador, hora fija 11:12 CDMX, backend simulado: contadores y filtro, columnas con sus
  personas, chips, tarjeta → reloj, celular en secciones, sin desborde a 1440 y 390. Vistas: el selector cambia de vista
  y se recuerda al recargar; en la Línea, filas en orden de urgencia, horario, tramos y línea de ahora en su hora del eje
  (medido en px), tipos de tramo; en la Lista, cada persona con horario, línea, chips y estado; filtros, búsqueda, área y
  reloj del día en las tres; celular: eje desplazable con el nombre fijo, abre con ahora a la vista, tarjetas sin
  desborde. Capturas con `CAPTURAS=carpeta` (`monitor-linea-*.png`, `monitor-lista-*.png`).

## Hidratación de la fecha y hora del encabezado (INC-006)
Abrir `/panel/monitor` directo (recargar) daba React #418: el servidor pintaba su hora y el navegador otra. La fecha y
hora del encabezado se ponen al montar; hasta entonces dice solo «se actualiza solo».

## Pendiente del backend
- ✅ El backend ya manda `horas_extra_autorizadas_dia: { hasta: "HH:mm", minutos, motivo }` (de las horas extra
  registradas con horario, o de la salida del día si Asistencias dice «Sí» a horas extra; las de reposición no cuentan)
  y `permisos_horas_dia[].motivo`. Lo cubre `tests/miEquipoBd.test.cjs` en el backend.
- ❓ PENDIENTE: la maqueta muestra «regresa el jueves» en vacaciones y un filtro «Sucursal»; no hay dato de regreso en
  la consulta del día y el filtro de área ya existe.

❓ PENDIENTE: la maqueta ordena la Línea por hora de entrada; se usa el orden de urgencia del Tablero (pedido del dueño).
❓ PENDIENTE: varias empresas en zonas distintas comparten un eje en la hora de pared de cada una (la de la primera
persona para la etiqueta de «ahora»); con una sola zona, como hoy, no aplica.

❓ PENDIENTE: la ventana de comida sin botón (30 min antes) y el aviso de salida a los 15 min son criterios propuestos
(🧭), ajustables si el dueño lo pide.
