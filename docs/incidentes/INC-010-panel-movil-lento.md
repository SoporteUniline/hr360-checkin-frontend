# INC-010 · «Le pico a los botones y no reacciona, le pico a Asistencias y tarda muchísimo» (27/11/2026)

- **Síntoma (dueño, iPhone):** en el panel de RH desde el celular los toques no responden y entrar a Asistencias tarda.
- **Entorno de medición:** Chromium con perfil iPhone 13, CPU ×4, build de producción
  (`NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api`), backend simulado con 200 personas y 100–120 ms de latencia.
  **No medido en el aparato real** (Safari/WKWebView).
- **Reproducción (RED):** `scripts/verify-panel-rapido.mjs` con el código de `94c0dfa` falla en 8 de 12 comprobaciones:
  Asistencias pide `/checador/asistencias` ×4 y `/checador/empleados` ×2; tras tocar un módulo del menú el `<body>`
  sigue con `pointer-events:none` 423–441 ms (CPU ×1) y 1 528 ms o más (CPU ×4); la foto del usuario se pide en cada
  apertura del menú; portada y foto del aviso sin `decoding`/tamaño/`lazy`. `estres-menu` (12 vueltas): body bloqueado
  651–1 400 ms después de cada toque.

## Causas (con evidencia)

1. **Asistencias ×4.** `page.jsx` arrancaba con `limit = LIMITE_TODOS` y un efecto lo cambiaba a 500 cuando
   `useIsMobile` (que empieza en `false`) detectaba el celular: dos claves SWR, dos descargas de la tabla
   (`limit=1000000` y `limit=500`). Con 500, `AsistenciaDataContainer` pedía además el periodo completo en dos pasos
   (`cargarPeriodoCompleto`: conteo `limit=1` + `limit=200`) aunque los 200 registros ya venían en la tabla.
   No es StrictMode: se midió en build de producción.
2. **Empleados ×2.** `MobileEmpleadoDetalle` (siempre montado) pedía `empresa=<id_empresa del usuario>` y el contenedor
   `empresa=all`: dos claves para el mismo catálogo.
3. **Menú que se come toques.** La hoja de Radix del menú lateral (`<SheetContent menu>`) animaba la salida 300 ms; mientras
   la `Presence` mantiene el contenido montado, `DismissableLayer` deja el `<body>` en `pointer-events:none` y el velo
   encima. Con el hilo ocupado por la pantalla nueva eran 0.7–1.5 s. Al medirlo con trazas aparecieron dos costos más en
   el mismo toque: el `Tooltip` de `SidebarMenuButton` (oculto en celular) se «abría» con el foco del `mousedown` y
   forzaba recalcular estilos de ~6 000 elementos (~120–180 ms con CPU ×4), y desmontar el panel con el foco dentro
   volvía a forzar ese recálculo (~120 ms).
4. **`/users/imagen/-1` en cada apertura.** `NavUser` se monta con el menú y SWR revalida al montar.
5. **Tarea larga de ~500 ms al entrar.** Perfil de CPU: ~155 ms eran evaluar ExcelJS (chunk de 933 KB importado de forma
   estática por `AsistenciaTable` y `VistaHorasReponer` aunque solo sirve al exportar); el resto, pintar 200 tarjetas
   (`dayjs.tz` por tarjeta) varias veces: cada render del padre repintaba todas y un estado sin uso (`lastUpdated`)
   provocaba otro render completo al llegar los datos.

## Corrección

- `page.jsx`: `limit` empieza en `null` y el efecto lee el ancho al momento (`esMovilAhora()` en `hooks/use-mobile.js`);
  `useAsistenciaData` no pide con `limit` nulo.
- `lib/asistencia/consultaPeriodo.mjs`: `tablaTraeTodoElPeriodo()` y `cargarPeriodoDeUnaVez()`. El contenedor solo pide el
  periodo cuando la tabla ya respondió y no trae todo, en una petición. Exportar no cambia.
- `MobileEmpleadoDetalle`: recibe `idEmpresa` de la pantalla y comparte la clave de empleados.
- `ui/sheet.jsx`: los `menu` cierran sin animación de salida (overlay y contenido). El resto de hojas, igual que antes.
- `ui/sidebar.jsx`: el menú móvil se monta solo abierto; al cerrarlo se suelta antes el foco que quedó dentro;
  `SidebarMenuButton` no envuelve en `Tooltip` en celular (ya estaba oculto).
- `Sidebar/nav-user.jsx`: la foto no se revalida al reabrir (cambiarla en Mi cuenta hace `mutate` de la clave) y no se
  pide a empleados/accesos (ven iniciales).
- `AsistenciaTable` y `VistaHorasReponer`: ExcelJS con `import()` al exportar.
- `MobileAsistenciaView`: `EmpleadoCard` y `GrupoSection` con `memo`, `handleEmpleadoClick` estable, sin `lastUpdated`.
- Muro: portada con `decoding="async"` y `width`/`height` (sin `lazy`: es lo primero visible); foto del aviso emergente
  `loading="lazy"`, `decoding="async"`, tamaño y `h-auto`.

## GREEN (misma máquina, build de producción)

- `verify-panel-rapido.mjs`: 12/12 con CPU ×1 (body libre 21–26 ms) y con CPU ×4 (35–57 ms; límite 150).
- `estres-menu` 12 vueltas: `pointer-events:none` 0 ms después del toque en 12/12 (antes 651–1 400 ms).
- `medir.mjs` (2 corridas): al entrar a Asistencias 1 petición a asistencias y 1 a empleados (9 en total, antes 13);
  tarea larga máxima 140–220 ms (antes 203–525); INP del toque 56–80 ms (antes 184–424); foto 1 vez en 7 aperturas (antes 6–7).
- Pruebas de unidad nuevas en `test-consulta-periodo.mjs` (línea «Asistencias — cálculo» de `ci-dev.yml`).
- `verify-refresco-asistencias.mjs` adaptado: su paso 8 suponía conteo + periodo en celular; ahora simula un periodo que
  no cabe en la página y exige una tabla y UN periodo al entrar y al refrescar (8a nuevo).

## Pendiente / no comprobado

- Aparato real (iPhone/WKWebView, Android WebView): no medido.
- El backend no da miniaturas de fotos del muro; se usa la original.
- Abrir el menú sigue en ~260–300 ms de INP con CPU ×4 (montar la navegación completa); no se tocó.
- `/panel/empleados` pide `/checador/empleados` ×7 al entrar; Entradas y salidas pide `/checador/reloj/asistencia` ×2;
  ExcelJS sigue estático en Entradas y salidas, Reportes personalizados y Tareas. Fuera del alcance de este cambio.
- `verify-reloj-salida.mjs` no pasa en este entorno (espera la cámara del reloj en `/demo`), igual con el código base.

## Aprendizaje

- Un valor que depende del ancho no debe arrancar con el de escritorio si con él ya se dispara una consulta: esperar a
  saberlo (o leerlo al momento) evita descargas que se tiran.
- Si la respuesta ya trae lo necesario, no se descarga otra vez «por si acaso»; decidirlo con la respuesta en la mano.
- En celular, un menú que se cierra con animación bloquea la página mientras anima; los menús cierran de inmediato.
- Medir el toque con trazas (no solo con el reloj): los costos de foco/tooltip y de desmontar con foco no se veían en el
  perfil de JS.
