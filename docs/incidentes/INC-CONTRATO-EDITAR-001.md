# INC-CONTRATO-EDITAR-001 · «Editar datos» del contrato se veía con datos borrados

- **Fecha:** 27/11/2026 · **Ramas:** `agente/editar-contrato` (frontend) y `agente/editar-contrato-back` (backend).
- **Origen:** el dueño, con captura de producción del contrato CT-2026-0007: «al darle editar me abre una ventana
  horrible de editar y borra datos».
- **Severidad:** alta (riesgo de guardar datos de un contrato distintos a los que tenía, sin que RH lo note).

## Causa comprobada (no era la hipótesis de los nombres de campo)

La hipótesis de la orden era que el detalle pasaba al editor nombres de campo distintos. **No**: `GET
/contratos/:id/detalle` manda los mismos nombres que espera el editor (incluye `prima_vacacional`), y con valores en
minúsculas el diálogo se llenaba bien y el PUT era idéntico al contrato (reproducción en navegador, ver abajo).

Las causas reales, cada una reproducida:

| # | Dónde | Qué pasaba | Causa |
|---|---|---|---|
| 1 | `ContratoDialog.jsx` (frontend) | **Tipo de contrato, Periodicidad, Tipo de jornada y Modalidad se veían EN BLANCO** cuando el contrato los guarda con otras mayúsculas («Temporal», «Quincenal», «Diurna», «Presencial»: así los escriben el convenio, la renovación, «Revisar sueldos» y «Crear contrato con este sueldo» desde la ficha). | Los `Select` comparan el valor guardado con sus opciones en minúsculas al pie de la letra; sin coincidencia no muestran nada. |
| 2 | `ContratoDialog.jsx` | Un **horario guardado con otro formato** («Turno matutino…», «9:00 a 18:00», vacío) se **sustituía al guardar** por `Entrada: 09:00 \| Salida: 18:00 \| Comida: 14:00 - 15:00` (o se le inventaba comida). | Las horas se sacaban con una expresión que tomaba cualquier `h:mm` y, si no había, ponía horas fijas; al guardar siempre se reconstruía el horario. |
| 3 | `ContratoDialog.jsx` | Guardar mandaba **todos** los campos aunque no se tocaran (lo que se viera mal se guardaba igual). | El PUT armaba el contrato completo con el formulario. |
| 4 | `contratosController.actualizar` (backend) | Un PUT con la fecha de inicio y sin días de vacaciones **recalculaba los días** con la ley y se perdían los que se daban de más (20 → 12). | `completarVacacionesLey` corría en toda edición, no solo cuando se mandan vacíos. |
| 5 | `contratosServicio.actualizarContrato` (backend) | Quitar la fecha de fin de un contrato temporal sin mandar el tipo se aceptaba. | La regla «este tipo pide fecha de fin» se revisaba solo con el cuerpo, no con lo guardado. |

## Reproducción (RED)

- Navegador (build con backend simulado y la forma REAL del detalle, DECIMAL como texto): con «Quincenal», «Diurna»,
  «Presencial», «Temporal» los cuatro campos de lista se ven vacíos (`Tipo de Contrato=`, `Periodicidad de Pago=`,
  `Tipo de Jornada=`, `Modalidad=`). Con minúsculas se llenaban y el PUT era igual al contrato (salvo `elaborado_por_id`,
  que el servidor ignora). Guion: `scratchpad/repro-editar/repro.mjs` (fuera del repositorio).
- `scripts/test-formulario-contrato.mjs`: «RED del incidente: los campos de lista guardados con otras mayúsculas se ven
  llenos» y «abrir y guardar sin tocar nada no manda nada (ni el horario de otro formato)».
- Backend (`tests/contratosBd.test.cjs`, con MariaDB): «editar: el PUT solo cambia lo que se envía…» falló con
  `['dias_vacaciones']` cambiado.

## Corrección

- **Editar ya no es una ventana:** `/panel/contratos/[id]/editar` (y el alta `/panel/contratos/nuevo`, con duplicar y
  desde la ficha) con pestañas. Reglas puras y probadas en `src/lib/contratos/formularioContrato.mjs`:
  `formularioDesdeContrato` (valores sin importar mayúsculas; lo que no está en la lista aparece «(guardado)»),
  `partirHorario` (solo el formato de ADAMIA; otro texto se conserva y se muestra), `cambiosDeEdicion` (solo lo que
  cambió; el sueldo, la persona y la empresa nunca).
- **Backend:** los días de vacaciones solo se proponen por ley si se mandan vacíos; la fecha de fin se revisa con los
  datos guardados.

## Regresión (GREEN)

- `node --test scripts/test-formulario-contrato.mjs` (en CI, paso «Asistencias — cálculo…»).
- `scripts/verify-contratos.mjs` (1440, 390, 360): el contrato simulado guarda «Diurna» y «Presencial»; la página de
  editar los muestra seleccionados, al cambiar el puesto el PUT es exactamente `{ puesto: "Cajera principal" }`.
- Backend: `tests/contratosBd.test.cjs` («editar: el PUT solo cambia lo que se envía…»).

## Hallazgo relacionado, sin corregir (decisión del dueño)

El diálogo viejo guardaba la periodicidad en minúsculas («quincenal»). Los cálculos (`DIVISORES` en
`services/calculosLft.js` y `calculosLftDatos.js`) solo reconocen «Quincenal», así que **leen esos contratos como
MENSUALES**: CT-2026-0007 (5,000 «quincenal») se calcula como $5,000 al mes = $2,500 a la quincena. Si RH quiso decir
$5,000 por quincena, la nómina paga la mitad. No se cambió la lectura porque cambia lo que se paga: lo decide el dueño
(ver el reporte de esta rama). Mientras tanto, la tarjeta «Sueldo» dice lo que de verdad usa la nómina y «Duplicar» no
copia una periodicidad en minúsculas sin que RH la elija.
