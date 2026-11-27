---
titulo: Calculadora pública de aguinaldo
resumen: Calcula el aguinaldo proporcional sin entrar a ADAMIA, con la misma regla de la Ley Federal del Trabajo que usa el panel. Útil para empleados, dueños y RH.
modulo: nomina
audiencia: [empleado, rh, dueno]
pantallas: []
palabras: [calculadora de aguinaldo, aguinaldo proporcional, estimado, salario diario, salario semanal, salario quincenal, salario mensual, fecha de corte, días no laborados, bisiesto]
orden: 85
actualizado: 2026-11-27
fuentes: [src/app/(public)/calculadora-aguinaldos/page.jsx, src/lib/calculosLftApi.js, src/lib/calculos/calculosLft.mjs]
---

## Para qué sirve

En la página pública **Calculadora de aguinaldos** de adamia.com.mx cualquier persona puede calcular su aguinaldo proporcional. No necesita cuenta. El cálculo lo hace ADAMIA con **la misma regla** (art. 87 de la Ley Federal del Trabajo) que usan la sección **Aguinaldos** del panel y los finiquitos, así que para los mismos datos da el mismo resultado. No se guarda lo que escribes.

## Quién la usa

Cualquier persona: empleados que quieren saber cuánto les toca, dueños que quieren hacer una cuenta rápida y RH antes de usar la sección **Aguinaldos** del panel.

## Antes de empezar

Ten a la mano el salario (diario, semanal, quincenal o mensual), la fecha de ingreso y la fecha hasta la que quieres calcular.

## Cómo calcular tu aguinaldo

1. Abre la Calculadora de aguinaldos en el sitio de ADAMIA.
2. En **Tipo de salario** elige **Salario diario**, **Salario semanal (÷ 7)**, **Salario quincenal (÷ 15)** o **Salario mensual (÷ 30)** y escribe el importe.
3. Escribe la **Fecha de ingreso** y la **Fecha de corte** (para el año completo, el 31 de diciembre).
4. Revisa los **Días de aguinaldo** (15 por omisión; la ley pide al menos 15) y, si aplica, los **Días no laborados en el periodo**.
5. El resultado aparece a la derecha, en **Resultado estimado**, con la fórmula debajo del monto. Para empezar de nuevo presiona **Limpiar**.

![Calculadora pública de aguinaldos con un resultado](/ayuda/capturas/nomina/calculadora-publica.webp "El resultado y su fórmula se actualizan mientras escribes")

## Cómo hace la cuenta

| Dato del resultado | Cómo se obtiene |
| --- | --- |
| Salario diario usado | El salario diario que escribiste, o el semanal ÷ 7, el quincenal ÷ 15 o el mensual ÷ 30 |
| Periodo | Del 1 de enero del año de la fecha de corte (o de tu fecha de ingreso, si es posterior) a la fecha de corte |
| Días del periodo | Del inicio a la fecha de corte, contando los dos días |
| Días trabajados | Días del periodo − días no laborados, de 365 (366 si el año es bisiesto) |
| Días de aguinaldo proporcionales | Días de aguinaldo × días trabajados ÷ días del año |
| Monto estimado de aguinaldo (bruto) | Días de aguinaldo × (días trabajados ÷ días del año) × salario diario, redondeado a centavos |

Ejemplo: salario diario $320.00, ingreso el 1 de febrero de 2026, corte el 15 de diciembre de 2026 y 2 días no laborados: 318 días del periodo y 316 trabajados. La fórmula queda **15 días × 316/365 días trabajados × $320.00 = $4,155.62**.

> **Importante:** El monto es **bruto**: el ISR y las retenciones se calculan aparte. La calculadora es informativa y no sustituye asesoría contable o legal.

## Preguntas frecuentes

### ¿Se guardan mis datos?

No. La calculadora manda los datos a ADAMIA solo para hacer la cuenta y no los guarda.

### ¿Por qué me salen menos de 15 días si trabajé todo el año?

Si tu fecha de corte es antes del 31 de diciembre, solo se cuentan los días hasta esa fecha. Pon el 31 de diciembre como fecha de corte para ver el año completo.

### ¿Da lo mismo que el panel de ADAMIA?

Sí. Para el mismo salario diario, fechas, días de aguinaldo y días no laborados, la calculadora, la sección **Aguinaldos** y el aguinaldo del finiquito dan el mismo monto.

## Qué pasa si…

- **…la fecha de ingreso es mayor que la de corte.** Verás «La fecha de ingreso no puede ser mayor a la fecha de corte.».
- **…pones menos de 15 días de aguinaldo.** Se usan 15, el mínimo de ley, y lo verás en un aviso.
- **…pones días no laborados negativos.** Verás «Los días no trabajados no pueden ser negativos.».
- **…falta el salario, una fecha o los días de aguinaldo.** Verás «Captura los datos para ver el cálculo.».
- **…no hay conexión.** Verás «No se pudo calcular en este momento. Inténtalo de nuevo.».

## Relacionado

- [Cómo calcular aguinaldos (panel)](/ayuda/nomina/aguinaldos)
- [Cómo calcular un finiquito o una liquidación](/ayuda/nomina/finiquitos-y-liquidaciones)
