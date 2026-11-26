# Reloj del día (frontend)

Modal `src/app/panel/registro-asistencia/RelojDiaDialog.jsx`; lógica pura en `src/lib/asistencia/relojDia.mjs`
(probada en `scripts/test-reloj-dia.mjs` y en navegador con `scripts/verify-reloj-dia.mjs`). Las reglas del servidor
están en el backend, `docs/reloj-dia.md`; aquí se validan igual, en vivo.

## La hora extra va fuera de la jornada (aprobado por el dueño, 25/11/2026; LFT art. 66)
- Un renglón «Hora extra» vivo que se encima con [entrada programada, salida programada) muestra, junto a la fila:
  «La hora extra va antes de su entrada (9:00 a.m.) o después de su salida (4:00 p.m.). Dentro de la jornada usa «Jornada»».
  `errorExtraEnJornada(r, horario)`; mismo texto que el servidor (400 por renglón).
- Si todo el renglón cae dentro de la jornada, «Hora extra» queda deshabilitada en el Concepto con la explicación
  «Dentro de la jornada (9:00 a.m.–4:00 p.m.) usa «Jornada»» (`extraTodoEnJornada`).
- Si solo una parte queda fuera, se puede elegir, pero marca el error y sugiere: lo de después de la salida, «Jornada» +
  «Separar … como hora extra»; lo de antes de la entrada, otro registro de hora extra.
- Turno nocturno: `horarioMin` pone la salida al día siguiente. Sin salida cuenta como abierto hacia adelante.
- Sin horario ese día (descanso, sin turno): todo puede ser extra.
- Datos viejos: un renglón igual que como vino de la base (`sinCambio`: horas, concepto, motivo, anulado, quién autoriza)
  no se vuelve a validar con esta regla, para poder seguir corrigiendo días anteriores.
- «Separar X después de la salida» y «Agregar registro» después de la salida siempre cumplen.

## Horas extra con la jornada diaria (aprobado por el dueño, 26/11/2026)
«Si es de 8 y tengo 10, son 2 extras». La fuente de verdad es el servidor (backend `services/horasExtraDia.js`,
`docs/reloj-dia.md` → «Horas extra del día»): la lista trae `minutos_extra_por_autorizar`, `minutos_extra`,
`minutos_extra_detectadas`, `minutos_programados`, `estado_extra`… y todas las vistas los usan:
- Columna «Horas extra» y «de 8 h» de la Jornada (`AsistenciaRow` → `extraFila`, `minutos_programados`).
- Móvil, tarjetas de resumen, orden, Control de horas extra, Centro de incidencias y acciones masivas
  (`estadoHorasExtra` en `src/lib/asistencia/horasExtra.mjs`: si la fila trae `estado_extra`, manda lo del servidor).
- Exportación: columnas «Trabajadas (min)», «Extra (min)», «Extra por autorizar (min)» del servidor.
- Espejo exacto de la regla (`src/lib/asistencia/extraDelDia.mjs`, `UMBRAL_EXTRA_MIN = 30`, el único umbral) solo para el
  reloj en vivo mientras se edita (`resumen(regs, horario, { extraDia })`, con `extra_dia` del GET) y para filas sin esos
  campos. Probado en `scripts/test-extra-del-dia.mjs` con los mismos casos que el backend.
- Detectadas = trabajado (jornada + extra, sin comida) − jornada programada; desde 30 min; llegar tarde y salir tarde se
  compensa; descanso trabajado (sin horario ese día) todo por autorizar.
- «Separar X antes de las 9:00 a.m. como hora extra» (`separarExtraAntes`): como «Separar después», no pide motivo, sí quién
  autoriza. Los dos botones solo salen si hay extra por autorizar.
- «No autorizar» deja la constancia y **no mueve la salida** (`cambiosNoAutorizar`); los días de antes con la salida
  recortada se siguen reconociendo y «Quitar» la regresa.
