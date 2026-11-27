---
titulo: Cómo revisar y ajustar los recibos de una nómina
resumen: Revisa la nómina renglón por renglón, corrige asistencias, cambia importes con motivo, agrega o quita bonos y descuentos y ajusta el reparto antes de enviarla.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/nomina]
palabras: [revisar nómina, recibo, ajustar importe, motivo, volver al sugerido, agregar bono, quitar bono, corregir asistencia, recalcular, transferencia, avisos, pdf]
orden: 30
actualizado: 2026-11-27
fuentes: [src/components/nomina/EditorRecibo.jsx, src/components/nomina/AsistenciaRecibo.jsx, src/components/nomina/FormConcepto.jsx, src/lib/nomina/nomina.mjs]
---

## Para qué sirve

Antes de mandar la nómina al dueño, revisa que cada persona tenga lo correcto. En el detalle de la nómina ves la asistencia y el pago de todos en una sola tabla, y puedes abrir el recibo de cada quien para ajustar lo que haga falta. Todo esto solo se puede hacer mientras la nómina está en **Borrador**.

## Quién la usa

Recursos Humanos y el dueño de la cuenta (o un usuario con acceso con permiso **Ver y editar** en Nómina).

## Antes de empezar

- Crea la nómina: [Cómo crear y calcular una nómina](/ayuda/nomina/crear-y-calcular-nomina).
- Ábrela desde **Nómina → Nóminas** haciendo clic en su renglón.

## Cómo leer el detalle de la nómina

![Detalle de una nómina en borrador](/ayuda/capturas/nomina/nomina-borrador.webp "Detalle de la nómina: totales, botones y un renglón por persona")

Arriba está el título con las fechas («Nómina del 16/11/2026 al 22/11/2026»), la periodicidad, quién la creó y el estado (**Borrador**, **Por autorizar**, **Autorizada** o **Cancelada**).

Luego vienen los totales: **Personas** (y cuántas tienen avisos por revisar), **Neto a pagar**, **Por transferencia** y **En efectivo**; y debajo **Faltas**, **Retardos** (con la nota «no descuentan sueldo») y **Horas extra** del periodo.

La tabla tiene dos bloques:

| Bloque | Columnas |
| --- | --- |
| Asistencia del periodo | Trabajó (días y horas), Faltas, Retardos, Horas extra, Días pagados (por ejemplo 5.83 / 7) |
| Pago | Percepciones, Descuentos, Neto, Transferencia, Efectivo |

La última columna, **Avisos**, muestra con ⚠ lo que conviene revisar (por ejemplo, alguien que ingresó a mitad del periodo o que no tiene medio de pago). Si hay más de un aviso verás «(+1)»; pasa el cursor para leerlos todos.

## Cómo ver la asistencia de una persona día por día

1. Haz clic en el renglón de la persona (o en el triángulo junto a su nombre).
2. Se despliega su asistencia: una franja con **Trabajó**, **Faltas**, **Retardos**, **Horas extra** y **Días pagados**, una explicación en palabras de cómo se calculó su sueldo y la tabla día por día con **Día**, **Qué pasó**, **Entrada**, **Salida**, **Trabajó**, **Su jornada** y **Pagos y descuentos**.
3. En **Pagos y descuentos** ves lo que se pagó de más o se descontó ese día (por ejemplo «+$150.00 2 h extra al doble»).

![Asistencia de una persona con explicación del sueldo](/ayuda/capturas/nomina/asistencia-del-recibo.webp "La explicación del sueldo y los días con su estado: trabajó, retardo, falta o descanso")

## Cómo corregir una asistencia desde la nómina

1. En la tabla día por día, presiona **Corregir** en el día equivocado.
2. Se abre la misma ventana de edición que usas en Asistencias. Corrige la checada y guarda.
3. Al cerrar, la nómina se recalcula sola y verás «Asistencia corregida: la nómina se recalculó. Lo que ajustaste a mano se conserva.».

> **Ojo:** El botón **Corregir** solo aparece con la nómina en borrador. Si cambias la asistencia directo en Asistencias, regresa y presiona **Recalcular**.

## Cómo cambiar un importe

1. En el desplegable de la persona presiona **Revisar recibo y ajustar importes**. Se abre su recibo a la derecha.
2. Arriba ves sus avisos y su asistencia; abajo, **Percepciones** y **Descuentos** con un campo de importe en cada renglón.
3. Escribe el nuevo importe. Aparece el campo **Motivo del cambio (opcional)**: escribe por qué (queda registrado).
4. Presiona **Guardar cambios (1)**. El número indica cuántos renglones cambiaste.

![Panel del recibo de una persona](/ayuda/capturas/nomina/recibo-panel.webp "El recibo se abre a la derecha con avisos, asistencia, percepciones y descuentos")

![Recibo con un importe cambiado y su motivo](/ayuda/capturas/nomina/recibo-editar-importe.webp "Cambia el importe, escribe el motivo y guarda")

Después de guardar, el renglón dice «Editado por Laura Ríos: el motivo · sugerido $0.00». Para deshacerlo presiona **Volver al sugerido**.

## Cómo agregar un bono o descuento a una persona

En el recuadro **Agregar bono o descuento** del recibo tienes tres opciones:

1. **Del catálogo.** Elige uno en «Del catálogo…», escribe el importe y presiona **Agregar**. Si dejas marcada la casilla **Dejárselo asignado para las próximas nóminas**, también se le asigna en su ficha y saldrá solo la próxima vez.
2. **Crear uno nuevo.** Presiona **Crear uno nuevo**, llena el formulario del bono o descuento y guárdalo: se crea en el catálogo y se agrega a este recibo.
3. **A mano.** Escribe el concepto en «O escribe un concepto», elige **Bono** o **Descuento**, escribe el importe y presiona **Agregar**. Este renglón solo existe en esta nómina y se puede borrar con **Quitar**.

![Recadro para agregar un bono o descuento](/ayuda/capturas/nomina/recibo-agregar-bono.webp "Del catálogo, uno nuevo o a mano")

## Cómo quitar un bono o descuento

En un bono o descuento del catálogo con importe mayor a cero verás dos opciones:

- **Quitar en esta nómina**: lo deja en $0 solo en este recibo.
- **Quitárselo para siempre**: lo deja en $0 aquí y además se lo quita de su ficha para las próximas nóminas.

## Cómo cambiar cuánto va por transferencia

Abajo del recibo están los totales (**Percepciones**, **Descuentos**, **Neto** y **Transferencia · Efectivo**) y el medio de pago de su ficha. Para cambiar el reparto solo en esta nómina:

1. Escribe el monto en **Transferencia en esta nómina**.
2. Presiona **Aplicar**. El resto se paga en efectivo.

Para volver a lo que dice su ficha, deja el campo vacío y presiona **Aplicar**. La transferencia nunca puede ser mayor que el neto.

## Cómo ver el recibo en PDF

En el recibo presiona **Ver recibo en PDF**. Se abre en otra pestaña tal como lo recibirá la persona.

## Preguntas frecuentes

### ¿Si presiono Recalcular pierdo mis cambios?

No. Los importes que cambiaste a mano y los renglones que agregaste se conservan; solo se actualizan las sugerencias.

### ¿Puedo dejar un importe en cero?

Sí. Los importes pueden ser cero o más; no se aceptan negativos.

### ¿Puedo cambiar el abono de un préstamo?

Sí, pero no puede pasar del saldo del préstamo. Si lo intentas verás «El abono no puede pasar del saldo del préstamo».

### ¿Por qué no veo los campos para editar?

La nómina ya no está en borrador (está por autorizar, autorizada o cancelada), o tu permiso en Nómina es solo **Ver**.

## Qué pasa si…

- **…un recibo queda con neto negativo.** Se marca en rojo y aparece «Hay 1 recibo(s) con neto negativo: corrígelos antes de enviar.». El botón **Enviar a autorizar** se desactiva hasta corregirlo.
- **…otra persona cambió la nómina al mismo tiempo.** Verás «Alguien más cambió esta nómina. Recarga para ver la versión actual.» y la pantalla se actualiza. Vuelve a hacer tu cambio.
- **…un recibo dice «Presiona «Recalcular» para ver la asistencia de este recibo.».** Ese recibo todavía no tiene el detalle de asistencia: presiona **Recalcular** (con la nómina en borrador).
- **…agregas un concepto sin nombre o sin tipo.** El servidor responde «Indica el nombre y si es percepción o descuento.».

## Relacionado

- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
- [Cómo autorizar la nómina y enviar los recibos](/ayuda/nomina/autorizar-y-enviar-recibos)
- [Cómo asignar bonos y descuentos a las personas](/ayuda/nomina/asignar-bonos-y-descuentos)
