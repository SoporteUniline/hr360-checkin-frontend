---
titulo: Mi suscripción, facturas y pagos
resumen: Consulta el estado de cuenta de tu empresa con ADAMIA, tu mensualidad, las facturas pendientes y pagadas y paga en línea.
modulo: suscripcion
audiencia: [dueno]
pantallas: [/panel/mi-suscripcion]
palabras: [suscripción, suscripcion, mensualidad, factura, facturas, pagar, estado de cuenta, adeudo, saldo pendiente, plan, renovar, suspendido, stripe]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/mi-suscripcion/page.jsx, src/components/SubscriptionRequiredView.jsx, src/app/panel/layout.jsx]
---

## Para qué sirve

En **Mi suscripción** ves cuánto pagas por ADAMIA, si estás al corriente, tus facturas y tus pagos. Desde aquí puedes pagar en línea las facturas pendientes.

## Quién la usa

**Solo el dueño de la cuenta.** Un usuario con acceso ve «Solo para el dueño de la cuenta». En la app de ADAMIA esta sección no aparece en el menú: consúltala desde el navegador.

## Antes de empezar

Entra por **Ajustes → Mi suscripción**. Esta pantalla siempre está disponible, aunque la suscripción esté vencida.

## Cómo leer tu estado de cuenta

![Estado de cuenta de Mi suscripción](/ayuda/capturas/suscripcion/mi-suscripcion.webp "Arriba el estado financiero; abajo el resumen de tu suscripción")

Arriba tienes cuatro datos:

| Dato | Qué significa |
| --- | --- |
| Estado financiero | **Al corriente**, **Con adeudo**, **En segundo adeudo** o **Suspendido** |
| Saldo pendiente | Lo que debes hoy |
| Total pagado | Todo lo que has pagado |
| Facturas pendientes | Cuántas facturas faltan de pagar |

En **Resumen de suscripción** ves: Empresa, Contrato, Estado empresa, Estado contrato, **Mensualidad actual**, **Vencimiento**, **Empleados Activos**, **Empleados archivados (Inactivo y Baja)**, **Tarifa mensual por Activo**, **Tarifa mensual por archivado** y Origen.

> **Consejo:** En el resumen ves por separado cuántas personas tienes activas y cuántas archivadas (inactivas o dadas de baja), y la tarifa mensual de cada tipo. Si tienes dudas sobre tu mensualidad, escríbele al equipo de ADAMIA.

## Cómo pagar una factura pendiente

1. Si tienes facturas pendientes aparece el recuadro **Tienes facturas pendientes**.
2. Presiona **Pagar $…** en la factura. Se abre la página de pago segura de Stripe en otra pestaña.
3. Paga con los medios que te ofrezca la página.
4. Regresa y presiona **Actualizar** para ver el cambio.

Si ya pagaste por transferencia, espera a que ADAMIA aplique tu pago; aparecerá en **Pagos registrados**.

## Cómo consultar tus facturas y pagos

![Facturas y pagos registrados](/ayuda/capturas/suscripcion/facturas-y-pagos.webp "Cada factura con su periodo, estado y botones para pagar, ver o descargar")

En **Facturas** ves cada una con **Periodo**, **Concepto**, **Estado**, **Vencimiento** y **Total**. En **Acciones**:

- **Pagar** (si está Pendiente o Vencida) o **Ver** (si ya está pagada) abre la factura en línea;
- **PDF** descarga la factura.

| Estado de la factura | Qué significa |
| --- | --- |
| Pendiente | Por pagar, aún no vence |
| Vencida | Pasó su fecha de vencimiento |
| Pagada Stripe | Pagada en línea |
| Pagada Externa | Pagada por otro medio (por ejemplo, transferencia) |
| Cancelada | Ya no se cobra |

En **Pagos registrados** ves **Fecha**, **Método**, **Referencia**, **Periodo** y **Monto** de cada pago.

## Preguntas frecuentes

### ¿Dónde cambio mi plan o agrego módulos?

En **Ajustes → Módulos**, con el botón **Contratar** de cada módulo. Ve [Cómo encender o apagar módulos](/ayuda/modulos/encender-y-apagar-modulos).

### ¿Los créditos de Adamia AI se pagan aquí?

No. Los créditos de Adamia AI se recargan aparte en **Ajustes → Créditos de Adamia AI**.

## Qué pasa si…

- **…tu empresa no tiene contrato activo.** Al entrar al panel verás «Suscripción Requerida» y el botón **Renovar ahora**, que abre WhatsApp con ADAMIA. Mi suscripción y Seguridad siguen disponibles. En la app se muestra «Acceso restringido».
- **…no tienes ninguna contratación registrada.** Verás «No tienes ninguna contratación registrada.».
- **…la pantalla no carga.** Verás «Error al cargar tu estado de cuenta.». Presiona **Actualizar** o intenta más tarde.

## Relacionado

- [Créditos de Adamia AI](/ayuda/creditos-ia/creditos-de-adamia-ai)
- [Cómo encender o apagar módulos](/ayuda/modulos/encender-y-apagar-modulos)
