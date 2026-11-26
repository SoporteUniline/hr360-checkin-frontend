# Clima · NOM-035 lista para inspección, analítica, ciclo de vida y riesgo de rotación (26/11/2026)

Pantallas del agente clima2. El backend y sus reglas están en `hr360-checkin-backend/docs/clima-nom035.md` (sección del
26/11/2026, migración `20261220_clima_nom035_analitica.sql`). Sin la migración, las piezas nuevas muestran «Falta preparar
la base de datos» o no se dibujan (riesgo y ciclo de vida) y lo demás sigue igual.

## Dónde está cada cosa
| Ruta | Componente | Qué hace |
|---|---|---|
| `/panel/clima` | `RiesgoRotacion.jsx` (debajo del tablero) | Riesgo de rotación por área o jefe (grupos de 2 o más, nunca por persona): índice, nivel, 3 factores con su texto, recomendación y «Agregar al plan» (`POST /campanias/:id/acciones`; refresca el plan del tablero) |
| `/panel/clima/analitica` | `Analitica.jsx` (pestaña nueva) | Medición, cortes (área o jefe, antigüedad, puesto, sucursal), mapa de calor (tabla en escritorio, tarjetas por grupo en el teléfono), impulsores del compromiso y «Exportar CSV» |
| `/panel/clima/encuestas` | `CicloVida.jsx` (debajo de Encuestas) | Encender ingreso 30 días, ingreso 90 días y salida; enviadas y la encuesta abierta del trimestre |
| `/panel/clima/nom035/expediente` | `Nom035Expediente.jsx` | Centro de trabajo (sucursal) con su guía, lista por numeral con avance, programa de intervención (dominio, responsable, inicio, límite, avance, estado), política (modelo editable, publicar, acuses), difusión, evidencias con archivo y «Expediente en PDF» |
| `/panel/clima/nom035/buzon` | `Buzon.jsx` | Liga del buzón (copiar, «Compartir por WhatsApp» con `wa.me`, sin plantilla de Meta), quejas sin relato en la lista, detalle con relato, estado, respuesta, nota y bitácora |
| `/buzon/<clave>` | `BuzonPublico.jsx` (pública, fuera del middleware) | Contar lo que pasó sin nombre (opcional), recibir folio y clave, consultar el estado |
| `/empleado/panel/encuestas` | `PoliticaAcuse.jsx` (en «Mis encuestas») | Leer la política publicada y «La leí y la conozco» |

`Nom035Seccion.jsx` agrega la navegación Resultados · Expediente · Buzón dentro de la pestaña NOM-035. Lógica pura en
`src/lib/clima/inspeccion.mjs` (textos, colores del mapa, validaciones de formulario, liga de WhatsApp).

## Calidad
- Táctil ≥ 44 px y texto ≥ 13 px en las piezas nuevas; sin scroll horizontal de página a 390 px (el mapa de calor se
  vuelve tarjetas). Gráficos de barras con `role="img"` y `aria-label`; celdas del mapa con texto alterno.
- Pruebas: `scripts/test-clima-inspeccion.mjs` (paso propio en `ci-dev.yml`) y `scripts/verify-clima-inspeccion.mjs`
  (Playwright con backend simulado, 1440 y 390).
