---
titulo: Cómo autorizar la nómina y enviar los recibos
resumen: Envía la nómina al dueño, autorízala, manda los recibos en PDF por correo para firmar, revisa los envíos, descarga el Excel de pagos y cancela si hace falta.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/nomina]
palabras: [autorizar nómina, enviar a autorizar, regresar a borrador, recibos por correo, firma del recibo, reintentar envíos, excel de pagos, cancelar nómina, candado, checadas bloqueadas]
orden: 40
actualizado: 2026-11-27
fuentes: [src/lib/nomina/nomina.mjs, src/components/nomina/comun.jsx, src/components/nomina/EditorRecibo.jsx]
---

## Para qué sirve

Cuando la nómina ya está revisada, Recursos Humanos la envía al dueño de la cuenta. El dueño la autoriza y en ese momento ADAMIA cierra el periodo y le manda a cada persona su recibo en PDF por correo, con un enlace para firmarlo desde el celular.

## Quién la usa

| Acción | Quién |
| --- | --- |
| Enviar a autorizar, Regresar a borrador | Recursos Humanos o el dueño |
| Autorizar y enviar recibos | **Solo el dueño de la cuenta** |
| Cancelar una nómina en borrador o por autorizar | Recursos Humanos o el dueño |
| Cancelar una nómina autorizada | **Solo el dueño de la cuenta** |
| Reintentar envíos, Excel de pagos | Recursos Humanos o el dueño |

> **Ojo:** Los usuarios con acceso (aunque tengan rol Administrador) no pueden autorizar ni cancelar una nómina autorizada. Lo hace la cuenta principal.

## Antes de empezar

- La nómina debe estar en **Borrador** y revisada: [Cómo revisar y ajustar los recibos](/ayuda/nomina/revisar-y-ajustar-recibos).
- Ningún recibo puede tener neto negativo.
- Para que el correo llegue, cada persona necesita un correo en su ficha.

## Cómo enviar la nómina a autorizar (RH)

1. En el detalle de la nómina presiona **Enviar a autorizar**.
2. Lee el aviso «El dueño de la cuenta la revisará y autorizará. Mientras tanto ya no se puede editar; si hace falta, se regresa a borrador.» y presiona **Enviar**.
3. La nómina pasa a **Por autorizar** y verás el letrero «Enviada al dueño de la cuenta para su autorización.».

![Confirmación para enviar la nómina a autorizar](/ayuda/capturas/nomina/enviar-a-autorizar.webp "Al enviarla ya no se puede editar")

Si te diste cuenta de un error después de enviarla, presiona **Regresar a borrador**, corrige y vuelve a enviarla.

## Cómo autorizar la nómina (dueño)

1. En **Nómina → Nóminas**, el total **Por autorizar** te dice cuántas te esperan. Abre la nómina.
2. Revisa los totales y los recibos. Puedes abrir cualquier recibo en PDF.
3. Presiona **Autorizar y enviar recibos**.
4. Lee la confirmación: «Se cierra el periodo (ya no se podrán editar las checadas de esas fechas) y se envía a cada persona su recibo en PDF por correo para firmarlo.», con el neto total. Presiona **Autorizar**.

![Nómina por autorizar vista por el dueño](/ayuda/capturas/nomina/nomina-por-autorizar.webp "El dueño ve el botón Autorizar y enviar recibos")

![Confirmación para autorizar la nómina](/ayuda/capturas/nomina/autorizar-confirmar.webp "Revisa el neto total antes de autorizar")

## Qué pasa al autorizar

- **Se cierra el periodo.** Ya no se pueden corregir checadas, comidas ni asistencias de esas fechas (ni con el registro masivo). Si alguien lo intenta verá «Esa fecha pertenece a la nómina del … al …, que ya está autorizada. Para corregirla, el dueño debe cancelar esa nómina.».
- **Se cobran los préstamos.** El abono de cada préstamo baja su saldo; cuando llega a cero, el préstamo queda **Pagado**.
- **Se generan y envían los recibos.** Para cada persona se crea su recibo en PDF con folio, se prepara su firma (el enlace dura 30 días) y se le manda por correo con el PDF adjunto y el enlace para firmar. La pantalla se actualiza sola mientras se envían.
- **La persona lo ve en Mi espacio.** En **Mis recibos de pago** puede abrirlo y firmarlo aunque no le haya llegado el correo.

## Cómo revisar los envíos

En una nómina autorizada la última columna se llama **Envío** y muestra el estado de cada recibo:

| Estado | Qué significa |
| --- | --- |
| Enviando… | Se está generando y enviando |
| Enviado | El correo salió con el PDF y el enlace de firma |
| Sin correo | La persona no tiene correo en su ficha; puede firmar desde Mi espacio |
| No se envió | Hubo un problema al generar o enviar |

![Nómina autorizada con el estado de cada envío](/ayuda/capturas/nomina/nomina-autorizada.webp "En una nómina autorizada aparece la columna Envío y, si algo falló, Reintentar envíos")

Si algún recibo quedó como **No se envió**, presiona **Reintentar envíos**. Los marcados **Sin correo** no se reintentan: pídele a la persona que firme desde Mi espacio.

## Cómo descargar el Excel de pagos

En el detalle de cualquier nómina presiona **Excel de pagos**. Se descarga un archivo de Excel con una fila por persona y las columnas **Empleado**, **Banco**, **Cuenta / CLABE**, **Neto**, **Transferencia** y **Efectivo**. Úsalo para dispersar en tu banco, para tu contador o como base para timbrar en otro sistema.

## Cómo cancelar una nómina

1. En el detalle presiona **Cancelar nómina**.
2. Escribe el **Motivo** (es obligatorio; sin motivo el botón no se activa).
3. Presiona **Cancelar nómina** en la ventana.

![Ventana para cancelar una nómina autorizada](/ayuda/capturas/nomina/cancelar-nomina.webp "Cancelar una nómina pide un motivo")

Según el estado:

- **Borrador o Por autorizar:** «La nómina queda cancelada. Podrás crear otra para esas fechas.»
- **Autorizada (solo el dueño):** «Los recibos quedan cancelados, sus firmas pendientes se anulan y las checadas de esas fechas se pueden volver a corregir.» Además, los abonos de préstamos que se habían cobrado se regresan al saldo (en el historial del préstamo aparecen como «Regresado (nómina cancelada)»).

La nómina cancelada se queda en la lista con estado **Cancelada** y el letrero «Cancelada por … : motivo».

## Preguntas frecuentes

### ¿Puedo editar una nómina autorizada?

No. Para corregirla, el dueño la cancela, se corrige lo necesario y se crea una nueva nómina de esas fechas.

### ¿Qué recibe el empleado por correo?

Un correo con el asunto «Tu recibo de pago del … al …», su **Neto a pagar**, el PDF adjunto y el botón **Revisar y firmar mi recibo** (también puede firmarlo desde Mi espacio). El correo aclara que es un recibo de pago y no es un CFDI.

### ¿Cuánto tiempo tiene para firmar?

El enlace de firma del recibo dura 30 días. Después, la persona verá que ya no tiene un enlace vigente.

### ¿Se puede autorizar si hay préstamos que cambiaron?

ADAMIA revisa antes de autorizar que cada descuento de préstamo siga vigente y no pase del saldo. Si algo cambió verás, por ejemplo, «El préstamo #2 ya no está vigente: recalcula la nómina.». Regresa la nómina a borrador, presiona **Recalcular** y vuelve a enviarla.

## Qué pasa si…

- **…un usuario con acceso intenta autorizar.** No ve el botón; si llegara a intentarlo, el servidor responde «Solo el dueño de la cuenta puede hacer esto.».
- **…hay recibos con neto negativo.** No se puede enviar ni autorizar: «Hay recibos con neto negativo: corrígelos antes de continuar.».
- **…alguien más cambió la nómina mientras la veías.** Verás «Alguien más cambió esta nómina. Recarga para ver la versión actual.».
- **…cancelas una nómina autorizada después de que alguien firmó.** Su recibo queda cancelado; las firmas que estaban pendientes se anulan.

## Relacionado

- [Mis recibos de pago (empleados)](/ayuda/nomina/mis-recibos-de-pago)
- [Cómo manejar préstamos a empleados](/ayuda/nomina/prestamos)
- [Cómo crear y calcular una nómina](/ayuda/nomina/crear-y-calcular-nomina)
