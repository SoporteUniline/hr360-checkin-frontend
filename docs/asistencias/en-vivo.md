# Asistencias → En vivo (22/11/2026)

Pedido del dueño: «¿cómo sé que alguien entrará pronto, saldrá pronto o está en jornada, y dónde veo los tiempos que debe?».
Decisión: pestaña «En vivo» dentro de Asistencias (opción A).

- **Columnas:** Por entrar (próxima hora; arriba quien «va tarde»), En jornada (a qué hora sale), Por salir (próxima hora;
  arriba quien «no ha checado salida» 15 min después de su hora), Debe tiempo (cuenta de horas de permisos que se reponen).
  Abajo, plegables: No vinieron, Ya salieron, Entran más tarde, Descanso o sin horario.
- **Datos:** los mismos registros de Asistencias (ayer y hoy, para turnos nocturnos abiertos), que se actualizan con cada
  checada; la hora se recalcula cada 30 s. Permiso de llegar tarde: no cuenta como tarde antes de su hora de permiso.
- **Clic:** en el nombre, la ficha del empleado; en el renglón, la ventana de edición de ese día.
- Lógica pura en `src/lib/asistencia/enVivo.mjs` (`scripts/test-en-vivo.mjs`); pantalla `VistaEnVivo.jsx`;
  navegador `scripts/verify-en-vivo.mjs` (hora fija 10:00 CDMX).
- ❓ PENDIENTE: «pronto» = 60 min y aviso de salida a los 15 min; ajustables si el dueño lo pide.
