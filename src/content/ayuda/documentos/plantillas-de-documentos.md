---
titulo: Plantillas de documentos — las de ADAMIA y las tuyas
resumen: Usa los 21 formatos listos de ADAMIA, copia las plantillas base de contrato o crea tus propias plantillas con datos que se llenan solos con los del empleado, del contrato y de la empresa.
modulo: documentos
audiencia: [rh, dueno]
pantallas: [/panel/gestion-documental/plantillas, /panel/gestion-documental/plantillas/editor, /panel/gestion-documental/plantillas/adamia/lectura-politicas]
palabras: [plantillas, formatos, variables, plantilla de contrato, contrato base, sueldo con letra, carta de trabajo, constancia laboral, confidencialidad, responsiva, acuse de políticas, editor, asistente ia, plantillas adamia]
orden: 20
actualizado: 2026-11-27
fuentes: [src/app/panel/gestion-documental/plantillas/page.jsx, src/app/panel/gestion-documental/plantillas/editor/page.jsx, src/components/documentos/EditorContrato.jsx, src/components/documentos/PlantillasContratoBase.jsx, src/lib/contratos/variablesContrato.mjs, src/components/documentos/CatalogoAdamia.jsx, src/app/panel/gestion-documental/plantillas/adamia/lectura-politicas/page.jsx]
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

## Cómo usar las plantillas de contrato

ADAMIA trae una **plantilla base** por tipo de contrato: tiempo indeterminado, tiempo determinado, obra determinada, periodo de prueba y capacitación inicial, con cláusulas estándar de la Ley Federal del Trabajo (arts. 24, 25, 35, 39-A, 39-B, 61, 69, 76, 80, 87…). Son una **base sugerida: revísala con tu abogado**.

1. En **Plantillas** abre la pestaña **Contratos**.
2. Toca `Ver texto` para leer una base y `Copiar y editar` para copiarla a tu empresa.
3. En el editor elige en **Se usa para** el tipo de contrato.
4. Ajusta el texto. En **Datos que se llenan solos** toca un dato (Sueldo, **Sueldo con letra**, Periodicidad, Fecha de inicio, Horario, Prestaciones, Nombre completo, CURP, RFC, Domicilio, Razón social, Representante, Domicilio fiscal…) para ponerlo donde está el cursor. `Ver todos los datos` muestra el resto (día de descanso, vacaciones por ley, prima vacacional, aguinaldo…).
5. Elige un contrato en **Vista previa con el contrato de** y toca `Vista previa con un empleado` para verla llena con datos reales.
6. Toca `Guardar`.

![Plantillas base de contrato de ADAMIA](/ayuda/capturas/documentos/plantillas-contrato-base.webp "Una base por tipo de contrato")

![Editor de una plantilla de contrato con los datos que se llenan solos](/ayuda/capturas/documentos/editor-plantilla-contrato.webp "Toca un dato para insertarlo")

> **Importante:** los contratos nuevos de ese tipo usan tu plantilla. **Un contrato que ya se mandó a firmar o se firmó conserva su texto**: cambiar la plantilla no lo cambia. Ve [Contratos laborales](/ayuda/documentos/contratos).

## Cómo administrar tus plantillas

En **Mis plantillas** ves **Total plantillas**, **Activas**, **Inactivas** y **Categorías**.

![Mis plantillas](/ayuda/capturas/documentos/plantillas-mis-plantillas.webp "Tus plantillas con su estado")

- **Editar:** abre la plantilla en el editor.
- **Activar / Desactivar:** una plantilla inactiva no aparece al generar documentos.
- **Eliminar:** se borra para siempre. **Los documentos generados con esta plantilla no se verán afectados.**

## Preguntas frecuentes

### ¿Puedo modificar una plantilla ADAMIA?

Genera el documento con ella o guarda una copia en tu empresa. Si una base ADAMIA guardada en tu empresa fue modificada, al generar verás un aviso para que la revises en **Mis plantillas**; para un formato propio, crea una plantilla nueva.

### ¿El sueldo con letra se escribe solo?

Sí. **Sueldo con letra** pone el importe en pesos con letra, por ejemplo «DIEZ MIL QUINIENTOS PESOS 00/100 M.N.».

### ¿Dónde uso mis plantillas para la inducción?

Los formatos que la persona firma en su [Inducción digital](/ayuda/induccion/plantillas-de-induccion) salen de **Mis plantillas**.

## Qué pasa si…

- **…una plantilla de contrato no tiene «Se usa para»:** verás «Elige para qué tipo de contrato se usa esta plantilla».
- **…falta código, nombre o categoría:** verás «Completa los campos requeridos: código, nombre y categoría».
- **…el contenido está vacío:** verás «El contenido del documento no puede estar vacío».
- **…una variable no tiene dato en la ficha:** el documento sale sin ese dato, y las líneas que solo tenían una etiqueta (como «RFC:») se quitan. Completa la ficha y genera de nuevo.

## Relacionado

- [Cómo generar un documento](/ayuda/documentos/generar-documento)
- [Cómo mandar a firmar un documento](/ayuda/documentos/mandar-a-firmar)
- [Biblioteca documental](/ayuda/documentos/biblioteca-documental)
- [Contratos laborales](/ayuda/documentos/contratos)
