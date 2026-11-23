# Tareas y Checklists — diseño (23/11/2026)

Estado: **PROTOTIPO en dev con datos de ejemplo** (`/panel/tareas` y app del empleado → Tareas). Sin tablas todavía:
el siguiente paso es acordar el SQL. Lógica pura y probada en `src/lib/tareas/reglas.mjs` (`scripts/test-tareas.mjs`);
prueba en navegador `scripts/verify-tareas.mjs`.

## Decisiones del dueño
- Enfoque A: jefes que asignan a su equipo operativo, desde el celular, con foto de evidencia.
- **Tarea** = se hace una vez, tiene fin; puede pertenecer a un **proyecto** (p. ej. «Apertura sucursal Norte») o ir suelta.
  Pasos, responsable, fecha límite, prioridad, pide foto, comentarios. Kanban: Por hacer → En proceso → En revisión → Hecho.
  La persona la manda a revisión (con pasos completos y foto si la pide); el jefe la aprueba o la regresa.
- **Checklist** = tarea que se repite (diario, semanal) con puntos a evaluar; misma sección que tareas, vista aparte.
  El dueño los crea y asigna; la gente los llena con foto; el jefe los revisa.
- **Calificación por porcentaje** para dar bonos: cada punto tiene **peso**; cuenta lo que el jefe acepta al revisar
  (cumple / no cumple). No enviado = 0 %. Se exporta a Excel.
- **Fotos 3 meses** y se borran; la calificación, la hora y quién lo hizo se quedan.
- Venta por módulos: segundo escenario (ver abajo).

## 🧭 Criterio aplicado (avisado al dueño)
- «Tarde» se marca aparte y no baja el %; los «por revisar» aún no cuentan en el promedio.
- Revisa el jefe inmediato de la ficha; aviso en la app y por correo.
- Checklists diarios solo los días que la persona checó entrada (opción en cada checklist).
- Puntos obligatorios: sin ellos no se puede enviar; un punto marcado que pide foto necesita su foto.

## 💡 PROPUESTO
- Bono automático en Nómina «por cumplimiento de checklists ≥ X %» si la empresa tiene también el módulo de Nómina;
  si no, solo el Excel.
- El % de checklists como indicador en Evaluaciones (si tiene ese módulo).
- Venta por módulos: cada módulo (Activos, Uniformes, Evaluaciones, Tareas/Checklists, Nómina) con interruptor por empresa;
  base sin costo extra: asistencia, reloj, empleados, solicitudes. Integraciones entre módulos solo si ambos están activos.
- Botón «Conservar esta foto» para casos con incidente o acta.

## ❓ PENDIENTE
- Qué pasa si no envía a tiempo: solo avisar al jefe, contar en evaluación o afectar bono (se propuso solo avisar).
- Precios por módulo.
- Plantillas de ADAMIA incluidas (apertura, cierre, limpieza, alta y baja de personal).
