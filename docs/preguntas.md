# Preguntas

### P-001 · plataforma · ALTA · RESPONDIDA
**Contexto:** el backend (`redlab_back`) concentra checadas, asistencias, turnos y cálculos; no está accesible en esta sesión.
**Pregunta:** ¿Dónde vive el backend y se puede agregar a la sesión de trabajo? (o, alternativamente, ¿la funcionalidad de jornadas se construye como rutas `/api` de este repo con MySQL directo, como Control de Activos?)
**Opciones:** A) Dar acceso al repo del backend · B) Rutas `/api` en este repo + esquema de `adamia_dev`
**Recomendación:** A — una sola fuente de verdad para asistencia.
**Impacto en datos:** con B habría un segundo camino de escritura sobre tablas de asistencia.
**Respuesta:** A) en el backend `redlab_back` → D-002. Falta el owner/repo para agregarlo a la sesión.

### P-002 · asistencia · ALTA · ABIERTA
**Contexto:** "Aplicar a histórico" recalcula retardos pasados con la tolerancia actual (R-013).
**Pregunta:** ¿Se debe retirar/ocultar ese botón y versionar la configuración por fecha?
**Recomendación:** Sí — no alterar resultados pasados.

### P-003 · empleados · MEDIA · ABIERTA
**Contexto:** `hrs_por_dia` y `hrs_de_comida` del empleado conviven con el horario del turno.
**Pregunta:** ¿Cuál manda cuando difieren? ¿Se pueden derivar del turno asignado?

### P-004 · legal · ALTA · ABIERTA
**Contexto:** la reforma LFT publicada el 1 de mayo de 2026 (límites semanales 48→40 h, extra 9→12 h) no se ha verificado contra el DOF en esta sesión.
**Pregunta:** ¿Hay un documento o asesor laboral que confirme las cifras y fechas de entrada en vigor por año?
**Impacto:** se codifican como reglas versionadas 🟡 hasta confirmar.

### P-005 · seguridad · ALTA · ABIERTA
**Contexto:** varios controles de seguridad dependen de validaciones del backend que no se pueden ver desde este repo (detalle en el registro privado de riesgos, fuera del repositorio público).
**Pregunta:** revisar con el responsable del backend la lista privada de riesgos marcados "Verificar backend".
