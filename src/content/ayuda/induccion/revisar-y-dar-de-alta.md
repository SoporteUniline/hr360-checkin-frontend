---
titulo: Cómo revisar documentos y dar de alta a un nuevo ingreso
resumen: Aprueba o rechaza cada documento que subió la persona, revisa sus datos y con un clic créale su ficha de empleado con su expediente completo; o cancela el ingreso.
modulo: induccion
audiencia: [rh, dueno]
pantallas: [/panel/nuevos-ingresos]
palabras: [revisar documentos, aprobar, rechazar, dar de alta, alta, cancelar ingreso, expediente, nuevo ingreso, motivo]
orden: 30
actualizado: 2026-11-27
fuentes: [src/components/induccion/DetalleIngreso.jsx, src/components/induccion/NuevosIngresos.jsx, src/lib/induccion/induccion.mjs]
---

## Para qué sirve

Cuando la persona termina su liga, su ingreso pasa a **Por revisar documentos**. Aquí revisas lo que mandó y la das de alta como empleado sin capturar nada.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- La persona debe haber enviado su información (en el tablero, su siguiente paso dice `Revisar y dar de alta`).
- Sus datos y documentos **solo los ve Recursos Humanos**.

## Cómo revisar los documentos

1. En **Nuevos ingresos**, toca `Revisar y dar de alta` en la fila de la persona.
2. Baja a **Documentos**. Por cada documento:
   - `Ver`: abre el archivo (permite las ventanas emergentes del navegador).
   - `Aprobar`: lo marca como **Aprobado por RH**.
   - `Rechazar`: escribe **¿Qué debe corregir?** y confirma. **La persona verá este motivo en su celular** para corregirlo.
3. Revisa también **Datos que llenó** y si ya firmó y registró su rostro.

![Detalle de un nuevo ingreso con sus botones Reenviar liga, Cancelar ingreso y Revisar y dar de alta](/ayuda/capturas/induccion/revisar-y-dar-de-alta.webp "Encabezado del ingreso y su checklist")

![Sección Documentos con los botones Ver, Aprobar y Rechazar](/ayuda/capturas/induccion/revisar-documentos.webp "Revisa cada documento; al aprobar todo, dalo de alta")

![Ventana para rechazar un documento con su motivo](/ayuda/capturas/induccion/rechazar-documento.webp "El motivo le llega a la persona")

> **Consejo:** Si un dato lo **escribió** en lugar de subir archivo (por ejemplo su NSS o su CLABE), lo verás como «Lo escribió en sus datos».

## Cómo dar de alta

1. Con todo lo obligatorio aprobado, toca `Revisar y dar de alta`.
2. Lee la confirmación **¿Dar de alta a …?** y toca `Dar de alta`.
3. Verás uno de estos mensajes:
   - «Listo: quedó dado de alta como empleado con su expediente.» (ficha nueva)
   - «Listo: se vinculó a su ficha y sus documentos pasaron al expediente.» (ya tenía ficha)

**Qué hace ADAMIA al dar de alta:**

- Si **no** tiene ficha, la crea con las mismas revisiones del alta de **Empleados** (correo, CURP, RFC y NSS únicos).
- Si ya tenía ficha (por ejemplo, vino de Reclutamiento) o hay una **activa** con la misma CURP o correo, la **vincula** y solo llena los campos vacíos; no cambia lo que tú ya capturaste.
- Los documentos aprobados pasan a su **expediente digital** y los formatos firmados se guardan como PDF con su constancia de firma en la carpeta **Contractual**.
- Su rostro queda listo para checar.
- Se borran del proceso sus datos y su rostro (ya viven en su ficha) y **su liga deja de funcionar**.

## Cómo cancelar un ingreso

1. Abre el ingreso y toca `Cancelar ingreso`.
2. Escribe por qué (por ejemplo «Ya no se presentó») y confirma con `Cancelar ingreso`.
3. Verás «Ingreso cancelado. Sus datos se borraron.» Su liga deja de funcionar, se borran los datos que llenó y su rostro, y sus tareas pendientes se archivan.

## Preguntas frecuentes

### ¿Qué pasa cuando rechazo un documento?

El ingreso **regresa a la persona**: en su liga ve qué debe corregir y vuelve a subirlo. Cuando lo mande de nuevo, aparece otra vez para revisar.

### ¿Puedo dar de alta aunque falte un documento opcional?

Sí. Solo se necesitan aprobados los **obligatorios**.

### ¿Se puede repetir el alta por error?

No pasa nada: si tocas dar de alta otra vez, ADAMIA devuelve el mismo empleado, sin duplicarlo.

## Qué pasa si…

- **…existe una ficha de baja con la misma CURP o correo:** el alta no crea otra ficha. Reactiva a la persona en [Empleados](/ayuda/empleados/baja-y-reactivacion) y vuelve a intentar.
- **…el archivo no abre:** permite las ventanas emergentes; verás «Permite las ventanas emergentes para ver el archivo.»
- **…intento cancelar sin motivo:** verás «Escribe por qué se cancela.»
- **…la persona todavía está llenando:** el detalle dice «La persona sigue llenando su preingreso desde su celular.» Espera a que termine o revisa lo que ya subió.

## Relacionado

- [Checklist del primer día](/ayuda/induccion/checklist-primer-dia)
- [Cómo subir documentos al expediente digital](/ayuda/empleados/expediente-digital)
- [Inducción digital: cómo funciona](/ayuda/induccion)
- [Cómo contratar a un candidato](/ayuda/reclutamiento/contratar)
