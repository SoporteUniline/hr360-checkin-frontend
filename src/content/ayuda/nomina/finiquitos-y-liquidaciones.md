---
titulo: Cómo calcular un finiquito o una liquidación
resumen: Prepara el finiquito o la liquidación de una persona que se va. ADAMIA usa su salario, aplica la Ley Federal del Trabajo según el tipo de terminación y muestra la fórmula de cada concepto.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/finiquitos-y-liquidaciones]
palabras: [finiquito, liquidación, liquidacion, baja, renuncia, despido, despido justificado, despido injustificado, rescisión, indemnización, 90 días, 20 días por año, prima de antigüedad, tope salario mínimo, salario diario integrado, SDI, vacaciones pendientes, prima vacacional, aguinaldo proporcional, mutuo acuerdo, ISR]
orden: 90
actualizado: 2026-11-27
fuentes: [src/app/panel/finiquitos-y-liquidaciones/page.jsx, src/app/panel/finiquitos-y-liquidaciones/FiniquitoPreparation.jsx, src/app/panel/finiquitos-y-liquidaciones/FiniquitoResumen.jsx, src/app/panel/finiquitos-y-liquidaciones/FiniquitoViewDialog.jsx, src/lib/calculos/calculosLft.mjs, src/lib/finiquitosApi.js, src/app/panel/empleados/EstadoEmpleadoDialog.jsx]
---

## Para qué sirve

Cuando una persona deja la empresa, en **Finiquitos y liquidaciones** calculas lo que le toca según la Ley Federal del Trabajo (LFT). El **finiquito** (salario pendiente, aguinaldo proporcional, vacaciones y prima vacacional) se paga siempre. Según el **tipo de terminación** se agregan la **prima de antigüedad** y, en un despido injustificado o una rescisión por causa del patrón, la **indemnización** (eso es una **liquidación**). Cada concepto muestra su fórmula, en pantalla y en el PDF. Al guardarlo, la persona queda dada de baja y puedes pedirle su firma.

> **Importante:** Todos los importes son **brutos**: el ISR y las retenciones se calculan aparte. ADAMIA no calcula salarios vencidos (los fija un juicio laboral). Revisa el resultado con tu abogado o contador antes de pagar, sobre todo en liquidaciones.

## Quién la usa

Recursos Humanos y el dueño de la cuenta (o un usuario con acceso con permiso de editar en Nómina).

## Antes de empezar

- El módulo Nómina debe estar encendido. Entra por **Nómina → Finiquitos y liquidaciones**.
- La persona debe tener su fecha de ingreso y su salario en su **contrato activo** (o, si no tiene contrato, en su ficha de nómina).

## Cómo preparar un finiquito

1. Presiona **Nuevo Finiquito**. Se abre **Preparar finiquito**, con dos pasos arriba: **1 Preparar** y **2 Revisar y firmar**.
2. En **01 Empleado y baja**:
   - elige la **Unidad de negocio**;
   - escribe en **Empleado** y elige a la persona de la lista;
   - revisa la **Fecha de baja** (no puede ser anterior a su ingreso);
   - en **Tipo de terminación** elige uno de los siete tipos de la tabla de abajo. Debajo verás qué incluye; ADAMIA decide solo si es finiquito o liquidación;
   - opcional: escribe el **Motivo de baja**, que aparecerá en el documento.
3. En **02 Datos para el cálculo** revisa el **Salario diario** (debajo dice de dónde sale) y los **Días de salario pendientes** (los días trabajados que aún no le pagaste).
4. Abre **Ajustes de vacaciones y aguinaldo** si necesitas corregir algo: **Faltas a descontar del aguinaldo**, **Días de aguinaldo anual**, **Vacaciones pendientes de años anteriores**, **Días de vacaciones del año en curso**, **Vacaciones ya gozadas este año**, **Prima vacacional (%)**, **Zona del salario mínimo** y **Gratificación adicional pactada**.
5. En un despido injustificado o una rescisión aparece la casilla **Incluir 20 días por año (art. 50)**, activada. Quítala si no corresponde a tu caso.
6. Presiona **Calcular finiquito**. El **Resumen** de la derecha muestra cada concepto con su fórmula, los subtotales, el **Total a pagar** (bruto) y la nota «Importes brutos; el ISR y las retenciones se calculan aparte.».
7. Si todo está bien, presiona **Guardar y continuar**. ADAMIA vuelve a calcular en el servidor con los mismos datos y guarda ese resultado.

![Preparar finiquito con los datos precargados](/ayuda/capturas/nomina/finiquito-preparar.webp "Elige a la persona y revisa los datos precargados")

![Resumen del finiquito calculado](/ayuda/capturas/nomina/finiquito-calculado.webp "Cada concepto muestra su fórmula; el total es bruto")

> **Ojo:** Si cambias cualquier dato después de calcular, el resumen dice «Cambiaste los datos. Vuelve a calcular para actualizar el importe.» y el botón vuelve a ser **Calcular finiquito**.

## Qué incluye cada tipo de terminación

| Tipo | Finiquito | Prima de antigüedad | 90 días de SDI | 20 días por año de SDI |
| --- | --- | --- | --- | --- |
| Renuncia voluntaria | Sí | Solo con 15 años o más | No | No |
| Despido justificado (art. 47) | Sí | Sí | No | No |
| Despido injustificado | Sí | Sí | Sí | Casilla, activada |
| Rescisión por causa del patrón (art. 51) | Sí | Sí | Sí | Casilla, activada |
| Terminación de contrato por tiempo u obra determinado | Sí | Solo con 15 años o más | No | No |
| Muerte o incapacidad del trabajador | Sí | Sí | No | No |
| Mutuo acuerdo | Sí | Solo con 15 años o más | No | No (pueden pactar una gratificación adicional) |

Cuando la prima de antigüedad no aplica, el resumen lo dice y explica por qué.

## Qué precarga ADAMIA

| Dato | De dónde sale |
| --- | --- |
| Salario diario | El salario de su contrato activo; si no tiene contrato, el de su ficha de nómina con su propia periodicidad. Mensual ÷ 30, quincenal ÷ 15, catorcenal ÷ 14, semanal ÷ 7, diario tal cual (art. 89) |
| Faltas a descontar del aguinaldo | Días sin asistencia registrados del 1 de enero (o de su ingreso) a la fecha de baja. Pon 0 si no se descuentan |
| Vacaciones pendientes de años anteriores | Su saldo de Vacaciones: días cargados menos días tomados |
| Días de vacaciones del año en curso | Los de ley según su antigüedad (12 el primer año, 14 el segundo… tabla de la reforma 2023), o los de tu tabla de Vacaciones por ley si son más |
| Días de aguinaldo anual | Los de su contrato, mínimo 15 |
| Prima vacacional | La de su contrato o tu tabla, mínimo 25 % |
| Zona del salario mínimo | Salario mínimo general (cámbiala a Zona Libre de la Frontera Norte si el centro de trabajo está ahí) |

Todos se pueden cambiar antes de calcular. Si cambias el salario diario, el resumen avisa que es distinto al del empleado.

## Cómo se calcula

Los años de servicio cuentan del día de ingreso al día de baja, los dos incluidos, con la fracción del año en curso (por ejemplo «3 años + 157/365 días = 3.4301 años»).

| Concepto | Cálculo |
| --- | --- |
| Salario pendiente | Días de salario pendientes × salario diario |
| Aguinaldo proporcional (art. 87) | Días de aguinaldo × (días trabajados del año ÷ 365, o 366 en bisiesto) × salario diario. Los días trabajados van del 1 de enero (o del ingreso) a la baja, los dos incluidos, menos las faltas a descontar |
| Vacaciones (arts. 76 y 79) | (Pendientes de años anteriores + días del año en curso × fracción del año trabajada − ya gozadas este año) × salario diario |
| Prima vacacional (art. 80) | Los mismos días de vacaciones × salario diario × porcentaje de prima |
| Prima de antigüedad (art. 162) | 12 días × salario diario (con tope) × años de servicio |
| Indemnización constitucional (arts. 48 y 50) | 90 días × salario diario integrado (SDI) |
| 20 días por año (art. 50) | 20 días × SDI × años de servicio |
| Gratificación adicional | El monto pactado |

El **salario diario integrado (SDI)** suma al salario diario la parte de aguinaldo y de prima vacacional: SDI = salario diario × (1 + días de aguinaldo ÷ 365 + días de vacaciones × % de prima ÷ 365). Se muestra en **Ver detalle del cálculo**.

Cada concepto se redondea a centavos y el total es la suma de los conceptos.

### Por qué la prima de antigüedad puede no usar el salario del empleado

La ley (arts. 162, 485 y 486) pone un **tope**: el salario para la prima de antigüedad no puede pasar del **doble del salario mínimo** vigente en la fecha de baja, de la zona del centro de trabajo. Si el salario diario del empleado es mayor, se usa el tope. Por ejemplo, en 2026 el tope general es 2 × $315.04 = $630.08 y en la Zona Libre de la Frontera Norte 2 × $440.87 = $881.74. El resumen siempre explica si se aplicó el tope o no.

![Resumen de una liquidación](/ayuda/capturas/nomina/liquidacion-calculada.webp "En una liquidación se suman prima de antigüedad, 90 días y 20 días por año")

## Qué pasa al guardar

- Se guarda el finiquito y verás «Finiquito guardado. Continúa con la firma desde el detalle.».
- **La persona queda dada de baja** en Empleados, con la fecha y el motivo de baja, y se cierran sus sesiones abiertas.
- El finiquito aparece en la lista con estado de pago **Pendiente**. El detalle y el PDF muestran los mismos conceptos y fórmulas. Sigue con [Cómo pedir la firma del finiquito y registrar el pago](/ayuda/nomina/firma-y-pago-del-finiquito).

## Finiquitos calculados con la versión anterior

Los finiquitos guardados antes de esta actualización **no se recalculan solos**: se muestran con sus importes guardados, con la etiqueta **Versión anterior** en la lista y el aviso «Calculado con la versión anterior del cálculo…» en el detalle. Si todavía es un borrador (no se ha pagado), presiona **Recalcular como borrador** en el detalle: se abre en Editar; presiona **Recalcular con las reglas vigentes**, revisa y guarda.

## Cómo llegar desde la baja de un empleado

Cuando das de baja a alguien desde **Empleados**, ADAMIA te pregunta «¿Generar finiquito?». Si presionas **Sí, generar finiquito**, se abre esta pantalla con la persona, su unidad y el motivo ya elegidos.

## Preguntas frecuentes

### ¿Puedo corregir un finiquito guardado?

Sí. En la lista presiona **Editar** (lápiz), cambia los datos, vuelve a calcular y guarda. No puedes cambiar a la persona ni la unidad.

### ¿Qué pasa si borro un finiquito?

Se elimina (pide confirmación y no se puede deshacer). Si era el único finiquito de esa persona, vuelve a quedar **Activa** en Empleados.

### ¿Por qué el aguinaldo sale proporcional aunque tenga años en la empresa?

Porque el aguinaldo es anual: en el finiquito se paga la parte de los días trabajados del año en curso, hasta la fecha de baja.

### ¿El despido justificado paga algo además del finiquito?

Sí: la prima de antigüedad (12 días por año), aunque no paga indemnización.

### ¿Se descuenta el ISR?

No. ADAMIA muestra importes brutos; calcula el ISR y las retenciones aparte con tu contador.

## Qué pasa si…

- **…no eliges persona o fecha de baja.** Verás «Selecciona un empleado y una fecha de baja.».
- **…el salario diario es cero.** Verás «Captura un salario diario mayor que cero.».
- **…escribes un número negativo en días o porcentajes.** Verás «Los días y porcentajes deben ser números iguales o mayores que cero.».
- **…pones menos de 15 días de aguinaldo o menos de 25 % de prima.** ADAMIA usa el mínimo de ley y lo avisa en el resumen.
- **…la baja es de un año sin salario mínimo cargado.** Se usa el último año cargado y el resumen lo avisa.
- **…no encuentras a la persona.** Revisa que elegiste la unidad correcta; la lista dice «No se encontraron empleados.».
- **…se guarda pero no se ve en la lista.** Verás «El registro se guardó, pero no se pudo actualizar la lista. Recarga la página para consultarlo.».

## Relacionado

- [Cómo pedir la firma del finiquito y registrar el pago](/ayuda/nomina/firma-y-pago-del-finiquito)
- [Cómo calcular aguinaldos](/ayuda/nomina/aguinaldos)
- [Vacaciones por ley](/ayuda/vacaciones/vacaciones-por-ley)
