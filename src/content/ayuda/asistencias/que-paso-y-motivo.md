---
titulo: Cómo marcar qué pasó un día sin checadas (faltas, incapacidades, descansos)
resumen: Cuando alguien no checó, eliges «Qué pasó» (inasistencia, vacaciones, incapacidad, descanso…) y el «Motivo»; el sistema decide si el día se paga y avisa si se creará un acta.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/registro-asistencia]
palabras: [qué pasó, motivo, falta, inasistencia, injustificada, justificada, incapacidad, folio imss, vacaciones, descanso, goce de sueldo, acta administrativa, sin checar]
orden: 30
actualizado: 2026-11-27
fuentes: [src/app/panel/registro-asistencia/CeldaEstadoDia.jsx, src/components/asistencia/QuePasoMotivo.jsx, src/lib/asistencia/quePasoMotivo.mjs, src/lib/asistencia/tiposGoce.mjs, src/app/panel/registro-asistencia/RelojDiaDialog.jsx]
---

## Para qué sirve

Cuando una persona **no tiene checadas** en un día, tienes que decir **qué pasó**: ¿faltó?, ¿estaba de vacaciones?, ¿tenía incapacidad?, ¿era su descanso? Con eso el sistema sabe si el día **se paga o no** y lo lleva a la nómina.

Se usan dos campos:

- **Qué pasó**: el tipo de día (Inasistencia, Vacaciones, Incapacidad IMSS, Día de descanso…).
- **Motivo**: el porqué (Visita al médico, Permiso personal, Trámite…). En una inasistencia, el motivo decide si es justificada y si se paga.

## Quién la usa

Recursos Humanos y el dueño, con permiso de edición de asistencias.

## Antes de empezar

- Abre **Control de tiempo → Asistencias** y elige el día.
- Las columnas **Estado** y **Motivo** deben estar visibles (botón **Columnas**). Si ocultas Motivo, todo queda en la columna Estado.
- Esto solo se puede hacer en días **sin checadas**. Si la persona checó, el día se corrige en su reloj; ver [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia).

## Cómo marcar una falta (inasistencia)

1. En la fila de la persona, en **Estado**, abre el desplegable y elige **Inasistencia**.
2. En **Motivo**:
   - Si **no** justificó la falta, déjalo en **Injustificada**.
   - Si sí la justificó, elige el motivo (por ejemplo **Visita al médico**). Si eliges **Otro…**, escribe el motivo.
3. Revisa el **goce** que aparece junto al botón OK: viene del motivo. Si el motivo lo permite, puedes cambiarlo entre **Con goce** y **Sin goce**; si tiene candado 🔒, lo fija el catálogo.
4. Toca **OK** (o presiona Enter).

Verás un aviso como «Armando González: Inasistencia · Visita al médico. Queda en el historial con tu nombre.».

![Fila de Asistencias con Inasistencia elegida, el motivo, el goce y el botón OK](/ayuda/capturas/asistencias/que-paso-en-la-fila.webp "Arriba una inasistencia con motivo antes de confirmar; abajo una injustificada con su acta en borrador")

> **Importante:** una inasistencia **sin motivo** es **injustificada**: va sin goce y el sistema crea un **acta administrativa en borrador** («Sin motivo es injustificada: se creará un acta en borrador.»). El sistema no sanciona solo: la ley pide escuchar a la persona antes (art. 423 de la LFT). El enlace **Acta en borrador** aparece debajo del motivo.

## Cómo marcar un día de ley (vacaciones, incapacidad, descanso)

1. En **Estado**, elige el día de ley. Llevan candado 🔒 porque su pago lo fija la ley:
   - **Vacaciones** 🔒: con goce; descuenta del saldo de vacaciones y lleva prima vacacional.
   - **Incapacidad IMSS** 🔒: la empresa no paga el día; el IMSS da el subsidio.
   - **Día de descanso** 🔒: con goce de salario íntegro (art. 69).
2. Si es una incapacidad, escribe el **Folio IMSS (obligatorio)**.
3. Toca **OK**.

Los días de ley no llevan motivo.

## Cómo marcar que sí vino (o que llegó tarde con permiso)

Si en **Estado** eliges **Asistencia**, **Entrada tarde**, **Salida temprano** o **Salir en medio turno**, se abre su **reloj del día** para que pongas sus horas: esos casos necesitan horas, no solo una etiqueta. Ver [Cómo registrar que llegó tarde o salió antes con permiso](/ayuda/asistencias/permiso-del-dia).

## Cómo hacerlo desde el reloj del día

Si abres el reloj de alguien sin checadas, arriba a la derecha verás **Qué pasó** y **Motivo**. Funcionan igual: elige Inasistencia (con o sin motivo) o el día de ley y confirma. Si eliges Asistencia, pon sus horas abajo («Pon sus horas abajo, en las checadas.»).

![Reloj del día sin checadas con los campos Qué pasó y Motivo arriba a la derecha](/ayuda/capturas/asistencias/reloj-del-dia-sin-checadas.webp "Sin checadas, el reloj ofrece Qué pasó y Motivo, o cargar sus horas")

## Cómo hacerlo con varias personas a la vez

Si varias personas tienen el mismo caso (por ejemplo, un día de descanso que se movió), usa **Marcar como…** en las acciones masivas. Ver [Cómo corregir varios días a la vez](/ayuda/asistencias/acciones-masivas).

## Preguntas frecuentes

### ¿Qué pasa si nadie marca nada en un día que la persona no checó?

Si tu empresa tiene activada la generación automática de asistencias, el día empieza como «Sin checar». Cuando el día laboral ya terminó (a partir de las 6:00 a.m. del día siguiente y al menos 4 horas después de su salida programada), el sistema lo convierte en **Inasistencia sin motivo**, con la nota «Marcada como falta automáticamente: no checó en todo el día.» y su acta en borrador. No lo hace si ese día es festivo, si no es su día de trabajo, si tiene un permiso aprobado o pendiente, o si ya está en una nómina autorizada.

### ¿Y si después aparece una checada de ese día?

La falta se revierte sola: el día pasa a Asistencia y el acta en borrador se cancela («Llegó una checada del reloj de ese día: ya no es falta injustificada.»).

### ¿Cuándo se cancela el acta en borrador?

Cuando el día deja de ser falta injustificada: le pones motivo, se aprueba un permiso, se cargan checadas o vacaciones. El acta nunca se borra: queda cancelada. Si ya estaba **elaborada**, **notificada** o **cerrada**, el sistema no la toca y te avisa.

### ¿Por qué no puedo cambiar el goce?

Porque el motivo o el tipo de día lo fija (🔒). Los días de ley siempre tienen el goce de la ley. En los motivos, RH decide en el catálogo si «se cambia al aplicar». Ver [Tipos de registro y motivos](/ayuda/asistencias/tipos-de-registro).

### ¿Por qué ya no veo «Falta justificada» o «Visita al médico» como tipo?

Porque ahora son un **motivo**: se registra «Inasistencia» + «Visita al médico». Los registros viejos con esos tipos se siguen viendo y pagando igual.

### ¿Cómo afecta una falta injustificada a la nómina?

Va sin goce y también baja la parte proporcional del descanso semanal (art. 72 de la LFT), con la regla de nómina de tu empresa.

## Qué pasa si…

- **…la persona sí checó:** las columnas Estado y Motivo se ven como texto (no se pueden cambiar). Corrige el día en su reloj.
- **…eliges Incapacidad y no escribes el folio:** el botón OK no se activa («Escribe el folio de la incapacidad.»).
- **…eliges «Otro…» y no escribes nada:** verás «Escribe el motivo.».
- **…el día ya está en una nómina autorizada:** no se guarda; el dueño debe cancelar esa nómina para corregir.
- **…no se puede crear el acta** (la persona no tiene jefe ni quién autorice sus permisos): el día se guarda y el sistema te avisa.

## Relacionado

- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Cómo registrar que llegó tarde o salió antes con permiso](/ayuda/asistencias/permiso-del-dia)
- [Tipos de registro y motivos](/ayuda/asistencias/tipos-de-registro)
- [Cómo corregir varios días a la vez](/ayuda/asistencias/acciones-masivas)
- [Cómo registrar un permiso](/ayuda/permisos/registrar-un-permiso)
