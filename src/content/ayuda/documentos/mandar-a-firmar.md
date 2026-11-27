---
titulo: Cómo mandar a firmar un documento
resumen: Desde Documentos emitidos solicita la firma electrónica de un documento, comparte el enlace con la persona y revisa cuándo quedó firmado.
modulo: documentos
audiencia: [rh, dueno]
pantallas: [/panel/gestion-documental/documentos]
palabras: [firma electrónica, mandar a firmar, solicitar firma, enlace de firma, documentos emitidos, firmado, pdf firmado, evidencia, folio]
orden: 40
actualizado: 2026-11-27
fuentes: [src/app/panel/gestion-documental/documentos/page.jsx, src/lib/firmaDigitalApi.js, src/components/firma/EvidenciaFirma.jsx]
---

## Para qué sirve

Con la **firma electrónica** la persona firma el documento desde su celular, sin imprimir. ADAMIA guarda el PDF firmado con su **constancia y evidencia** (fecha, hora y, si firmó dibujando, una fotografía).

Lo encuentras en **Gestión documental → Documentos emitidos**.

![Documentos emitidos con sus estatus](/ayuda/capturas/documentos/documentos-emitidos.webp "Historial de todos los documentos emitidos")

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- El documento debe estar **generado para un empleado** (ve [Cómo generar un documento](/ayuda/documentos/generar-documento)).
- Si la persona va a firmar **con PIN**, debe tener su firma y PIN guardados en su app (ve [Mi firma y PIN](/ayuda/empleados/mi-firma-y-pin)). Si no, firmará dibujando.

## Paso a paso: solicitar la firma

1. En **Documentos emitidos**, busca el documento por folio, nombre o empleado.
2. Toca el ojo para abrirlo.
3. Revisa el contenido y toca `Solicitar firma`.

![Documento abierto con el botón Solicitar firma](/ayuda/capturas/documentos/ver-documento-solicitar-firma.webp "Revisa y solicita la firma")

Aparece **Firma pendiente** con el **enlace de firma**. Toca `Copiar enlace` y mándaselo a la persona (por WhatsApp, correo o como prefieras).

![Firma pendiente con el enlace para copiar](/ayuda/capturas/documentos/firma-pendiente-copiar-enlace.webp "Copia el enlace y compártelo con la persona")

> **Importante:** El enlace es **personal** y **vence en 72 horas**. ADAMIA no lo manda solo: tú se lo compartes.

## Paso a paso: revisar si ya firmó

1. Abre de nuevo el documento en **Documentos emitidos**.
2. Verás uno de estos estados:
   - **Firma pendiente:** «La solicitud está pendiente de firma por …». Si ya la abrió, también aparece como pendiente.
   - **Documento firmado:** «… completó la firma de este documento.» con `Ver PDF firmado` y la evidencia.
3. `Descargar PDF` siempre descarga el documento.

## Los estatus de la tabla

| Estatus | Qué significa |
| --- | --- |
| Borrador | Documento preparado que aún no se emite. |
| Emitido | Documento generado. |
| Firmado | La persona ya lo firmó. |
| Anulado | El documento ya no es válido. |

Arriba ves cuántos documentos hay en cada estatus y puedes filtrar con **Todos los estatus**.

## Preguntas frecuentes

### ¿Puedo pedir la firma dos veces del mismo documento?

No mientras haya una solicitud vigente: el sistema avisa «Ya existe una solicitud de firma vigente para este documento.» Si ya se firmó, avisa «Este documento ya fue firmado.»

### ¿Dónde queda el documento firmado?

Puedes abrirlo con `Ver PDF firmado` desde aquí. En el expediente de la persona, los documentos generados muestran su estado **Pendiente de firma** o **Firmado**.

### ¿Cómo lo firma la persona?

Ve [Cómo firmar un documento desde el celular](/ayuda/documentos/firmar-desde-el-celular). Puedes mandarle esa guía junto con el enlace.

## Qué pasa si…

- **…el enlace venció:** la persona verá «Este enlace ya no está disponible». Abre el documento y vuelve a `Solicitar firma`.
- **…elimino el documento:** aparece **¿Eliminar documento?** y se elimina permanentemente.
- **…falta información del documento para pedir la firma:** verás «No se encontraron los datos necesarios del documento para solicitar la firma.» Genera el documento de nuevo para la persona.

## Relacionado

- [Cómo generar un documento](/ayuda/documentos/generar-documento)
- [Cómo firmar un documento desde el celular](/ayuda/documentos/firmar-desde-el-celular)
- [Actas administrativas](/ayuda/documentos/actas-administrativas)
