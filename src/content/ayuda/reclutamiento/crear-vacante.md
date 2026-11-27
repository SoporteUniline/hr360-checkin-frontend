---
titulo: Cómo crear una vacante
resumen: En tres pasos captura los datos del puesto, arma el formulario de postulación con tus propias preguntas y decide los avisos antes de publicar.
modulo: reclutamiento
audiencia: [rh, dueno]
pantallas: [/panel/reclutamiento/vacantes, /panel/reclutamiento/catalogos]
palabras: [crear vacante, nueva vacante, puesto, sueldo, modalidad, sucursal, formulario de postulación, preguntas, borrador, catálogos, avisos]
orden: 10
actualizado: 2026-11-27
fuentes: [src/components/reclutamiento/VacancyWizard.jsx, src/components/reclutamiento/QuestionBuilder.jsx, src/components/reclutamiento/VacanciesView.jsx, src/components/reclutamiento/CatalogDialog.jsx, src/lib/reclutamiento/model.js]
---

## Para qué sirve

La vacante es la base de todo: de ella salen su página pública con formulario, su lugar en la bolsa de trabajo, su enlace de WhatsApp y los datos con los que el agente contesta dudas. Se crea con un asistente de tres pasos y puedes guardarla como borrador.

## Quién la usa

RH y el dueño.

## Antes de empezar

- Entra a **Reclutamiento y selección › Vacantes** y presiona **Nueva vacante** (o **Crear vacante** si aún no tienes).
- Revisa tus **Catálogos** (**Reclutamiento y selección › Catálogos**): las sucursales y las modalidades. Vienen Presencial, Híbrida y Remota; con **Agregar modalidad** creas otra (por ejemplo, «En campo») y decides si requiere sucursal.

## Paso 1 · Datos del puesto

1. **Nombre del puesto** (obligatorio), por ejemplo «Auxiliar administrativo».
2. **Modalidad** (obligatoria).
3. **Sucursal**: obligatoria si la modalidad la requiere; en remota puedes omitirla. La ubicación pública se toma de esta sucursal.
4. **Tipo de jornada**: Tiempo completo, Medio tiempo, Por proyecto o Prácticas profesionales.
5. **Lugares disponibles** (obligatorio).
6. **Fecha de cierre · opcional**: después de esta fecha la página de la vacante deja de recibir postulaciones.
7. **Sueldo**: marca **Mostrar rango de sueldo mensual** y escribe **Desde · MXN al mes** y **Hasta · opcional**, en pesos mexicanos. Si no lo marcas, la página dice que el sueldo no se publica.
8. **Acerca del puesto** (obligatorio): cuenta qué hará la persona, qué necesita y qué ofrece tu empresa. El editor permite títulos, listas, negritas y cursivas.

![Asistente para crear vacante, paso Datos del puesto](/ayuda/capturas/reclutamiento/crear-vacante.webp "Crea tu próxima vacante en tres pasos")

> **Consejo:** Lo que escribas en **Acerca del puesto**, el sueldo, la dirección y la jornada es lo que el agente de WhatsApp usa para contestar dudas. Mientras más claro, mejor contesta.

## Paso 2 · Formulario

En **Tu formulario, a tu manera** armas lo que se pide al postularse por la página:

- Siempre se piden **Nombre completo**, **Correo electrónico**, **Teléfono** y **Currículum** («Los datos de contacto se conservan»).
- Viene una pregunta sugerida sobre experiencia que puedes editar o quitar.
- Con **Nueva pregunta** agregas las tuyas. Tipos: Respuesta corta, Respuesta larga, Una opción, Varias opciones, Número y Fecha.
- Marca cada pregunta como **Obligatoria** u **Opcional**.
- Las de opciones necesitan al menos dos opciones diferentes (una por línea).
- Ordénalas arrastrando o con los botones de subir y bajar.

Puedes tener hasta 30 preguntas.

## Paso 3 · Publicación

1. Revisa **Así está quedando tu vacante**: una vista previa de su página.
2. En **Avisos de nuevas postulaciones** decide:
   - **Avisar al equipo**: manda un correo por cada postulación al **Correo de tu equipo** (sin correo propio, llega al de tu empresa).
   - **Confirmar recepción al candidato**: le manda un correo de confirmación.
3. Presiona **Publicar vacante** o **Guardar borrador**.

Al publicar sale «Vacante publicada. Ya recibe postulaciones.». Sigue con [Publicar y compartir la vacante](/ayuda/reclutamiento/publicar-y-compartir-vacante).

## Preguntas frecuentes

### ¿Puedo guardar a medias?

Sí. Con **Guardar borrador** basta el nombre del puesto. Para publicar, todo lo obligatorio debe estar completo.

### ¿Puedo cambiar las preguntas después de publicar?

Sí. Las nuevas postulaciones usarán la nueva versión del formulario; las anteriores conservan sus respuestas con el texto de la pregunta de ese momento.

### ¿Las preguntas del formulario son las mismas que hace el agente de WhatsApp?

No. El agente usa su propia entrevista por vacante. Ver [Entrevista y requisitos del agente](/ayuda/reclutamiento/entrevista-y-requisitos).

## Qué pasa si…

### …sale «Revisa los campos señalados antes de publicar»

Falta algo obligatorio (título, modalidad, sucursal si aplica, descripción, lugares, sueldo válido o una fecha de cierre pasada). Los campos con error se marcan.

### …intento salir con cambios

Te pregunta «¿Salir sin guardar los cambios?».

### …no aparece mi sucursal

Dala de alta en tus sucursales (Catálogos › Unidades de negocio) y vuelve a abrir el asistente.

## Relacionado

- [Publicar y compartir la vacante](/ayuda/reclutamiento/publicar-y-compartir-vacante)
- [Entrevista y requisitos del agente](/ayuda/reclutamiento/entrevista-y-requisitos)
- [Reclutamiento: visión general](/ayuda/reclutamiento)
