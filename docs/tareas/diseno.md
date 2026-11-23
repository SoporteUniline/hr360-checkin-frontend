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

## Preguntas configurables (23/11/2026, decisión del dueño: «muy completo y muy fácil»)
Cada punto del checklist es una pregunta con tipo y valor (`src/lib/tareas/preguntas.mjs`, 10 pruebas):
- **Sí / No**: se elige cuál es la buena (100 %), la otra 0 %.
- **Una opción**: cada opción vale un % (p. ej. Limpia 100 · Regular 50 · Sucia 0); alguna debe valer 100 %.
- **Varias opciones**: cada elegida suma su %, hasta 100 %; juntas deben sumar al menos 100 %.
- **Número con rango**: 100 % si está dentro (p. ej. 0 a 5 °C); vacío = sin límite.
- **Foto**: 100 % si la sube.
- **Estrellas** (1 a 5): 🧭 cada estrella vale 20 % (3 de 5 = 60 %).
- **Firma** con el dedo (p. ej. «Recibió»): solo registra; normalmente obligatoria.
- **Solo registran** (no cuentan en el %): Texto corto, Texto largo, Fecha, Fecha y hora (p. ej. caducidad, hora de
  llegada del proveedor). En el editor aparecen en un grupo aparte de los que «Se califican».
- Por pregunta: **peso** (se muestra cuánto vale del total), obligatoria, permite «No aplica» (no cuenta en el total),
  pide foto de evidencia. Opciones listas (Limpia/Regular/Sucia, Bueno/Regular/Malo…), plantillas copiando otro checklist,
  validación junto a cada pregunta y **vista previa del celular** que se contesta de prueba.
- **Decisión A**: el jefe puede **corregir** una respuesta al revisar; la calificación se recalcula y queda
  «Respondió X → corregido a Y por Fulano». La persona lo ve en su app.
- Productividad: «Preguntas que más fallan» (promedio y % de veces que salió mal), por checklist y sucursal, con Excel.
- Calificación = promedio ponderado por peso de las preguntas que cuentan; sin contestar = 0 %.

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
