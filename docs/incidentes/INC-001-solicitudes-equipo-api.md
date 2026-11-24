# INC-001 · «No pudimos cargar tu equipo» en Solicitudes de mi equipo (23/11/2026)

- **Síntoma (reportado por el dueño):** «No pudimos cargar tu equipo — Unexpected token '<', "<!DOCTYPE "... is not valid JSON».
- **Reproducción (RED):** `curl https://dev.adamia.com.mx/api/solicitudes-equipo` → `404 text/html` «Cannot GET /api/solicitudes-equipo» (respuesta de Express, no de Next).
- **Causa:** en dev/prod el proxy manda `/api/*` al backend de Express, salvo `bot`, `empresas` e `image-proxy`. La pantalla llamaba la ruta de Next por `/api/solicitudes-equipo`, así que nunca llegaba a Next. Ya había un patrón para esto (`/internal/*` con rewrite en `next.config.mjs`), pero esta ruta no lo usaba.
- **Corrección:** rewrite `/internal/solicitudes-equipo/:path*` → `/api/solicitudes-equipo/:path*` y la pantalla llama `/internal/...`. Si alguna vez llega HTML, el mensaje es claro en lugar de «Unexpected token».
- **Regresión:** `scripts/test-rutas-internas.mjs` (en CI) falla si el navegador llama por `/api/<ruta de Next>` una ruta que el proxy no entrega a Next, o si falta su rewrite. Comprobado: falla sin la corrección y pasa con ella.
- **GREEN:** `scripts/verify-solicitudes-equipo.cjs` (navegador, con `/internal/...`) pasa.
- **Aprendizaje:** toda ruta nueva en `src/app/api` que use el navegador se publica por `/internal/*`.
