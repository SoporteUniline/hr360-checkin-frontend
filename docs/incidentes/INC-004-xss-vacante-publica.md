# INC-004 · XSS en la página pública de la vacante (24/11/2026) — backend: INC-REC-003

- **Severidad:** alta (XSS almacenado en página pública).
- **Síntoma/riesgo:** `src/app/(public)/vacante/[slug]/page.jsx` (y `panel/empleados/DetalleVacante.jsx`) insertaban con
  `dangerouslySetInnerHTML` el HTML del backend (descripción, responsabilidades, escolaridad, experiencia, habilidades):
  `<img onerror>`, `<script>` o `href="javascript:"` se ejecutaban en el navegador de cada candidato.
- **Causa:** no había saneado (ni dependencia para ello en `package.json`).
- **RED:** `scripts/test-html-seguro.mjs` sobre 7456413: «las vistas de vacante solo insertan HTML saneado» falla
  (`data.escolaridad sin sanear`); el resto se salta porque no existe el saneador.
- **Corrección:** `src/lib/htmlSeguro.mjs` (sin dependencias nuevas; misma regla que `utils/htmlSeguro.js` del backend):
  lista blanca p, br, strong, b, em, i, u, ul, ol, li, h3, h4 y a (solo href http/https/mailto, con
  `rel="noopener noreferrer nofollow" target="_blank"`); el resto de etiquetas y atributos se descarta y el texto se escapa.
  Las 10 inserciones de las dos vistas pasan por `sanearHtml(...)`.
- **GREEN:** `test-html-seguro.mjs` 5/5; lista de CI de asistencias 207/207; lint sin errores; `npm run build` correcto.
