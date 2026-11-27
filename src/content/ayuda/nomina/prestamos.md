---
titulo: Cómo manejar préstamos a empleados
resumen: Aprueba o rechaza los préstamos que piden los empleados, registra préstamos tú mismo, sigue la firma del acuerdo, cobra en la nómina y registra abonos en efectivo.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/nomina/prestamos, /panel/nomina/prestamos/nuevo, /panel/nomina/prestamos/[id]]
palabras: [préstamo, prestamo, préstamos, adelanto, abono, saldo, aprobar préstamo, rechazar préstamo, acuerdo, firma, abono en efectivo, cancelar préstamo, sin intereses, cuántos pagos, quincenas, calendario de pagos, último pago]
orden: 70
actualizado: 2026-11-27
fuentes: [src/app/panel/nomina/prestamos/page.jsx, src/app/panel/nomina/prestamos/nuevo/page.jsx, src/components/nomina/DetallePrestamo.jsx, src/components/nomina/RegistrarPrestamo.jsx, src/components/nomina/PlanPrestamo.jsx, src/lib/nomina/nomina.mjs]
---

## Para qué sirve

Los préstamos de ADAMIA son **sin intereses** y se cobran solos en cada nómina. Tú decides **en cuántos pagos** se cobra («6 quincenas», «12 semanas», «2 meses», según cómo se le paga a la persona) y ADAMIA calcula el abono al centavo. La persona firma un acuerdo desde su celular y, a partir de ahí, cada nómina le descuenta su abono hasta terminar de pagar.

## Quién la usa

| Acción | Quién |
| --- | --- |
| Aprobar, rechazar, registrar, abono en efectivo | Recursos Humanos o el dueño |
| Cancelar un préstamo por aprobar o por firmar | Recursos Humanos o el dueño |
| Cancelar un préstamo **vigente** con saldo | **Solo el dueño de la cuenta** |
| Pedir un préstamo y firmar el acuerdo | El empleado, desde Mi espacio |

## Antes de empezar

- El módulo Nómina debe estar encendido.
- La persona debe estar **activa** y conviene que tenga su sueldo y su periodo de pago (semanal, quincenal…) en la ficha o en su contrato vigente: ADAMIA los usa para decir los pagos con la palabra correcta, armar el calendario y avisarte si el abono pasa del límite de la ley o si el préstamo pasa de un mes de salario.
- Cada persona puede tener **un solo préstamo abierto** a la vez (por aprobar, por firmar o vigente).

## Cómo leer la lista de préstamos

1. Entra a **Nómina → Préstamos** (o la pestaña **Préstamos** dentro de Nómina).
2. Arriba ves **Por aprobar** («Pedidos desde Mi espacio»), **Por firmar** («Aún no se descuentan»), **Vigentes** y **Por cobrar** (la suma de los saldos vigentes y por firmar).
3. Filtra con **Todos**, **Por aprobar**, **Por firmar**, **Vigentes** o **Pagados**.
4. Cada renglón muestra la persona, el folio (P-3) y el motivo, **Prestado**, **Abono por nómina**, **Saldo**, el **Avance** en porcentaje y el **Estado**. Haz clic para abrir su detalle.

![Lista de préstamos con filtros y estados](/ayuda/capturas/nomina/prestamos-lista.webp "Préstamos: totales, filtros por estado y avance de cada uno")

| Estado | Qué significa |
| --- | --- |
| Por aprobar | La persona lo pidió desde Mi espacio y espera respuesta |
| Por firmar | Ya se aprobó; falta que firme el acuerdo. No se descuenta nada todavía |
| Vigente | Ya firmó; se descuenta en cada nómina |
| Pagado | Saldo en cero |
| Rechazado o Cancelado | Se cerró con un motivo |

## Cómo aprobar o rechazar un préstamo que pidió un empleado

1. Abre el préstamo **Por aprobar**.
2. Revisa el motivo y los avisos (por ejemplo, si pasa de un mes de salario).
3. Presiona **Aprobar**. Puedes ajustar el **Monto** y **¿En cuántos pagos?** (o, con **Prefiero poner cuánto por nómina**, el abono). Abajo ves el plan nuevo y el calendario antes de confirmar.
4. Presiona **Aprobar y enviar acuerdo**. Verás «Aprobado. Se envió el acuerdo para que lo firme en Mi espacio.».

![Aprobar un préstamo ajustando monto y número de pagos](/ayuda/capturas/nomina/prestamo-aprobar.webp "Al aprobar puedes cambiar el monto y en cuántos pagos")

Para rechazarlo presiona **Rechazar**, escribe el **Motivo** (obligatorio) y presiona **Rechazar**. La persona verá el motivo en Mi espacio.

## Cómo registrar un préstamo tú mismo

1. En la lista presiona **Registrar préstamo**. Se abre su página (no es una ventana: puedes volver con **Préstamos** o **Cancelar**; si escribiste algo, ADAMIA te pregunta antes de salir).
2. En **Persona**, escribe el nombre y elígela de la lista.
3. Escribe el **Monto prestado** y **¿En cuántos pagos?**. Al lado del número ves la palabra de su periodo de pago: «quincenas», «semanas», «catorcenas» o «meses».
4. Mientras escribes, ADAMIA te muestra el plan: «Se paga en **6 quincenas de $833.33 · la última de $833.35**», y el calendario: «Primer descuento: 1 al 15 dic 2026 · Último: 16 al 28 feb 2027».
5. Opcional: el **Motivo**.
6. Presiona **Registrar y enviar a firma**. El préstamo queda **Por firmar** y se abre su detalle.

![Registrar un préstamo en 6 quincenas con su calendario](/ayuda/capturas/nomina/prestamo-registrar.webp "El plan y el calendario se calculan mientras escribes")

Si prefieres escribir el abono, presiona **Prefiero poner cuánto por nómina**: escribes el **Abono por quincena** (o por semana, por mes…) y ADAMIA calcula en cuántos pagos se cubre. Para volver, **Prefiero decir en cuántos pagos**.

### Cómo se reparten los centavos

ADAMIA divide el monto entre los pagos **al centavo**: todos los pagos son iguales y el **último** lleva los centavos que sobran. Por ejemplo, **$5,000 en 6 quincenas** son 5 pagos de **$833.33** y el último de **$833.35** (5 × 833.33 + 833.35 = 5,000.00). En la nómina, ese último pago cobra el saldo completo; no queda un pago extra de unos centavos.

### Si el abono pasa del límite de la ley

Con el sueldo de su periodo, ADAMIA estima cuánto se le puede descontar por ley en cada nómina (el 30 % de lo que gana arriba del salario mínimo). Si el abono lo pasa, antes de guardar verás un aviso como «El abono de $833.35 pasa del tope de la ley para cada quincena ($382.32 …). Con 14 quincenas o más sí cabe.» y el botón **Usar 14 quincenas** para cambiarlo con un clic. El aviso no te impide guardar: decides tú.

### Qué quiere decir «aproximado» en el calendario

Si la empresa ya tiene nóminas de ese periodo en ADAMIA, el calendario sigue esas fechas. Si todavía no hay ninguna, se estima con el calendario normal (semanas de lunes a domingo, quincenas del 1 al 15 y del 16 al fin de mes, meses completos) y dice «aproximado».

## Cómo seguir la firma del acuerdo

En el detalle de un préstamo **Por firmar** verás el estado del acuerdo:

- «Esperando su firma en Mi espacio»
- «Abrió el acuerdo, falta que firme»
- «El enlace venció» o «La firma se canceló»

Si el enlace venció o se canceló, presiona **Generar acuerdo** para mandarle uno nuevo. En cuanto la persona firma, el préstamo pasa a **Vigente**.

> **Importante:** No se descuenta nada mientras el acuerdo no esté firmado.

## Cómo se cobra en la nómina

En cada nómina, cada préstamo vigente agrega el descuento «Abono a préstamo #N». El importe es el abono pactado (o, en el **último pago**, el saldo completo con sus centavos: la nota dice «Último pago: liquida el saldo…»), pero nunca más del 30 % de lo que la persona gana arriba del salario mínimo en sus días pagados. Puedes cambiarlo en el recibo (sin pasar del saldo).

El saldo **baja cuando el dueño autoriza la nómina**. Si después esa nómina se cancela, el abono se regresa al saldo y en el historial aparece como «Regresado (nómina cancelada)».

En el detalle ves lo **acordado** («Acordado en 6 quincenas de $833.33 · la última de $833.35»), los **pagos restantes**, el calendario con el **primer y último descuento** y el historial.

![Detalle de un préstamo vigente con su plan, calendario e historial](/ayuda/capturas/nomina/prestamo-vigente.webp "Saldo, pagos restantes, calendario e historial de abonos")

## Cómo registrar un abono en efectivo

1. Abre un préstamo **Vigente**.
2. Presiona **Registrar abono en efectivo**.
3. Escribe el **Importe** (no puede pasar del saldo) y, si quieres, una **Nota**.
4. Presiona **Registrar abono**. El saldo baja de inmediato y el movimiento queda en el **Historial** como «Abono en efectivo».

## Cómo cancelar un préstamo

1. Abre el préstamo y presiona **Cancelar préstamo**.
2. Escribe el **Motivo** y confirma. Si estaba vigente verás «El saldo de $500.00 ya no se cobrará.».

Un préstamo vigente con saldo solo lo puede cancelar el dueño de la cuenta.

## Preguntas frecuentes

### ¿Cobran intereses?

No. Los préstamos de ADAMIA son sin intereses.

### ¿Puede tener dos préstamos a la vez?

No. Hasta que termine de pagar (o se cancele o rechace) no se puede abrir otro. Si lo intentas verás «Ya tiene un préstamo abierto… Solo se permite uno a la vez.».

### ¿Por qué en la nómina se descontó menos que el abono?

Por el límite de la ley: el descuento no puede pasar del 30 % de lo que gana arriba del salario mínimo en sus días pagados. La nota del renglón lo explica.

### ¿Qué significa «Pagos restantes»?

Cuántos pagos faltan («4 quincenas») si se descuenta el abono completo cada vez. Si la ley limitó algún descuento, puede hacer falta uno más.

### ¿Hay un máximo de pagos?

No. Tú decides en cada caso. ADAMIA solo pide un número entero de 1 o más y que el abono no quede en $0.00.

### ¿Qué pasa con los préstamos que ya tenía?

Conservan su abono. Su número de pagos se calcula con el saldo y el abono y el detalle dice «(calculado con el abono)».

## Qué pasa si…

- **…la persona no está activa.** No se le puede prestar: «Solo se presta a personas activas.».
- **…no tiene sueldo en su ficha.** Verás el aviso «La persona no tiene sueldo registrado en su ficha.».
- **…el préstamo pasa de un mes de salario.** Aviso «Pasa de un mes de salario (…). La ley no permite exigir más de un mes.». No bloquea; decides tú.
- **…escribes un número de pagos con decimales o cero.** «Escribe en cuántos pagos se descuenta (un número entero, 1 o más).».
- **…son tantos pagos que el abono quedaría en $0.00.** «Son demasiados pagos para ese monto: el abono quedaría en $0.00.».
- **…la persona gana el salario mínimo o menos.** «Con su sueldo no gana más del salario mínimo: la ley no permite descontarle por nómina.».
- **…otra persona cambió el préstamo al mismo tiempo.** «Alguien más cambió este préstamo. Recarga para ver la versión actual.».
- **…no se pudo crear el acuerdo para firma.** El préstamo se guarda y verás un aviso en ámbar; usa **Generar acuerdo** desde su detalle.

## Relacionado

- [Mis préstamos (empleados)](/ayuda/nomina/mis-prestamos)
- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
- [Cómo autorizar la nómina y enviar los recibos](/ayuda/nomina/autorizar-y-enviar-recibos)
