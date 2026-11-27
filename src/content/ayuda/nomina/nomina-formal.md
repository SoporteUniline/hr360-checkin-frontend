---
titulo: Cómo manejar la nómina formal (ISR e IMSS)
resumen: Enciende la nómina formal para que cada recibo calcule el ISR con el subsidio para el empleo y la cuota del IMSS. Captura los datos fiscales de la empresa y de cada persona y revisa lo que falta.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/nomina/configuracion, /panel/nomina/configuracion/personas/[id]]
palabras: [nómina formal, nomina formal, ISR, impuesto, retención, subsidio para el empleo, IMSS, cuotas, cuota obrera, cuota patronal, salario base de cotización, SBC, SDI, salario diario integrado, registro patronal, prima de riesgo, RFC, régimen fiscal, código postal, tablas fiscales, UMA, gravado, exento, pre-nómina, timbrar]
orden: 25
actualizado: 2026-11-27
fuentes: [src/app/panel/nomina/configuracion/page.jsx, src/app/panel/nomina/configuracion/personas/[id]/page.jsx, src/components/nomina/DesgloseFiscal.jsx, src/lib/nomina/formal.mjs, src/components/nomina/EditorRecibo.jsx, src/app/panel/nomina/[id]/page.jsx]
---

## Para qué sirve

Si tu empresa paga una nómina **formal**, ADAMIA puede calcular en cada recibo el **ISR** (con el subsidio para el empleo) y la **cuota del IMSS** que se le retiene al trabajador. También te muestra lo que el patrón paga al IMSS, como información. Así ya no tienes que capturar esas retenciones a mano.

> **Importante:** Los recibos siguen **sin timbrar**: dicen «Pre-nómina, no timbrada» y no son un CFDI. El cálculo usa las tablas del SAT y del IMSS que ADAMIA tiene cargadas. Valídalo con tu contador antes de pagar.

## Quién la usa

Recursos Humanos captura los datos fiscales. Solo el **dueño de la cuenta** puede encender o apagar la nómina formal.

## Antes de empezar

La nómina formal está **apagada** para todas las empresas. Mientras esté apagada, la nómina funciona exactamente igual que siempre.

Para encenderla hacen falta dos cosas:

1. Que las **tablas fiscales** del año (UMA, salario mínimo, tarifa del ISR, subsidio para el empleo y cuotas del IMSS) estén **confirmadas**. Las confirma el equipo de ADAMIA con un contador. Mientras haya valores por confirmar, el botón **Encender nómina formal** no se puede usar.
2. Que la empresa tenga su **registro patronal** y su **prima de riesgo de trabajo**.

## Cómo encenderla

1. Entra a **Nómina** y abre la pestaña **Configuración**.
2. En **Datos fiscales de la empresa**, captura el registro patronal (11 letras y números, sin guiones), la prima de riesgo de trabajo en porcentaje (por ejemplo, 0.54355), el RFC, el régimen fiscal, el código postal de expedición y la zona del salario mínimo.
3. Presiona **Guardar datos de la empresa**.
4. En **Manejar nómina formal**, el dueño presiona **Encender nómina formal** y luego **Sí, encender**.
5. Recalcula las nóminas que tengas en borrador para que lleven ISR e IMSS. Las nóminas autorizadas no cambian.

> **Ojo:** Si enciendes o apagas la nómina formal después de calcular una nómina, ADAMIA no te deja enviarla ni autorizarla hasta que la recalcules. Así ningún recibo sale con el cálculo equivocado.

## Lo que falta para nómina formal

En la misma pestaña **Configuración**, la sección **Lo que falta para nómina formal** te dice qué datos faltan de la empresa y de cada persona:

| Etiqueta | Qué quiere decir |
| --- | --- |
| **Bloquea el cálculo** | Sin ese dato no se le puede calcular el ISR ni el IMSS. A esa persona su recibo le sale sin ISR ni IMSS y la nómina no se puede enviar ni autorizar hasta completarlo y recalcular. |
| **Para timbrar después** | No impide el cálculo, pero hará falta cuando ADAMIA timbre los recibos. |

A una persona le bloquea el cálculo que le falte el **número de seguridad social** (11 dígitos), la **fecha de ingreso** o, si no tiene sueldo fijo, su **salario diario integrado**.

Presiona **Completar datos** junto a la persona para abrir su página de datos fiscales.

## Los datos fiscales de cada persona

En la página de cada persona ves:

- **De su ficha:** NSS, RFC, CURP y fecha de ingreso. Se cambian en su ficha con **Editar en su ficha**.
- **Salario diario integrado (SDI):** ADAMIA lo calcula por ley con su sueldo y el factor de integración (aguinaldo de 15 días y prima vacacional del 25 % sobre sus días de vacaciones por antigüedad). Si la persona tiene prestaciones mayores o una parte variable, captura su SDI en **SDI capturado**; si lo dejas vacío, se usa el calculado.
- **Para timbrar más adelante:** código postal fiscal y las claves del SAT de tipo de contrato, régimen y jornada. Si su contrato dice, por ejemplo, «Indeterminado», ADAMIA te sugiere la clave con **Usar la sugerida**.

Presiona **Guardar datos fiscales** y recalcula la nómina en borrador.

## Qué cambia en el recibo

Con la nómina formal encendida, cada recibo agrega dos descuentos que **se calculan solos** y no se editan a mano:

- **ISR retenido:** el ISR según la tarifa del periodo, menos el subsidio para el empleo cuando aplica.
- **IMSS (cuota del trabajador):** la cuota del trabajador sobre su salario base de cotización y los días del periodo.

Si cambias otro renglón (un bono, el sueldo), el ISR y el IMSS se recalculan solos al guardar.

En el panel del recibo, la sección **ISR e IMSS** te muestra el desglose:

| Renglón | Qué es |
| --- | --- |
| Gravado y exento por concepto | Qué parte de cada percepción paga ISR. Las horas extra dobles están exentas al 50 % (hasta 5 UMA por semana) y la prima dominical hasta 1 UMA por domingo. |
| ISR según tarifa | El impuesto antes del subsidio. |
| Subsidio para el empleo aplicado | Lo que se resta del ISR cuando lo gravado no pasa del límite. Nunca se paga en efectivo. |
| ISR retenido | Lo que se descuenta. |
| Salario base de cotización y días cotizados | Con lo que se calcula el IMSS. Tiene un tope de 25 UMA. |
| IMSS (cuota del trabajador) | Lo que se descuenta. A quien gana el salario mínimo no se le descuenta: la paga el patrón. |
| IMSS a cargo del patrón | Solo informativo. No incluye INFONAVIT ni el impuesto sobre nómina. |

En el detalle de la nómina, arriba de la tabla, ves los totales de **ISR retenido**, **IMSS de los trabajadores** e **IMSS a cargo del patrón**, y quién se quedó sin calcular.

El recibo en PDF trae el mismo desglose y dice «Pre-nómina, no timbrada».

## Preguntas frecuentes

### ¿Puedo apagar la nómina formal?

Sí. El dueño presiona **Apagar nómina formal**. Las próximas nóminas que calcules ya no llevarán ISR ni IMSS. Las nóminas autorizadas no cambian.

### ¿Por qué el ISR de una quincena no es la mitad del ISR del mes?

Porque la tarifa de cada periodo del SAT se obtiene dividiendo la mensual entre 30.4 y multiplicando por los días del periodo (15 en una quincena), no entre 2.

### ¿ADAMIA calcula INFONAVIT, FONACOT o el impuesto sobre nómina?

Todavía no. Si tu empresa los descuenta, agrégalos como descuento a mano y revísalo con tu contador.

### ¿Los recibos ya se timbran ante el SAT?

No. Son una pre-nómina: te sirven para calcular y pagar con las retenciones correctas mientras ADAMIA prepara el timbrado.

## Qué pasa si…

- **…las tablas fiscales tienen valores por confirmar.** No se puede encender: «Las tablas fiscales de 2026 tienen … valor(es) por confirmar. Un administrador de ADAMIA debe revisarlas con un contador antes de encender la nómina formal.».
- **…falta el registro patronal o la prima de riesgo.** No se puede encender: «Faltan datos de la empresa: …».
- **…a una persona le falta su NSS.** Su recibo sale sin ISR ni IMSS y la nómina no se envía ni se autoriza: «A … no se le pudo calcular el ISR ni el IMSS: completa sus datos en Nómina › Configuración y recalcula.».
- **…intentas cambiar el ISR o el IMSS a mano.** No se puede: «El ISR y el IMSS se calculan solos en la nómina formal: cambia los renglones de los que salen (sueldo, bonos…) y se recalculan.».
- **…cambias el interruptor después de calcular.** «La empresa encendió la nómina formal después de calcular esta nómina: regrésala a borrador y recalcúlala para que lleve ISR e IMSS.».
- **…la persona gana el salario mínimo.** No se le retiene ISR y su cuota del IMSS la paga el patrón; el recibo lo explica.
- **…la prima de riesgo no está entre 0.5 % y 15 %.** «La prima de riesgo de trabajo va de 0.5 % a 15 % (art. 74 LSS). Escríbela como porcentaje, por ejemplo 0.54355.».

## Relacionado

- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
- [Cómo revisar y ajustar un recibo](/ayuda/nomina/revisar-y-ajustar-recibos)
- [Cómo autorizar la nómina y enviar los recibos](/ayuda/nomina/autorizar-y-enviar-recibos)
