---
titulo: Cómo calcula ADAMIA la nómina
resumen: De dónde sale cada número del recibo. Días pagados, sueldo, horas extra, prima dominical, festivos, faltas, permisos, retardos, bonos, préstamos y reparto entre transferencia y efectivo.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/nomina]
palabras: [cálculo, calculo, días pagados, sueldo, sueldo del contrato, revisar sueldos, sin contrato vigente, horas extra, dobles, triples, prima dominical, festivo, descanso trabajado, faltas, retardos, permiso con goce, sin goce, transferencia, efectivo, mixto]
orden: 20
actualizado: 2026-11-27
fuentes: [src/components/nomina/AsistenciaRecibo.jsx, src/components/nomina/EditorRecibo.jsx, src/lib/nomina/nomina.mjs, src/components/nomina/AvisoSueldosPorRevisar.jsx, src/app/panel/nomina/[id]/page.jsx]
---

## Para qué sirve

Esta guía explica, regla por regla, cómo arma ADAMIA cada recibo. Te sirve para revisar la nómina con confianza y para contestarle a un empleado que pregunta «¿por qué me pagaron esto?». En el detalle de cada nómina, al hacer clic en una persona, ADAMIA te muestra estas mismas cuentas día por día.

> **Importante:** Todo lo que calcula ADAMIA es una **sugerencia editable**: Recursos Humanos puede cambiar cualquier importe con un motivo. El recibo no es un CFDI. Mientras la **nómina formal** esté apagada, el cálculo solo incluye los conceptos de esta guía: **no calcula ISR ni cuotas del IMSS**. Si tu empresa hace esas retenciones, enciende la nómina formal en **Nómina › Configuración** para que se calculen solas (ve [Cómo manejar la nómina formal](/ayuda/nomina/nomina-formal)). Te recomendamos validar tus reglas con tu contador.

## Quién la usa

Recursos Humanos y el dueño de la cuenta. Para el empleado, el recibo en PDF muestra el resultado.

## Antes de empezar

El cálculo usa el **sueldo del contrato vigente** de cada persona; si no tiene contrato vigente, el de su ficha (y el recibo lo marca «sin contrato vigente»). De la ficha usa también el periodo de pago (con él entra a la nómina), el medio de pago y, si es mixto, cuánto va por transferencia, y sus horas por día. De **Asistencias** usa el horario, las checadas, faltas, permisos, festivos y horas extra autorizadas.

> **Importante:** si el sueldo de la ficha de alguien no coincide con el de su contrato vigente, la nómina **no se puede crear ni autorizar** hasta que decidas cuál es el correcto en **Revisar sueldos**. Lo mismo si su contrato tiene la **periodicidad por confirmar** (se estaba pagando como mensual). Puedes ver la nómina mientras tanto. Ve [Contratos laborales](/ayuda/documentos/contratos#como-revisar-sueldos).

![Aviso de sueldos por revisar en la nómina](/ayuda/capturas/nomina/nomina-sueldos-por-revisar.webp "La nómina no se autoriza con sueldos por revisar")

## Cómo calcula ADAMIA cada recibo

Para cada persona, ADAMIA sigue siempre el mismo orden:

1. Cuenta los **días pagados** del periodo.
2. Calcula el **sueldo** de esos días.
3. Suma **lo que se paga de más** (horas extra autorizadas, prima dominical, festivos o descansos trabajados y bono de desempeño).
4. Resta **lo que se descuenta** (horas no trabajadas o no repuestas, abonos a préstamos y descuentos del catálogo).
5. Aplica los **retardos**.
6. Aplica los **bonos y descuentos del catálogo**.
7. Calcula el **neto** y lo reparte entre transferencia y efectivo.

Cada paso, en detalle:

### Paso 1. Los días pagados

ADAMIA revisa cada día del periodo, solo dentro de las fechas en que la persona estuvo activa:

| Lo que pasó ese día | Cómo cuenta |
| --- | --- |
| Día con horario y trabajó | Día pagado |
| Día con horario que era festivo (lo haya trabajado o no) | Día pagado |
| Día con horario cubierto por un permiso **con goce** | Día pagado |
| Día con horario cubierto por un permiso **sin goce** o una inasistencia justificada sin goce | No se paga; cuenta como «sin goce», **no** como falta |
| Día con horario en que no trabajó y no tenía permiso | **Falta**: no se paga |
| Día sin horario (su descanso) | Se paga en proporción, ver abajo |

**Descansos pagados en proporción.** Por cada semana, los días de descanso se pagan según los días laborables que sí se pagaron: descansos × días pagados ÷ días laborables. Por ejemplo, si trabaja de lunes a sábado (6 días), descansa el domingo y tuvo 1 falta, se le pagan 5 días + 1 × 5 ÷ 6 = **5.83 días**.

> **Ojo:** Si la persona no tiene ningún horario capturado, ADAMIA le paga todos sus días activos y te avisa «No tiene horario: se pagaron todos sus días activos. Revísalo.».

### Paso 2. El sueldo

El sueldo es el del contrato vigente, expresado en el periodo de pago de la ficha (por ejemplo, un contrato de $10,500.00 al mes en una ficha quincenal da $5,250.00 por quincena). La fórmula depende del periodo de pago:

| Periodo de pago | Fórmula |
| --- | --- |
| Semanal, Catorcenal, Quincenal o Mensual | Sueldo del periodo × días pagados ÷ días de la nómina |
| Diario | Sueldo diario × días pagados |
| Por hora | Tarifa por hora × horas ordinarias trabajadas |

Ejemplo con un sueldo semanal de $2,100.00 y 5.83 días pagados en una nómina de 7 días: 2,100 × 5.83 ÷ 7 = **$1,750.00**. En el recibo aparece como «Sueldo (días pagados) · 5.83».

![Desplegable con la asistencia de una persona y la explicación del sueldo](/ayuda/capturas/nomina/asistencia-del-recibo.webp "Al hacer clic en una persona ves sus totales, la explicación del sueldo y su asistencia día por día")

**El sueldo diario** (para horas extra, primas y descuentos por horas) se obtiene dividiendo el sueldo entre 7 si es semanal, 14 si es catorcenal, 15 si es quincenal y 30 si es mensual. La **tarifa por hora** es el diario entre las horas por día de su ficha (8 si no tiene).

### Paso 3. Lo que se paga de más

| Concepto en el recibo | Cuándo aparece | Cuánto |
| --- | --- | --- |
| Horas extra dobles | Horas extra **autorizadas** en Asistencias hasta el tope semanal de la ley | Horas × tarifa por hora × 2 |
| Horas extra triples | Las horas autorizadas que pasan el tope semanal | Horas × tarifa por hora × 3 |
| Prima dominical (25 %) | Por cada domingo trabajado | 25 % del sueldo diario |
| Festivo trabajado (+200 %) | Por cada festivo en que trabajó | 2 sueldos diarios más |
| Descanso trabajado (+200 %) | Si trabajó en su día de descanso y ese día **no** se pagó como horas extra | 2 sueldos diarios más |
| Bono de desempeño | Si hay un bono aprobado en Evaluaciones para este periodo | El importe aprobado |

> **Importante:** Solo cuentan las horas extra **autorizadas** en Asistencias. Si alguien se quedó más tiempo pero nadie lo autorizó, no se paga como extra.

### Paso 4. Lo que se descuenta

| Concepto en el recibo | De dónde sale |
| --- | --- |
| Horas no trabajadas (permiso por parte del día) | Permisos de unas horas marcados como «se descuentan» o sin goce: minutos × tarifa por hora |
| Horas no repuestas | Horas de la cuenta de horas por reponer que se cerraron con «Rebajar en nómina» |
| Abono a préstamo #N | Préstamos vigentes (ver abajo) |
| Descuentos del catálogo | Los de **Bonos y descuentos** asignados a la persona |

Los permisos de unas horas marcados como «se reponen» o «se pagan» **no** descuentan nada. Si la persona cobra por hora, simplemente se le pagan las horas que trabajó.

**Préstamos.** Cada préstamo vigente agrega el renglón «Abono a préstamo #N». El importe es el **menor** de tres: el abono pactado, el saldo pendiente y el 30 % de lo que la persona gana en el periodo por arriba del salario mínimo de sus días pagados (límite de la ley). El salario mínimo sale de la tabla oficial por año de ADAMIA, la misma del tope de la prima de antigüedad del finiquito (2026: $315.04 diarios, zona general). Si el límite recorta el abono, el renglón lo explica en una nota.

### Paso 5. Los retardos

**Los retardos no descuentan sueldo.** Solo hacen que un bono condicionado a puntualidad salga en $0. Un retardo se cuenta igual que en Asistencias: llegar después del horario (o de la hora de su permiso para llegar tarde) más la tolerancia de la empresa.

### Paso 6. Los bonos y descuentos del catálogo

Cada bono o descuento asignado a la persona aparece con su valor (el valor propio de la persona, si tiene uno; si no, el valor sugerido):

| Cómo se aplica | Qué hace ADAMIA |
| --- | --- |
| Fijo cada periodo | Lo pone siempre con su valor |
| Si cumple la asistencia | Lo pone en $0 si no cumple, con la nota «No cumple: 1 falta» o «No cumple: 1 retardo» |
| A mano en cada nómina | Lo pone con la nota «Captura el importe» para que escribas cuánto |

Los permisos sin goce no cuentan como faltas para los bonos «sin faltas».

### Paso 7. Neto y reparto

**Neto = percepciones − descuentos.** Después se reparte según el **medio de pago** de la ficha:

| Medio de pago | Transferencia | Efectivo |
| --- | --- | --- |
| Transferencia | Todo el neto | $0 |
| Mixto | El monto fijo de la ficha (sin pasar del neto) | El resto |
| Efectivo | $0 | Todo el neto |
| Sin definir | $0 | Todo el neto, con el aviso «No tiene medio de pago: se tomó en efectivo.» |

En el recibo puedes cambiar la transferencia solo para esa nómina (campo **Transferencia en esta nómina**).

## Preguntas frecuentes

### ¿Por qué a una persona con una falta le bajó también el pago del domingo?

Porque el descanso se paga en proporción a los días laborables pagados de esa semana. Es la regla del Paso 1.

### ¿Por qué no se pagaron sus horas extra?

Solo se pagan las autorizadas en Asistencias. Autorízalas y presiona **Recalcular** mientras la nómina esté en borrador.

### ¿Los retardos le quitan dinero?

No del sueldo. Solo pueden dejar en $0 un bono condicionado a puntualidad.

### ¿Qué hago si el sueldo cambió después de calcular?

Si el sueldo de alguien cambió (por un convenio o al revisar sueldos) después de calcular, al autorizar verás que hay que recalcular. Regresa la nómina a borrador, presiona **Recalcular** y vuelve a enviarla.

### ¿Puedo cambiar un importe que calculó ADAMIA?

Sí, en borrador. Escribe el nuevo importe y, de preferencia, el motivo. Si recalculas, tu cambio se conserva. Ve [Cómo revisar y ajustar los recibos](/ayuda/nomina/revisar-y-ajustar-recibos).

## Qué pasa si…

- **…la persona ingresó o se dio de baja a mitad del periodo.** Solo se cuentan sus días activos y el recibo muestra el aviso con la fecha.
- **…no estuvo activa ningún día del periodo.** Su recibo sale vacío con el aviso «No estuvo activo en este periodo.».
- **…el neto sale negativo.** El recibo muestra «El neto es negativo: revisa los descuentos.» y no podrás enviar la nómina a autorizar hasta corregirlo.
- **…la persona no gana más del salario mínimo.** El abono del préstamo sale en $0 con la nota de que la ley no permite descontar.
- **…un préstamo se liquidó o se canceló.** Al recalcular, su renglón desaparece del borrador.

## Relacionado

- [Cómo revisar y ajustar los recibos](/ayuda/nomina/revisar-y-ajustar-recibos)
- [Cómo crear bonos y descuentos](/ayuda/nomina/bonos-y-descuentos)
- [Cómo manejar préstamos a empleados](/ayuda/nomina/prestamos)
- [Cómo revisar y exportar las asistencias de un periodo](/ayuda/asistencias/revisar-asistencias)
- [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra)
- [Cómo controlar las horas por reponer](/ayuda/asistencias/horas-por-reponer)
- [Cómo revisar y resolver incidencias antes de la prenómina](/ayuda/incidencias/centro-de-incidencias)
