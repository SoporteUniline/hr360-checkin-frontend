# Monitor (`/panel/monitor`, maquetas aprobadas `Main.dc.html` / `MovilMonitor.dc.html`: Tabla · Línea del día)

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
Tocar uno filtra la Tabla (o la Línea); tocarlo otra vez (o «ver todos») lo quita. Cuentan con la búsqueda y el área aplicadas.
| Contador | Quién cuenta | Pie | En rojo |
|---|---|---|---|
| Trabajando | tramo abierto (incluye hora extra) | N en hora extra | — |
| En comida | en comida | N ya se pasó / nadie se ha pasado | alguien se pasó |
| Ya salieron | ya salió o salió antes | N salió antes (sin permiso o con uno que lo cubre) | — |
| Por entrar | aún no le toca (o en su tolerancia) | el próximo a las … / ya es su hora / nadie más hoy | — |
| No han llegado | no ha llegado o faltó | ya pasó su hora / todos llegaron | hay alguien |
| Llegaron tarde | retardo, o llegó después de su hora dentro de un permiso «llega tarde» | N con permiso | — |
| Con permiso / día | permiso por horas aprobado hoy, o momento «Descanso / permiso de día» (descanso, vacaciones…) | N por horas · N de día | — |

🧭 Criterio: **hora extra** = sigue trabajando después de su salida programada; si ya pasó el aviso «debía salir hace…»
(15 min tras su salida o tras la hora extra autorizada) no se presume hora extra: la tarjeta dice «Sin checar salida ·
debía salir hace N» y va en «Requiere atención» — porque un olvido de checar no debe contarse como hora extra.

## Tabla (vista por defecto) — `TablaHoy.jsx`, lógica en `vistasMonitor.mjs`
El dueño pidió una sola tabla fácil de leer, como la primera propuesta (`Main.dc.html`, `MovilMonitor.dc.html`); el
tablero kanban (6 columnas) y la «Lista» vieja se retiraron (noviembre 2026).
Tabla semántica (`<table aria-label="Personas de hoy">`): encabezados **Persona · Horario · Entrada · Qué pasa · Jornada**
(`th scope="col"`) y una columna «Abrir día» solo para lector de pantalla. Renglones agrupados del más urgente al menos;
cada grupo es un `<tbody>` con su encabezado (`th scope="rowgroup"`: punto de color, título y número). Grupos vacíos no
se muestran.
| Grupo | Quién (uno por persona; reutiliza `grupoMonitor` del Monitor de mi equipo) |
|---|---|
| Requiere atención | faltó, no ha llegado, salió antes sin permiso, se pasó de comida, 🧭 sin checar salida, llegó tarde (y sigue) |
| Con permiso / descanso | permiso de día o por horas aprobado hoy; descanso, festivo, vacaciones, incapacidad, sin horario |
| Saldrán tarde / hora extra | hora extra autorizada (aún no sale) o ya en hora extra sin autorizar |
| En jornada | trabajando a tiempo o en comida sin pasarse |
| Por entrar | aún no le toca (o en su tolerancia) |
| Ya salieron | salió a su hora |
Orden: los grupos como en la maqueta (lo que pide acción y lo excepcional arriba); dentro de cada uno, el orden de
urgencia (`ordenUrgencia`: no han llegado → en comida → trabajando → por entrar → ya salieron → descanso, y por hora).
En «Requiere atención»: faltó → no ha llegado → salió antes → se pasó de comida → sin checar salida → llegó tarde.
- **Persona:** avatar (color de su frase), nombre (abre la ficha) y área.
- **Horario:** «9:00 a.m.–6:00 p.m.» o «Sin horario hoy» (`horarioVista`).
- **Entrada:** hora real de la primera entrada, en naranja si llegó tarde; si ya salió, «7:55 a.m. → 3:10 p.m.»; «—»
  sin entrada (`entradaTabla`).
- **Qué pasa:** UNA frase con su color (`quePasaTabla` sobre `razonMonitor`): «Llegó 18 min tarde», «No ha llegado ·
  debía entrar hace 2 h 12 min», «En comida 67 de 60 min», «Sin checar salida · debía salir hace 5 h 12 min», «En hora
  extra desde 11:00 a.m.», «Saldrá 8:00 p.m. · 3 h extra · inventario», «Permiso 10:00 a.m.–12:00 p.m. · cita médica ·
  salió 10:00 a.m.», «A tiempo», «Entra 12:00 p.m. · en 48 min», «Vacaciones»… Permisos en violeta (como su contador).
  A lo más **un** chip secundario, el primero que aplique: «Llegó tarde +N» (si la frase no lo dice), el permiso por
  horas (si la persona está en otro grupo) o «Debe N» (cuenta de horas).
- **Jornada** (desde 1280 px): «3 h 21 de 8 h» y barra (azul en jornada, violeta en hora extra, gris si ya salió).
- **›** y todo el renglón abren el reloj del día (`RelojDiaDialog`): clic en cualquier parte del renglón (salvo el
  nombre) y, con teclado o lector de pantalla, el botón «Ver día de <nombre> · <qué pasa>».
Texto ≥ 13 px, contraste ≥ 4.5:1 (texto -800 sobre fondo -100), horas con cifras tabulares.
**Celular (< 1024 px):** la misma tabla se pinta como tarjetas bajo los mismos encabezados de grupo: nombre y área
arriba; la frase; «horario · Entró 9:18 a.m.» (o «Checó 7:55 a.m. → 3:10 p.m.» en su renglón). Toda la tarjeta es el
botón (≥ 44 px), sin encabezados de columna, sin Jornada y sin desplazamiento lateral.
Se conserva: contadores-filtro, búsqueda, área, aviso de encuestas pendientes, «Ver historial en Asistencias» y el botón
«Reloj checador» de la barra. Datos: `/checador/asistencias` de ayer y hoy (todos), recargados con cada checada por SSE
(`useRefrescoChecadas`); la hora se recalcula cada 30 s.

## Selector de vista: Tabla · Línea del día
Arriba del contenido (escritorio: junto a «Ver historial en Asistencias»; celular: bajo el título, 2 botones ≥ 44 px).
**Tabla** es la vista por defecto. La elección se recuerda por usuario en este navegador (`localStorage`,
`adamia.monitor.vista.<id_usuario>`, con try/catch: sin almacenamiento queda la Tabla). Un valor desconocido, y las
vistas retiradas «tablero» y «lista» guardadas antes, abren la Tabla (`vistaValida`). Se lee al montar, así que la
primera pintura es la Tabla y cambia en cuanto se lee. Contadores, búsqueda y área son los mismos en las dos vistas.

### Línea del día
Una fila por persona en el **orden de urgencia** (no han llegado → en comida → trabajando → por entrar → ya salieron →
descanso): avatar y nombre fijos a la izquierda (el nombre abre la ficha), una barra sobre el eje de horas y, en
escritorio, el chip de estado a la derecha (en celular va bajo el nombre).
- **Eje:** desde la entrada (programada o real) más temprana hasta la salida (programada, extra autorizada o real) más
  tardía o la hora actual, con 30 min de margen y redondeado a la hora; mínimo 4 h. Marcas cada 1 h (día ≤ 12 h), 2 h
  (≤ 24 h) o 3 h. Se calcula con todo el día (no con lo filtrado), para que no brinque al filtrar. Un turno nocturno de
  ayer que sigue vivo alarga el eje desde la noche de ayer (la marca dice la hora del día: «10 p.m.», «12 a.m.»…).
- **Barra:** su horario en gris tenue (no en vacaciones/descanso/sin horario); la extra autorizada en violeta tenue;
  encima lo real: trabajo **azul** si sigue en su jornada (trabajando o en comida) y **gris** si ya salió; comida en
  **ámbar** (botón «Salir a comer» o salida dentro de la comida del horario, el criterio de `estadoHoy`); lo que pasó de
  su comida en **rojo**; trabajo después de su salida programada en **violeta** (hora extra). 🧭 Si ya pasó el aviso
  «debía salir hace…» sin checar salida, lo de después va **rayado en rojo** («Sin checar salida»), no como hora extra
  (mismo criterio de la Tabla). Un hueco que no es comida (sale y regresa) no se pinta. Cada tramo dice sus horas al
  pasar el mouse («Comida 2:00 p.m.–2:30 p.m. · 30 min»).
- **Ahora:** línea roja vertical en cada fila y etiqueta con la hora en el eje (las marcas que se enciman se ocultan).
- **Estado** (chip): Trabajando, Hora extra, Sin checar salida, En comida (· se pasó), Salió / Salió antes / Salió con
  permiso, Por entrar, No ha llegado, Faltó, o el tipo de día (Vacaciones, Día de Descanso…).
- Leyenda abajo. Tocar cualquier parte de la fila (también la barra) abre el reloj del día.
- **Celular / eje largo:** el eje se desplaza a lo ancho dentro de su caja (52 px por hora) con la columna del nombre
  fija; la página no desborda. Si el eje no cabe, abre con «ahora» a la vista (a 2/3 del ancho); solo al abrir o si
  cambia el día, para no pelear con el desplazamiento de la persona. En escritorio (~28 px por hora) un día de 24 h cabe.

El «Monitor de mi equipo» del empleado sigue con las tarjetas y grupos de `monitor.mjs` (sin cambios); la Tabla de RH
reutiliza esos grupos y frases con los ajustes de arriba.

## Backend (rama `agente/asistencias-hoy-back`)
`/checador/asistencias` agrega `tolerancia_salida_min`, `entrada_tramo_abierto` y `permisos_horas_dia` (todos los
permisos por horas aprobados del día). Sin ese backend la vista funciona con lo de antes (un permiso por día; sin
tolerancia de salida; lo trabajado del tramo abierto tras varios tramos no se cuenta).

## Pruebas
- `scripts/test-asistencias-hoy.mjs` (estados) y `scripts/test-monitor.mjs` (tarjetas y grupos del Monitor de equipo,
  razones, saldrán tarde, enlaces viejos, contadores y momentos del día), en CI. `scripts/test-monitor.mjs` también cubre
  `vistasMonitor.mjs`: vista válida (y «tablero»/«lista» → Tabla) y clave por usuario, orden de urgencia, grupos de la
  Tabla, «Qué pasa» (frase y un solo chip), entrada y jornada, chip de estado y horario, eje, tramos y posiciones.
- `scripts/verify-monitor.mjs`: navegador, hora fija 11:12 CDMX, backend simulado: contadores y filtro, Tabla
  (encabezados, 6 grupos con su número y personas, horario | entrada | frase | chip de cada renglón, jornada, texto ≥ 13
  px, renglón → reloj del día con clic y con teclado), búsqueda y área, celular en tarjetas (≥ 44 px, a todo el ancho,
  sin desplazamiento lateral), «tablero»/«lista» guardados abren la Tabla, Línea del día (orden, eje, tramos, ahora,
  celular), sin desborde a 1440 y 390. Capturas con `CAPTURAS=carpeta` (y `ESCALA=2`): `monitor-tabla-*.png`,
  `monitor-linea-*.png`.

## Hidratación de la fecha y hora del encabezado (INC-006)
Abrir `/panel/monitor` directo (recargar) daba React #418: el servidor pintaba su hora y el navegador otra. La fecha y
hora del encabezado se ponen al montar; hasta entonces dice solo «se actualiza solo».

## Pendiente del backend
- ✅ El backend ya manda `horas_extra_autorizadas_dia: { hasta: "HH:mm", minutos, motivo }` (de las horas extra
  registradas con horario, o de la salida del día si Asistencias dice «Sí» a horas extra; las de reposición no cuentan)
  y `permisos_horas_dia[].motivo`. Lo cubre `tests/miEquipoBd.test.cjs` en el backend.
- ❓ PENDIENTE: la maqueta muestra «regresa el jueves» en vacaciones y un filtro «Sucursal»; no hay dato de regreso en
  la consulta del día y el filtro de área ya existe.

❓ PENDIENTE: la maqueta ordena la Línea por hora de entrada; se usa el orden de urgencia (pedido del dueño).
❓ PENDIENTE: la maqueta pliega «En jornada» con «ver todos»; hoy se muestran todos (la búsqueda, el área y los
contadores ya filtran). Proponer al dueño si con muchos empleados lo quiere plegado.
❓ PENDIENTE: varias empresas en zonas distintas comparten un eje en la hora de pared de cada una (la de la primera
persona para la etiqueta de «ahora»); con una sola zona, como hoy, no aplica.

❓ PENDIENTE: la ventana de comida sin botón (30 min antes) y el aviso de salida a los 15 min son criterios propuestos
(🧭), ajustables si el dueño lo pide.
