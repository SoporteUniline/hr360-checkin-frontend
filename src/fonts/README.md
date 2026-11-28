# Tipografías

| Archivo | Familia | Origen | Licencia |
|---|---|---|---|
| `plus-jakarta-sans-latin-var.woff2` | Plus Jakarta Sans (variable, 200–800, latino) — **letra oficial de ADAMIA** desde el 28/11/2026 | Google Fonts, vía el paquete `@fontsource-variable/plus-jakarta-sans` 5.3.0 (`files/plus-jakarta-sans-latin-wght-normal.woff2`) | SIL Open Font License 1.1 |
| `outfit-latin-var.woff2` | Outfit (variable, 500–800, latino) — títulos de la página pública | Google Fonts (`fonts.gstatic.com/s/outfit/v15`) | SIL Open Font License 1.1 |

Se guardan en el proyecto para que la construcción no dependa de Google Fonts (21/11/2026: dos despliegues fallaron
porque Google no respondió). Licencia: https://openfontlicense.org — permite usarlas, incluirlas y redistribuirlas con el software.
Se cargan desde `src/fonts/index.js`. En CSS se usa la variable neutra `var(--font-adamia)` (antes `--font-inter`).

Inter (`inter-latin-var.woff2`) se quitó el 28/11/2026 al cambiar a Plus Jakarta Sans (sigue en el historial de git).
