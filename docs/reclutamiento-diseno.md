# Reclutamiento: entrega de diseño

Rama: `ChatGPT`. **Reclutamiento y selección** es un grupo propio del menú principal, con siete vistas y dashboard en `/panel/reclutamiento`. También aparece en el buscador global y tiene navegación horizontal en móvil. Respeta la autorización de `/panel` y la suscripción existentes; no introduce un bypass de acceso.

## Vistas independientes

| Vista          | Ruta                                  | Uso                                                                                          |
| -------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| Dashboard      | `/panel/reclutamiento`                | Indicadores, distribución por etapa, postulaciones por día, pendientes, agenda y movimientos |
| Vacantes       | `/panel/reclutamiento/vacantes`       | Administrar, filtrar, crear y descargar vacantes                                             |
| Candidatos     | `/panel/reclutamiento/candidatos`     | Buscar perfiles y abrir expedientes                                                          |
| Selección      | `/panel/reclutamiento/seleccion`      | Tablero por etapas en escritorio; tarjetas y filtros en móvil                                |
| Entrevistas    | `/panel/reclutamiento/entrevistas`    | Programar, reprogramar, completar y cancelar citas                                           |
| Contrataciones | `/panel/reclutamiento/contrataciones` | Ofertas y altas de prueba completadas                                                        |
| Catálogos      | `/panel/reclutamiento/catalogos`      | Sucursales de ejemplo y modalidades independientes                                           |

Cada vacante tiene `/vacantes/[id]` y cada candidato `/candidatos/[id]`, bajo la misma ruta del módulo. Se pueden abrir directamente y recargar. Los enlaces del dashboard conservan el filtro de vacante, etapa o periodo aplicable. Los expedientes son páginas completas.

Los indicadores distinguen **estado actual** (vacantes publicadas, candidatos pendientes y distribución por etapa) de **actividad en el periodo** (postulaciones por fecha de recepción y contrataciones por fecha de finalización). El filtro de 7/30/90 días no oculta pendientes antiguos. La gráfica permite consultar las cifras por fecha.

## Alcance navegable

- Dashboard con filtros, indicadores y accesos al listado correspondiente.
- Vacantes con búsqueda sobre todo el conjunto antes de paginar, filtros por estado/modalidad, contadores y descarga CSV de los resultados filtrados.
- Alta en tres pasos: puesto → formulario → publicación. Guardado de borradores, edición, duplicado, pausa, cierre y reapertura con revisión.
- Sucursal y modalidad independientes, mediante IDs. El catálogo de prueba permite agregar modalidades e indicar si requieren sucursal. Las sucursales actuales se reutilizarán en la integración.
- Descripción con negritas, cursiva, subrayado, encabezado y listas. El contenido se guarda como árbol restringido, no como HTML arbitrario.
- Preguntas cortas/largas, una/varias opciones, número, fecha y archivo. Orden por arrastre, teclado o botones. Los datos base de contacto no se eliminan; el resto se puede configurar. Máximo 30 preguntas.
- Expediente con respuestas, etapa, notas, entrevistas e historial. Preparación de contratación: fecha, sucursal y lista de requisitos. Completar una contratación de prueba no crea un empleado.
- Selección por arrastre en escritorio y selector de etapa accesible también en móvil. Mover a Contratado abre la revisión de contratación: no evita la lista de requisitos.
- Agenda con estados Próximas, Por registrar, Realizadas y Canceladas; búsqueda, filtro por vacante, paginación y CSV. Las entrevistas se guardan como citas estructuradas y cada cambio queda en el historial del candidato.
- Publicación con enlace de prueba, configuración y vistas previas de correos.
- Página para postulantes en `/reclutamiento-demo/[workspaceId]/[vacancyId]`, adaptada a móvil, sin indexación ni los scripts globales de mapas/Meta. Permite simular una postulación y verla en el panel.
- Estados de carga, registro no disponible, filtros vacíos, validaciones y errores de almacenamiento. Confirmación de cambios sin guardar al cerrar el formulario de vacante o usar el botón de salida del seguimiento del candidato.

## Límites explícitos de esta fase

Esta entrega utiliza **solo datos ficticios y almacenamiento local del navegador**, con un aviso visible. No consulta catálogos reales ni escribe en la API. No envía correos, invitaciones, archivos ni altas de empleados. No incluye nómina.

El espacio de pruebas del panel se separa por empresa/usuario autenticado. Un identificador aleatorio permite abrir su vista de prueba en otra pestaña del mismo navegador. **El enlace no comparte los datos entre dispositivos o navegadores**. No se debe enviar a postulantes reales. Las pruebas permanecen al recargar, pero se pierden al borrar el almacenamiento del sitio. No reemplaza permisos ni persistencia del servidor.

Los archivos de ejemplo conservan solo nombre y tamaño, con validación visual de extensión y límite de 5 MB. Sus bytes no se almacenan; por eso no se ofrece una descarga ficticia de CV. Las descargas reales en esta fase son los CSV de vacantes/candidatos/contrataciones/entrevistas de prueba; sus celdas se protegen contra fórmulas.

La página real `/vacante/[slug]`, `/bolsa-de-trabajo` y los servicios existentes `/vacantes`, `/postulaciones` y OTP permanecen independientes. No se sustituyó su formulario ni su lógica.

## Organización

| Responsabilidad                                | Archivo/directorio                                              |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Layout protegido y páginas                     | `src/app/panel/reclutamiento/`                                  |
| Navegación compartida                          | `src/components/reclutamiento/navigation.js`                    |
| Estado compartido entre vistas                 | `RecruitmentModule.jsx` y `RecruitmentContext.jsx`              |
| Entrada pública de prueba                      | `src/app/reclutamiento-demo/[workspaceId]/[vacancyId]/page.jsx` |
| Vistas y componentes                           | `src/components/reclutamiento/`                                 |
| Reglas y ejemplos del diseño                   | `src/lib/reclutamiento/model.js`                                |
| Adaptador local, sin HTTP                      | `src/lib/reclutamiento/demoStore.js`                            |
| Carga, errores y sincronización entre pestañas | `src/hooks/useReclutamientoDemo.js`                             |
| Convenciones del módulo                        | `src/components/reclutamiento/AGENTS.md`                        |
| Prueba del recorrido con API ficticia          | `scripts/verify-recruitment-design.cjs`                         |

Las preguntas conservan su ID al reordenar. Cada postulación guarda etiquetas, tipo y respuesta de la versión utilizada; editar el formulario no modifica las respuestas anteriores. La versión local es una demostración de esa regla, no sustituye el versionado transaccional del backend.

El layout mantiene un único adaptador y las operaciones compartidas al cambiar de página. Los listados de vacantes/candidatos/contrataciones conservan sus filtros durante la navegación del módulo. Las pruebas anteriores sin `interviews` se leen con una agenda vacía, conservando vacantes, candidatos, notas e historial; no se reinician ni se convierten textos históricos en citas inventadas.

## Siguiente entrega con Luis

1. Confirmar tablas existentes de vacantes/postulaciones y el contrato de la guía de Reclutamiento. Reutilizar lo existente; no crear un esquema paralelo sin revisar el backend.
2. Resolver Sucursal con el catálogo de la empresa y Modalidad con un catálogo independiente. Acordar permisos, estados, IDs y formato de descripción enriquecida.
3. Definir consultas con búsqueda/filtros/paginación y conteos en servidor; CRUD de vacantes, publicación, formulario versionado, postulaciones, respuestas, notas e historial. Incluir consultas agregadas para el dashboard y entrevistas relacionadas al candidato, con fecha/hora, duración, medio, entrevistador y estado. Acordar zona horaria y transiciones.
4. Habilitar la URL pública real dentro de `/vacante/[slug]`, validación de formulario en servidor, mecanismo OTP/antiabuso acordado, aviso de privacidad y archivos privados. La validación del navegador es solo experiencia de usuario.
5. Implementar avisos con el servicio de correo existente y registrar intentos/reintentos. La configuración visual no implica un envío.
6. Integrar la contratación con el alta de empleados existente mediante una operación autorizada e idempotente. El cambio de etapa por sí solo no debe crear registros de personal.
7. Sustituir el adaptador demo por hooks/servicios que sigan el patrón SWR + API del repositorio, conservando los componentes visuales. Retirar el aviso de demostración solo al verificar el flujo real y el aislamiento entre empresas.

## Verificación reproducible

El script inicia y detiene Next en un proceso local, firma un token **solo para su servidor de prueba** y reemplaza las peticiones del backend por fixtures. Registra cualquier escritura y falla si el diseño intenta usar una API real. No utiliza credenciales de producción.

Con Playwright y Chromium disponibles en el entorno:

```bash
node scripts/verify-recruitment-design.cjs
```

Opciones: `CHROMIUM_EXECUTABLE_PATH` para un Chromium existente, `PLAYWRIGHT_MODULE_PATH` para el módulo Playwright, `RECRUITMENT_TEST_OUTPUT` para capturas/registros y `RECRUITMENT_TEST_PORT` (por defecto 4410). En entornos sin acceso a Google Fonts puede proporcionarse el fixture `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` de Next. Nada de esto se usa en producción.

La prueba recorre creación/validación, texto enriquecido, formulario, reordenado, publicación, postulación pública, sincronización, notas, oferta, contratación, pausa, duplicado, búsqueda más allá de la página actual, descarga y persistencia. Verifica además los enlaces filtrados del dashboard, las rutas y recarga de expedientes, programación/reprogramación/finalización de entrevistas con historial, arrastre de selección, alternativa móvil, requisitos de contratación y modalidades compartidas. Incluye capturas y comprobaciones de que los diálogos y pestañas no se corten en móvil.

La revisión visual complementa estas pruebas: una página sin desbordamiento global todavía puede tener un modal o una pestaña recortados.

Resultado de esta entrega: recorrido completo aprobado en Chromium a 1440 y 390 px, sin errores de JavaScript ni escrituras HTTP desde el módulo. ESLint de los archivos nuevos y `next build` aprobados. El build conserva la advertencia del módulo existente `face-api.js` sobre `fs` en reconocimiento de empleados, ajena a Reclutamiento. Las fuentes se sustituyeron por un fixture local exclusivamente durante las pruebas de este entorno.
