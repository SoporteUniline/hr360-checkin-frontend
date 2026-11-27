# Estilo favorito del dueño: mosaico de módulos (27/11/2026)

> El dueño: «estos diseños me super mega encantaron, apúntalo». Es la **referencia visual por omisión** para
> presentar módulos y funciones en la página pública, en portadas de módulo y en tarjetas de resumen dentro del panel.
> Antes de inventar otro estilo para una pantalla de presentación, parte de este.

Implementación de referencia: `src/components/landing/home/MosaicoModulos.jsx` (componente de servidor) + `landing-home.css`
(clases `.mz-*`); lista y textos en `mosaico.mjs`, mini pantallas en `MinisMosaico.jsx`, datos vivos y ciclos en
`DatosVivos.jsx`, entrada al hacer scroll en `animaciones.js`, botón del celular en `MosaicoPlegable.jsx`.

## Qué lo hace funcionar
1. **Mosaico tipo «bento»**: rejilla de tarjetas grandes con esquinas muy redondeadas (≈ 28 px), fondo gris muy claro
   (`#F3F5FA` aprox.) y una tarjeta protagonista más ancha (`.mz-g4`) con degradado azul ADAMIA → violeta → lila claro
   hacia abajo. Las demás ocupan `.mz-g2`; una banda oscura completa (`.mz-g6`, azul marino casi negro) para Adamia AI.
2. **Encabezado de cada tarjeta**: título grande en la tipografía de títulos (≈ 30 px, peso fuerte, tracking cerrado),
   etiqueta opcional en mayúsculas pequeñas separada por una barra (p. ej. «RECIBOS FIRMADOS»), y la **submarca**
   «**adamia** nómina.» / «**adamia** time.» / «**adamia** check.» (palabra *adamia* en negritas, módulo en regular,
   punto final). Debajo, 2–3 líneas de beneficio concreto, sin adjetivos vacíos.
3. **Botón flecha** circular (↗) arriba a la derecha que lleva a la función; en la tarjeta protagonista es lima/amarillo
   (`#D9F26B` aprox.) para contrastar con el azul; en las claras, blanco con borde fino.
4. **Mini pantalla real** dentro de cada tarjeta (`.mz-mini`): un recorte de la interfaz con datos verosímiles (total a
   pagar y avance de firmas; jornada con comida a tiempo; rostro verificado + ubicación + cronómetro en jornada;
   checklist con avance; contrato firmado con trazo de firma; chat de la IA citando el artículo). Tarjeta blanca, sombra
   suave, filas con etiqueta gris a la izquierda y valor en negritas a la derecha, barras de avance azules, chips
   pequeños redondeados, botón primario azul de ancho completo.
5. **Movimiento discreto**: las mini pantallas **flotan** despacio (`.flota`, 5–7 s, desfasadas entre sí), los números
   cuentan hacia arriba (`Contador`), el cronómetro corre, y al pasar el cursor la tarjeta sube 4 px y su mini pantalla
   se acerca (curva `cubic-bezier(.2,.7,.2,1)`). Todo se pausa fuera de pantalla y se queda quieto con
   `prefers-reduced-motion`.
6. **Datos de demostración** creíbles y ficticios (Ana Torres, Beto Ríos…), nunca nombres reales del equipo.
7. **Móvil**: una sola columna, mismas tarjetas, padding 22/20 px, títulos 26 px; las mini pantallas conservan su tamaño
   legible.

## Cómo reutilizarlo
- Página pública: cada módulo nuevo que llegue a producción entra al mosaico con su submarca, beneficio, flecha y mini
  pantalla (regla de `docs/pagina-inicio.md`).
- Portadas de módulo / Centro de ayuda / resúmenes del panel: misma tarjeta (radio, gris claro, mini pantalla, flecha),
  sin el degradado salvo para la tarjeta principal.
- Accesibilidad: la mini pantalla es decorativa (`aria-hidden`) y el texto de la tarjeta explica lo mismo; contraste
  ≥ 4.5:1 también sobre el degradado.

## Mosaico completo (27/11/2026)
Pedido del dueño: «pon todos los módulos con el estilo que pusiste de los demás, bien animado». 24 tarjetas (las 9 de
antes + 15) en 5 grupos con subtítulo: Nómina y dinero · Tiempo · Personas · Talento y cultura · Plataforma.
- Anchos `.mz-g2` / `.mz-g3` / `.mz-g4` / `.mz-g6`; cada grupo llena filas completas de 6 columnas. Tarjeta ancha clara
  (`.mz-ancha`) para Aguinaldos y finiquitos. Solo Nómina lleva el degradado.
- Títulos en peso 700, beneficio a 16 px, color secundario `--body` (#4b5270); contraste ≥ 4.5:1 medido en la prueba.
- Ciclos pequeños (`Ciclo`): la solicitud se aprueba, el monitor suma llegadas, otra búsqueda en el Centro de ayuda…
  Corren solo a la vista; el HTML y «reducir movimiento» muestran el último estado. La ruta del mapa se dibuja en CSS.
- Celular: 8 tarjetas (`movil: true`) y «Ver todos los módulos (24)»; sin JavaScript se ven todas.
- Regla: módulo nuevo en producción = renglón en `src/lib/sitio/modulos.js` + tarjeta en `mosaico.mjs` (con su guía o
  página real y textos verificados). `scripts/test-mosaico.mjs` revisa que coincidan con la lista, el catálogo y los
  enlaces; `scripts/verify-landing.mjs` lo prueba en navegador.
- No entra: Inducción digital (no está en producción). Vacaciones dice «el jefe aprueba desde su celular» (Solicitudes
  de mi equipo); no promete aprobación por WhatsApp en la tarjeta.
