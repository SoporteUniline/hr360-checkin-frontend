---
titulo: Actas administrativas — registrar faltas e incidentes
resumen: Levanta un acta con los hechos, testigos, sanción y descargo de la persona; cambia su estatus, descárgala en PDF y mándala a firmar.
modulo: documentos
audiencia: [rh, dueno]
pantallas: [/panel/actas-administrativas]
palabras: [acta administrativa, falta, incidente, sanción, amonestación, suspensión, rescisión, descargo, testigos, reincidencia, borrador, falta injustificada]
orden: 70
actualizado: 2026-11-27
fuentes: [src/app/panel/actas-administrativas/page.jsx, src/components/NewActaModal.jsx, src/components/NewTipoActaModal.jsx, src/components/AdministrativeMinutesTable.jsx, src/components/AdministrativeDetailsModal.jsx, src/lib/actasEstatus.mjs]
---

## Para qué sirve

Las **actas administrativas** documentan una falta o un incidente de una persona (faltas injustificadas, retardos, faltantes, conductas): qué pasó, cuándo, quién lo vio, qué sanción se aplica y qué dijo la persona.

Lo encuentras en **Gestión de personal → Actas administrativas**.

![Pantalla de actas administrativas](/ayuda/capturas/documentos/actas-administrativas.webp "Registro y seguimiento de actas por empleado")

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

> **Importante:** Antes de aplicar una sanción, la persona **debe ser oída** (art. 423 de la Ley Federal del Trabajo). Escucha su versión y anótala en **Descargo del trabajador**.

Arriba ves **Total actas**, **Borradores**, **Elaboradas**, **Cerradas** y **Graves**.

## Paso a paso: levantar un acta

1. Toca `Nueva acta`.
2. **Información básica:** Empresa, **Empleado** (búscalo por nombre) y **Tipo de Acta**. Si el tipo no existe, créalo con el botón **Crear tipo de acta**.
3. **Detalles del incidente:** Fecha del incidente (obligatoria), Hora y Lugar.
4. **Hechos y testigos:** describe detalladamente lo sucedido (obligatorio) y escribe los testigos (opcional).
5. **Sanción:** elige el **Tipo de sanción**: amonestación verbal, amonestación escrita, suspensión o rescisión.
6. **Elaboración:** quién elabora el acta (se llena con tu usuario cuando aplica) y su cargo.
7. **Declaraciones:** el **Descargo del trabajador** (su versión), si **el trabajador acepta los hechos** y si **es reincidencia**.
8. Toca `Guardar`. Verás «Acta creada correctamente».

![Ventana Nueva Acta Administrativa](/ayuda/capturas/documentos/nueva-acta.webp "Secciones del acta")

## Paso a paso: tipos de acta

1. En la ventana del acta, toca **Crear tipo de acta**.
2. Escribe el **Nombre del tipo** (por ejemplo «Falta injustificada») y una **Descripción**.
3. Elige **Clasificación** (Falta o Sanción) y **Gravedad** (Leve o Grave).
4. Guarda. En la misma ventana ves los **Tipos existentes** para editarlos o eliminarlos.

## Los estatus del acta

| Estatus | Qué significa |
| --- | --- |
| Borrador | Acta preparada que todavía se revisa. Las crea el sistema cuando se registra una **falta injustificada**. |
| Elaborada | RH ya la revisó, oyó a la persona y la formalizó. |
| Notificada | Ya se le dio a conocer a la persona. |
| Cerrada | El caso terminó. |
| Cancelada | La falta se corrigió o el acta no procede. |

## Paso a paso: revisar, cambiar estatus, descargar y firmar

1. En la fila, toca **Ver**.
2. Revisa la información general, los detalles del incidente, el descargo y la información administrativa.
3. Toca **Cambiar estatus** para moverla (por ejemplo, de Borrador a Elaborada).
4. `Descargar PDF` genera el acta con espacio para firmas.
5. `Solicitar firma` crea el **enlace de firma** para que la persona la firme desde su celular. Cópialo y compártelo; vence en 72 horas. Cuando firme, verás **Documento firmado** y podrás ver el PDF firmado.

## Preguntas frecuentes

### ¿Por qué tengo actas en Borrador que no hice?

Porque se registró una **falta injustificada** en asistencias. El sistema prepara el borrador para que no se te pase. Revísalo, oye a la persona y pásalo a **Elaborada**, o **Cancélalo** si la falta se corrigió.

### ¿Puedo editar un acta?

Sí, con el lápiz (**Editar**) de la fila.

## Qué pasa si…

- **…no elijo tipo de acta o fecha:** verás «Selecciona un tipo de acta» o «La fecha es obligatoria».
- **…elimino un acta:** confirma en **¿Eliminar acta administrativa?**; no se puede deshacer.
- **…ya hay una solicitud de firma vigente:** no se crea otra; comparte el mismo enlace.

## Relacionado

- [Cómo mandar a firmar un documento](/ayuda/documentos/mandar-a-firmar)
- [Cómo firmar un documento desde el celular](/ayuda/documentos/firmar-desde-el-celular)
- [Panel de empleado: expediente 360°](/ayuda/empleados/panel-empleado)
