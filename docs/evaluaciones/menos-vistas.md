# Evaluaciones: menos vistas (20/11/2026)

Propuesta «menos vistas» aprobada por el dueño (lienzo del 20/11/2026). Antes: 4 entradas en el menú
(Resumen, Campañas, Plantillas, Tablero) y hasta 10 pestañas iguales para todos dentro del módulo.
Ahora: **una entrada «Evaluaciones»** y cada quien ve sus pestañas.

| Quién (lo decide el servidor en `/capabilities`) | Pestañas | Entra a |
|---|---|---|
| RH (`flags.canViewCampaigns` y puede administrar) | Campañas · Plantillas · Por responder (solo si tiene evaluaciones asignadas) + engrane de Ajustes | Campañas |
| Dirección (`canViewCampaigns`, solo consulta) | Campañas | Campañas |
| Jefe | Por responder · Mi equipo · Mis resultados | Por responder |
| Colaborador | Por responder · Mis resultados | Por responder |

- RH = todo usuario del panel (Admin, Recruiter, User) o quien tenga el permiso «rh» del módulo; así lo
  resuelve el backend (`modules/performance/services/access.js`). No cambió.
- **La campaña en una pantalla** (`/panel/evaluaciones/campanas/:id`): arriba los 5 pasos (Preparar,
  Responder, Revisar, Publicar, Planes) con su avance; abajo una fila por persona con respuestas
  («2 de 3 · falta su jefe»), resultado, planes y «Abrir». Al abrir se ve su resultado, sus respuestas por
  perspectiva y su plan de acción. Debajo, los indicadores de esa campaña y «Cada evaluación» (detalle por
  evaluador, plegado).
- Los pasos y las filas se calculan en `src/lib/evaluaciones/avance.mjs` solo con lo que manda el servidor
  (campaña, `/results?campaignId=` y `/plans?campaignId=`); no deciden permisos ni calificaciones.
  El paso «Planes» nunca se marca terminado: un plan no es obligatorio para todos.
- «Resumen» y «Tablero» eran la misma vista: ahora son el bloque de indicadores arriba de la lista de
  campañas (todas) y dentro de cada campaña (solo esa), con «Exportar CSV».
- «Resultados» (lista) y «Seguimiento» (planes sueltos) ya no son vistas aparte. Los planes se crean y se
  actualizan dentro del resultado de la persona (exportar planes sigue ahí para RH y jefes).
- Las rutas viejas `/tablero`, `/resultados` y `/seguimiento` (panel y portal del empleado) redirigen a la
  entrada del módulo (`next.config.mjs`). `/resultados/:campaña/:persona` sigue igual.
- El selector de empresa (solo si hay más de una) pasó a la barra de pestañas.
- Al guardar, la vista se refresca sin desmontarse (antes, crear un plan dentro del resultado recargaba
  la pantalla y cerraba el siguiente formulario).
- Sin cambios de backend ni de reglas.

Pruebas: `scripts/test-evaluaciones.mjs` (pasos y filas) y `scripts/verify-evaluaciones-api.cjs`
(navegador: pestañas por rol, redirecciones, campaña en una pantalla, alta de plan y avance dentro del
resultado). La prueba de navegador estaba rota en dev: bloqueaba el backend porque suponía que vivía en el
mismo dominio, y dejaba encendido `next-server` al terminar; ambas cosas se corrigieron.

Pendientes:

- Pasar `evaluaciones.css` (913 líneas) a Tailwind con modo oscuro.
- Error de hidratación de React (#418) en 1 de cada 4 cargas de **cualquier** pantalla del panel (medido
  en dev sin estos cambios: activos 10/40, departamentos 12/40, evaluaciones 11/40). No es de este
  módulo; la prueba lo cuenta y avisa sin ocultar otros errores.
- Decisión de negocio sin confirmar: al cerrar una campaña incompleta, ¿RH quita al evaluador que falta y
  se recalcula?
