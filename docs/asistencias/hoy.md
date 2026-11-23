# Asistencias → Hoy (23/11/2026, maqueta aprobada)

Reemplaza la vista «En vivo» de columnas (22/11/2026). Maqueta aprobada por el dueño: escritorio `Main.dc.html` y
teléfono `Telefono.dc.html` (artefacto «Asistencias · Hoy»).

## Un estado por persona (en este orden)
1. **No laboran hoy** (plegado, con conteo): descanso, vacaciones, permiso de día, incapacidad, festivo o sin horario,
   si NO checó. Si checó en su descanso, cuenta lo que checó (sin retardo ni «salió antes»: no tenía horario).
2. Sin checadas: **Faltó** (ya pasó la mitad de su jornada) → **No ha llegado** (pasó entrada + tolerancia de la
   empresa; «Debía entrar hace X») → **Por entrar** (grupo «Próximos»). Un permiso «llega tarde» aprobado corre la
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

## Pantalla
- Tarjetas = filtros (`aria-pressed`; otra vez = todos): Trabajando, Llegaron tarde, No han llegado, En comida,
  Ya salieron, Salieron antes (7.ª tarjeta: cabe en 1440 px; en pantallas medianas pasan a 4 por fila), Faltaron.
- Búsqueda y área en pantalla (no cambian los filtros de «Registros»). Lista agrupada: Requieren atención (Faltó, No ha
  llegado, Salió antes, comida pasada) → En comida → Trabajando → Próximos → Ya salieron → No laboran hoy.
- Renglón: iniciales, nombre (abre la ficha), área (y «debe X» de la cuenta de horas, antes columna «Debe tiempo»),
  horario, estado, checada real, jornada y «Ver día» (la ventana de edición de Registros).
- Celular (≤ 768 px): encabezado propio con las tres pestañas, tarjetas con desplazamiento horizontal (lo urgente
  primero) y renglones como tarjetas; toda la tarjeta abre el día (≥ 44 px). «Registros» en celular sigue siendo la
  vista móvil de siempre, ahora con las pestañas arriba.
- Horas en 12 h con a.m./p.m. (decisión del 19/11/2026), aunque la maqueta las dibuja en 24 h.
- Datos: los registros de ayer y hoy (`/checador/asistencias`, todos, sin paginar), recargados con cada checada (SSE);
  la hora se recalcula cada 30 s.

## Backend (rama `agente/asistencias-hoy-back`)
`/checador/asistencias` agrega `tolerancia_salida_min`, `entrada_tramo_abierto` y `permisos_horas_dia` (todos los
permisos por horas aprobados del día). Sin ese backend la vista funciona con lo de antes (un permiso por día; sin
tolerancia de salida; lo trabajado del tramo abierto tras varios tramos no se cuenta).

## Pruebas
- `scripts/test-asistencias-hoy.mjs` (en CI): cada estado, precedencia, permisos, tolerancias, nocturno, varios tramos,
  comida pasada, tarjetas y grupos.
- `scripts/verify-asistencias-hoy.mjs` (navegador, hora fija 11:12 CDMX, backend simulado; antes `verify-en-vivo.mjs`).

❓ PENDIENTE: la ventana de comida sin botón (30 min antes) y el aviso de salida a los 15 min son criterios propuestos
(🧭), ajustables si el dueño lo pide.
