---
titulo: Cómo pedir la firma del finiquito y registrar el pago
resumen: Genera el enlace para que la persona firme su finiquito o liquidación, revisa el estado de la firma, descarga el PDF y marca el pago.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/finiquitos-y-liquidaciones]
palabras: [firma finiquito, enlace de firma, pdf finiquito, imprimir finiquito, pagado, marcar como pagado, documento firmado, evidencia]
orden: 95
actualizado: 2026-11-27
fuentes: [src/app/panel/finiquitos-y-liquidaciones/FiniquitoViewDialog.jsx, src/app/panel/finiquitos-y-liquidaciones/page.jsx, src/lib/firmaDigitalApi.js]
---

## Para qué sirve

Después de guardar un finiquito o una liquidación, desde su detalle consigues la firma de la persona (con fotografía como evidencia), descargas o imprimes el documento y registras cuándo se le pagó.

## Quién la usa

Recursos Humanos y el dueño de la cuenta.

## Antes de empezar

Guarda el finiquito: [Cómo calcular un finiquito o una liquidación](/ayuda/nomina/finiquitos-y-liquidaciones).

## Cómo abrir el detalle

1. Entra a **Nómina → Finiquitos y liquidaciones**.
2. En la lista ves cada documento con su **ID**, **Unidad de negocio**, **Empleado**, **Fecha baja**, **Tipo** (Finiquito o Liquidación), **Total** y **Estado de pago**. Puedes filtrar por cada encabezado.
3. Presiona **Ver** (ojo) en el renglón.

![Lista de finiquitos y liquidaciones](/ayuda/capturas/nomina/finiquitos-lista.webp "Cada finiquito con su tipo, total y estado de pago")

El detalle muestra la fecha de baja, la terminación, el **Desglose del documento**, el **Total a pagar**, **Ver detalle del cálculo**, el **Motivo de baja** y, a la derecha, **Firma del documento** y **Estado del pago**.

![Detalle del finiquito con firma y pago](/ayuda/capturas/nomina/finiquito-firma-y-pago.webp "A la derecha, la firma y el pago")

## Cómo pedir la firma

1. En **Firma del documento**, si dice «Sin solicitud de firma», presiona **Solicitar firma**. ADAMIA genera el documento y un enlace.
2. Presiona **Copiar enlace de firma** y mándaselo a la persona por el medio que prefieras (o presiona **Abrir página de firma** para que firme ahí mismo, en tu equipo).
3. La persona abre el enlace, activa su cámara para la fotografía de evidencia, revisa el documento y dibuja su firma.
4. Para ver si ya firmó, presiona el botón de actualizar (flechas en círculo) junto a **Firma del documento**.

| Estado de la firma | Qué significa |
| --- | --- |
| Sin solicitud de firma | Aún no se genera el enlace |
| Pendiente de firma | El enlace está listo y no lo han abierto |
| Enlace abierto · por firmar | La persona lo abrió pero no ha terminado |
| Enlace vencido | Pasó el tiempo del enlace: presiona **Generar nuevo enlace** |
| Documento firmado | Firmó; verás quién y cuándo, y el botón **Ver PDF firmado** con la evidencia |

> **Ojo:** El enlace de firma de un finiquito dura **72 horas**. Si vence, genera uno nuevo.

> **Consejo:** El enlace completo solo se muestra cuando lo generas. Si cierras la ventana, usa el enlace que ya copiaste; si lo perdiste y venció, genera uno nuevo.

## Cómo descargar o imprimir el documento

En el detalle presiona **Descargar PDF** o **Imprimir**. Estas opciones generan el documento original, con espacios para la firma del trabajador y del representante de la empresa. Si ya está firmado, la versión con firma está en **Ver PDF firmado**.

## Cómo registrar el pago

1. Cuando ya le pagaste, en **Estado del pago** presiona **Marcar como pagado**.
2. Confirma con **Confirmar pago** («¿Confirmas que se realizó el pago de $…?»).
3. El estado cambia a **Pagado** y dice «El pago está registrado.».

## Preguntas frecuentes

### ¿La persona necesita cuenta en ADAMIA para firmar?

No. Basta con abrir el enlace desde un celular o computadora con cámara.

### ¿Puedo corregir el finiquito después de pedir la firma?

Puedes editarlo desde la lista, pero una firma ya hecha corresponde al documento que se firmó y desde esta ventana no se pide una segunda firma mientras haya una solicitud pendiente o firmada. Por eso, corrige y vuelve a calcular **antes** de solicitar la firma.

### ¿Se puede desmarcar un pago?

Desde esta ventana no hay opción para regresar a Pendiente. Revisa bien antes de confirmar.

## Qué pasa si…

- **…no se puede consultar la firma.** Verás «Estado de firma sin confirmar.» y el botón **Reintentar consulta**.
- **…el registro no tiene empresa.** Verás «El registro no incluye la empresa. No es posible solicitar la firma.».
- **…falla la generación del PDF.** Verás «No se pudo generar el PDF. Inténtalo de nuevo.».
- **…la persona abre un enlace vencido o cancelado.** Su página dice «Este enlace ya no está disponible»; genera uno nuevo.

## Relacionado

- [Cómo calcular un finiquito o una liquidación](/ayuda/nomina/finiquitos-y-liquidaciones)
- [Nómina: visión general](/ayuda/nomina)
