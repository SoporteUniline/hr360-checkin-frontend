# Reclutamiento: entrega de diseño

Rama: `ChatGPT`. El módulo se abre desde **Gestión de personal → Reclutamiento**, o en `/panel/reclutamiento`. Respeta la autorización de `/panel` y la suscripción existentes; no introduce un bypass de acceso.

## Alcance navegable

- Resumen con accesos a vacantes publicadas, candidatos nuevos, entrevistas y ofertas.
- Vacantes con búsqueda sobre todo el conjunto antes de paginar, filtros por estado/modalidad, contadores y descarga CSV de los resultados filtrados.
- Alta en tres pasos: puesto → formulario → publicación. Guardado de borradores, edición, duplicado, pausa, cierre y reapertura con revisión.
- Sucursal y modalidad independientes, mediante IDs. El catálogo de prueba permite agregar modalidades e indicar si requieren sucursal. Las sucursales actuales se reutilizarán en la integración.
- Descripción con negritas, cursiva, subrayado, encabezado y listas. El contenido se guarda como árbol restringido, no como HTML arbitrario.
- Preguntas cortas/largas, una/varias opciones, número, fecha y archivo. Orden por arrastre, teclado o botones. Los datos base de contacto no se eliminan; el resto se puede configurar. Máximo 30 preguntas.
- Expediente con respuestas, etapa, notas, entrevistas e historial. Preparación de contratación: fecha, sucursal y lista de requisitos. Completar una contratación de prueba no crea un empleado.
- Publicación con enlace de prueba, configuración y vistas previas de correos.
- Página para postulantes en `/reclutamiento-demo/[workspaceId]/[vacancyId]`, adaptada a móvil, sin indexación ni los scripts globales de mapas/Meta. Permite simular una postulación y verla en el panel.
- Estados de carga, datos no disponibles, filtros vacíos, validaciones y errores de almacenamiento. Diálogos con confirmación de cambios sin guardar en la vacante y el seguimiento del candidato.

## Límites explícitos de esta fase

Esta entrega utiliza **solo datos ficticios y almacenamiento local del navegador**, con un aviso visible. No consulta catálogos reales ni escribe en la API. No envía correos, invitaciones, archivos ni altas de empleados. No incluye nómina.

El espacio de pruebas del panel se separa por empresa/usuario autenticado. Un identificador aleatorio permite abrir su vista de prueba en otra pestaña del mismo navegador. **El enlace no comparte los datos entre dispositivos o navegadores**. No se debe enviar a postulantes reales. Las pruebas permanecen al recargar, pero se pierden al borrar el almacenamiento del sitio. No reemplaza permisos ni persistencia del servidor.

Los archivos de ejemplo conservan solo nombre y tamaño, con validación visual de extensión y límite de 5 MB. Sus bytes no se almacenan; por eso no se ofrece una descarga ficticia de CV. Las descargas reales en esta fase son los CSV de vacantes/candidatos/contrataciones de prueba; sus celdas se protegen contra fórmulas.

La página real `/vacante/[slug]`, `/bolsa-de-trabajo` y los servicios existentes `/vacantes`, `/postulaciones` y OTP permanecen independientes. No se sustituyó su formulario ni su lógica.

## Organización

| Responsabilidad | Archivo/directorio |
| --- | --- |
| Entrada protegida | `src/app/panel/reclutamiento/page.jsx` |
| Entrada pública de prueba | `src/app/reclutamiento-demo/[workspaceId]/[vacancyId]/page.jsx` |
| Vistas y componentes | `src/components/reclutamiento/` |
| Reglas y ejemplos del diseño | `src/lib/reclutamiento/model.js` |
| Adaptador local, sin HTTP | `src/lib/reclutamiento/demoStore.js` |
| Carga, errores y sincronización entre pestañas | `src/hooks/useReclutamientoDemo.js` |
| Convenciones del módulo | `src/components/reclutamiento/AGENTS.md` |
| Prueba del recorrido con API ficticia | `scripts/verify-recruitment-design.cjs` |

Las preguntas conservan su ID al reordenar. Cada postulación guarda etiquetas, tipo y respuesta de la versión utilizada; editar el formulario no modifica las respuestas anteriores. La versión local es una demostración de esa regla, no sustituye el versionado transaccional del backend.

## Siguiente entrega con Luis

1. Confirmar tablas existentes de vacantes/postulaciones y el contrato de la guía de Reclutamiento. Reutilizar lo existente; no crear un esquema paralelo sin revisar el backend.
2. Resolver Sucursal con el catálogo de la empresa y Modalidad con un catálogo independiente. Acordar permisos, estados, IDs y formato de descripción enriquecida.
3. Definir consultas con búsqueda/filtros/paginación y conteos en servidor; CRUD de vacantes, publicación, formulario versionado, postulaciones, respuestas, notas e historial.
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

La prueba recorre creación/validación, texto enriquecido, formulario, reordenado, publicación, postulación pública, sincronización, notas, oferta, contratación, pausa, duplicado, búsqueda más allá de la página actual, descarga y persistencia. Incluye capturas y comprobaciones de que los diálogos y pestañas no se corten en móvil.

La revisión visual complementa estas pruebas: una página sin desbordamiento global todavía puede tener un modal o una pestaña recortados.

Resultado de esta entrega: recorrido completo aprobado en Chromium a 1440 y 390 px, sin errores de JavaScript ni escrituras HTTP desde el módulo. ESLint de los archivos nuevos y `next build` aprobados. El build conserva la advertencia del módulo existente `face-api.js` sobre `fs` en reconocimiento de empleados, ajena a Reclutamiento. Las fuentes se sustituyeron por un fixture local exclusivamente durante las pruebas de este entorno.
