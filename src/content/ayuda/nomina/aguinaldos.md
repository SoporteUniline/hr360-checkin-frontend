---
titulo: Cómo calcular aguinaldos
resumen: Calcula el aguinaldo de varias personas a la vez, revisa quién lo recibe completo o proporcional, guarda el cálculo, descarga los PDF y marca lo pagado.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/aguinaldos]
palabras: [aguinaldo, aguinaldos, 15 días, proporcional, completo, fecha de corte, 31 de diciembre, año fiscal, días no trabajados, bisiesto, pdf aguinaldo, pagado, ISR]
orden: 80
actualizado: 2026-11-27
fuentes: [src/app/panel/aguinaldos/page.jsx, src/app/panel/aguinaldos/AguinaldoViewDialog.jsx, src/app/panel/aguinaldos/CambiarEstadoDialog.jsx, src/lib/aguinaldosApi.js, src/lib/calculos/calculosLft.mjs]
---

## Para qué sirve

La sección **Aguinaldos** calcula en un solo paso el aguinaldo de las personas que elijas, con su salario diario, sus días de aguinaldo y los días que no trabajaron en el año, según el art. 87 de la Ley Federal del Trabajo. Cada persona muestra la fórmula de su aguinaldo, en pantalla y en su PDF. Es la misma regla del finiquito y de la calculadora pública. Puedes guardar el cálculo, descargar un PDF general o uno por persona para firma y llevar el control de quién ya cobró.

> **Importante:** Los importes son **brutos**: el ISR y las retenciones se calculan aparte.

## Quién la usa

Recursos Humanos y el dueño de la cuenta (o un usuario con acceso con permiso en Nómina).

## Antes de empezar

- El módulo Nómina debe estar encendido. Entra por **Nómina → Aguinaldos**.
- Revisa la **fecha de ingreso** y el **salario** de cada persona en su ficha: el cálculo parte de esos datos.
- Si alguien tiene derecho a más de 15 días de aguinaldo, cámbialo en la tabla antes de calcular.

## Cómo calcular el aguinaldo

1. Presiona **Nuevo Cálculo** (o la pestaña **Calculadora**).
2. En **Unidad de negocio** elige una unidad. Se cargan las personas activas de la empresa a la que pertenece esa unidad.
3. Revisa la **Fecha de corte** (obligatoria): es la fecha hasta la que se calcula y viene en el **31 de diciembre** del año. Para el aguinaldo anual déjala así; con una fecha anterior se paga proporcional a los días trabajados hasta esa fecha. El **Año fiscal** se llena solo con el año de esa fecha.
4. Opcional: escribe **Observaciones**, por ejemplo «Aguinaldo 2026 - Pago anticipado diciembre».
5. En **Selección de empleados** marca a las personas (o **Seleccionar / Deseleccionar Todos**). Puedes buscar por nombre, puesto o departamento.
6. Revisa en la tabla el **Salario diario**, los **Días aguinaldo** (los del contrato, mínimo 15) y los **Días NO Trabajados**. Los tres se pueden cambiar a mano.
7. Presiona **Calcular**.

![Configuración del cálculo de aguinaldo](/ayuda/capturas/nomina/aguinaldo-configurar.webp "Unidad de negocio, fecha de corte, año fiscal y observaciones")

![Tabla de selección de empleados con salario, días de aguinaldo y días no trabajados](/ayuda/capturas/nomina/aguinaldo-empleados.webp "Puedes corregir salario, días de aguinaldo y días no trabajados antes de calcular")

## Cómo se calcula

ADAMIA usa estas reglas (art. 87 LFT):

- **Periodo del cálculo:** del 1 de enero del año fiscal (o de la fecha de ingreso, si entró después) a la fecha de corte, **contando los dos días**.
- **Días trabajados** = días del periodo − **días no trabajados**. Los días no trabajados se toman solos de Asistencias (días registrados sin asistencia en ese periodo) y los puedes corregir o dejar en 0.
- **Completo:** solo si trabajó **todo el año**: del 1 de enero al 31 de diciembre, sin días no trabajados. Recibe todos sus días de aguinaldo.
- **Proporcional:** en cualquier otro caso: días de aguinaldo × días trabajados ÷ días del año (365, o **366** en año bisiesto).
- **Monto** = días de aguinaldo × (días trabajados ÷ días del año) × salario diario, redondeado a centavos.

Ejemplos con la fórmula tal como la muestra ADAMIA:

| Caso | Fórmula |
| --- | --- |
| Entró el 1 de febrero de 2026, corte 31/12/2026, 2 días sin asistencia, $320.00 diarios | 15 días × 332/365 días trabajados × $320.00 = $4,366.03 |
| Entró en 2022, corte 31/12/2026, sin faltas, $300.00 diarios | 15 días × $300.00 = $4,500.00 (año completo) |
| Entró en 2022, corte 15/12/2026, $300.00 diarios | 15 días × 349/365 días trabajados × $300.00 = $4,302.74 |

> **Ojo:** Con una fecha de corte antes del 31 de diciembre, incluso quien tiene años en la empresa recibe la parte proporcional hasta esa fecha. Para pagar el aguinaldo anual completo deja la fecha de corte en el 31 de diciembre.

**De dónde sale el salario diario precargado:** del salario de su **contrato activo**; si no tiene contrato, del sueldo de su ficha de nómina con **su propia periodicidad**. Mensual ÷ 30, quincenal ÷ 15, catorcenal ÷ 14, semanal ÷ 7; diario tal cual (art. 89). **Revisa siempre este dato** y corrígelo en la tabla si no es el que quieres usar.

## Cómo revisar y guardar el resultado

![Resultados del cálculo de aguinaldos](/ayuda/capturas/nomina/aguinaldo-resultados.webp "Totales, monto general y el detalle por persona")

1. Revisa los totales: **Total Empleados**, **Aguinaldos Completos**, **Aguinaldos Proporcionales** y **Total general a pagar**.
2. En la tabla ves por persona: F. Ingreso, Años, Faltas (días no trabajados), Salario, Días Aguin., Tipo (**Completo** o **Proporcional**) y **Monto**, con la fórmula debajo.
3. Si ya sabes quién está pagado, cambia su **Estado** a **Pagado** (o **Cancelado**). Por omisión todos quedan **Pendiente**.
4. Presiona **PDF** en un renglón para el recibo individual de esa persona (incluye la fórmula y la nota de importes brutos), o **Descargar PDF** para el reporte de todos.
5. Presiona **Guardar**. ADAMIA vuelve a calcular cada aguinaldo en el servidor con los mismos datos y guarda ese resultado. El cálculo aparece en la pestaña **Guardados**.

> **Importante:** Si no presionas **Guardar**, el cálculo se pierde al salir de la página.

## Cómo consultar, cambiar el estado o borrar un cálculo guardado

![Lista de cálculos de aguinaldo guardados](/ayuda/capturas/nomina/aguinaldos-guardados.webp "Cada cálculo guardado con su año, fechas, número de personas, total y estado")

En la pestaña **Guardados** cada renglón es un cálculo con su **ID**, **Unidad de negocio**, **Año**, **Fecha cálculo**, **Fecha corte**, **Empleados**, **Total** y **Estado**. Puedes filtrar por ID, unidad, año o estado desde los encabezados.

- **Editar** (lápiz): cambia el estado general del cálculo (Pendiente, Pagado o Cancelado).
- **Ver** (ojo): abre el detalle por persona, con la fórmula de cada una, donde puedes cambiar su estado y descargar su PDF individual con espacio para la firma del trabajador. Los cálculos guardados antes de esta actualización se muestran tal como se guardaron, con la nota «Versión anterior».
- **Eliminar** (bote): borra el cálculo. Pide confirmación y no se puede deshacer.

## Preguntas frecuentes

### ¿Esto paga el aguinaldo en la nómina?

No. Aguinaldos es un cálculo aparte para que sepas cuánto pagar y tengas el comprobante. Si lo pagas junto con una nómina, agrégalo a mano en el recibo como bono.

### ¿Por qué no apareció una persona en el resultado?

Si ingresó después del fin del año fiscal o después de la fecha de corte, no aplica para ese año y se excluye con el aviso «… fueron excluidos porque no trabajaron durante el año fiscal…».

### ¿Puedo dar más de 15 días?

Sí. Cambia **Días aguinaldo** de esa persona en la tabla antes de calcular. La ley marca un mínimo de 15 días.

### ¿Por qué alguien con años en la empresa salió proporcional?

Porque la fecha de corte es anterior al 31 de diciembre o porque tiene días no trabajados. El aguinaldo completo es para quien trabajó todo el año calendario.

## Qué pasa si…

- **…no eliges a nadie.** Verás «⚠️ Debes seleccionar al menos un empleado».
- **…ninguna persona trabajó en ese año fiscal.** Verás «Ninguno de los empleados seleccionados trabajó durante el año fiscal…». Revisa las fechas de ingreso.
- **…el salario diario de alguien es cero.** Esa persona no aparece en el resultado. Corrige su salario en la tabla y vuelve a calcular.
- **…cambias la fecha de corte después de elegir personas.** Los días no trabajados se vuelven a consultar solos.

## Relacionado

- [Calculadora pública de aguinaldo](/ayuda/nomina/calculadora-de-aguinaldo)
- [Cómo calcular un finiquito o una liquidación](/ayuda/nomina/finiquitos-y-liquidaciones)
