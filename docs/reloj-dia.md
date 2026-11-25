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
