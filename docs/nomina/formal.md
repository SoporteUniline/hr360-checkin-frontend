# Nómina formal — R3 + R4 (pantallas)

Decisión D-10 (`diseno.md`), aprobada por el dueño el 27/11/2026. Reglas, tablas, fórmulas, API y casos de prueba:
`hr360-checkin-backend/docs/nomina-formal.md`. Aquí solo las pantallas.

## Pantallas
| Pantalla | Ruta | Quién | Qué hace |
|---|---|---|---|
| Nómina › **Configuración** (pestaña nueva) | `/panel/nomina/configuracion` | RH y dueño (el interruptor solo el dueño) | «Manejar nómina formal» (Encendida/Apagada; por qué no se enciende; confirmación en la página), datos fiscales de la empresa (registro patronal, prima de riesgo, RFC, régimen, CP, zona del mínimo), estado de las tablas del año y «Lo que falta para nómina formal» (empresa y cada persona: «Bloquea el cálculo» / «Para timbrar después») |
| Datos fiscales de una persona | `/panel/nomina/configuracion/personas/[id]` | RH | NSS, RFC, CURP y fecha de ingreso de su ficha (solo lectura, «Editar en su ficha»), SDI calculado por ley y SDI capturado, CP fiscal y claves SAT con sugerencia desde el texto del contrato |
| **Tablas fiscales** | `/dashboard/tablas-fiscales` | Admin de ADAMIA confirma; los demás solo ven | Cada valor con cifra, vigencia, fuente (oficial y secundarias), nota y estado; «Confirmar» manda la huella que se vio |
| Detalle de la nómina | `/panel/nomina/[id]` | RH y dueño | En una nómina formal: totales de ISR, IMSS de los trabajadores e IMSS patronal (informativo), quién quedó sin calcular y aviso si el interruptor cambió después de calcular |
| Panel del recibo | `EditorRecibo` | RH | ISR e IMSS de solo lectura («Se calcula solo…») y el desglose `DesgloseFiscal` (gravado/exento, ISR, subsidio, SBC, IMSS, patronal, «Pre-nómina, no timbrada») |

- Diseño: páginas (no ventanas), letra ≥ 16 px (las etiquetas tipo chip, 15 px en negritas como en Prospectos), títulos en
  700, campos y botones de 48 px, sin degradados (`src/components/nomina/PiezasFormal.jsx`). Las pestañas y la tabla del
  detalle son las de siempre del módulo (no se cambiaron).
- Lógica de presentación pura: `src/lib/nomina/formal.mjs` (`scripts/test-nomina-formal.mjs`).
- Verificación en navegador: `scripts/verify-nomina-formal.mjs` (1440 y 390, en `ci-dev.yml`).
- Guía del Centro de ayuda: `src/content/ayuda/nomina/nomina-formal.md`; se actualizaron «Cómo calcula ADAMIA la
  nómina», la portada de Nómina, «Cómo crear y calcular» y «Cómo autorizar» (Excel con columna Aviso y que no sirve solo
  para timbrar, H-05).

## ❓ Pendiente
- Entrada en el menú lateral para `/dashboard/tablas-fiscales` (el menú lo está tocando otro agente; hoy se llega desde
  Nómina › Configuración siendo admin, o por la dirección).
- Captura rápida (R5) y timbrado (R6): ver el plan del backend.
