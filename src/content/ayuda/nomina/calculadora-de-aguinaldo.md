---
titulo: Calculadora pública de aguinaldo
resumen: Calcula un estimado de aguinaldo proporcional sin entrar a ADAMIA. Útil para empleados, dueños y RH que quieren una cuenta rápida.
modulo: nomina
audiencia: [empleado, rh, dueno]
pantallas: []
palabras: [calculadora de aguinaldo, aguinaldo proporcional, estimado, salario diario, salario mensual, fecha de corte, días no laborados]
orden: 85
actualizado: 2026-11-27
fuentes: [src/app/(public)/calculadora-aguinaldos/page.jsx]
---

## Para qué sirve

En la página pública **Calculadora de aguinaldos** de adamia.com.mx cualquier persona puede calcular un estimado de su aguinaldo proporcional. No necesita cuenta ni guarda ningún dato: todo se calcula en tu navegador mientras escribes.

## Quién la usa

Cualquier persona: empleados que quieren saber cuánto les toca, dueños que quieren hacer una cuenta rápida y RH antes de usar la sección **Aguinaldos** del panel.

## Antes de empezar

Ten a la mano el salario (diario o mensual), la fecha de ingreso y la fecha hasta la que quieres calcular.

## Cómo calcular tu aguinaldo

1. Abre la Calculadora de aguinaldos en el sitio de ADAMIA.
2. En **Tipo de salario** elige **Salario diario** o **Salario mensual** y escribe el importe en **Salario diario (MXN)** o **Salario mensual (MXN)**.
3. Escribe la **Fecha de ingreso** y la **Fecha de corte**.
4. Revisa los **Días de aguinaldo** (15 por omisión) y, si aplica, los **Días no laborados en el periodo**.
5. El resultado aparece a la derecha, en **Resultado estimado**. Para empezar de nuevo presiona **Limpiar**.

![Calculadora pública de aguinaldos con un resultado](/ayuda/capturas/nomina/calculadora-publica.webp "El resultado se actualiza mientras escribes")

## Cómo hace la cuenta

| Dato del resultado | Cómo se obtiene |
| --- | --- |
| Salario diario usado | El salario diario que escribiste, o el mensual ÷ 30 |
| Inicio de cálculo | El 1 de enero del año de la fecha de corte, o tu fecha de ingreso si es posterior |
| Días del periodo | Del inicio de cálculo a la fecha de corte, contando ambos días |
| Días efectivos | Días del periodo − días no laborados |
| Días de aguinaldo proporcionales | Días de aguinaldo × días efectivos ÷ 365 |
| Monto estimado de aguinaldo | Días proporcionales × salario diario |

Ejemplo: salario diario $320.00, ingreso el 1 de febrero de 2026, corte el 15 de diciembre de 2026 y 2 días no laborados: 318 días del periodo, 316 efectivos, 15 × 316 ÷ 365 = 12.99 días, y un monto estimado de unos $4,155.62.

> **Importante:** La calculadora es informativa y no sustituye asesoría contable o legal. Siempre calcula en proporción a los días del año, así que puede dar un resultado distinto al de la sección **Aguinaldos** del panel, donde quien tiene un año o más de antigüedad recibe sus días completos y el salario mensual se divide entre 30.4.

## Preguntas frecuentes

### ¿Se guardan mis datos?

No. La calculadora no se conecta a ningún servidor ni guarda lo que escribes.

### ¿Por qué me salen menos de 15 días si trabajé todo el año?

Si tu fecha de corte es antes del 31 de diciembre, la calculadora solo cuenta los días hasta esa fecha. Pon el 31 de diciembre como fecha de corte para ver el año completo.

## Qué pasa si…

- **…la fecha de ingreso es mayor que la de corte.** Verás «La fecha de ingreso no puede ser mayor a la fecha de corte.».
- **…pones 0 días de aguinaldo.** Verás «Los días de aguinaldo deben ser mayores a 0.».
- **…pones días no laborados negativos.** Verás «Los días no laborados no pueden ser negativos.».
- **…no escribes salario.** Verás «Captura un salario válido (diario o mensual).».
- **…te falta una fecha.** Verás «Captura los datos para ver el cálculo.».

## Relacionado

- [Cómo calcular aguinaldos (panel)](/ayuda/nomina/aguinaldos)
