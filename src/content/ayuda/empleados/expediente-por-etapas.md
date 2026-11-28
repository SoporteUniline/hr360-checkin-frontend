---
titulo: Expediente por etapas, lista de ley y exportar en ZIP
resumen: Ve qué documentos exige la ley a cada persona, cuáles tiene y cuáles faltan, marca los pasos de ingreso y salida, y descarga su expediente organizado o el paquete para juicio.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/expediente, /panel/expediente/[id]]
palabras: [expediente, cumplimiento, ley, guarda, conservar, art. 804, ingreso, salida, baja, finiquito, zip, exportar, juicio, depurar, archivar, reemplazar, versión]
orden: 76
actualizado: 2026-11-28
fuentes: [src/app/panel/expediente/page.jsx, src/app/panel/expediente/[id]/page.jsx, src/components/expediente/ExpedientePersona.jsx, src/components/expediente/TableroCumplimiento.jsx, src/components/expediente/PasoLey.jsx, src/components/expediente/Carpeta.jsx, src/lib/expediente/presentacion.mjs]
---

## Para qué sirve

El **expediente por etapas** ordena todo lo de cada persona en tres secciones: **Ingreso**, **Durante la relación** y **Salida**. En cada una ves:

- La **lista de lo que pide la ley**, con su artículo: qué **tiene**, qué **falta**, qué **vence pronto** y qué está **vencido**.
- Las **carpetas** con sus documentos y lo que ADAMIA ya tiene en otros módulos (contrato firmado, recibos de nómina, vacaciones aprobadas, actas, finiquito, acuse de NOM-035). Esos aparecen solos, sin volver a subirlos.

Con un botón descargas el expediente completo en **ZIP**, bien organizado, o el **paquete para juicio**.

## Quién la usa

Recursos Humanos y el dueño. La persona no exporta su expediente: si te pide una copia, descárgala tú y entrégasela.

## Antes de empezar

- La persona debe estar registrada en **Empleados**.
- Para que el porcentaje sea exacto, revisa que su **fecha de ingreso** y, si se fue, su **fecha de baja** estén en la ficha.

## Dónde está

- **Gestión de personal** → **Expediente y cumplimiento**: el porcentaje de toda la empresa y quién está más incompleto.
- Toca el nombre de una persona para abrir su expediente.
- También desde la ficha: **Empleados** → la persona → pestaña **Documentos** → **Ver expediente por etapas**.

## Cómo revisar el cumplimiento de la empresa

1. Entra a **Expediente y cumplimiento**.
2. Arriba ves el **porcentaje general**, cuántas personas están completas y cuántas tienen faltantes o vencidos.
3. Filtra por **Quiénes** (Activos, Bajas o Todos), **Departamento**, **Sucursal**, busca por nombre o marca **Solo incompletos**.
4. Toca `Descargar Excel` o `Descargar CSV` para llevarte la lista. Queda registrado quién la descargó.

## Cómo completar el expediente de una persona

1. Abre su expediente.
2. En cada etapa, revisa los **Pasos**. Si falta un documento, toca `Subir documento`, elige el archivo y toca `Guardar documento`. La carpeta y la categoría se eligen solas.
3. Si un paso de ingreso o salida se hizo fuera de ADAMIA, toca `Marcar como hecho`. Queda quién lo marcó y cuándo.
4. Si no le aplica, toca `No aplica` y escribe por qué.

La sección **Salida** aparece cuando la persona tiene baja. Si todavía está activa pero ya va de salida (por ejemplo, anunció su renuncia), toca `Empezar la salida`.

## Lo que la ley pide conservar

Un documento **no se puede borrar** mientras esté en su plazo de guarda. Por ejemplo, el contrato se conserva mientras dure la relación laboral y un año después de la baja (art. 804 de la Ley Federal del Trabajo). Si lo intentas, verás hasta cuándo se conserva y podrás **archivarlo** para que ya no aparezca entre los vigentes.

| Tipo de documento | Se conserva |
| --- | --- |
| Contrato | Mientras dure la relación y 1 año después de la baja (art. 804 fr. I) |
| Nómina, asistencia, vacaciones, prima, aguinaldo y PTU | Toda la relación y 1 año después de la baja (art. 804 fr. II a IV) |
| IMSS, INFONAVIT y fiscal | Mientras dure la relación y 5 años (art. 30 CFF). Por confirmar con tu abogado |
| Capacitación (DC-3), actas, renuncia o rescisión | Igual que el contrato. Por confirmar con tu abogado |

Cuando el plazo termina, el documento dice **Puede depurarse**. Para borrarlo toca `Depurar` y confirma con `Sí, borrar definitivamente`. Queda en la bitácora. **Nada se borra solo.**

## Cómo reemplazar un documento

1. En su carpeta toca `Reemplazar`.
2. Elige el archivo nuevo y toca `Guardar versión nueva`.

La versión anterior **se conserva** como «Versión anterior» con su archivo. Así siempre puedes demostrar qué había antes.

## Cómo exportar

- `Exportar expediente (ZIP)`: carpetas **01 Ingreso**, **02 Relación laboral** y **03 Salida**, más un **Índice del expediente** en PDF con los datos de la persona, la lista de ley, la fecha y la **huella** (SHA-256) de cada archivo y la bitácora.
- `Paquete para juicio`: lo mismo, agrupado por lo que el patrón debe probar en un juicio (art. 784): ingreso y contrato, salario, jornada y asistencia, vacaciones y prestaciones, causa de la baja, e IMSS.

Cada descarga queda en la bitácora con quién la hizo y cuándo.

## Preguntas frecuentes

### ¿Por qué el porcentaje no cuenta la solicitud de empleo o la identificación?

Porque la ley no las exige. Se muestran como **Recomendado** y no bajan el porcentaje.

### ¿Puedo pedir una prueba de embarazo o de VIH?

No. La ley lo prohíbe (art. 133 de la Ley Federal del Trabajo). Si creas una categoría que lo parece, ADAMIA te avisa.

### ¿Los activos y uniformes se marcan solos?

Todavía no. Marca a mano **Activos y uniformes entregados** y **Devolución de activos y uniformes**; el detalle sigue en [Activos y uniformes](/ayuda/activos).

## Qué pasa si…

- **…intento borrar un documento en plazo:** verás «… se debe conservar hasta el … No se puede borrar: puedes archivarlo».
- **…la persona está de baja pero no tiene fecha de baja:** todo se conserva hasta que registres la fecha.
- **…sale «Falta preparar la base de datos»:** soporte de ADAMIA está terminando una actualización; mientras, puedes ver el expediente.

## Relacionado

- [Cómo subir documentos al expediente digital](/ayuda/empleados/expediente-digital)
- [La ficha del empleado y sus 5 pestañas](/ayuda/empleados/ficha-del-empleado)
- [Baja y reactivación](/ayuda/empleados/baja-y-reactivacion)
