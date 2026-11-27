---
titulo: Créditos de Adamia AI
resumen: Consulta tu saldo en pesos para usar Adamia AI, recarga con un paquete, revisa el consumo del mes por función y el historial de movimientos, incluido el crédito de bienvenida.
modulo: creditos-ia
audiencia: [dueno, rh]
pantallas: [/panel/creditos-ia]
palabras: [créditos, creditos, adamia ai, inteligencia artificial, saldo, recargar, recarga, paquetes, iva, consumo, movimientos, crédito de bienvenida, cortesía, sin créditos, saldo bajo, gratis por ahora]
orden: 10
actualizado: 2026-11-27
fuentes: [src/components/ia/CreditosIA.jsx, src/lib/ia/creditos.mjs, src/components/ia/AvisoSinCreditos.jsx, src/app/panel/creditos-ia/page.jsx]
---

## Para qué sirve

Adamia AI (el asistente de la Ley Federal del Trabajo, las sugerencias de Clima, las plantillas de documentos, desempeño y otras funciones con inteligencia artificial del panel) se paga con un **saldo en pesos** de prepago. En **Créditos de Adamia AI** ves cuánto te queda, recargas y revisas en qué se usó.

## Quién la usa

El dueño y Recursos Humanos. Cualquier usuario del panel puede entrar y recargar. Si tienes varias empresas, cada empresa tiene su propio saldo: elígela arriba a la derecha.

## Antes de empezar

Entra por **Ajustes → Créditos de Adamia AI**. Para recargar necesitas el navegador: en la app de ADAMIA verás «Las recargas se hacen desde el navegador en adamia.com.mx, con la misma cuenta.».

## Cómo leer tu saldo

![Saldo, aviso de saldo bajo y paquetes de recarga](/ayuda/capturas/creditos-ia/creditos-saldo.webp "Saldo disponible, aviso de saldo bajo y paquetes para recargar")

- **Saldo disponible** en pesos (en rojo si ya no tienes) y tu **Última recarga**.
- Debajo, cómo se usa: «Cada consulta a Adamia AI en el panel descuenta su precio.».
- El agente de WhatsApp de reclutamiento **no** usa estos créditos: va en tus paquetes de entrevistas.

| Aviso | Cuándo aparece |
| --- | --- |
| Tu saldo bajó del 20 % de tu última recarga. Recarga para no quedarte sin Adamia AI. | Saldo bajo. El dueño también recibe un correo, una vez por recarga |
| Sin créditos de Adamia AI. Recarga para seguir usando la IA. | Saldo en cero: las funciones con IA se detienen hasta recargar |
| Gratis por ahora: el cobro de Adamia AI aún no está activo | ADAMIA todavía no activa el cobro para tu cuenta: tus consultas no descuentan saldo y aquí ves cuánto habrían costado |

> **Importante:** El cobro lo enciende ADAMIA para todas las cuentas; tú no tienes que activarlo. Mientras veas «Gratis por ahora», usar Adamia AI no te cuesta.

## Cómo recargar

1. En **Recargar** elige un paquete. Cada tarjeta muestra el monto que se acredita y abajo «+ IVA … · total …».
2. Presiona **Recargar $…**. Se abre la página de pago segura de Stripe (tarjeta u otros medios que ofrezca, como OXXO o transferencia).
3. Paga y regresa a ADAMIA. La pantalla espera la confirmación del banco y te muestra el resultado.

| Mensaje al regresar | Qué significa |
| --- | --- |
| ¡Listo! Tu recarga (folio IA-…) ya está en tu saldo. | El pago se confirmó y el saldo ya subió |
| Estamos confirmando tu pago con el banco… | Falta la confirmación. Con OXXO o transferencia puede tardar hasta que se refleje tu pago |
| Cancelaste el pago. No se hizo ningún cargo. | Saliste de Stripe sin pagar |
| Tu pago (folio IA-…) no se completó… | La ficha de OXXO o la transferencia venció o fue rechazada. No se cobró nada; puedes recargar de nuevo |
| Tu pago (folio IA-…) quedó en revisión. Escríbenos y lo resolvemos. | Contacta a ADAMIA con el folio |

> **Ojo:** Se acredita el monto del paquete; el IVA se cobra aparte.

## Cómo revisar el consumo y los movimientos

![Consumo del mes y movimientos](/ayuda/capturas/creditos-ia/creditos-consumo-movimientos.webp "Lo que se usó este mes por función y cada movimiento con su saldo")

- **Consumo del mes**: cada función con su número de consultas y lo que costó, y el total. Si el cobro aún no está activo dice «Lo que habría costado cada función (aún no se descuenta).».
- **Movimientos**: cada entrada o salida de saldo con fecha, importe y saldo después. Presiona **Ver anteriores** para ver más.

| Movimiento | Qué es |
| --- | --- |
| Recarga | Una compra de paquete |
| Cortesía de ADAMIA | Saldo regalado por ADAMIA, como el **crédito de bienvenida** |
| Consumo | Lo que costó una consulta |
| Ajuste | Corrección hecha por ADAMIA, con su motivo |
| Reembolso | Devolución de una recarga |

## El crédito de bienvenida

Cada empresa recibe **una sola vez** un crédito de bienvenida para probar Adamia AI. Aparece en Movimientos como **Cortesía de ADAMIA** con un concepto como «Crédito de bienvenida de Adamia AI: US$1.00 × … = … MXN»: el monto se define en dólares y se convierte a pesos con el tipo de cambio que registra ADAMIA.

## Preguntas frecuentes

### ¿Qué pasa si me quedo sin créditos a mitad de algo?

En cualquier pantalla con IA aparece «Te quedaste sin créditos de Adamia AI» con el botón **Recargar créditos**. Lo que ya hiciste no se pierde; al recargar puedes seguir.

### ¿Puedo quedar con saldo negativo?

No. ADAMIA revisa tu saldo antes de cada consulta; nunca te queda deuda.

### ¿El saldo es por usuario o por empresa?

Por empresa. Todos los usuarios de esa empresa usan el mismo saldo.

## Qué pasa si…

- **…aparece «Los créditos de Adamia AI aún no están disponibles en tu cuenta.».** Tu cuenta todavía no tiene esta función; consulta a ADAMIA.
- **…aparece «No hay paquetes disponibles por ahora.».** No hay paquetes a la venta en este momento; intenta más tarde.
- **…aparece «No se pudo abrir el pago. Intenta de nuevo.».** Revisa tu conexión y vuelve a presionar el paquete.

## Relacionado

- [Créditos y límites de Adamia AI: indicadores y topes](/ayuda/adamia-ai/creditos-y-limites)
- [Qué es Adamia AI](/ayuda/adamia-ai/que-es-adamia-ai)
- [Mi suscripción, facturas y pagos](/ayuda/suscripcion/mi-suscripcion)
- [Roles y permisos por módulo](/ayuda/usuarios/roles-y-permisos)
