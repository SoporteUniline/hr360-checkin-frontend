# Evaluaciones · Talento (objetivos, 1:1, feedback, reconocimientos, calibración 9-box, bono) — 22/12/2026

Backend, permisos, reglas de dinero y API: `docs/desempeno-talento.md` del backend (migración
`20261222_desempeno_objetivos_calibracion.sql`). Aquí solo pantallas.

## Pestañas (src/lib/evaluaciones/vistas.mjs; el servidor decide con `/capabilities`)
| Ruta | RH / dueño | Jefe | Colaborador | Alcance |
|---|---|---|---|---|
| `objetivos` | todos, aprueba | los suyos y su equipo, aprueba | los suyos, avance mensual | `objectives` |
| `uno-a-uno` | — | agenda, cierra, notas | ve, temas, notas | `oneonones` |
| `reconocimientos` | muro, da, oculta | muro, feedback de su equipo | muro, da, pide, responde | `feedback` |
| `calibracion` | 9-box + pestaña «Bono a nómina» | solo si RH lo designó | — | `calibration` |
| `equipo` | — | arriba: «Mi equipo» de talento (`EquipoTalento`) | — | `team` |

El menú de RH (Sidebar) lee `VISTAS_RH` y agrega Objetivos, Calibración y bono, Feedback. En el resultado de una evaluación
se agrega la sección «Objetivos del periodo» (informativa).

## Archivos
- `src/components/evaluaciones/talento/`: `ObjetivosView.jsx` (+ `ObjetivosSeccion`), `UnoAUnoView.jsx`, `FeedbackView.jsx`,
  `CalibracionView.jsx` (9-box, mover con motivo, bitácora, designados, cerrar/reabrir; bono: reglas, generar, aprobar,
  cancelar), `EquipoTalento.jsx`, `comun.jsx` (`useTalento().enviar`), `talento.css` (texto ≥ 13 px, controles ≥ 44 px).
- `src/lib/evaluaciones/talento.mjs` (reglas puras) · `api.mjs`: `send(method, path, body)` (cuerpo tal cual, control de
  cambios en `revision`).

## Pruebas
- `scripts/test-evaluaciones-talento.mjs` (CI, step propio en `.github/workflows/ci-dev.yml`).
- Capturas con red simulada a 1440 y 390 (sin scroll horizontal; texto ≥ 13 px y controles ≥ 44 px medidos en las vistas
  nuevas).

## ❓ PENDIENTE
Ver backend: ponderar objetivos en la calificación, definición de «sueldo» del bono, si el colaborador ve su 9-box,
aprobación de Meta de `adamia_reconocimiento_recibido`.
