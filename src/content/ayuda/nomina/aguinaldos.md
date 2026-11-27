---
titulo: Cómo calcular aguinaldos
resumen: Calcula el aguinaldo de varias personas a la vez, revisa quién lo recibe completo o proporcional, guarda el cálculo, descarga los PDF y marca lo pagado.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/aguinaldos]
palabras: [aguinaldo, aguinaldos, 15 días, proporcional, completo, fecha de corte, año fiscal, días no trabajados, pdf aguinaldo, pagado]
orden: 80
actualizado: 2026-11-27
fuentes: [src/app/panel/aguinaldos/page.jsx, src/app/panel/aguinaldos/AguinaldoViewDialog.jsx, src/app/panel/aguinaldos/CambiarEstadoDialog.jsx, src/lib/aguinaldosApi.js]
---

## Para qué sirve

La sección **Aguinaldos** calcula en un solo paso el aguinaldo de las personas que elijas, con su salario diario, sus días de aguinaldo y los días que no trabajaron en el año. Puedes guardar el cálculo, descargar un PDF general o uno por persona para firma y llevar el control de quién ya cobró.

## Quién la usa

Recursos Humanos y el dueño de la cuenta (o un usuario con acceso con permiso en Nómina).

## Antes de empezar

- El módulo Nómina debe estar encendido. Entra por **Nómina → Aguinaldos**.
- Revisa la **fecha de ingreso** y el **salario** de cada persona en su ficha: el cálculo parte de esos datos.
- Si alguien tiene derecho a más de 15 días de aguinaldo, cámbialo en la tabla antes de calcular.

## Cómo calcular el aguinaldo

1. Presiona **Nuevo Cálculo** (o la pestaña **Calculadora**).
2. En **Unidad de negocio** elige una unidad. Se cargan las personas activas de la empresa a la que pertenece esa unidad y la **Fecha de corte** se pone en el día de hoy.
3. Revisa la **Fecha de corte** (obligatoria): es la fecha hasta la que se calcula. El **Año fiscal** se llena solo con el año de esa fecha.
4. Opcional: escribe **Observaciones**, por ejemplo «Aguinaldo 2026 - Pago anticipado diciembre».
5. En **Selección de empleados** marca a las personas (o **Seleccionar / Deseleccionar Todos**). Puedes buscar por nombre, puesto o departamento.
6. Revisa en la tabla el **Salario diario**, los **Días aguinaldo** (15 por omisión) y los **Días NO Trabajados**. Los tres se pueden cambiar a mano.
7. Presiona **Calcular**.

![Configuración del cálculo de aguinaldo](/ayuda/capturas/nomina/aguinaldo-configurar.webp "Unidad de negocio, fecha de corte, año fiscal y observaciones")

![Tabla de selección de empleados con salario, días de aguinaldo y días no trabajados](/ayuda/capturas/nomina/aguinaldo-empleados.webp "Puedes corregir salario, días de aguinaldo y días no trabajados antes de calcular")

## Cómo se calcula

ADAMIA usa estas reglas:

- **Periodo del cálculo:** desde el 1 de enero del año fiscal (o desde la fecha de ingreso, si entró después) hasta la fecha de corte.
- **Días trabajados** = días del periodo − **días no trabajados**. Los días no trabajados se toman solos de Asistencias (días registrados sin asistencia en ese periodo) y los puedes corregir.
- **Completo:** si la persona tiene **un año o más** de antigüedad a la fecha de corte, recibe sus días de aguinaldo completos (15 o los que pusiste).
- **Proporcional:** si tiene **menos de un año**, recibe días de aguinaldo × días trabajados ÷ 365.
- **Monto** = días de aguinaldo calculados × salario diario.

Ejemplo: alguien que entró el 1 de febrero de 2026, con corte al 15 de diciembre, 2 días sin asistencia y salario diario de $320.00: tiene 317 días en el periodo, 315 trabajados, 15 × 315 ÷ 365 = 12.95 días; 12.95 × $320.00 = **$4,142.47**.

> **Ojo:** Los días no trabajados solo cambian el resultado de quien recibe aguinaldo **proporcional**. A quien tiene un año o más se le dan sus días completos.

**De dónde sale el salario diario precargado:** del salario de su **contrato activo** (o, si no tiene, del sueldo de su ficha de nómina), dividido según la periodicidad de pago del contrato: semanal ÷ 7, catorcenal ÷ 14, quincenal ÷ 15 y mensual ÷ 30.4; si es diario o por hora se toma tal cual. Si la persona no tiene contrato activo, el sueldo se divide entre 30.4 como si fuera mensual. **Revisa siempre este dato** y corrígelo en la tabla si no es el que quieres usar.

## Cómo revisar y guardar el resultado

![Resultados del cálculo de aguinaldos](/ayuda/capturas/nomina/aguinaldo-resultados.webp "Totales, monto general y el detalle por persona")

1. Revisa los totales: **Total Empleados**, **Aguinaldos Completos**, **Aguinaldos Proporcionales** y **Total general a pagar**.
2. En la tabla ves por persona: F. Ingreso, Años, Faltas (días no trabajados), Salario, Días Aguin., Tipo (**Completo** o **Proporcional**) y **Monto**.
3. Si ya sabes quién está pagado, cambia su **Estado** a **Pagado** (o **Cancelado**). Por omisión todos quedan **Pendiente**.
4. Presiona **PDF** en un renglón para el recibo individual de esa persona, o **Descargar PDF** para el reporte de todos.
5. Presiona **Guardar**. El cálculo aparece en la pestaña **Guardados**.

> **Importante:** Si no presionas **Guardar**, el cálculo se pierde al salir de la página.

## Cómo consultar, cambiar el estado o borrar un cálculo guardado

![Lista de cálculos de aguinaldo guardados](/ayuda/capturas/nomina/aguinaldos-guardados.webp "Cada cálculo guardado con su año, fechas, número de personas, total y estado")

En la pestaña **Guardados** cada renglón es un cálculo con su **ID**, **Unidad de negocio**, **Año**, **Fecha cálculo**, **Fecha corte**, **Empleados**, **Total** y **Estado**. Puedes filtrar por ID, unidad, año o estado desde los encabezados.

- **Editar** (lápiz): cambia el estado general del cálculo (Pendiente, Pagado o Cancelado).
- **Ver** (ojo): abre el detalle por persona, donde puedes cambiar el estado de cada una y descargar su PDF individual con espacio para la firma del trabajador.
- **Eliminar** (bote): borra el cálculo. Pide confirmación y no se puede deshacer.

## Preguntas frecuentes

### ¿Esto paga el aguinaldo en la nómina?

No. Aguinaldos es un cálculo aparte para que sepas cuánto pagar y tengas el comprobante. Si lo pagas junto con una nómina, agrégalo a mano en el recibo como bono.

### ¿Por qué no apareció una persona en el resultado?

Si ingresó después del fin del año fiscal o después de la fecha de corte, no aplica para ese año y se excluye con el aviso «… fueron excluidos porque no trabajaron durante el año fiscal…».

### ¿Puedo dar más de 15 días?

Sí. Cambia **Días aguinaldo** de esa persona en la tabla antes de calcular. La ley marca un mínimo de 15 días.

### ¿Cómo se cuentan los años?

Desde la fecha de ingreso hasta la fecha de corte. Por eso alguien que entró hace poco más de un año ya recibe su aguinaldo completo.

## Qué pasa si…

- **…no eliges a nadie.** Verás «⚠️ Debes seleccionar al menos un empleado».
- **…ninguna persona trabajó en ese año fiscal.** Verás «Ninguno de los empleados seleccionados trabajó durante el año fiscal…». Revisa las fechas de ingreso.
- **…el salario diario de alguien es cero.** Esa persona no aparece en el resultado. Corrige su salario en la tabla y vuelve a calcular.
- **…cambias la fecha de corte después de elegir personas.** Los días no trabajados se vuelven a consultar solos.

## Relacionado

- [Calculadora pública de aguinaldo](/ayuda/nomina/calculadora-de-aguinaldo)
- [Cómo calcular un finiquito o una liquidación](/ayuda/nomina/finiquitos-y-liquidaciones)
