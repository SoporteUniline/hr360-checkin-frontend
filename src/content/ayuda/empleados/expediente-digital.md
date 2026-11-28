---
titulo: Cómo subir documentos al expediente digital
resumen: Guarda la INE, el contrato, constancias y certificados de cada persona, con su categoría y fecha de vencimiento, y recibe aviso cuando estén por vencer.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/empleados, /panel/panel-empleado]
palabras: [expediente, documentos, subir, cargar, ine, comprobante, vencimiento, por vencer, categorías, pdf, archivo]
orden: 75
actualizado: 2026-11-28
fuentes: [src/app/panel/panel-empleado/components/PanelEmpleadoDocumentos.jsx, src/app/panel/empleados/FormularioEmpleado.jsx, src/lib/expedienteApi.js]
---

## Para qué sirve

El **expediente digital** guarda los documentos de cada persona en un solo lugar: identificación, contratos, constancias fiscales, certificados médicos, capacitación, etc. Te dice cuáles están **vigentes**, **por vencer** o **vencidos**.

Los documentos que la persona sube en su [Inducción digital](/ayuda/induccion) y los formatos que firma ahí llegan solos a su expediente cuando la das de alta.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- La persona debe estar registrada.
- Formatos permitidos: **PDF, fotos (JPG, PNG, WEBP o HEIC), DOC y DOCX**, de **máximo 10 MB**. Una foto se ajusta sola al elegirla (formato WebP, se sigue leyendo la letra) y verás «Preparando foto…» un momento.

## Dónde está

Tienes dos entradas al mismo expediente:

- **Empleados** → abre la ficha → pestaña **Documentos**.
- **Panel empleado** → elige a la persona → pestaña **Documentos**.

![Expediente digital dentro de la ficha del empleado](/ayuda/capturas/empleados/ficha-documentos.webp "Pestaña Documentos de la ficha")

Arriba ves los contadores **Cargados**, **Vigentes**, **Por vencer**, **Vencidos** y **Obligat.** (obligatorios), y la **Completitud** del expediente.

## Cómo subir un documento

1. En el expediente toca `Cargar`.
2. Arrastra el archivo o toca **Toca para seleccionar archivo**.
3. Elige la **Categoría** (obligatoria).
4. Escribe el **Nombre del documento** (obligatorio), por ejemplo «INE 2026 vigente».
5. Si vence, marca **Este documento tiene fecha de vencimiento** y pon la **Fecha vencimiento**.
6. Si quieres, agrega **Fecha emisión** y **Notas**.
7. Toca `Subir documento`. Verás «Documento subido correctamente».

## Cómo buscar, ver y eliminar un documento

- Filtra por categoría con los botones de arriba, escribe en **Buscar documento…** o elige un estatus: Vigente, Sin vencimiento, **Por vencer (30 días)** o Vencido.
- Toca el ojo (**Ver documento**) para abrirlo. Queda registrado en la bitácora que lo viste.
- Toca **Bitácora** para ver quién subió, vio o cambió el documento y cuándo.
- Toca el bote (**Eliminar**). Si el documento está en su **plazo legal de guarda** (por ejemplo, el contrato mientras dure la relación y un año después de la baja), no se puede borrar: el aviso te ofrece `Archivar`. Si su plazo ya terminó, toca `Borrar definitivamente`; queda en la bitácora. Ve [Expediente por etapas](/ayuda/empleados/expediente-por-etapas).

## Cómo administrar las categorías

1. Toca `Categorías`.
2. Para crear una, escribe el **Nombre**, elige un **Color** y toca `Crear categoría`.
3. Puedes editar o desactivar las tuyas. Las marcadas como **Sistema (no eliminable)** vienen con ADAMIA y no se pueden eliminar.

## Estatus de un documento

| Estatus | Qué significa |
| --- | --- |
| Vigente | Tiene vencimiento y todavía no llega. |
| Sin venc. | No vence. |
| Por vencer | Vence en los próximos 30 días. |
| Vencido | Ya pasó su fecha de vencimiento. |
| Pendiente de firma / Firmado | Documentos generados en ADAMIA que se mandaron a firmar. |

## Preguntas frecuentes

### ¿El empleado puede ver su expediente?

Los documentos del expediente los administra RH. La persona ve y firma lo que le mandes a firmar (ve [Cómo firmar un documento desde el celular](/ayuda/documentos/firmar-desde-el-celular)).

### ¿Puedo reemplazar un documento vencido?

Desde el [expediente por etapas](/ayuda/empleados/expediente-por-etapas) toca `Reemplazar`: la versión anterior se conserva archivada. También puedes subir el nuevo aquí con su nueva fecha de vencimiento y archivar el anterior.

## Qué pasa si…

- **…el archivo pesa más de 10 MB:** verás «El archivo supera el límite de 10 MB. Comprime el archivo o usa uno más pequeño.»
- **…el tipo de archivo no está permitido:** verás «Tipo de archivo no permitido. Solo se aceptan: PDF, JPG, PNG, WEBP, DOC, DOCX.»
- **…sale «El archivo pesa demasiado para subirlo. Prueba con uno más ligero.»:** el servidor no aceptó un archivo tan grande; usa uno más ligero.
- **…olvido la categoría, el nombre o la fecha de vencimiento:** el sistema te avisa antes de subir.
- **…no tengo permiso:** verás «No tienes permisos para subir documentos a este empleado.»

## Relacionado

- [Expediente por etapas, lista de ley y exportar en ZIP](/ayuda/empleados/expediente-por-etapas)

- [La ficha del empleado y sus 5 pestañas](/ayuda/empleados/ficha-del-empleado)
- [Panel de empleado: expediente 360°](/ayuda/empleados/panel-empleado)
- [Biblioteca documental](/ayuda/documentos/biblioteca-documental)
