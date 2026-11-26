# Clima · canales, vista del jefe y «¿Cómo te fue hoy?» (frontend, 26/11/2026, agente clima1)

Reglas y API en el backend: `docs/clima-nom035.md`, «Canales, avisos y vista del jefe» (migración
`20261219_clima_canales_jefe.sql`). Lógica pura de pantalla en `src/lib/clima/canales.mjs` (probada en
`scripts/test-clima-canales.mjs`, paso propio del CI «Clima — canales…»). Verificación en navegador con backend
simulado a 1440 y 390 px: `scripts/verify-clima-canales.mjs`.

## Lanzar (`components/clima/Lanzar.jsx`)
- **Recordatorios:** con la migración, botones «El día del cierre / 1 / 2 / 3 / 5 / 7 días antes» (máximo 3; el cuarto
  queda deshabilitado), la fecha en que saldrá cada uno y aviso si alguno cae el día que abre o antes. Se manda
  `recordatorios` y `recordatorio_dias: null`. Sin la migración (`/inicio` → `canales.migracion: false`) se ve el selector
  de siempre («A los N días») y no se manda `recordatorios`.
- **WhatsApp:** se puede elegir; dice que se contesta solo en la liga personal y nada se guarda en el chat. Si el número
  de notificaciones no está configurado: «WhatsApp aún no está configurado: mientras tanto se manda por correo».
- **Al checar salida (app del empleado):** «¿Cómo te fue hoy?», solo clima; «El reloj compartido no cambia».

## «¿Cómo te fue hoy?» (`components/clima/PulsoSalida.jsx`)
- En el **Inicio del empleado**, solo cuando la jornada de hoy está cerrada (`salidaRegistrada`: hay registros y todos
  tienen salida). Al checar, la app regresa sola al Inicio; la pregunta va aparte de la checada y si falla no aparece.
- 5 botones de un toque (≥ 72 px de alto, cara + texto de 13 px, `aria-label` «4 de 5: Bien») y «Saltar». Manda solo
  `{ id_campania, valor }` o `{ id_campania, saltar: true }`; la persona sale de la sesión. Tras contestar: «¡Gracias! Tu
  respuesta es anónima…». Recuerda en el teléfono que ya la cerró hoy (además de la marca del servidor).
- El reloj compartido (kiosco) no se tocó (decisión documentada en el backend).
- Tablero de RH: tarjeta `PulsoDiarioTarjeta` con respuestas, promedio, % bien/muy bien y distribución (sin serie por día).

## Vista del jefe y «Mis acciones»
- «Mis encuestas» (app `/empleado/panel/encuestas` y panel `/panel/mis-encuestas`) agrega, si aplica:
  - **Clima de mi equipo** (`EquipoClima.ListaEquipo`): mediciones cerradas con respuestas de su equipo. Si la persona no
    tiene equipo, el servidor responde 403 y la sección no aparece.
  - **Mis acciones del plan de clima** (`MisAcciones`): las que tiene como responsable; cambia su estado ahí.
- `…/encuestas/equipo/<id>` (`vistaDeRuta`): % favorable y eNPS del equipo, por tema contra la empresa
  («+6 vs. empresa»), comentarios del equipo, aviso de equipo chico (menos de 5) y el **plan de su equipo**: agregar
  acción (texto, tema, fecha; él queda como responsable) y cambiar estado. El cuerpo nunca lleva empresa ni ficha.
- RH ve en su plan la etiqueta «Plan del equipo de <jefe>» en esas acciones.

## Contestar en el celular (`components/clima/Contestar.jsx`)
- Opciones como `radiogroup`/`radio` (`aria-checked`) en vez de botones con `aria-pressed`; la pregunta abierta sigue en
  `group`.
- «Pregunta X de Y» con `aria-live` y el % contestado para lectores de pantalla; al cambiar de pregunta el foco pasa al
  texto de la pregunta.
- Avance: «Tu avance se guarda solo en este teléfono…», «✓ Avance guardado…» tras cada respuesta y «Seguimos donde te
  quedaste» al volver.
- Al final, si falta algo: «Te faltan N preguntas» + botón «Ir a la que falta».
- `scripts/verify-clima.mjs` y `verify-clima-aviso.mjs` ahora tocan las opciones por rol `radio`.
