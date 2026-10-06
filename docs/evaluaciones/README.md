# Evaluación de desempeño · Entrega frontend

Módulo autónomo de ADAMIA con demostración funcional persistente. Sin integración backend, correos reales, archivos privados ni firma verificable todavía.

## Documentos para Cristian Cano

- [Contrato de backend, reglas, API y decisiones pendientes](./CRISTIAN_CANO_BACKEND.md).
- [Esquema MySQL propuesto, sin ejecutar](./schema-propuesto.sql).
- [Verificación realizada](./VERIFICACION.md).

## Pantallas

Base RH: `/panel/evaluaciones`. Base empleado: `/empleado/panel/evaluaciones`.

| Ruta relativa                           | Vista                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/`                                     | Resumen RH/dirección; equipo para jefe; pendientes para colaborador                         |
| `/plantillas`                           | Disponibles / archivadas, búsqueda, duplicar y restaurar                                    |
| `/plantillas/nueva` y `/plantillas/:id` | Contenido, orden, pesos, escala, semáforo y vista previa                                    |
| `/campanas`                             | Activas, programadas, borradores, vencidas y cerradas                                       |
| `/campanas/nueva`                       | Asistente de cuatro pasos                                                                   |
| `/campanas/:id`                         | Avance por persona, matriz, configuración, recordatorios simulados, ampliar/cerrar/duplicar |
| `/campanas/:id/editar`                  | Edición de borrador                                                                         |
| `/mis-pendientes`                       | Evaluaciones asignadas al perfil seleccionado                                               |
| `/responder/:assignmentId`              | Respuesta por secciones, borrador y envío                                                   |
| `/equipo`                               | Alcance del jefe, progreso y resultados publicados                                          |
| `/resultados`                           | Resultados, revisión y publicación                                                          |
| `/resultados/:campaignId/:subjectId`    | Promedio, categorías, perspectivas, comentarios, planes, historial, acuse, CSV e impresión  |
| `/tablero`                              | Dirección: áreas, distribución, competencias, destacados, seguimiento y comparativo         |
| `/mis-evaluaciones`                     | Resultados propios publicados según permisos                                                |
| `/seguimiento`                          | Acciones, responsables, fechas, avances y enlaces de evidencia                              |
| `/configuracion`                        | Predeterminados por perfil, confidencialidad, actividad y restablecimiento local            |

## Prueba manual corta

1. Entrar al módulo y seleccionar el perfil ficticio RH Daniela Flores.
2. Crear o duplicar una plantilla; cambiar orden, tipos y pesos. Verificar que no se guarda un total distinto de 100%.
3. Crear campaña, seleccionar modelo y personas. Revisar la matriz; no permite iniciar relaciones vacías ni grupos confidenciales insuficientes.
4. Cambiar al perfil del evaluador asignado. Guardar un borrador, salir y volver; enviar completo.
5. Volver a RH, revisar resultado, aprobar y publicar.
6. Como colaborador, consultar solo lo habilitado, confirmar recibido con observaciones y actualizar el plan del que es responsable.
7. Cambiar a dirección o jefe para revisar su alcance.
8. Restablecer datos ficticios desde Configuración → Demostración cuando se quiera reiniciar.

Las campañas de ejemplo corresponden a 2026. Para probar después de su fecha límite, RH puede ampliar el plazo o crear una campaña con fechas vigentes. La fecha efectiva se calcula en la zona de cada campaña.

## Implementación

- JSX y componentes existentes de ADAMIA; sin dependencias nuevas de producción.
- Reglas puras en `src/lib/evaluaciones/model.mjs` y comandos en `demoStore.mjs`.
- Estado local separado por empresa/usuario; versión de esquema; detección de cambios de otra pestaña y errores de almacenamiento.
- Flujos con datos ficticios solamente. El selector de perfil no sustituye la autorización del servidor.
- Tablas con búsqueda sobre el conjunto completo antes de paginar; en móvil los registros se convierten en fichas.
- Navegación incorporada al sidebar y buscador de páginas. No cambia la lógica de vacaciones, asistencia, nómina, reclutamiento ni permisos existentes.
- La conexión futura debe retirar el selector ficticio y aplicar capabilities reales desde el backend.
