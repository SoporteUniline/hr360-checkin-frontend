# Reclutamiento

Convenciones del módulo (03/12/2026: conectado al servidor; la demostración quedó en el historial de git):

- Usar JavaScript/JSX, componentes compartidos de `@/components/ui`, lucide y los estilos claros de ADAMIA. No agregar otro sistema de diseño ni dependencias sin necesidad.
- Separar vistas, formularios, modelo y acceso a datos. Mantener las páginas como puntos de entrada pequeños.
- Mantener Reclutamiento y selección como módulo independiente, con rutas propias y navegación compartida en `navigation.js`. El layout conserva un único estado (`RecruitmentModule` + `useReclutamiento`, una consulta SWR del resumen de la empresa); no crear almacenes por página.
- Datos reales: API en `src/lib/reclutamiento/api.js` (`/api/reclutamiento/panel`, ver `docs/reclutamiento-real.md` del backend) y traducción servidor ↔ pantallas en `src/lib/reclutamiento/adaptador.mjs` (probada en `scripts/test-reclutamiento-adaptador.mjs`). La empresa la valida el servidor contra la sesión.
- Sucursal = catálogo «Sucursales» (`unidades_de_negocio`); modalidad = catálogo propio (tres base + las de la empresa). Las preguntas conservan su ID al reordenarse; las respuestas guardan una instantánea de la pregunta. Los archivos solo se piden como currículum.
- WhatsApp: no duplicar agenda ni preguntas; reutilizar `@/components/whatsapp/*` (enlace, `EditorEntrevista`, `AgendaVacante`). Desde el 04/12/2026 (`docs/candidato-whatsapp.md` del backend) el candidato de WhatsApp que aceptó el aviso es una postulación más (`origin: "whatsapp"`): mismo expediente, etapas, notas y «Contratar» (`HiringForm.jsx`, compartido con el chat), más su entrevista con el agente, «Abrir chat», la sugerencia de etapa del agente (un clic) y «Avisarle por WhatsApp» (`ProcesoWhatsapp.jsx`; nunca se envía sin que RH pulse «Enviar aviso»). En el chat lo muestra `@/components/whatsapp/ProcesoChat.jsx`. Solo los que aún no aceptan el aviso siguen en solo lectura («Iniciar proceso» si ya aceptaron). Reglas puras en `src/lib/reclutamiento/procesoWhatsapp.mjs` (`scripts/test-proceso-whatsapp.mjs`).
- «Contratar» lo hace el servidor en una transacción (crea o enlaza la ficha del empleado, marca la postulación y cierra la vacante al llenarse). Nunca simularlo en el navegador.
- Móvil: formularios de una columna, acciones accesibles sin desbordamiento (botones de 44 px), controles etiquetados y alternativa al arrastre.
- Verificar el recorrido completo (`scripts/verify-reclutamiento-real.mjs`) en móvil y escritorio antes de subir cambios.
