---
titulo: Cómo calcular un finiquito o una liquidación
resumen: Prepara el finiquito o la liquidación de una persona que se va. ADAMIA precarga su salario, vacaciones y días no trabajados, calcula cada concepto y lo guarda para firma.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/finiquitos-y-liquidaciones]
palabras: [finiquito, liquidación, liquidacion, baja, renuncia, despido, indemnización, prima de antigüedad, vacaciones pendientes, prima vacacional, aguinaldo proporcional, salarios vencidos]
orden: 90
actualizado: 2026-11-27
fuentes: [src/app/panel/finiquitos-y-liquidaciones/page.jsx, src/app/panel/finiquitos-y-liquidaciones/FiniquitoPreparation.jsx, src/app/panel/finiquitos-y-liquidaciones/FiniquitoResumen.jsx, src/lib/finiquitosApi.js, src/app/panel/empleados/EstadoEmpleadoDialog.jsx]
---

## Para qué sirve

Cuando una persona deja la empresa, en **Finiquitos y liquidaciones** calculas lo que le toca: salario pendiente, aguinaldo proporcional, vacaciones pendientes y prima vacacional (finiquito) y, si aplica, prima de antigüedad, indemnización y salarios vencidos (liquidación). Al guardarlo, la persona queda dada de baja y puedes pedirle su firma.

> **Importante:** ADAMIA te da un cálculo de referencia con las reglas de esta guía. Cada caso de terminación tiene sus particularidades legales: revisa el resultado con tu abogado o contador antes de pagar, sobre todo en liquidaciones.

## Quién la usa

Recursos Humanos y el dueño de la cuenta (o un usuario con acceso con permiso de editar en Nómina).

## Antes de empezar

- El módulo Nómina debe estar encendido. Entra por **Nómina → Finiquitos y liquidaciones**.
- La persona debe estar **activa** y tener su fecha de ingreso y su sueldo en la ficha.

## Cómo preparar un finiquito

1. Presiona **Nuevo Finiquito**. Se abre **Preparar finiquito**, con dos pasos arriba: **1 Preparar** y **2 Revisar y firmar**.
2. En **01 Empleado y baja**:
   - elige la **Unidad de negocio**;
   - escribe en **Empleado** y elige a la persona de la lista;
   - revisa la **Fecha de baja** (no puede ser anterior a su ingreso);
   - en **Tipo de cálculo** elige **Finiquito** o **Liquidación**;
   - en **Tipo de terminación** elige: Renuncia Voluntaria, Despido Justificado, Despido Injustificado, Mutuo Acuerdo, Fin de Contrato, Rescisión Artículo 51, Defunción u Otros;
   - opcional: escribe el **Motivo de baja**, que aparecerá en el documento.
3. En **02 Datos para el cálculo** revisa lo que ADAMIA precargó: **Salario diario** y **Días de salario pendientes** (los días trabajados que aún no le pagaste).
4. Abre **Ajustes de vacaciones y aguinaldo** si necesitas corregir: **Días no trabajados**, **Días de aguinaldo anual**, **Vacaciones pendientes de años anteriores**, **Días de vacaciones por año**, **Vacaciones ya gozadas este año** y **Prima vacacional (%)**.
5. Presiona **Calcular finiquito**. El **Resumen** de la derecha muestra cada concepto y el **Total a pagar**.
6. Si todo está bien, presiona **Guardar y continuar**.

![Preparar finiquito con los datos precargados](/ayuda/capturas/nomina/finiquito-preparar.webp "Elige a la persona y revisa los datos precargados")

![Resumen del finiquito calculado](/ayuda/capturas/nomina/finiquito-calculado.webp "El resumen muestra cada concepto, el total y el botón Guardar y continuar")

> **Ojo:** Si cambias cualquier dato después de calcular, el resumen dice «Cambiaste los datos. Vuelve a calcular para actualizar el importe.» y el botón vuelve a ser **Calcular finiquito**.

## Qué precarga ADAMIA

| Dato | De dónde sale |
| --- | --- |
| Salario diario | Del salario de su contrato activo (o del sueldo de su ficha de nómina), dividido según la periodicidad del contrato: semanal ÷ 7, catorcenal ÷ 14, quincenal ÷ 15, mensual ÷ 30.4. Sin contrato activo se divide entre 30.4. Revísalo siempre |
| Días no trabajados | Días registrados sin asistencia en el periodo |
| Vacaciones pendientes de años anteriores | La suma de sus periodos de vacaciones vigentes (Vacaciones por periodo) |
| Días de vacaciones por año | Los que le tocan según sus años cumplidos en la tabla de Vacaciones por ley de tu empresa (12 si no hay dato) |
| Días de aguinaldo anual | 15 |
| Prima vacacional | 25 % |

Todos se pueden cambiar antes de calcular.

## Cómo se calcula el finiquito

| Concepto | Cálculo |
| --- | --- |
| Salario pendiente | Días de salario pendientes × salario diario |
| Aguinaldo proporcional | Días de aguinaldo anual × (días del 1 de enero, o de su ingreso si fue después, a la fecha de baja, contando ambos − días no trabajados) ÷ 365 × salario diario |
| Vacaciones pendientes | (Vacaciones de años anteriores + vacaciones proporcionales del año − vacaciones ya gozadas) × salario diario. Las proporcionales son días de vacaciones por año × días desde su último aniversario (menos días no trabajados) ÷ 365 |
| Prima vacacional | Vacaciones pendientes en pesos × porcentaje de prima |

**Total del finiquito** = la suma de los cuatro conceptos. Abre **Ver detalle del cálculo** para ver todos los días que se usaron.

## Cómo se calcula una liquidación

Si eliges **Liquidación**, aparece el campo **Días de salarios vencidos** y al resumen se agregan, además del finiquito:

| Concepto | Cálculo |
| --- | --- |
| Prima de antigüedad | 12 días por cada año completo trabajado × el salario diario, con el tope que muestra el detalle del cálculo |
| Indemnización | (90 días + 20 días por cada año completo) × salario diario |
| Salarios vencidos | Días de salarios vencidos × salario diario |

El resumen muestra **Subtotal finiquito**, los tres conceptos, **Subtotal liquidación** y el **Total a pagar**.

![Resumen de una liquidación](/ayuda/capturas/nomina/liquidacion-calculada.webp "En una liquidación se suman prima de antigüedad, indemnización y salarios vencidos")

> **Importante:** ADAMIA suma la prima de antigüedad y la indemnización completas en cualquier liquidación, sin importar el tipo de terminación que elijas. Si en tu caso no corresponde alguno de esos conceptos, calcula como **Finiquito** y agrega lo que sí aplique fuera del sistema, o consulta a tu abogado.

## Qué pasa al guardar

- Se guarda el finiquito y verás «Finiquito guardado. Continúa con la firma desde el detalle.».
- **La persona queda dada de baja** en Empleados, con la fecha y el motivo de baja, y se cierran sus sesiones abiertas.
- El finiquito aparece en la lista con estado de pago **Pendiente**. Sigue con [Cómo pedir la firma del finiquito y registrar el pago](/ayuda/nomina/firma-y-pago-del-finiquito).

## Cómo llegar desde la baja de un empleado

Cuando das de baja a alguien desde **Empleados**, ADAMIA te pregunta «¿Generar finiquito?». Si presionas **Sí, generar finiquito**, se abre esta pantalla con la persona, su unidad y el motivo ya elegidos.

## Preguntas frecuentes

### ¿Puedo corregir un finiquito guardado?

Sí. En la lista presiona **Editar** (lápiz), cambia los datos, vuelve a calcular y guarda. No puedes cambiar a la persona ni la unidad.

### ¿Qué pasa si borro un finiquito?

Se elimina (pide confirmación y no se puede deshacer). Si era el único finiquito de esa persona, vuelve a quedar **Activa** en Empleados.

### ¿Por qué el aguinaldo sale proporcional aunque tenga años en la empresa?

Porque en el finiquito el aguinaldo siempre se paga en proporción a los días trabajados del año en curso, hasta la fecha de baja.

## Qué pasa si…

- **…no eliges persona o fecha de baja.** Verás «Selecciona un empleado y una fecha de baja.».
- **…el salario diario es cero.** Verás «Captura un salario diario mayor que cero.».
- **…escribes un número negativo en días o porcentajes.** Verás «Los días y porcentajes deben ser números iguales o mayores que cero.».
- **…no encuentras a la persona.** Revisa que esté activa y que elegiste la unidad correcta; la lista dice «No se encontraron empleados.».
- **…se guarda pero no se ve en la lista.** Verás «El registro se guardó, pero no se pudo actualizar la lista. Recarga la página para consultarlo.».

## Relacionado

- [Cómo pedir la firma del finiquito y registrar el pago](/ayuda/nomina/firma-y-pago-del-finiquito)
- [Cómo calcular aguinaldos](/ayuda/nomina/aguinaldos)
