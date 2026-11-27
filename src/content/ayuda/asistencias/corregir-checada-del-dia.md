---
titulo: Cómo corregir la checada de un día
resumen: Con el reloj del día agregas la checada que alguien olvidó, cambias una hora, anulas una checada duplicada o cargas su horario normal, siempre con un motivo y sin borrar lo que marcó el reloj.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/registro-asistencia, /panel/monitor]
palabras: [corregir checada, reloj del día, olvidó checar, agregar checada, cambiar hora, anular checada, duplicada, motivo de corrección, editar asistencia, sin salida, cargar horario normal]
orden: 20
actualizado: 2026-11-27
fuentes: [src/app/panel/registro-asistencia/RelojDiaDialog.jsx, src/lib/asistencia/relojDia.mjs, src/app/panel/registro-asistencia/AsistenciaRow.jsx, src/app/panel/registro-asistencia/CeldaEditado.jsx, src/components/cambios/CambiosPendientes.jsx]
---

## Para qué sirve

El **reloj del día** es la única ventana donde se corrigen las horas de una persona en un día. Con él puedes:

- Agregar la entrada o salida que alguien **olvidó checar**.
- **Cambiar la hora** de una checada (por ejemplo, si el reloj falló).
- **Anular** una checada duplicada.
- Cargar su **horario normal** si ese día no checó nada pero sí trabajó.
- Marcar su comida y separar o autorizar su hora extra.

Lo que marcó el reloj **nunca se borra**: queda tachado o como «reloj: hora», y en el historial con tu nombre y el motivo.

## Quién la usa

Recursos Humanos y el dueño, con permiso de edición de asistencias. Los empleados y jefes no pueden corregir: solo consultan.

## Antes de empezar

- Abre **Control de tiempo → Asistencias** (o el **Monitor**) y busca a la persona y el día.
- Ten a la mano el **motivo** de la corrección: es obligatorio cada vez que agregas, cambias o anulas una checada.

## Cómo abrir el reloj del día

Tienes tres caminos, todos abren la misma ventana:

- En **Asistencias**, toca el renglón de la persona o el botón azul del reloj (columna **Reloj**).
- En el **Monitor**, toca el renglón o la tarjeta de la persona.
- En **Asistencias**, el botón morado «… por autorizar» de la columna **Horas extra**.

![Reloj del día de una persona con sus tres checadas](/ayuda/capturas/asistencias/reloj-del-dia.webp "El reloj del día: arriba quién y su horario, en medio el resumen y abajo las checadas")

## Cómo leer el reloj del día

**Encabezado:** el nombre, el día, el área, la **jornada** («Jornada 9:00 a.m.–4:00 p.m.») y la **comida** de su horario. A la derecha, el tipo de día con un candado (Día normal, Domingo, Festivo…): lo pone el calendario y no se edita aquí, para que el registro sea auditable.

**Franja de resumen:**

- **Trabajadas**: horas trabajadas «de» las programadas. Si sigue trabajando dice «sigue en jornada».
- **Comida**: tiempo de comida «de» el de su horario.
- **Extra**: horas extra autorizadas y, en morado, las que están «por autorizar».
- **Estado**: Asistió, Retardo +N min, Salió antes −N, Sin salida, Entró tarde con permiso…
- **Qué pasó**: a la derecha. Sirve para registrar un permiso del día. Ver [Cómo registrar que llegó tarde o salió antes con permiso](/ayuda/asistencias/permiso-del-dia).

**Tabla de checadas:** un renglón por tramo con **#**, **Entrada**, **Salida**, **Concepto** (Jornada, Comida u Hora extra), **Duración**, **Motivo** y el botón **✕**.

Cuando no cambias nada, los números son los que calculó el sistema. En cuanto editas algo, el resumen se recalcula en vivo con la misma regla.

## Cómo agregar una checada que olvidó

Ejemplo: Héctor entró a las 8:55 y no checó su salida.

1. Abre su reloj del día. Verás su renglón con **Sin salida**.
2. Escribe la hora de salida en el campo **Salida** del renglón (por ejemplo 4:00 p.m.).
3. En **Motivo**, elige el que aplique, por ejemplo **Olvidó checar**.
4. Toca **Guardar**.

Si le faltó un tramo completo (por ejemplo, regresó de comer y no checó), toca **Agregar registro**: aparece un renglón nuevo donde pones su entrada, su salida, el concepto y el motivo.

## Cómo cambiar la hora de una checada

1. Toca la hora que quieres cambiar y escribe la correcta.
2. Debajo del campo verás en ámbar la hora original, por ejemplo «reloj: 9:18 a.m.».
3. El renglón pide motivo: «Cambiaste la hora: elige el motivo.». Elígelo en **Motivo**.
4. Toca **Guardar**.

![Reloj del día con una hora cambiada, la hora original debajo y el motivo marcado en rojo](/ayuda/capturas/asistencias/reloj-del-dia-cambio-de-hora.webp "Al cambiar una hora queda visible la original («reloj: 9:18 a.m.») y se pide el motivo")

## Cómo anular una checada duplicada

1. En el renglón duplicado toca la **✕** («Anular checada»).
2. El renglón queda tachado y aparece **Restaurar** en su lugar por si te equivocaste.
3. Elige el motivo, por ejemplo **Checada duplicada**.
4. Toca **Guardar**.

La checada anulada no cuenta para las horas, pero sigue en el historial. Si el renglón lo agregaste tú (no vino del reloj), la ✕ dice **Quitar**: si aún no lo guardabas, simplemente desaparece; si ya estaba guardado, también pide el motivo («Para quitar un registro agregado a mano elige el motivo.») y queda en el historial.

## Cómo cargar las horas de alguien que no checó nada

Si la persona no tiene checadas, el reloj muestra «No tiene checadas. ¿De qué hora a qué hora trabajó?» con dos botones:

- **Cargar su horario normal**: llena los renglones con su horario de ese día (y su comida), con el motivo **Olvidó checar**. Ajusta lo que haga falta.
- **Escribir las horas**: agrega un renglón vacío para que pongas sus horas.

Luego toca **Guardar**. Si en realidad no vino, no cargues horas: usa **Qué pasó** para marcar la inasistencia o el día de ley. Ver [Cómo marcar qué pasó un día sin checadas](/ayuda/asistencias/que-paso-y-motivo).

![Reloj del día de una persona sin checadas con los botones para cargar su horario o escribir las horas](/ayuda/capturas/asistencias/reloj-del-dia-sin-checadas.webp "Sin checadas: o cargas sus horas o eliges qué pasó")

## Los motivos de corrección

| Motivo | Cuándo usarlo |
|---|---|
| Olvidó checar | La persona no marcó una entrada o salida |
| Falla del reloj | El reloj no registró o registró mal |
| Error de captura | Alguien capturó mal una hora |
| Trabajó fuera de la sucursal | Trabajó en otro lugar y no pudo checar ahí |
| Checada duplicada | Checó dos veces lo mismo |
| Por el permiso del día | La hora cambia por un permiso del día |
| Trabajo remoto / home office | Trabajó desde casa |
| Visita a cliente o comisión | Salió a ver clientes o a una comisión |
| Capacitación o evento externo | Estuvo en un curso o evento |
| Sin dispositivo o reloj sin conexión | No tenía cómo checar |
| Otro (escribe el motivo) | Escribe el motivo (al menos 5 letras; es un texto corto) |

## Cómo guardar o salir sin guardar

- **Guardar** se activa cuando hay cambios y nada está en rojo. Al guardar verás «Reloj guardado. Horas, comida, extra y estado se recalcularon; lo original queda en el historial.».
- **Cancelar** o la **✕** de arriba cierran. Si hiciste cambios, te pregunta «Tienes cambios sin guardar» con **Guardar y salir**, **Salir sin guardar** o **Seguir editando**.

## Cómo ver quién corrigió y qué cambió

En la tabla de Asistencias, la columna **Editado** dice «Sí» cuando el día tiene correcciones. Tócalo para ver **Qué cambió** (antes → después), **Quién y cuándo**, desde qué pantalla (por ejemplo **Reloj del día**, **Centro de incidencias** o **Entradas y salidas**) y el **Motivo**.

## Errores que puedes ver y cómo resolverlos

| Mensaje | Qué hacer |
|---|---|
| Corrige lo marcado en rojo para guardar. | Revisa los renglones con borde rojo |
| Falta la entrada. / Falta la salida. | Escribe la hora que falta |
| La salida debe ser después de la entrada. | Corrige las horas (para turnos de noche, la salida puede quedar al día siguiente) |
| Se encima con otro registro. | Dos renglones cubren el mismo horario; ajusta uno |
| Cambiaste la hora: elige el motivo. / Registro agregado: elige el motivo. | Elige el motivo del renglón |
| Para anular una checada del reloj elige el motivo. | Elige el motivo de la anulación |
| Para quitar un registro agregado a mano elige el motivo. | Elige por qué lo quitas (por ejemplo **Checada duplicada** o **Error de captura**) |
| Escribe el motivo (al menos 5 letras). | En «Otro», escribe un motivo más claro |
| Hora extra: falta quién autoriza. | Elige quién autoriza o «No se autoriza» |
| La hora extra va antes de su entrada (…) o después de su salida (…). Dentro de la jornada usa «Jornada» | Cambia el concepto a Jornada o corrige las horas |

## Preguntas frecuentes

### ¿Puedo borrar una checada del reloj?

No. Solo se **anula**: deja de contar, pero queda en el historial. Así el registro siempre es auditable.

### ¿Qué pasa con la nómina si corrijo un día?

Las horas, la comida, la hora extra y el estado se recalculan al guardar. Si ese día ya está en una **nómina autorizada**, no se puede corregir: verás «Esa fecha pertenece a la nómina del … al …, que ya está autorizada. Para corregirla, el dueño debe cancelar esa nómina.».

### ¿Por qué no puedo elegir «Hora extra» en el concepto?

Porque todo ese renglón cae dentro de su jornada. La hora extra va antes de su entrada o después de su salida (Ley Federal del Trabajo, art. 66). Usa «Jornada». Para separar lo de después de su salida usa el botón **Separar…**; ver [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra).

### ¿Puedo corregir días viejos que se guardaron con otra regla?

Sí. Un renglón que se queda igual a como estaba guardado no se vuelve a validar con las reglas nuevas, para que puedas seguir corrigiendo días anteriores.

### ¿El empleado se entera?

Asistencias y el Monitor de todas las personas que lo tengan abierto se actualizan solos cuando alguien guarda un cambio.

## Qué pasa si…

- **…cierras la ventana con cambios:** te pregunta si quieres guardar, salir sin guardar o seguir editando.
- **…el servidor rechaza un renglón:** verás el error debajo de ese renglón y arriba del botón Guardar.
- **…no se puede abrir el reloj:** verás «No se pudo abrir el reloj de este día.»; vuelve a intentarlo.
- **…el día es festivo o domingo:** puedes corregir las horas, pero el tipo de día y su pago especial los pone el calendario.

## Relacionado

- [Cómo marcar qué pasó un día sin checadas](/ayuda/asistencias/que-paso-y-motivo)
- [Cómo registrar que llegó tarde o salió antes con permiso](/ayuda/asistencias/permiso-del-dia)
- [Cómo se registra y se corrige la comida](/ayuda/asistencias/comida)
- [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra)
- [Cómo corregir varios días a la vez](/ayuda/asistencias/acciones-masivas)
- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
