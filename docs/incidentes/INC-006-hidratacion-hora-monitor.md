# INC-006 · Monitor: React #418 al abrir `/panel/monitor` directo (24/11/2026)

- **Contexto:** el encabezado del Monitor («Martes 24 de noviembre · 11:12 a.m. · se actualiza solo») tomaba la hora con
  `useState(() => new Date())`. Al llegar por navegación interna (`/panel` → Monitor) no hay render de servidor y no
  fallaba; al recargar o abrir el enlace directo, el servidor pintaba su hora y el navegador la suya.
- **RED:** `scripts/verify-monitor.mjs` con el paso nuevo «la vista elegida se recuerda al recargar» (recarga
  `/panel/monitor`) termina con `Minified React error #418 … args[]=text` en la página `/panel/monitor`.
- **Causa:** texto que depende de la hora (y de la zona del navegador) en el primer render de un componente que también
  se pinta en el servidor.
- **Corrección:** `page.jsx` arranca `ahora` en `null` y lo pone al montar; mientras tanto el subtítulo dice solo «se
  actualiza solo». La vista elegida (localStorage) también se lee al montar por la misma razón.
- **GREEN:** `verify-monitor.mjs` completo, con la recarga y «sin errores de JS».
- **Aprendizaje:** nada que dependa de `Date`, zona o `localStorage` en el primer render de una pantalla del panel.
