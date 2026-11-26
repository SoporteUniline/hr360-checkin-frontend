# Plantillas de WhatsApp · pantalla del administrador de ADAMIA

> 26/11/2026. `/dashboard/plantillas-whatsapp` (menú de Admin y buscador ⌘K: «Plantillas de WhatsApp»). Backend:
> `/api/checador/whatsapp-plantillas` (solo administrador de ADAMIA); reglas, catálogo y API en
> `docs/plantillas-whatsapp.md` del backend. La llave de Zernio nunca llega al navegador.

## Qué hay en la pantalla
- **En Zernio**: elegir el número (notificaciones / reclutamiento), filtrar por categoría, estado (chips con su número:
  Aprobada, En revisión, Rechazada…) y texto. Tarjetas con nombre, estado, categoría, idioma, variables, inicio del texto y
  el motivo si Meta la rechazó.
- **Detalle** (al tocar una tarjeta): estado, motivo de rechazo, calidad, si es del catálogo del sistema, ejemplos,
  vista previa tipo burbuja de WhatsApp, **Editar** (solo aprobada/rechazada/pausada; vuelve a revisión), **Crear versión
  nueva** (copia con `…_v2`) y **Borrar** (escribir el nombre para confirmar; Meta no deja reutilizarlo 30 días).
- **Nueva plantilla / Editar**: nombre, categoría e idioma (fijos al editar), encabezado de texto, cuerpo con «Agregar
  variable» ({{n}} siguiente), un ejemplo por variable (se agregan/quitan solos), pie y botones (respuesta rápida, enlace,
  llamar). Vista previa en vivo. Las reglas de Meta se revisan antes de mandar (no se envía lo que Meta rechazaría) y el
  error de Zernio/Meta se muestra tal cual.
- **Catálogo del sistema**: lo que el código manda, por módulo, con Falta / Difiere / Coincide, el estado de Meta, las
  diferencias (idioma, variables, texto), avisos (p. ej. Meta la reclasificó a MARKETING) y «Ver texto y variables».
  **Enviar a aprobación las que faltan (N)**: confirma, manda solo las que faltan (el servidor vuelve a revisar Zernio) y
  muestra el resumen; con 0 faltantes el botón se apaga. «Revisar y crear» abre el formulario con la plantilla del sistema.
- **Bitácora**: quién creó, editó, borró o envió y con qué resultado (aviso si falta la migración 20261223).

## Código
- `src/lib/whatsapp/plantillasMeta.mjs`: reglas de Meta (mismas que el servidor), vista previa, ejemplos, versión nueva,
  filtro, cuerpo para la API, chips y resumen. Pruebas: `scripts/test-plantillas-whatsapp.mjs` (en el CI).
- `src/components/whatsapp/plantillas/`: `PanelPlantillas`, `FormularioPlantilla`, `DetallePlantilla`, `CatalogoSistema`,
  `BurbujaWhatsapp`, `estilos.js` (campos y botones de 44 px; la X del diálogo se agranda a 44 px).
- Navegador: `scripts/verify-plantillas-whatsapp.mjs` (backend simulado, 1440 y 390: sin scroll horizontal, objetivos
  ≥ 44 px, texto ≥ 13 px). Uso: `NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build` y luego
  `CAPTURAS=<carpeta> PLAYWRIGHT_MODULE_PATH=… node scripts/verify-plantillas-whatsapp.mjs`.
