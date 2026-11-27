# Centro de comunicados (27/11/2026) — frontend

Maqueta aprobada por el dueño (Main, Redactar, Seguimiento, Popup, Automáticos, AppFeed, AppDetalle, Correo, Comentarios,
Moderación) + portada del muro y publicaciones fijadas. Reglas y API: `docs/comunicados.md` del backend
(`/api/checador/comunicados`, módulo `comunicados`).

| Pantalla | Ruta | Componente |
|---|---|---|
| **Muro del panel** (primera pantalla después de entrar; «Muro» arriba del menú; primera pestaña de Comunicados) | `/panel/muro` (`/panel` y `/panel/comunicados` llevan aquí) | `MuroPanel.jsx` + `TarjetaMuro.jsx`, `Publicacion.jsx`, `Comentarios.jsx`, `EditorPortada.jsx` |
| Pestaña «Administrar»: lista con resumen, filtros y «Por aprobar» | `/panel/comunicados/administrar` (menú Comunicados › Administrar) | `components/comunicados/PanelComunicados.jsx` |
| Redactar / editar (borrador o programado) | `/panel/comunicados/nuevo`, `/panel/comunicados/[id]/editar` | `Redactar.jsx` + `SelectorAudiencia.jsx` |
| Seguimiento de lectura | `/panel/comunicados/[id]` | `Seguimiento.jsx` |
| Automáticos | `/panel/comunicados/automaticos` | `Automaticos.jsx` |
| Moderar el muro + reglas + portada | `/panel/comunicados/moderacion` | `Moderacion.jsx` + `EditorPortada.jsx` |
| Aviso emergente (panel y Mi espacio) | layout del panel y `EmployeeShell` | `AvisoEmergente.jsx` |
| Muro (portada, por confirmar, fijadas, push, preferencias) | `/empleado/panel/muro` (barra inferior «Muro») | `Muro.jsx`, `Publicacion.jsx`, `AvisosPush.jsx` |
| Publicación: confirmar de leído y comentarios | `/empleado/panel/muro/[id]` | `DetallePost.jsx`, `Comentarios.jsx` |
| Publicar (empleado → pendiente de aprobación; jefe → también a su equipo) | `/empleado/panel/muro/publicar` | `NuevaPublicacion.jsx` |
| Liga de correos y push | `/mi-espacio/comunicados/<id>` (middleware) | empleado → detalle; panel → `/panel/muro` |

## Muro del panel (27/11/2026, pedido del dueño)
- **Primera pantalla**: el login, el middleware y el reloj mandan a `/panel`; `src/lib/inicioPanel.mjs` decide: el muro
  (`/panel/muro`) si la empresa tiene el módulo `comunicados` y el usuario puede verlo (dueño, RH o acceso con «ver» o
  «editar»); si no, el Monitor, como antes. El aviso de encuestas por contestar (Clima) que estaba en el Monitor también
  sale arriba del muro.
- **Menú**: «Muro» (ícono periódico) es la primera entrada, arriba de «Resumen»; se oculta sin el módulo o sin permiso.
  El grupo Comunicados queda con Administrar / Automáticos / Moderar el muro. **Pestañas** en las cuatro vistas:
  Muro | Administrar | Automáticos | Moderar el muro (`PestanasComunicados.jsx`, ligas con `aria-current`).
- **Vista tipo Facebook**: columna centrada de 680 px (teléfono: todo el ancho), portada a todo lo ancho con «Cambiar
  portada» (quien edita; el mismo editor de Moderar, en una ventana), caja «¿Qué quieres comunicar?» con el avatar que
  abre Redactar, fijadas primero, tarjetas con avatar, nombre y fecha, contenido, fotos (mosaico + visor), YouTube, PDF,
  fila de conteos y barra «Me gusta» / «Comentar». RH ve además el avance («30 de 42 confirmaron», barra en los de
  confirmación) con «Ver seguimiento», y el menú ⋯ con Fijar / Desfijar (máx. 3) y Archivar (con confirmación).
- **Mismos componentes en los dos muros** (sin copias): `useFeedMuro` (datos y «Me gusta» optimista), `ListaMuro`,
  `Portada`, `TarjetaMuro` (tarjeta + hilo) y `Publicacion`/`Comentarios` con una **fuente** (`fuenteMuro("empleado")` →
  `/mi/...`; `fuenteMuro("panel", empresa)` → `/muro/...?empresa=`). En el panel no hay detalle de Mi espacio ni
  «Reportar» (RH modera); RH comenta como sí mismo («Laura Ríos · Recursos Humanos»).
- **Comentarios en la tarjeta (los dos muros)**: debajo de cada publicación los 2 últimos comentarios
  (`comentarios_recientes` del backend), «Ver N comentarios más» y «Escribe un comentario…» con el avatar; al tocarlo se
  abre el hilo completo ahí mismo (responder, «Me gusta», borrar el propio) con el cursor en la caja. En Mi espacio el
  detalle (confirmar de leído y el hilo) sigue en `/empleado/panel/muro/<id>`.
- **Solo consulta** (`comunicados: ver`): ve el muro, el seguimiento y los comentarios; sin caja para publicar, «Me
  gusta», comentar, ⋯ ni «Cambiar portada» (el servidor también lo niega: 403 `PERMISO_SOLO_VER`).
- **Caché** (hotfix #267, también en el panel): el muro y los comentarios se piden de nuevo completos cada vez que se
  montan (`revalidateOnMount` + `revalidateAll`; el muro además al volver a la pestaña).

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
- Muro del panel, pestañas y primera pantalla: también en `scripts/test-comunicados.mjs` (`fuenteMuro`, `pestanaDe`,
  `avanceSeguimiento`, `rutaInicioPanel`). `verify-modulos` revisa que «Muro» sea la primera entrada del menú y que sin
  el módulo no esté y `/panel` lleve al Monitor; `verify-monitor` entra directo a `/panel/monitor`; `verify-clima-aviso`
  ve el aviso de encuestas en la primera pantalla (el muro).
- Navegador: `scripts/verify-comunicados.mjs` (backend simulado con las formas reales del backend; 1440 y 390; sin
  scroll horizontal, táctil ≥ 44 px, texto ≥ 13 px; aviso que no se cierra al fondo; acceso de solo consulta; liga del
  correo). `COMUNICADOS_DEV=1` lo corre con `next dev`. En CI: paso «Centro de comunicados — verificación en navegador».
- Límites: el envío real de Web Push no se prueba en navegador (Chromium sin interfaz niega notificaciones; se revisa
  la tarjeta). La pantalla de seguimiento para jefes (lo que publicaron a su equipo) queda para R2.
