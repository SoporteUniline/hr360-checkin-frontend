# INC-008 · «Tengo que recargar para ver los cambios de asistencia» (25/11/2026)

- **Síntoma (dueño):** en `https://adamia.com.mx/panel/registro-asistencia` hay que recargar para ver los cambios de
  asistencia «y todo eso».
- **Causa, comprobada en código y en navegador:**
  1. **El SSE nunca llegaba con «Todas las empresas».** La página pone `empresaActiva = "all"` en cuanto el usuario
     tiene empresas (y el Monitor siempre usa `"all"`); `useRefrescoChecadas` abría
     `eventos-checada?id_empresa=all` y el backend solo emite a `empresa:<número>`. Ni las checadas refrescaban.
  2. **El SSE solo hablaba de checadas.** Ediciones de otro usuario u otra pestaña (reloj del día, estado del día,
     checada corregida, permisos/vacaciones aprobados, horas extra, cuenta de horas, turnos extra, masivos) no avisaban.
  3. **Al guardar solo se recargaba la tabla.** Los `onGuardado` llamaban al `mutate` de la tabla; la cuenta de horas
     (`CuentaHorasContext`, su clave solo cambia con una reposición), «Horas por reponer» y su contador, el periodo
     completo de tarjetas/filtros/matriz (`filterOptionsRows`, cargado una vez en un `useEffect`), las checadas del panel,
     horas extra y «Horas de ley» se quedaban con lo de antes. Todo con `revalidateOnFocus: false` y sin sondeo.
  4. De paso: `CeldaEstadoDia` llamaba `mutateAsistencia(asistencia)`, que ponía UNA asistencia en el caché de la tabla
     y pedía la tabla otra vez.
- **RED:** `scripts/verify-refresco-asistencias.mjs` (Chromium + build, backend y EventSource simulados) contra el
  código anterior: **9 defectos** — SSE a `id_empresa=all` (Asistencias y Monitor); guardar no recarga cuenta de horas
  ni por reponer (`{"tabla":1}`); `asistencia` no recarga nada (`{}`), tampoco al cerrar una edición, ni en el Monitor
  ni en celular; con la pestaña oculta pedía igual; «Nueva checada» se mostraba con la pestaña oculta.
- **Corrección:** refrescador único `src/lib/asistencia/refrescoAsistencias.js` + `refresco.mjs` (filtro de claves,
  reglas de foco/sondeo/edición abierta, unión de recargas); interceptor de `lib/axios.js`; `useRefrescoChecadas`
  (empresas del usuario, eventos `checada`/`asistencia`/`ping`, foco, sondeo de respaldo); periodo completo como clave
  SWR; la guardia `CambiosPendientes` publica si hay cambios sin guardar; `conRefrescoAsistencias` en Asistencias,
  Monitor, horas extra, comida, checadas y «Horas por reponer». Backend: evento `asistencia` (INC-REFRESCO-001).
  Detalle en `docs/asistencias/refresco.md`.
- **GREEN:** `verify-refresco-asistencias.mjs` 17/17; `test-refresco-asistencias.mjs` 15/15 (nueva línea del CI tras
  «Asistencias — cálculo»); `verify-reloj-dia`, `verify-monitor`, `verify-asistencias-horas`, `verify-horas-reponer`,
  `verify-asistencias-movil`, `verify-asistencias-fase1`, `verify-asistencias-hoy-grupos`, `verify-tiempo-reponer`,
  `verify-permisos-horas`, `verify-monitor-equipo`, `verify-salir-a-comer`, `verify-quepaso-motivo` en verde.
- **No comprobado:** el SSE real detrás del nginx de producción con varias pestañas y usuarios; el WebView de la app.
- **Riesgos conocidos:** un cambio de otro usuario que llegue dentro de los 3 s posteriores a un guardado propio, con
  esa recarga aún en curso, se une a ella y puede no verse hasta el siguiente aviso/foco; con el SSE caído, lo de
  otros tarda hasta 1 min (sondeo). Por ciclo se piden 3 (escritorio) a 5 (paginado) peticiones en vez de 1.
- **Aprendizaje:** «revalidar la tabla» no es «revalidar la pantalla»: lo que depende de un dato se recarga por un
  solo punto con filtro de claves; y un canal en vivo se prueba con el valor real que manda la pantalla («all»).
