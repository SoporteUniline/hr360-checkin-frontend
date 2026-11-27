---
titulo: Cómo crear y ejecutar un reporte personalizado
resumen: Arma tus propios reportes de asistencia o de checadas con las columnas y filtros que necesitas, guárdalos para toda tu empresa y expórtalos a PDF o Excel.
modulo: reportes-personalizados
audiencia: [rh, dueno]
pantallas: [/panel/reportes-personalizados]
palabras: [reportes personalizados, reporte a la medida, columnas, filtros, agrupar, PDF, Excel, plantilla de reporte, asistencia, reloj checador, GPS]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/reportes-personalizados/page.jsx, src/app/panel/reportes-personalizados/components/ReporteDialog.jsx, src/app/panel/reportes-personalizados/components/ReporteCard.jsx, src/app/panel/reportes-personalizados/components/ReporteResultados.jsx, src/hooks/useReportePersonalizado.js]
---

## Para qué sirve

Si los reportes de siempre no te dan exactamente lo que necesitas, aquí armas el tuyo: eliges de dónde salen los datos, qué columnas llevar, qué filtros aplicar por omisión y cómo agrupar. El reporte queda guardado para que **cualquier usuario de tu empresa** lo ejecute cuando quiera.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Entra a **Control de tiempo → Reportes personalizados**.

![Reportes personalizados con dos reportes guardados y el botón Nuevo reporte](/ayuda/capturas/reportes-personalizados/reportes-personalizados.webp "Cada reporte guardado aparece como tarjeta y como pestaña")

## Cómo crear un reporte

1. Toca **Nuevo reporte**.
2. Elige la **Empresa** (el reporte será visible para todos los usuarios de esa empresa).
3. Escribe el **Nombre** (por ejemplo «Reporte mensual de asistencia»).
4. Elige la **Fuente de datos**:
   - **Asistencia**: registros diarios de presencia, ausencias y horas trabajadas.
   - **Reloj Checador**: movimientos de entrada y salida con correcciones y GPS.
5. Si quieres, escribe una **Descripción**.
6. En **Campos del reporte**, marca las columnas a la izquierda. A la derecha verás las **Columnas del reporte**; arrástralas para cambiar el orden o quítalas con la ✕.
7. En **Filtros por defecto** (opcional), marca por ejemplo solo «Tardanza» en Estado Asistencia.
8. Toca **Crear reporte**.

![Ventana Nuevo reporte personalizado con la fuente de datos y las columnas](/ayuda/capturas/reportes-personalizados/reporte-nuevo.webp "Elige la fuente, marca las columnas y ordénalas")

**Columnas disponibles en Asistencia:** nombre y apellidos, código, departamento, unidad de negocio, fecha, entrada, salida, horas que debía, horas que trabajó, diferencia, estado de asistencia, estado del registro, tipo de registro, corrección, autorizado por, horas extra, forma de pago de extras, quién autorizó extras, horas de comida, goce de sueldo, festivo, domingo, pago triple, prima dominical, % día festivo, observaciones y notas de horas extra.

**Columnas disponibles en Reloj Checador:** empleado, código, empresa, departamento, fecha, entrada, salida, entrada y salida corregidas, duración, estado, tipo de cierre y la latitud y longitud de la entrada y de la salida.

## Cómo ejecutar un reporte

1. Toca **Ejecutar** en la tarjeta del reporte (o su pestaña arriba).
2. Elige **Empresa**, **Desde** y **Hasta**.
3. En **Agrupar por** elige Sin agrupación, Por empleado, Por departamento, Por fecha (día), Por semana o Por mes.
4. Si necesitas, toca **Mostrar filtros avanzados** para filtrar por nombre, departamento o estado.
5. Toca **Ejecutar**.

![Reporte listo para ejecutar con las fechas, la agrupación y los botones Ejecutar, PDF y Excel](/ayuda/capturas/reportes-personalizados/reporte-ejecutar.webp "Elige el periodo y toca Ejecutar; después puedes descargarlo en PDF o Excel")

Verás el total de registros, columnas y grupos, y la tabla con los resultados.

## Cómo exportar

- **PDF**: sale con el logo de tu empresa, la información del reporte y espacios para firma del responsable. Puede tardar unos segundos («Preparando PDF…»).
- **Excel**: descarga los mismos resultados.

## Cómo editar o eliminar un reporte

- **Editar** (lápiz): cambia nombre, fuente, columnas o filtros y toca **Guardar cambios**. La empresa no se cambia.
- **Eliminar** (bote de basura): borra el reporte para todos los usuarios de la empresa.

## Preguntas frecuentes

### ¿Mis compañeros ven los reportes que creo?

Sí. Los reportes se guardan por empresa y los ven todos los usuarios de esa empresa.

### Antes guardaba reportes en mi navegador, ¿se perdieron?

No. Si el sistema encuentra reportes guardados en tu navegador, te ofrece importarlos para que queden en tu empresa.

### ¿Cuál fuente elijo para ver dónde checó la gente?

**Reloj Checador**, con las columnas de latitud y longitud. Para verlo en un mapa usa el [Mapa de rutas](/ayuda/mapa-de-rutas/ver-recorridos).

## Qué pasa si…

- **…no escribes nombre:** verás «El nombre del reporte es obligatorio.».
- **…no eliges columnas:** verás «Selecciona al menos una columna.».
- **…no hay resultados:** verás una sugerencia para ajustar el rango de fechas o los filtros y ejecutar de nuevo.

## Relacionado

- [Cómo generar el reporte de horas trabajadas](/ayuda/reporte-horas/generar-reporte-de-horas)
- [Cómo revisar y exportar las asistencias de un periodo](/ayuda/asistencias/revisar-asistencias)
- [Cómo ver los recorridos de un empleado en el mapa](/ayuda/mapa-de-rutas/ver-recorridos)
