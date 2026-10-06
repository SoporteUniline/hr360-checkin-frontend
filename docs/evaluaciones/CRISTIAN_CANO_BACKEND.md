# ADAMIA · Evaluación de desempeño

**Entrega para Cristian Cano · 6 de octubre de 2026**

Este documento describe el backend que falta construir para conectar el frontend de la rama `feat/evaluaciones-desempeno`. El frontend parte de `main` actualizado al commit `4fea19a`. La base de datos y los endpoints de este módulo **no existen todavía**: no se ejecutó ninguna migración ni se escribieron datos de producción.

## 1. Qué está listo y cómo probarlo

Entradas del módulo:

- RH: `/panel/evaluaciones`.
- Empleado/jefe: `/empleado/panel/evaluaciones`.
- Vistas: resumen, campañas, editor de plantillas, pesos/escala, asistente de campaña, matriz de asignaciones, pendientes, equipo, respuesta, resultados, tablero, historial, seguimiento y configuración.
- El selector superior permite recorrer perfiles **ficticios** de RH, dirección, jefe y colaborador. No representa permisos de usuarios reales.
- Los cambios se guardan en `localStorage`, separados por empresa y usuario autenticado: `adamia:desempeno:demo:v1:{companyId}:{userId}`. No se importan empleados reales ni se envían correos.
- Para el recorrido más rápido: jefe Ana Torres → pendientes; RH Daniela Flores → resultados; colaboradora Mariana López → mis evaluaciones / seguimiento.
- RH puede crear una plantilla, programar una campaña, revisar asignaciones, simular el envío de respuestas con cada perfil, aprobar/publicar y confirmar recepción como el evaluado.
- La confirmación de recibido es una **simulación local**, no una firma digital con identidad verificada. Se permite expresar desacuerdo.
- Los recordatorios y la recurrencia guardan su configuración, pero no ejecutan tareas futuras. Las evidencias son enlaces locales; no hay subida privada de archivos.

Código que debe conservarse como referencia de contrato:

| Archivo                                             | Responsabilidad                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/lib/evaluaciones/model.mjs`                    | Validaciones, tipos, asignaciones, ponderación, resultados y visibilidad de demostración |
| `src/lib/evaluaciones/demoStore.mjs`                | Semilla ficticia y comandos locales                                                      |
| `src/components/evaluaciones/EvaluationContext.jsx` | Adaptador actual de persistencia local; punto principal a sustituir por API              |
| `src/components/evaluaciones/*Views.jsx`            | Pantallas y acciones                                                                     |
| `scripts/test-evaluaciones.mjs`                     | Casos de cálculo, permisos, estados y versiones                                          |
| `docs/evaluaciones/schema-propuesto.sql`            | Propuesta MySQL 8; revisar claves reales antes de convertirla en migración               |

Las pruebas de demostración NO sustituyen pruebas del backend ni una autorización en servidor.

## 2. Decisiones de producto aplicadas

### Tipos de evaluación

El motor combina perspectivas; el nombre 180/270/360 es una configuración inicial editable, no una regla universal impuesta.

| Formato inicial | Perspectivas y pesos                                          |
| --------------- | ------------------------------------------------------------- |
| Descendente     | Jefe directo 100%                                             |
| Ascendente      | Colaboradores directos 100%                                   |
| Horizontal      | Pares del mismo nivel 100%                                    |
| Autoevaluación  | La propia persona 100%                                        |
| 180°            | Jefe 80% + autoevaluación 20%                                 |
| 270°            | Jefe 50% + pares 30% + autoevaluación 20%                     |
| 360°            | Jefe 40% + colaboradores 25% + pares 25% + autoevaluación 10% |
| Personalizada   | Combinación editable; inicialmente jefe 50% + RH 50%          |

Cada perspectiva usa su propia plantilla y un peso mayor a cero. La suma debe ser 100%. Un usuario puede evaluar a varias personas. No se repite `(campaña, evaluado, evaluador, perspectiva)`.

La autoevaluación es la única relación que permite que evaluador y evaluado sean la misma persona. Descendente usa jefe directo; ascendente usa reportes directos; horizontal usa nivel jerárquico; RH usa responsables autorizados. El frontend demuestra el nivel con `people.level`: **Cristian debe confirmar si ese dato existe en el organigrama real o crear un catálogo de niveles**. Un puesto con nombre parecido no basta para inferir pares.

Los participantes se eligen por área, puesto y búsqueda. Al cambiar participantes, modelo o plantillas durante el borrador se regeneran las asignaciones; después se pueden quitar o agregar evaluadores elegibles. Una campaña iniciada fija participantes, relaciones, pesos y versiones.

### Plantillas

- Nombre, descripción, área/puesto objetivo.
- Categorías ordenadas y con peso; preguntas ordenadas dentro de cada categoría.
- Tipos: escala 1–5, sí/no, texto abierto, opción múltiple de selección única y número dentro de rango.
- Cada pregunta puede ser obligatoria. Salvo texto, se puede excluir de la calificación.
- Pesos iguales entre preguntas calificables, o pesos personalizados que suman 100% dentro de la categoría.
- Texto y preguntas no calificables no aportan puntos; una categoría solo de texto debe pesar 0%.
- Las cinco descripciones de escala son editables. Semáforo editable que cubre 1.00–5.00, con límites a dos decimales, sin huecos ni superposiciones.
- Archivar impide usar una plantilla en campañas nuevas; las campañas previas conservan su versión.
- Una edición crea una versión. Nunca se cambia la definición que usó una respuesta anterior.
- Identificadores de competencia estables permiten comparar categorías equivalentes. Si cambia el significado de una categoría, crear otro `competency_key`; no reutilizarlo solo porque el nombre coincide.

## 3. Cálculo que debe reproducir el servidor

El cliente muestra una referencia. El servidor valida respuestas y calcula resultados; nunca acepta un promedio enviado por el navegador como autoridad.

1. Escala 1–5: usa el número seleccionado, entero.
2. Sí/no: mapea ambas opciones a puntos configurados de 1 a 5; `false` es una respuesta válida.
3. Opción múltiple: mapea la opción elegida por ID a su puntuación de 1 a 5.
4. Número: normaliza `1 + 4 × (respuesta − mínimo) / (máximo − mínimo)`. El máximo debe superar al mínimo. Cero es una respuesta válida si está en rango.
5. Texto y preguntas con `scored=false`: no califican.
6. Categoría: promedio ponderado de sus preguntas calificables respondidas. Con peso igual, todas valen 1. Una pregunta opcional omitida sale del denominador de su categoría; el servidor conserva esa condición.
7. Una categoría de peso positivo necesita al menos una respuesta calificable al enviar. No se admite que quede sin puntuación. Una categoría de peso 0 puede contener solo texto.
8. Resultado de una respuesta: suma de `promedio de categoría × peso de categoría / 100`.
9. Perspectiva: promedio simple de los resultados de los evaluadores que pertenecen a ella. Se promedia **primero cada perspectiva**, para que tener más pares no aumente su peso.
10. Resultado final: suma de `promedio de perspectiva × peso de perspectiva / 100`. Solo existe cuando todas las asignaciones están enviadas y se cumple el mínimo de confidencialidad. No convertir pendientes en cero ni redistribuir silenciosamente pesos entre perspectivas faltantes.
11. Ejemplo 360: jefe 5 × 40% + colaboradores 2 × 25% + pares 4 × 25% + autoevaluación 3 × 10% = **3.80**.
12. Conservar precisión decimal durante operaciones; redondear a dos decimales solo al presentar/persistir el resultado final. El semáforo individual clasifica ese valor redondeado. Se congela `resultBands` de la plantilla principal al iniciar; no se toma de una perspectiva elegida arbitrariamente.
13. Categoría entre perspectivas: promedio de la categoría dentro de cada perspectiva y ponderación con los pesos de las perspectivas donde aparece su `competency_key`. Mostrar que una competencia exclusiva de una perspectiva no representa a todos los evaluadores.
14. Tablero: promedio simple de resultados finales de persona/campaña. Mostrar denominador `n`. Seleccionar varias campañas puede contar a una persona en varios periodos; nunca llamarlo número de personas únicas.
15. Semáforo ejecutivo común de referencia: `<3`, `3–3.99`, `>=4`. Es independiente del semáforo individual editable; etiquetarlo para no mezclar significados.
16. Comparativo temporal: mismas personas con resultado en ambos periodos, misma composición y pesos de perspectivas, misma identidad y versión de plantilla. El frontend compara solo configuraciones equivalentes. Si cambió el instrumento, mostrar “No comparable” y conservar el historial sin una variación artificial.

## 4. Estados y transacciones

### Campaña

`draft → scheduled/active → closed`.

`scheduled`, `active` y `overdue` también son estados efectivos derivados de las fechas de apertura/cierre en la zona horaria de la campaña. Vencida no significa resultado cero. Una campaña fuera de fechas rechaza borradores y envíos.

- Guardar borrador admite configuración incompleta pero requiere nombre.
- Iniciar exige todas las validaciones, evaluadores elegibles, pesos 100%, fechas válidas y mínimo por grupo confidencial. Rechazar fecha límite pasada.
- La transacción de inicio fija versiones de plantillas, organigrama de participantes, reglas de visibilidad y asignaciones.
- Ampliar fecha: fecha nueva >= fecha actual; auditar valor anterior/nuevo. Para campaña vencida, permite volver a responder si el nuevo plazo incluye la fecha actual.
- Cerrar manualmente: cierra respuestas; no inventa respuestas ni publica resultados incompletos. Confirmar número de pendientes.
- Duplicar crea otro borrador sin respuestas, firmas, publicaciones ni fechas de lanzamiento de la campaña origen. Puede reutilizar configuración, pero obliga a revisar participantes y fechas.
- No se implementa reapertura de respuestas enviadas. Si el negocio la requiere, será una operación explícita de RH, con invalidación de publicaciones, revisión y nueva versión; no un UPDATE silencioso.

### Respuesta

`pending → draft → submitted`.

Guardar valida los valores presentes. Enviar valida todas las obligatorias y categorías calificables; transacción, bloqueo/versión optimista y marca de tiempo del servidor. Después de enviar la respuesta queda inmutable. No permitir editarla por un endpoint genérico.

### Publicación

`unreviewed → approved → published` (se puede omitir aprobación cuando la campaña lo permite).

La publicación guarda un snapshot calculado por el servidor, hash, versión, autor y fecha. La vista del colaborador lee ese snapshot y su máscara de permisos. No debe depender de recalcular datos que luego se puedan editar. Crear permisos por campaña evita que cambiar valores predeterminados exponga resultados históricos.

### Seguimiento

`pending → in_progress → completed`.

RH o jefe del evaluado crea acciones. Responsable, jefe y RH pueden actualizar avance según permisos. Evidencias y notas guardan autor, fecha e historial; no sobrescribir pruebas previas sin bitácora. El empleado ve el plan solo cuando RH publicó y habilitó `employeePlan`.

### Confirmación / firma

Recepción asociada a la **versión y hash exactos** de la publicación, usuario autenticado, texto aceptado, observaciones y timestamp servidor. Recibir no equivale a aceptar la calificación. Una nueva versión requiere nueva recepción; no reutilizar la firma anterior. Confirmar con producto si se requiere solo acuse autenticado o firma con proveedor/OTP y qué evidencia de identidad se debe guardar.

## 5. Autorización y confidencialidad

Obtener `tenant_id`, usuario y permisos del token/sesión validada. No confiar en `tenant_id`, `role`, `actorId`, `employeeId` ni `score` del cuerpo. Todas las consultas, índices únicos, descargas y joins deben conservar el alcance de empresa.

| Perfil      | Permitido                                                                                                      | No permitido                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| RH          | Plantillas, campañas, matriz, progreso, revisión, publicación, planes, configuración                           | Cambiar respuestas enviadas mediante CRUD genérico             |
| Dirección   | Tablero, resultados y planes de su empresa                                                                     | Notas privadas de RH, cambiar evaluaciones, publicar           |
| Jefe        | Responder asignaciones; avance de sus reportes; resultados publicados si `managerResults`; planes de su equipo | Acceso a otro equipo por conocer un ID; notas privadas RH      |
| Colaborador | Sus asignaciones; resultado propio publicado conforme a flags; plan autorizado; recepción                      | Resultados de otra persona, aprobar, modificar configuraciones |

Flags fijados por campaña: `employeeScore`, `employeeCategories`, `employeeComments`, `employeePlan`, `managerResults`, `requireApproval`, `requireReceipt`, `anonymousPeers`, `anonymousAscending`, `minimumResponses`.

No enviar campos restringidos al cliente: quitarlos en el DTO y en exportaciones. `employeeScore=false` oculta promedio, semáforo individual, resultados por perspectiva y deltas; `employeeCategories` controla sus puntuaciones por separado. Un botón oculto no es autorización.

Confidencialidad:

- Para pares/ascendentes agrupados, mínimo configurable **3–20 respuestas enviadas**. Bloquear lanzamiento si no hay suficientes evaluadores asignados.
- No mostrar puntuación ni comentarios de un grupo bajo el mínimo, tampoco en API/exportaciones.
- No entregar IDs/nombres de autores junto con comentarios agrupados ni notas privadas de esos grupos.
- RH necesita identificar asignados para recordatorios y avance; esa lista administrativa debe estar separada de respuestas/resultados anónimos.
- El backend debe aplicar umbrales también en filtros y exports. Evitar revelar un grupo pequeño restando dos agregados o filtrando por evaluador. El frontend local no constituye garantía de anonimato: contiene fixtures inspeccionables.
- Definir retención y tratamiento de comentarios identificables con el responsable del producto; no prometer anonimato absoluto del texto libre.

## 6. API propuesta

Prefijo de ejemplo: `/api/v1/performance`. Mantener el estilo del backend real; hoy el frontend usa `@/lib/axios` con `NEXT_PUBLIC_RUTA_BACKEND` para otros módulos. No duplicar autenticación.

Convenciones:

- UUID para entidades nuevas; IDs de empleado/usuario/empresa según la base real.
- Fechas civiles `YYYY-MM-DD`; timestamps RFC3339 UTC; `timezone` IANA por campaña.
- Listados: `?q=&page=1&pageSize=25&sort=...&direction=asc&status=&areaId=&positionId=&managerId=&campaignId=&periodStart=&periodEnd=`. Buscar/filtrar **en toda la consulta antes de paginar**, nunca solo en filas cargadas.
- Respuesta: `{data: [...], pagination:{page,pageSize,total}, aggregates:{...}, requestId}`. Los totales deben reflejar los filtros y ámbito autorizado.
- Errores: `{error:{code,message,fields:[{path,message}],requestId}}`.
- Códigos: 401 sesión; 403 permiso; 404 objeto fuera de alcance/no encontrado; 409 versión/idempotencia/estado; 422 validación; 429 límite de recordatorios; 503 dependencia no disponible.
- Ediciones con `version` / `If-Match`. En 409, ofrecer recargar y revisar; no sobrescribir trabajo de otra persona.
- `Idempotency-Key` en iniciar, enviar, aprobar/publicar, firmar y disparar recordatorios.

| Método y ruta                                     | Permiso                | Entrada / salida importante                                                                |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| GET `/capabilities`                               | Sesión                 | Rol efectivo, persona vinculada, scopes y capacidades reales; elimina el selector ficticio |
| GET `/people`                                     | Según alcance          | Personas elegibles con área, puesto, jefe, nivel y estado; filtros/paginación globales     |
| GET `/catalogs`                                   | RH                     | Áreas, puestos, sucursales, niveles y zonas de la empresa existentes                       |
| GET `/templates`                                  | RH                     | Búsqueda, archivadas, conteos y versión vigente                                            |
| POST `/templates`                                 | RH                     | Plantilla completa validada; crea v1                                                       |
| GET `/templates/:id`                              | RH                     | Definición vigente y versionado                                                            |
| POST `/templates/:id/versions`                    | RH                     | Nueva definición inmutable; control de versión                                             |
| POST `/templates/:id/duplicate`                   | RH                     | Nueva plantilla, sin alterar campañas previas                                              |
| PATCH `/templates/:id/archive`                    | RH                     | `{archived,version}`                                                                       |
| GET `/campaigns`                                  | RH/Dirección           | Campañas, avance, pendientes, resultados publicados y filtros                              |
| POST `/campaigns`                                 | RH                     | Guardar borrador de configuración                                                          |
| GET `/campaigns/:id`                              | Ámbito                 | Detalle + capacidades aplicables                                                           |
| PATCH `/campaigns/:id`                            | RH                     | Solo borrador; configuración y versión                                                     |
| POST `/campaigns/:id/preview-assignments`         | RH                     | Propuesta desde organigrama; sin envío ni lanzamiento                                      |
| PUT `/campaigns/:id/assignments`                  | RH                     | Asignaciones seleccionadas + revisión de borrador; validar relación y duplicados           |
| POST `/campaigns/:id/validate`                    | RH                     | Lista completa de errores de lanzamiento                                                   |
| POST `/campaigns/:id/launch`                      | RH                     | Fijar snapshot + participantes + asignaciones + outbox en una transacción                  |
| POST `/campaigns/:id/duplicate`                   | RH                     | Copiar configuración a borrador nuevo                                                      |
| POST `/campaigns/:id/extend`                      | RH                     | `{dueOn,reason,version}`                                                                   |
| POST `/campaigns/:id/close`                       | RH                     | `{reason,version}`; pendientes se mantienen sin resultado final                            |
| POST `/campaigns/:id/reminders`                   | RH                     | Solo asignaciones pendientes válidas; límite, idempotencia y outbox                        |
| GET `/my/assignments`                             | Evaluador              | Lista propia, estado, avance y fechas                                                      |
| GET `/assignments/:id`                            | Evaluador asignado     | Snapshot exacto del formulario, borrador y capacidades                                     |
| PUT `/assignments/:id/draft`                      | Evaluador asignado     | Respuestas + comentarios + versión; devuelve savedAt servidor                              |
| POST `/assignments/:id/submit`                    | Evaluador asignado     | Validar y cerrar respuesta en transacción                                                  |
| GET `/team`                                       | Jefe/RH                | Alcance de equipo y progreso; no autores de respuestas confidenciales                      |
| GET `/results`                                    | Según alcance          | Lista filtrada con DTO según permisos                                                      |
| GET `/campaigns/:id/results/:employeeId`          | Según alcance          | Resultado/versionado, grupos seguros, categorías, comentarios permitidos, publicación      |
| POST `/campaigns/:id/results/:employeeId/approve` | RH                     | Revisión del snapshot y versión calculada                                                  |
| POST `/campaigns/:id/results/:employeeId/publish` | RH                     | Publicación del snapshot aprobado + outbox                                                 |
| GET `/my/results`                                 | Colaborador            | Solo resultados propios publicados y campos habilitados                                    |
| GET `/dashboard`                                  | RH/Dirección           | Promedios, denominadores, avance, áreas, semáforo, competencias y comparables              |
| GET `/people/:id/history`                         | Según alcance          | Historial permitido y metadatos de comparabilidad                                          |
| GET `/plans`                                      | Según alcance          | Planes, estado, vencimientos, responsable                                                  |
| POST `/plans`                                     | RH/Jefe del evaluado   | Acción, persona/campaña, responsable, fecha y criterio                                     |
| PATCH `/plans/:id`                                | RH/Jefe                | Datos del compromiso + versión                                                             |
| POST `/plans/:id/updates`                         | Responsable/RH/Jefe    | Estado, nota, evidencias; evento inmutable                                                 |
| POST `/plans/:id/evidence/upload-url`             | Según alcance          | URL temporal de subida privada, tamaño/tipo permitido                                      |
| POST `/plans/:id/evidence`                        | Según alcance          | Confirmar archivo validado: storage key, SHA256, nombre/tipo/tamaño                        |
| GET `/evidence/:id/download`                      | Según alcance          | URL de lectura temporal; auditar                                                           |
| POST `/publications/:id/receipt`                  | Persona publicada      | Consentimiento de recibido, observaciones, identidad verificada; idempotente               |
| GET `/settings` / PATCH `/settings`               | RH                     | Predeterminados y versión, sin afectar campañas anteriores                                 |
| GET `/audit`                                      | RH autorizado          | Eventos paginados, redacción de datos sensibles                                            |
| POST `/exports`                                   | Según alcance          | Solicitar CSV/PDF con filtros y máscara de permisos                                        |
| GET `/exports/:id`                                | Solicitante autorizado | Estado y URL firmada con vencimiento                                                       |

### Ejemplo de borrador de campaña

```json
{
  "name": "Desempeño · Cuarto trimestre 2026",
  "description": "Evalúa el trabajo observado durante el periodo.",
  "model": "360",
  "primaryTemplateVersionId": "UUID",
  "periodStart": "2026-10-01",
  "periodEnd": "2026-12-31",
  "opensOn": "2027-01-04",
  "dueOn": "2027-01-18",
  "timezone": "America/Mexico_City",
  "subjectIds": ["EMPLOYEE_ID"],
  "groups": [
    { "key": "descending", "weight": 40, "templateVersionId": "UUID" },
    { "key": "ascending", "weight": 25, "templateVersionId": "UUID" },
    { "key": "peer", "weight": 25, "templateVersionId": "UUID" },
    { "key": "self", "weight": 10, "templateVersionId": "UUID" }
  ],
  "settings": {
    "employeeScore": true,
    "employeeCategories": true,
    "employeeComments": true,
    "employeePlan": true,
    "managerResults": true,
    "requireApproval": true,
    "requireReceipt": true,
    "anonymousPeers": true,
    "anonymousAscending": true,
    "minimumResponses": 3
  },
  "reminders": [7, 3, 0],
  "recurrence": "quarterly",
  "version": 1
}
```

El cliente de demostración tiene `templateId` y copia la definición al iniciar. La API debe resolverlo a una versión explícita e inmutable. No aceptar una definición de plantilla alterada dentro de una respuesta.

### Borrador / envío de respuesta

```json
{
  "version": 4,
  "answers": {
    "QUESTION_SCALE_ID": 4,
    "QUESTION_BOOL_ID": false,
    "QUESTION_TEXT_ID": "Comentario",
    "QUESTION_CHOICE_ID": "OPTION_ID",
    "QUESTION_NUMBER_ID": 0
  },
  "categoryComments": { "CATEGORY_ID": "Observación de la competencia." },
  "comment": "Fortalezas y oportunidades observadas.",
  "privateNote": "Solo para RH."
}
```

Solo aceptar preguntas/opciones de la versión asignada. Rechazar campos desconocidos, tipos incorrectos, longitudes excesivas, categorías ajenas y datos fuera de rango. No confundir `false`, `0`, `null` y ausencia. Límites frontend: comentario 4,000 caracteres; nombre de plantilla/campaña 160; pregunta 500. Definir límites de categorías/preguntas/participantes en servidor y devolverlos en capabilities.

## 7. Modelo de base de datos

Se propone MySQL 8 por la dependencia `mysql2` presente en este repositorio. **Confirmar motor, versión, ORM, nombres y tipos de las tablas reales con Luis antes de aplicar.** `schema-propuesto.sql` es un diseño, no una migración probada contra producción.

Todas las tablas llevan `tenant_id`; claves únicas y foráneas internas compuestas evitan relaciones entre empresas. Los vínculos a empresas, empleados y usuarios existentes se agregan cuando Cristian confirme sus claves reales. No crear otro catálogo de empleados, departamentos, puestos o sucursales para este módulo.

| Tabla propuesta                  | Propósito / relaciones                                                       |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `performance_settings`           | Predeterminados por empresa y revisión                                       |
| `performance_templates`          | Identidad, versión actual, archivado                                         |
| `performance_template_versions`  | Definición completa inmutable, hash, escala y semáforo                       |
| `performance_categories`         | Categorías de una versión, peso, orden, `competency_key`                     |
| `performance_questions`          | Preguntas de categoría, tipo, obligatoriedad, puntuación y configuración     |
| `performance_options`            | Opciones con orden y score                                                   |
| `performance_campaigns`          | Fechas, zona, estado, reglas congeladas, recordatorios, recurrencia          |
| `performance_perspectives`       | Perspectiva/peso/versión de plantilla por campaña                            |
| `performance_subjects`           | Empleado evaluado y snapshot de organigrama al lanzar                        |
| `performance_assignments`        | Evaluado, evaluador, perspectiva, estado y versión                           |
| `performance_responses`          | Borrador/envío, respuestas tipadas JSON, comentarios, nota privada           |
| `performance_response_revisions` | Historial inmutable de cambios; no sustituye respuesta vigente               |
| `performance_publications`       | Resultado aprobado/publicado, snapshot/hash/versión                          |
| `performance_plans`              | Acción, responsable, compromiso, criterio y estado                           |
| `performance_plan_updates`       | Historial de avances, notas y autor                                          |
| `performance_evidence`           | Archivo privado/enlace, hash, tipo, tamaño y responsable                     |
| `performance_receipts`           | Acuse/firma sobre publicación exacta y evidencia de identidad                |
| `performance_audit`              | Operaciones administrativas y accesos sensibles                              |
| `performance_outbox`             | Eventos de notificación, recurrencia y exportación, reintentos/deduplicación |
| `performance_idempotency`        | Respuestas a comandos críticos y protección ante reintentos                  |

La definición JSON de una versión es el snapshot canónico que consume el formulario. Categorías/preguntas/opciones normalizadas permiten consultas y validación: **escribir ambas representaciones en la misma transacción y comprobar que el hash coincide**. Alternativa aceptable antes de desarrollar: usar solo normalizado y construir el snapshot al publicar la versión; evitar dos fuentes mutables de verdad.

Las respuestas JSON usan tipos JSON reales. No guardar `false` como texto ni depender de strings para cálculos. Guardar un hash de payload enviado, versión y timestamp. Las publicaciones deben conservar versión exacta de todas las definiciones usadas.

## 8. Jobs, correo, recurrencia y archivos

- Outbox transaccional: al iniciar/publicar se registra el evento en la misma transacción; worker procesa después del commit.
- Unicidad para evitar doble correo: empresa + evento + campaña/asignación + destinatario + fecha de programación.
- Recordatorios: zona horaria de campaña, solo pendientes, dentro de ventana válida. No enviar a respondidos ni a campañas cerradas. Reintentos con backoff y máximo de intentos.
- Invitación: enlace autenticado a la asignación; no incluir respuestas, score, GPS ni otros datos personales en el correo.
- Recurrencia: calcular el siguiente periodo civil, crear borrador nuevo y notificar RH para revisar cambios de organigrama. No copiar respuestas/firmas ni lanzar automáticamente una campaña inválida.
- Archivos privados con URLs temporales; verificar tipo real, límite de tamaño y malware. No confiar en MIME/nombre enviados por el navegador. Auditar descargas.
- Exports usan filtros completos y permisos del solicitante al generarse **y al descargarse**. Caducidad, nombre legible, zona/fecha y leyenda de alcance. CSV debe neutralizar fórmulas de hoja de cálculo en textos.
- Bitácora incluye quién, cuándo, empresa, acción, objeto, requestId, razón y cambios relevantes. No guardar tokens, contraseñas ni datos sensibles innecesarios.

## 9. Adaptación del frontend al backend

1. Crear cliente `performanceApi` sobre el `axios` existente. Mantener respuestas de API normalizadas en un adaptador, no repartir conversiones por componentes.
2. Sustituir `seedState/loadDemo/demoCommand` por queries y mutations. Conservar sus validaciones como ayuda visual, nunca como seguridad.
3. Consultar capabilities desde sesión real y eliminar el selector de perfiles ficticios. Agregar feature flag de disponibilidad backend según el despliegue acordado.
4. Obtener catálogos y participantes reales por empresa; usar IDs, no nombres como claves. La selección múltiple debe soportar búsqueda global con paginación.
5. Separar paginación/filtros/totales en servidor. Cancelar búsquedas anteriores y evitar respuestas fuera de orden.
6. Mostrar guardando/guardado/error real. No confirmar guardado antes de la respuesta del servidor; conservar edición ante errores/409. Deshabilitar doble envío durante la mutation.
7. Usar snapshots publicados y DTO filtrado; quitar notas privadas/calificaciones no permitidas antes de serializar.
8. Reemplazar recordatorio simulado y acuse local por sus endpoints. Incorporar upload privado y evidencia verificable.
9. Retirar/resetear datos de demostración mediante una versión de namespace; no migrar personas ficticias a base real.
10. Verificar roles reales RH/dirección/jefe/empleado con Luis: hoy `Recruiter`/`User` acceden al panel y `Empleado` a su panel, pero no resuelven por sí solos los permisos finos de desempeño.

## 10. Pruebas obligatorias del backend y aceptación

- Isolation: una empresa nunca obtiene persona, plantilla, respuesta, agregado, URL de archivo o exportación de otra, aunque conozca el UUID.
- Búsqueda encuentra coincidencias de páginas no cargadas; totales/filtros coinciden con exportación.
- Relación jefe/pares/ascendente y permisos de usuario real. Un evaluador no responde por otro, y un jefe no ve equipos ajenos.
- Pesos por categoría/pregunta/perspectiva; tipos, cero/false, opcionales y grupos incompletos. Caso 360 de 3.80 incluido arriba.
- No hay resultado final hasta completar todas las perspectivas; mínimo agrupado se aplica en listas, detalle, filtros y exportación.
- Carrera de dos envíos: solo uno persiste; borrador viejo produce 409. Publicar/firmar/reintentar no duplica registros ni correos.
- Modificar plantilla/predeterminados/organigrama no altera el resultado histórico. No reutilizar hash/acuse en nueva publicación.
- Fechas en zonas mexicanas, cambio de día, fin de mes y años bisiestos; cerrar/ampliar y recordatorios vencidos.
- Transacción fallida no deja campaña parcialmente iniciada ni publicación sin outbox.
- Empleado sin score/comentarios no recibe esos campos en JSON, CSV o PDF.
- Recepción con desacuerdo se conserva y no se convierte en aceptación de calificación.
- Evidencias: acceso, expiración, revocación, nombre/tipo/tamaño y bitácora.
- Restauración de respaldos, retención y baja del empleado sin borrar el historial autorizado.

## 11. Datos que Cristian y Luis necesitan confirmar

1. Repositorio/framework del backend, motor/versión/ORM y convenciones de migraciones.
2. Tipos y claves reales de empresa, usuario, empleado, departamento, puesto, sucursal y jefe directo; fuente de nivel jerárquico para pares.
3. Quién representa RH y dirección; posibilidad de usuario RH sin empleado vinculado; alcance multiempresa y sustitución temporal de jefe.
4. Pesos iniciales por formato y si se desea autoevaluación de referencia con peso 0 (la primera versión requiere pesos positivos en perspectivas participantes).
5. Política final de anonimato y mínimo; tratamiento de grupos pequeños y comentarios libres.
6. Si se podrán excluir asignaciones faltantes al cierre. **Hoy no se redistribuyen pesos automáticamente.** Cualquier exclusión futura debe explicarse y auditarse antes de publicar.
7. Si todas las campañas requieren aprobación/acuse o se permite configurar por campaña.
8. Acuse autenticado vs firma OTP/proveedor; texto de consentimiento, evidencia de identidad y conservación.
9. Proveedor/remitente de correo, plantilla institucional, horarios y límites de recordatorios.
10. Storage privado, tamaños/tipos de evidencias, antivirus y caducidad de enlaces.
11. Tiempo de retención, bajas y cambios de empresa/jefe; quién consulta historial previo.
12. Recurrencia crea borrador para RH (propuesto) o autoenvía tras validación.
13. Comparativos entre instrumentos distintos, semáforo ejecutivo y requisitos de PDF/Excel.
14. Política comercial/feature flag: qué planes de ADAMIA incluyen este módulo y cuándo se habilita producción.

## 12. Orden recomendado de implementación

1. Esquema/migraciones, catálogos, scopes y permisos.
2. Plantillas versionadas, validación y pruebas de cálculo.
3. Campañas, organigrama/asignaciones, snapshots y lanzamiento transaccional.
4. Borradores, envío, control de concurrencia e idempotencia.
5. Resultados, confidencialidad, aprobación/publicación e historial.
6. Planes/evidencias/recepción y bitácora.
7. Outbox, recordatorios, recurrencia y exports.
8. Conexión del frontend, pruebas integradas y habilitación acordada.

La entrega de frontend permite validar el producto completo antes de integrar datos reales. La salida a producción funcional depende de terminar y verificar estos servicios.
