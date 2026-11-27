---
titulo: Cómo generar un documento para un empleado
resumen: Elige una plantilla, elige a la persona, revisa la vista previa y genera el documento listo para descargar, imprimir o mandar a firmar.
modulo: documentos
audiencia: [rh, dueno]
pantallas: [/panel/gestion-documental/generar]
palabras: [generar documento, carta, constancia, pdf, imprimir, vista previa, folio, candidato, formato]
orden: 30
actualizado: 2026-11-27
fuentes: [src/app/panel/gestion-documental/generar/page.jsx, src/components/documentos/FormularioFormatoRRHH.jsx, src/components/documentos/CatalogoAdamia.jsx]
---

## Para qué sirve

**Generar documento** llena una plantilla con los datos de una persona (nombre, puesto, fecha de ingreso, RFC…) y la guarda con un **folio**. Después la descargas en PDF, la imprimes o la mandas a firmar.

Lo encuentras en **Gestión documental → Generar documento**.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Necesitas al menos una plantilla **activa** (tuya o de ADAMIA). Si no hay, verás «No hay plantillas disponibles» y el botón `Ir a Plantillas`.
- Si manejas varias empresas, elige la **Empresa del documento**.

## Paso a paso

Arriba ves los cuatro pasos: **Plantilla → Empleado → Vista previa → Listo**.

### 1. Plantilla

Toca la plantilla que quieres usar y luego `Siguiente`. Si buscas un formato ADAMIA, toca `Explorar catálogo`.

![Paso 1: elegir la plantilla](/ayuda/capturas/documentos/generar-documento.webp "Selecciona una plantilla")

### 2. Empleado

1. Elige la **Unidad de negocio** (opcional) y busca a la persona por nombre.
2. Toca a la persona. Abajo verás «Seleccionado: …».
3. Si quieres, escribe **Notas adicionales (opcional)**; son internas.
4. Toca `Vista previa`.

![Paso 2: elegir al empleado](/ayuda/capturas/documentos/generar-elegir-empleado.webp "Las variables se llenan con los datos de esta persona")

### 3. Vista previa

Revisa el documento ya lleno. Si algo está mal, regresa con `Anterior` o corrige la ficha de la persona. Toca `Generar documento`.

![Paso 3: vista previa del documento](/ayuda/capturas/documentos/generar-vista-previa.webp "Revisa el documento antes de generarlo")

### 4. Listo

Verás **¡Documento generado!** con estas opciones:

- `Descargar PDF`
- `Imprimir`
- `Ver todos los documentos` (te lleva a **Documentos emitidos**, donde puedes mandarlo a firmar)
- `Generar otro`

## Formatos guiados de ADAMIA

Cuando usas un formato del catálogo ADAMIA, después de elegir a la persona aparece **Datos del documento**: completa los campos y revisa la vista previa. Esa información corresponde solo a este documento.

Algunos formatos muestran avisos importantes, por ejemplo: «Este documento requiere la firma del responsable de la empresa; la firma del empleado no la sustituye.»

### Documentos para candidatos (sin alta)

Algunos formatos (como la carta oferta) permiten marcar **Candidato sin alta en ADAMIA** y escribir su **Nombre completo**. En ese caso el botón dice `Preparar documento` y solo podrás **descargar el PDF**: no se guarda en un expediente ni se puede mandar a firmar hasta que registres a la persona como empleado.

## Preguntas frecuentes

### ¿Dónde queda guardado el documento?

En **Documentos emitidos**, con su folio, empleado, plantilla, estatus y fecha.

### ¿Puedo corregir un documento ya generado?

Corrige la ficha o la plantilla y genera uno nuevo. El anterior puedes eliminarlo desde Documentos emitidos.

## Qué pasa si…

- **…la plantilla pertenece a otra empresa:** verás «La plantilla pertenece a otra empresa.» Elige la empresa correcta.
- **…el empleado pertenece a otra empresa:** verás «El empleado pertenece a otra empresa.»
- **…no se cargan los datos de la empresa:** verás un aviso para recargar la página antes de generar.
- **…la plantilla no tiene contenido:** la vista previa dice «Esta plantilla no tiene contenido.»

## Relacionado

- [Plantillas de documentos](/ayuda/documentos/plantillas-de-documentos)
- [Cómo mandar a firmar un documento](/ayuda/documentos/mandar-a-firmar)
