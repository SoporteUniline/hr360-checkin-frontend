---
titulo: Actas administrativas — registrar faltas e incidentes
resumen: Levanta un acta con los hechos, testigos, sanción y descargo de la persona; cambia su estatus, descárgala en PDF y mándala a firmar.
modulo: documentos
audiencia: [rh, dueno]
pantallas: [/panel/actas-administrativas, /panel/actas-administrativas/nueva, /panel/actas-administrativas/[id]/editar]
palabras: [acta administrativa, falta, incidente, sanción, amonestación, suspensión, rescisión, descargo, testigos, reincidencia, borrador, falta injustificada]
orden: 70
actualizado: 2026-11-28
fuentes: [src/app/panel/actas-administrativas/page.jsx, src/app/panel/actas-administrativas/formulario/FormularioActa.jsx, src/app/panel/actas-administrativas/formulario/useFormularioActa.js, src/components/NewTipoActaModal.jsx, src/components/AdministrativeMinutesTable.jsx, src/components/AdministrativeDetailsModal.jsx, src/lib/actasEstatus.mjs]
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

## Cómo levantar un acta

Toca `Nueva acta`. Se abre la página **Nueva acta administrativa** (ya no es una ventana), en **5 pasos**. En la computadora ves los pasos a la izquierda; en el celular, arriba dice «Paso 1 de 5». En cada paso toca `Continuar`: si falta algo, el dato se marca en rojo y no avanza.

1. **Persona y tipo de acta:** Empresa, **Empleado** (búscalo por nombre y elígelo de la lista) y **Tipo de acta**. Si el tipo no existe, créalo con el botón **+** (Crear tipo de acta).
2. **Qué pasó:** Fecha del incidente (obligatoria), Hora, Lugar, la **Descripción de los hechos** (obligatoria) y los **Testigos** (opcional).
3. **Sanción y quién la elabora:** el **Tipo de sanción** (amonestación verbal, amonestación escrita, suspensión o rescisión), quién **elabora el acta** (se llena con tu usuario cuando aplica) y su cargo.
4. **Declaraciones:** el **Descargo del trabajador** (su versión), si **el trabajador acepta los hechos** y si **es reincidencia**.
5. **Revisar y guardar:** lees todo junto; con **Cambiar** regresas al paso que quieras corregir. Toca `Guardar acta`.

Regresas a la lista y verás «Acta creada correctamente». Para corregir un acta toca el lápiz (**Editar**): se abre la página **Editar acta administrativa** con todos los pasos llenos; cambia lo que haga falta y toca `Guardar cambios`. Si sales con cambios sin guardar, el sistema te pregunta antes.

## Cómo crear tipos de acta

1. En el paso **Persona y tipo de acta**, toca el botón **+** (Crear tipo de acta).
2. Escribe el **Nombre del tipo** (por ejemplo «Falta injustificada») y una **Descripción**.
3. Elige **Clasificación** (Falta o Sanción) y **Gravedad** (Leve o Grave).
4. Guarda. En esa ventana ves los **Tipos existentes** para editarlos o eliminarlos.

## Los estatus del acta

| Estatus | Qué significa |
| --- | --- |
| Borrador | Acta preparada que todavía se revisa. Las crea el sistema cuando se registra una **falta injustificada**. |
| Elaborada | RH ya la revisó, oyó a la persona y la formalizó. |
| Notificada | Ya se le dio a conocer a la persona. |
| Cerrada | El caso terminó. |
| Cancelada | La falta se corrigió o el acta no procede. |

## Cómo revisar, cambiar el estatus, descargar y firmar un acta

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
