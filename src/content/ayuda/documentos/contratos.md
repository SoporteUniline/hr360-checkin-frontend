---
titulo: Contratos laborales — el contrato de cada persona, su sueldo, su texto y sus firmas
resumen: Registra el contrato de cada persona, revisa su sueldo y su texto, fírmalo y mándalo a firmar al celular, cambia el sueldo con un convenio, renuévalo o termínalo.
modulo: documentos
audiencia: [rh, dueno]
pantallas: [/panel/contratos, /panel/contratos/[id], /panel/contratos/[id]/editar, /panel/contratos/nuevo, /panel/contratos/revisar-sueldos]
palabras: [contratos, contrato laboral, editar contrato, duplicar contrato, nuevo contrato, vigencia, por vencer, vencido, renovar, convenio, cambiar sueldo, firmar contrato, mandar a firmar, revisar sueldos, sueldo del contrato, contrato vigente, indefinido, temporal, periodo de prueba, terminar contrato]
orden: 60
actualizado: 2026-11-27
fuentes: [src/app/panel/contratos/page.jsx, src/app/panel/contratos/ContratosTable.jsx, src/app/panel/contratos/formulario/FormularioContrato.jsx, src/lib/contratos/formularioContrato.mjs, src/app/panel/contratos/CambiarEstatusContrato.jsx, src/app/panel/contratos/[id]/DetalleContrato.jsx, src/app/panel/contratos/[id]/DialogosContrato.jsx, src/app/panel/contratos/revisar-sueldos/page.jsx, src/lib/contratos/detalleContrato.mjs, src/components/avisos/CampanaAvisos.jsx]
---

## Para qué sirve

**Contratos** guarda el contrato de cada persona: tipo, vigencia, sueldo, jornada, prestaciones, el texto que se firma y quién lo firmó. **El sueldo del contrato vigente es el que usan la nómina, los finiquitos, los aguinaldos y los documentos.** Si alguien no tiene contrato vigente, se usa el sueldo de su ficha, marcado «sin contrato vigente».

Lo encuentras en **Gestión de personal → Contratos**.

![Pantalla de contratos con indicadores y lista](/ayuda/capturas/documentos/contratos.webp "Contratos con su vigencia y estatus")

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

La persona debe estar registrada como empleado. Para mandar el contrato a firmar, su ficha debe tener **CURP**, **RFC** y **domicilio**, y la unidad de negocio los datos del empleador (razón social, RFC, domicilio y representante).

## Cómo abrir un contrato

1. En la lista toca el **folio** o el **nombre** de la persona.
2. Se abre la vista del contrato. Arriba ves la persona, el folio, el tipo, el **estado**, la **vigencia** (con el aviso «Vence en N días» si está por vencer) y cómo va la **firma**.
3. Debajo están las tarjetas **Sueldo**, **Jornada**, **Prestaciones**, **Historial** y **El documento** con el estado de las dos firmas.

El botón **Más** de cada fila tiene Ver contrato, Editar datos, Cambiar estatus, Renovar (duplicar) y Eliminar.

![Vista de un contrato con su sueldo, jornada, prestaciones, historial y documento](/ayuda/capturas/documentos/contrato-detalle.webp "La vista del contrato")

En el celular ves lo mismo en una columna y, abajo, la acción principal, **Ver el documento** y **Más acciones**.

![Vista de un contrato en el celular](/ayuda/capturas/documentos/contrato-detalle-celular.webp "El contrato en el celular")

## Cómo registrar un contrato

1. Toca `Nuevo contrato`. Se abre la página del contrato nuevo, con pestañas.
2. **Persona y puesto:** la **Persona** (y la empresa si tienes varias), Puesto, Departamento o área, Jefe inmediato, Lugar de trabajo y Modalidad.
3. **Sueldo:** **¿Cada cuándo se le paga?** y el **Sueldo** de cada periodo (por quincena si es quincenal), y la moneda.
4. **Jornada:** tipo de jornada, horas a la semana, entrada, salida y comida (déjala vacía si no tiene).
5. **Prestaciones:** los días de vacaciones se proponen con los de ley (art. 76); aguinaldo (al menos 15 días), prima vacacional (al menos 25 %) y otras prestaciones.
6. **Documento:** el **Tipo de contrato**, cuándo **inicia** y, si el tipo lo pide, cuándo **termina**. En **Causa u obra, y notas** de un contrato por tiempo u obra determinado escribe la causa o la obra: es lo que dice el texto del contrato.
7. Toca `Guardar contrato`. Se abre el contrato nuevo.

Si falta algo, arriba ves «Faltan o hay que corregir…» con la pestaña y cuántos datos; tócala y corrige lo marcado en rojo.

![Página de contrato nuevo con sus pestañas](/ayuda/capturas/documentos/nuevo-contrato.webp "Contrato nuevo")

Para empezar desde otro contrato toca **Más → Renovar (duplicar)** en la lista: se copian las condiciones, el inicio se propone el día siguiente al fin del anterior y eliges el tipo otra vez. Desde la ficha de alguien sin contrato vigente, `Crear contrato con este sueldo` abre esta misma página con la persona y su sueldo.

## Cómo editar los datos de un contrato

1. Abre el contrato y toca `Editar datos` (o **Más → Editar datos** en la lista). Se abre la página **Editar contrato** con las mismas pestañas, ya llenas con lo que tiene el contrato.
2. Cambia lo que necesites y toca `Guardar cambios`. Solo se guarda lo que cambiaste; lo demás se queda igual.
3. Si tocas `Cancelar` o sales con cambios sin guardar, ADAMIA te pregunta si quieres guardarlos o salir sin guardar.

![Página Editar contrato, pestaña Jornada](/ayuda/capturas/documentos/editar-contrato.webp "Editar contrato")

En el celular, `Guardar cambios` y `Cancelar` siempre están abajo.

![Editar contrato en el celular](/ayuda/capturas/documentos/editar-contrato-celular.webp "Editar contrato en el celular")

> **Importante:** en **Sueldo** ves el sueldo, pero **no se cambia ahí**: toca `Cambiar sueldo (convenio)` para que quede su historial. La persona de un contrato tampoco se cambia: para otra persona crea un contrato nuevo. Un contrato que ya se mandó a firmar, firmado o terminado se ve sin poder editarse, con la explicación.

> **Importante:** cada persona tiene **un solo contrato vigente**. Si creas o activas otro, el anterior se termina solo (no se borra) y queda en su historial.

## Cómo firmar el contrato

1. Abre el contrato y revisa **El documento**. Si dice «Faltan datos para poder firmarlo», complétalos en la ficha.
2. Toca `Firmar como empresa` y luego `Firmar contrato`. Queda registrado quién firmó, la fecha y desde qué equipo.
3. Toca `Mandar a firmar` y luego `Generar enlace de firma`. ADAMIA arma el PDF del contrato y te da el enlace.
4. Toca `Copiar enlace` y mándaselo a la persona por WhatsApp o correo. Lo abre en su celular, lee el contrato y firma con su dedo; se toma una foto como evidencia. Ve [Firmar desde el celular](/ayuda/documentos/firmar-desde-el-celular).
5. Cuando las dos partes firman, el encabezado dice «Firmado por las dos partes» y `Descargar PDF` baja el contrato firmado.

> **Importante:** desde que se manda a firmar o firma la empresa, **el texto del contrato queda fijo**. Si después cambias la plantilla, este contrato no cambia. Por eso «Editar datos» ya no está disponible: usa un convenio o una renovación.

## Cómo cambiar el sueldo (convenio)

1. Abre el contrato vigente y toca `Cambiar sueldo (convenio)`.
2. Escribe el **Sueldo nuevo**, la **Periodicidad del pago**, la **Fecha en que aplica** (hoy o antes) y, si quieres, el **Motivo**.
3. Toca `Guardar convenio`. Verás el sueldo nuevo en la tarjeta **Sueldo** y en el **Historial** («Convenio: sueldo antes → después», con fecha y quién).

Desde ese momento la nómina, los finiquitos y los aguinaldos usan el sueldo nuevo. Editar el sueldo de un contrato vigente directamente no se permite: «El sueldo de un contrato vigente se cambia con «Cambiar sueldo (convenio)», para que quede su historial.»

## Cómo revisar sueldos

Si el sueldo de la ficha de alguien no coincide con el de su contrato vigente, **la nómina de esa persona no se puede crear ni autorizar** hasta que decidas cuál es el correcto. Nunca se cambia un sueldo sin que lo decidas.

1. Toca `Revisar sueldos` en Contratos (o en el aviso de la nómina).
2. En cada persona ves el sueldo **En la ficha** y **En el contrato**.
3. Elige `Usar el del contrato` (la ficha toma el sueldo del contrato) o `Actualizar el contrato con convenio al de la ficha` (se registra un convenio con tu nombre y la fecha de hoy).
4. Toca `Confirmar`.

![Revisar sueldos: la ficha y el contrato con sueldos distintos](/ayuda/capturas/documentos/revisar-sueldos.webp "Elige cuál sueldo es el correcto")

En la misma pantalla aparecen las personas con **más de un contrato vigente** (de antes): elige cuál se queda y toca `Conservar este y terminar los demás`. No se borra ninguno.

## Cómo renovar o terminar un contrato

1. **Renovar:** toca `Renovar`, elige el tipo, la fecha de inicio (se propone el día siguiente al fin), la de fin y el sueldo, y toca `Crear renovación`. Se abre el contrato nuevo; el anterior queda terminado y ligado («Renovación de…»).
2. **Terminar:** toca `Terminar contrato`, escribe el **Motivo** y la **Fecha de terminación**, y toca `Terminar contrato`. Para pagarle a la persona, haz su [finiquito](/ayuda/nomina/finiquitos-y-liquidaciones).

## Preguntas frecuentes

### ¿Qué sueldo usa la nómina?

El del contrato vigente. Si la persona no tiene, el de su ficha, y el recibo lo marca «sin contrato vigente». Ve [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina).

### ¿De dónde sale el texto del contrato?

De tu plantilla de contrato para ese tipo o, si no tienes, de la plantilla base de ADAMIA. Ve [Plantillas de documentos](/ayuda/documentos/plantillas-de-documentos).

### ¿Me avisa cuando un contrato va a vencer?

Sí: en la lista (**Por vencer (30d)**), en el encabezado del contrato («Vence en N días») y en la **campana**. Ve [Avisos: cumpleaños, aniversarios y fin de contrato](/ayuda/avisos/campana-de-avisos).

### ¿Puedo eliminar un contrato?

Solo si nadie lo ha firmado ni se mandó a firmar. Si ya existió, termínalo o cancélalo.

## Qué pasa si…

- **…faltan datos para firmar:** verás «Faltan datos para el contrato: CURP, RFC…». Complétalos en la ficha.
- **…edito un contrato ya enviado a firmar:** verás que su texto ya no cambia; usa un convenio o una renovación.
- **…toco afuera de una ventana:** no se cierra (así no pierdes lo que escribiste). Ciérrala con `Esc`, `Cancelar`, `Guardar` o la **X**.
- **…un dato guardado no está en la lista:** aparece con «(guardado)» para que veas lo que tiene el contrato; solo cambia si eliges otro.
- **…la fecha del convenio es futura:** verás «La fecha efectiva no puede ser futura». Regístralo el día que aplique.
- **…la fecha de fin es anterior al inicio:** verás «La fecha de fin no puede ser anterior a la fecha de inicio.»
- **…el tipo pide fecha de fin y no la pongo:** verás «La fecha de fin es obligatoria para este tipo.»

## Relacionado

- [Plantillas de documentos](/ayuda/documentos/plantillas-de-documentos)
- [Mandar a firmar](/ayuda/documentos/mandar-a-firmar)
- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
- [La ficha del empleado](/ayuda/empleados/ficha-del-empleado)
- [Cómo dar de baja o reactivar a un empleado](/ayuda/empleados/baja-y-reactivacion)
