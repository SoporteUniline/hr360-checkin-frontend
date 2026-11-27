# Centro de comunicados (27/11/2026) — frontend

Maqueta aprobada por el dueño (Main, Redactar, Seguimiento, Popup, Automáticos, AppFeed, AppDetalle, Correo, Comentarios,
Moderación) + portada del muro y publicaciones fijadas. Reglas y API: `docs/comunicados.md` del backend
(`/api/checador/comunicados`, módulo `comunicados`).

| Pantalla | Ruta | Componente |
|---|---|---|
| Lista con resumen, filtros y «Por aprobar» | `/panel/comunicados` (menú Comunicados) | `components/comunicados/PanelComunicados.jsx` |
| Redactar / editar (borrador o programado) | `/panel/comunicados/nuevo`, `/panel/comunicados/[id]/editar` | `Redactar.jsx` + `SelectorAudiencia.jsx` |
| Seguimiento de lectura | `/panel/comunicados/[id]` | `Seguimiento.jsx` |
| Automáticos | `/panel/comunicados/automaticos` | `Automaticos.jsx` |
| Moderar el muro + reglas + portada | `/panel/comunicados/moderacion` | `Moderacion.jsx` |
| Aviso emergente (panel y Mi espacio) | layout del panel y `EmployeeShell` | `AvisoEmergente.jsx` |
| Muro (portada, por confirmar, fijadas, push, preferencias) | `/empleado/panel/muro` (barra inferior «Muro») | `Muro.jsx`, `Publicacion.jsx`, `AvisosPush.jsx` |
| Publicación: confirmar de leído y comentarios | `/empleado/panel/muro/[id]` | `DetallePost.jsx`, `Comentarios.jsx` |
| Publicar (empleado → pendiente de aprobación; jefe → también a su equipo) | `/empleado/panel/muro/publicar` | `NuevaPublicacion.jsx` |
| Liga de correos y push | `/mi-espacio/comunicados/<id>` (middleware) | empleado → detalle; panel → `/panel/comunicados` |

## Decisiones
- Módulo `comunicados` en `src/lib/modulos/catalogo.mjs` (misma clave que el backend) → área de permisos. «Ver» = solo
  consulta (se ocultan publicar, aprobar, fijar, recordar, avisado en persona, archivar, moderar, reglas y portada);
  «Editar» = todo (`usePuedeEditar`). La plantilla «Recursos Humanos» trae `comunicados: editar`.
- Audiencia: sucursal, área y puesto por **nombre** (como en la ficha) y personas por `id_empleado`, desde
  `GET /audiencia/opciones`; conteo en vivo con `GET /audiencia/previa` (espera 400 ms y no pide la audiencia vieja).
- Archivos: `FormData` con `datos` (JSON) + `fotos` + `pdf`, siempre con `Content-Type: multipart/form-data` (la instancia
  de axios manda JSON por omisión y convertiría el FormData). Aviso inmediato de 10 fotos JPG/PNG/WebP de 8 MB y PDF de
  15 MB; el servidor valida por bytes. Errores 422 `VALIDACION`: el mensaje de cada campo junto a su campo.
- Fechas: `publicar_en` y `expira_en` se mandan como instante ISO (hora de quien escribe); `fecha_evento` solo el día.
- Aviso emergente: Radix Dialog que ignora el clic al fondo; Escape solo cierra los normales. Normal: «Entendido» =
  `POST …/posponer` (lo marca visto). Confirmación: casilla + «Confirmar de leído» (manda `dispositivo`) o «Recordarme
  más tarde» (4 h). Panel: `/popup`, `/popup/:id/confirmar|posponer`; Mi espacio: `/mi/popup`, `/mi/:id/confirmar|posponer`.
- Texto de las personas siempre como texto (`TextoPlano`, sin `dangerouslySetInnerHTML`). YouTube: miniatura y el
  reproductor `youtube-nocookie.com/embed/<id>` solo al tocar «Reproducir» (`referrerPolicy` estricto para que cargue).
- Me gusta optimista (`useMeGusta`): cambia al instante, se ajusta con la respuesta y regresa si falla.
- Web Push: `public/comunicados-push-sw.js` con alcance propio `/comunicados-push/` para no tocar el registro de «/»
  (`offline-clock-sw.js` se retira solo y `RetireOfflineWorker` lo actualiza). La tarjeta solo aparece si
  `GET /mi/push/clave` dice `habilitado` y el navegador lo soporta; no en la app nativa (push nativo = R2).
- Liga `/login?next=/mi-espacio/comunicados/<id>`: el middleware la protege (sin sesión → login con `next`) y la
  redirige según el tipo de usuario (`destinoLiga`).
- Barra inferior del empleado: «Muro» entre Inicio y Asistencia (solo con el módulo activo).

## Pruebas
- Reglas de presentación, liga y service worker: `scripts/test-comunicados.mjs` (CI).
- Navegador: `scripts/verify-comunicados.mjs` (backend simulado con las formas reales del backend; 1440 y 390; sin
  scroll horizontal, táctil ≥ 44 px, texto ≥ 13 px; aviso que no se cierra al fondo; acceso de solo consulta; liga del
  correo). `COMUNICADOS_DEV=1` lo corre con `next dev`. En CI: paso «Centro de comunicados — verificación en navegador».
- Límites: el envío real de Web Push no se prueba en navegador (Chromium sin interfaz niega notificaciones; se revisa
  la tarjeta). La pantalla de seguimiento para jefes (lo que publicaron a su equipo) queda para R2.
