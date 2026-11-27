---
titulo: Plantillas de documentos — las de ADAMIA y las tuyas
resumen: Usa los 21 formatos listos de ADAMIA o crea tus propias plantillas con variables que se llenan solas con los datos del empleado y de la empresa.
modulo: documentos
audiencia: [rh, dueno]
pantallas: [/panel/gestion-documental/plantillas, /panel/gestion-documental/plantillas/editor, /panel/gestion-documental/plantillas/adamia/lectura-politicas]
palabras: [plantillas, formatos, variables, carta de trabajo, constancia laboral, confidencialidad, responsiva, acuse de políticas, editor, asistente ia, plantillas adamia]
orden: 20
actualizado: 2026-11-27
fuentes: [src/app/panel/gestion-documental/plantillas/page.jsx, src/app/panel/gestion-documental/plantillas/editor/page.jsx, src/components/documentos/CatalogoAdamia.jsx, src/app/panel/gestion-documental/plantillas/adamia/lectura-politicas/page.jsx]
---

## Para qué sirve

Una **plantilla** es un documento modelo (carta de trabajo, contrato, constancia, responsiva…) con **variables** que se llenan solas con los datos de cada persona. Así generas documentos en segundos y sin errores de dedo.

Lo encuentras en **Gestión documental → Plantillas**. Tiene dos pestañas: **Plantillas ADAMIA** y **Mis plantillas**.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Revisa que los datos de tus empleados (puesto, departamento, fecha de ingreso, RFC, CURP) y de tu empresa estén completos: son los que llenan las variables.

## Cómo usar una plantilla ADAMIA

ADAMIA trae **21 formatos listos para completar**: confidencialidad, responsivas de equipo, constancias, aviso de privacidad, carta oferta, descripción de puesto y más.

1. Abre la pestaña **Plantillas ADAMIA**.
2. Busca por nombre o elige un **tema**.
3. Toca `Usar` en el formato. Se abre el formulario guiado para completar sus datos y generar el documento para tu colaborador.

![Catálogo de Plantillas ADAMIA](/ayuda/capturas/documentos/plantillas-adamia.webp "Formatos base para todas las empresas")

### Acuse de recepción y lectura de políticas

Este formato se prepara aparte:

1. Toca `Usar` en **Acuse de recepción y lectura de políticas**.
2. Llena **Datos de la entrega**: Empresa, Lugar o centro de trabajo, Medio de entrega y Contacto para dudas.
3. En **Políticas que se entregan**, agrega cada política con su **Nombre**, **Versión o fecha de emisión** y **Archivo, anexo o ubicación de consulta**. Usa `Agregar política` para más.
4. Revisa la **Vista previa** y toca `Guardar copia y usar`. Verás «Plantilla lista en tu empresa. Selecciona al empleado para generar el acuse.»

> **Importante:** Entrega las políticas y permite su lectura antes de solicitar la firma. Este formato no sustituye el Reglamento Interior de Trabajo ni su depósito y difusión.

## Cómo crear tu propia plantilla

1. Toca `Nueva plantilla`.
2. En **Información** llena:
   - **Código** (sin espacios; por ejemplo `carta_trabajo`),
   - **Nombre** (por ejemplo «Carta de Trabajo»),
   - **Categoría**: Laboral, Administrativo, Legal, RRHH u Otro,
   - **Descripción** (para qué se usa).
3. Escribe el contenido en el editor.
4. Para poner un dato que cambia según la persona, toca una variable en **Variables disponibles**: se inserta donde está el cursor.
5. Toca `Vista previa` para revisarla y luego `Guardar`.

![Editor de plantillas con las variables disponibles](/ayuda/capturas/documentos/editor-de-plantilla.webp "Toca una variable para insertarla")

### Variables disponibles

| Grupo | Variables |
| --- | --- |
| Empleado | `empleado.nombre`, `empleado.codigo`, `empleado.puesto`, `empleado.departamento`, `empleado.fecha_ingreso`, `empleado.salario`, `empleado.email`, `empleado.telefono`, `empleado.rfc`, `empleado.curp` |
| Empresa | `empresa.nombre`, `empresa.representante` |
| Fecha | `fecha.dia`, `fecha.mes`, `fecha.anio`, `fecha.completa` |

En el documento se ven entre llaves, por ejemplo `{{empleado.nombre}}`, y se reemplazan automáticamente al generar el documento.

### Con el Asistente IA

1. En el editor abre **Asistente IA**.
2. Describe el documento que necesitas (o elige uno de los **Ejemplos rápidos**). Sé específico.
3. Toca `Generar con IA`, revisa la **Vista previa del resultado** y toca `Aplicar al editor`.

> **Ojo:** `Aplicar al editor` **reemplaza** el contenido actual del editor. Revisa siempre el texto antes de usarlo.

## Cómo administrar tus plantillas

En **Mis plantillas** ves **Total plantillas**, **Activas**, **Inactivas** y **Categorías**.

![Mis plantillas](/ayuda/capturas/documentos/plantillas-mis-plantillas.webp "Tus plantillas con su estado")

- **Editar:** abre la plantilla en el editor.
- **Activar / Desactivar:** una plantilla inactiva no aparece al generar documentos.
- **Eliminar:** se borra para siempre. **Los documentos generados con esta plantilla no se verán afectados.**

## Preguntas frecuentes

### ¿Puedo modificar una plantilla ADAMIA?

Genera el documento con ella o guarda una copia en tu empresa. Si una base ADAMIA guardada en tu empresa fue modificada, al generar verás un aviso para que la revises en **Mis plantillas**; para un formato propio, crea una plantilla nueva.

### ¿Dónde uso mis plantillas para la inducción?

Los formatos que la persona firma en su [Inducción digital](/ayuda/induccion/plantillas-de-induccion) salen de **Mis plantillas**.

## Qué pasa si…

- **…falta código, nombre o categoría:** verás «Completa los campos requeridos: código, nombre y categoría».
- **…el contenido está vacío:** verás «El contenido del documento no puede estar vacío».
- **…una variable no tiene dato en la ficha:** el documento sale sin ese dato, y las líneas que solo tenían una etiqueta (como «RFC:») se quitan. Completa la ficha y genera de nuevo.

## Relacionado

- [Cómo generar un documento](/ayuda/documentos/generar-documento)
- [Cómo mandar a firmar un documento](/ayuda/documentos/mandar-a-firmar)
- [Biblioteca documental](/ayuda/documentos/biblioteca-documental)
