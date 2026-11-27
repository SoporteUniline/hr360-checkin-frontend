# Permisos · «Respuestas de WhatsApp sin aplicar»

29/12/2026. Frontend de la aprobación de permisos y vacaciones por WhatsApp. El flujo completo está en
`hr360-checkin-backend/docs/aprobacion-whatsapp.md`.

## Qué ve RH
La tarjeta va en el panel de Permisos (`/panel/permisos`), debajo de las estadísticas. Se llama «Respuestas de WhatsApp sin
aplicar (N)» y lista las solicitudes que siguen Pendiente en ADAMIA, pero a las que quien autoriza contestó por WhatsApp
algo que parece aprobar o rechazar. Cada fila muestra:
- empleado, tipo (o «Vacaciones») y fechas;
- «Parece que la aprobó» o «Parece que la rechazó», con la etiqueta de confianza (alta, media o baja) y el aviso «Hay
  respuestas distintas» cuando hay respuestas contradictorias;
- la última respuesta: fecha y hora en la zona de la empresa, quién y el texto.

«Aplicar aprobación» y «Aplicar rechazo» abren una confirmación. Lo que se aplica es la **misma acción de la tabla**
(`permisosApi.actualizarEstado` → `PATCH /checador/solicitudes-permiso/:id/estado`). Nada se aplica solo. Después la
tarjeta, la tabla y el calendario se actualizan.

La tarjeta muestra 3 filas y el botón «Ver las N» despliega el resto. No se muestra si el servidor no pudo revisar (sin
número de notificaciones), si no hay respuestas o si la sesión es de un empleado (403).

## Código
| Archivo | Qué contiene |
| --- | --- |
| `src/app/panel/permisos/RespuestasWhatsapp.jsx` | La tarjeta (SWR con `GET /checador/solicitudes-permiso/whatsapp/sin-aplicar?dias=30[&empresa=ID]` según la unidad elegida) |
| `src/lib/aprobacion-whatsapp/presentacion.mjs` | Reglas puras: fechas, rango, momento, confianza, textos de la confirmación, cuándo mostrar y consulta |

## Pruebas
- `scripts/test-aprobacion-whatsapp.mjs`: corre en el paso «Asistencias — cálculo de horas y exportación» del CI.
- `scripts/verify-aprobacion-whatsapp.mjs`: Playwright con el backend simulado, a 1440 y 390. Revisa:
  - título con N y despliegue de las filas;
  - textos y confianza;
  - que Cancelar no mande nada;
  - el PATCH normal al aprobar y al rechazar;
  - que a 390 no haya scroll horizontal y que los botones midan al menos 40 px;
  - que la tarjeta se oculte sin número de notificaciones.

  Corre en el paso «Permisos — respuestas de WhatsApp sin aplicar» del CI y reusa la compilación del paso de comunicados.
