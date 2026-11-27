---
titulo: Cómo generar el reporte de horas trabajadas
resumen: Genera por persona y periodo las horas trabajadas, programadas, extra dobles y triples, comida y alertas de la Ley Federal del Trabajo, listo para imprimir y firmar.
modulo: reporte-horas
audiencia: [rh, dueno]
pantallas: [/panel/reporte-horas]
palabras: [reporte de horas, horas trabajadas, LFT, ley federal del trabajo, horas extra, dobles, triples, firma, PDF, Excel, periodo de pago, quincena, alertas de ley]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/reporte-horas/page.jsx, src/app/panel/reporte-horas/ResumenLey.jsx]
---

## Para qué sirve

El **Reporte de horas** junta, para cada persona y el periodo que elijas:

- Horas **trabajadas** y **programadas**.
- Horas **extra dobles**, **extra triples** y **por autorizar**.
- Su **comida** y cuánto se excedió.
- Las **alertas de la ley** (más de 4 h extra en un día, extra en más de 4 días, jornada de más de 12 h, trabajo en domingo o festivo, etc.).

Cada persona tiene su **hoja** con el detalle por día y espacio para la **firma del empleado** y la **firma de autorización**.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Entra a **Control de tiempo → Reporte de horas**.

## Cómo generar el reporte

1. Elige los filtros:
   - **Unidad de negocio**: una o todas.
   - **Cargo**: un puesto o todos.
   - **Periodo de pago**: Diario, Semanal, Catorcenal, Quincenal, Mensual, Por hora o todos.
   - **Empleado(s)**: toca para buscar y marcar a varias personas. Si no eliges a nadie, se toman todos los del filtro.
   - **Rango de fechas**: por ejemplo **Este mes**.
2. El reporte se calcula solo al cambiar las fechas o las personas. Si cambias otros filtros, toca **Generar reporte**.

![Reporte de horas con los filtros, el resumen de la ley y la hoja de la primera persona](/ayuda/capturas/reporte-horas/reporte-de-horas.webp "Arriba el resumen del periodo contra la ley; abajo la hoja de cada persona, lista para firmar")

## Cómo leer el resumen de la ley

La franja morada dice las reglas que aplican, por ejemplo «LFT · ordinaria máx. 48 h/semana · extra máx. 4 h/día en 4 días · 9 h dobles/semana, el resto triples · jornada máx. 12 h/día · menores: sin horas extra». Recuerda que **solo cuentan las horas extra autorizadas** en Asistencias.

Debajo verás los totales (**Trabajadas**, **Extra dobles**, **Extra triples**, **Por autorizar** y **Empleados con alertas de ley**) y una tabla por persona. Toca a una persona para ir a su hoja.

## Cómo leer la hoja de cada persona

- Datos: empleado, empresa, periodo y días laborados.
- Totales: trabajadas, ordinarias, extra dobles, extra triples, por autorizar y comida.
- Tabla por día: **Fecha**, **Entrada**, **Salida**, **Horas**, **Comida** (por ejemplo «2:00 p.m.–3:10 p.m. · 70 de 60 min · +10 min»), **Estado**, **Motivo**, **Notas** y **Extra / ley**.
- Al final, los espacios para firmas.

## Cómo exportar o imprimir

- **Exportar Excel**: descarga el reporte con sus columnas (incluida la comida).
- **Guardar PDF**: descarga el PDF con todas las hojas, listo para imprimir y firmar.

## Preguntas frecuentes

### ¿Por qué hay horas «por autorizar»?

Son horas trabajadas de más que nadie ha autorizado. No se cuentan como extra hasta que se autorizan. Ver [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra).

### ¿Cuándo una hora extra es doble o triple?

Las primeras horas extra autorizadas de la semana (lunes a domingo) son dobles hasta el tope legal; las que pasan del tope son triples.

### ¿Qué periodo puedo pedir?

Hasta unos tres meses por reporte. Para periodos más largos, genera varios.

### ¿Por qué dice que algunos días «se midieron con el horario actual»?

Porque no hay registro del horario que esa persona tenía esos días; se usó su horario de hoy.

## Qué pasa si…

- **…no hay datos en el periodo:** verás «Sin datos en el periodo».
- **…todavía no has elegido filtros:** verás «Aún no hay reporte · Configura los filtros y pulsa “Generar reporte” para ver la vista previa aquí.».
- **…falla la exportación:** verás «No se pudo exportar a Excel» o «No se pudo generar el PDF».

## Relacionado

- [Cómo revisar las horas de la semana contra el límite de la ley](/ayuda/asistencias/horas-de-ley)
- [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra)
- [Cómo crear y ejecutar un reporte personalizado](/ayuda/reportes-personalizados/crear-y-ejecutar-un-reporte)
