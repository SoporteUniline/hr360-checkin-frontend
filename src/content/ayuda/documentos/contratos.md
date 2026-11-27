---
titulo: Contratos laborales — registrar, renovar y dar seguimiento a vencimientos
resumen: Registra el contrato de cada persona con su tipo, vigencia, sueldo, jornada y prestaciones; renuévalo, cambia su estatus y entérate cuáles están por vencer.
modulo: documentos
audiencia: [rh, dueno]
pantallas: [/panel/contratos]
palabras: [contratos, contrato laboral, vigencia, por vencer, vencido, renovar, duplicar, indefinido, temporal, periodo de prueba, estatus, terminar contrato]
orden: 60
actualizado: 2026-11-27
fuentes: [src/app/panel/contratos/page.jsx, src/app/panel/contratos/ContratosTable.jsx, src/app/panel/contratos/ContratoDialog.jsx, src/app/panel/contratos/CambiarEstatusContrato.jsx, src/app/panel/contratos/ContratoViewDialog.jsx, src/components/avisos/CampanaAvisos.jsx]
---

## Para qué sirve

**Contratos** lleva el control de los contratos laborales: qué tipo de contrato tiene cada persona, cuándo vence, en qué condiciones (sueldo, jornada, prestaciones) y en qué estatus está. Te avisa cuáles están **por vencer** para que decidas a tiempo si renuevas.

Lo encuentras en **Gestión de personal → Contratos**.

![Pantalla de contratos con indicadores y lista](/ayuda/capturas/documentos/contratos.webp "Contratos con su vigencia y estatus")

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

La persona debe estar registrada como empleado.

## Lo que ves en la pantalla

- **Total contratos**, **Activos**, **Por vencer (30d)** y **Vencidos**.
- `Exportar` descarga la lista en Excel.
- En la tabla, la **Vigencia** te marca «VENCE HOY», «VENCIDO» o «Sin fecha de término» (en los indefinidos).
- Filtros en los encabezados: folio, empleado, puesto, tipo y estatus.

## Cómo registrar un contrato

1. Toca `Nuevo contrato`.
2. **Información básica:** Empresa, **Empleado** (búscalo por nombre), Puesto y Departamento (se llenan con los de su ficha), Elaborado por y Jefe inmediato.
3. **Tipo y vigencia:** elige el **Tipo de Contrato** y las fechas.
4. **Compensación:** Salario Base, Periodicidad de Pago (Semanal, Quincenal o Mensual) y Moneda.
5. **Jornada laboral:** Tipo de Jornada (Diurna, Nocturna, Mixta o Reducida), Horas Semanales, Entrada, Salida y horario de comida.
6. **Prestaciones:** Días de Vacaciones, Días de Aguinaldo, Prima Vacacional (%) y Prestaciones Superiores (por ejemplo, vales de despensa o seguro de gastos médicos).
7. **Ubicación y modalidad:** Presencial, Remoto o Híbrido, y Lugar de Trabajo. Agrega **Notas** si hay acuerdos especiales.
8. Toca `Guardar`. Verás «Contrato creado correctamente.»

![Ventana Nuevo contrato](/ayuda/capturas/documentos/nuevo-contrato.webp "Registra un nuevo contrato para un empleado")

### Tipos de contrato

| Tipo | ¿Pide fecha de fin? |
| --- | --- |
| Indefinido | No |
| Temporal | Sí |
| Obra Determinada | Sí |
| Capacitación Inicial | Sí |
| Periodo de Prueba | Sí |
| Prestación de Servicios | No |

> **Importante:** Revisa que vacaciones, aguinaldo y prima vacacional cumplan al menos con la Ley Federal del Trabajo vigente para la antigüedad de la persona.

## Cómo renovar un contrato

1. En la fila del contrato que vence, toca **Duplicar**.
2. Se abre un contrato nuevo con salario, horarios, prestaciones y modalidad **copiados**.
3. Elige otra vez el **Tipo de contrato** (no se copia). La **fecha de inicio** sugerida es el día siguiente al fin del anterior. La **fecha de fin** déjala vacía o pon una nueva.
4. Toca `Guardar`.

## Cómo cambiar el estatus

1. Toca **Cambiar estatus** en la fila.
2. Elige el **Nuevo estatus**: Activo, Suspendido, Terminado o Cancelado.
3. Si es **Terminado** o **Cancelado**, escribe el **Motivo** (obligatorio).
4. Toca `Guardar cambio`.

## Cómo ver e imprimir un contrato

Toca **Ver detalles** para ver el contrato en solo lectura (vigencia, compensación, jornada y prestaciones) y `Imprimir contrato` para obtener el PDF con espacio para las firmas del trabajador y del representante de la empresa.

## Preguntas frecuentes

### ¿Me avisa cuando un contrato va a vencer?

Sí. En la pantalla ves **Por vencer (30d)** y, además, la **campana** de la barra superior te avisa de los contratos que vencen en los próximos 7 días, con el botón `Ver contrato`. Ve [Avisos: cumpleaños, aniversarios y fin de contrato](/ayuda/avisos/campana-de-avisos).

### ¿Dar de baja a la persona termina su contrato?

No. Son dos movimientos distintos: cambia el estatus del contrato a **Terminado** con su motivo.

### ¿Puedo eliminar un contrato?

Sí, con **Eliminar** y confirmando en **¿Eliminar contrato?**. No se puede deshacer; si el contrato existió, es mejor cambiar su estatus a **Cancelado** o **Terminado**.

## Qué pasa si…

- **…la fecha de fin es anterior al inicio:** verás «La fecha de fin no puede ser anterior a la fecha de inicio.»
- **…el tipo pide fecha de fin y no la pongo:** verás «La fecha de fin es obligatoria para este tipo.»
- **…el salario no es válido:** verás «Ingresa un salario base válido.»
- **…falta algo:** aparece **Corrige los siguientes puntos** con la lista de lo que hay que arreglar.

## Relacionado

- [Cómo dar de baja o reactivar a un empleado](/ayuda/empleados/baja-y-reactivacion)
- [Avisos: cumpleaños, aniversarios y fin de contrato](/ayuda/avisos/campana-de-avisos)
- [Plantillas de documentos](/ayuda/documentos/plantillas-de-documentos)
