# Reclutamiento

Convenciones acordadas para esta entrega de diseño, basadas en el frontend existente:

- Usar JavaScript/JSX, componentes compartidos de `@/components/ui`, lucide y los estilos claros de ADAMIA. No agregar otro sistema de diseño ni dependencias sin necesidad.
- Separar vistas, formularios, modelo y acceso a datos. Mantener las páginas como puntos de entrada pequeños.
- Mantener Reclutamiento y selección como módulo independiente, con rutas propias y navegación compartida en `navigation.js`. El layout conserva un único estado de prueba; no crear almacenes por página.
- Esta entrega es una demostración. No conectar escrituras a vacantes, postulaciones, empleados, correo ni nómina hasta confirmar el contrato con Luis.
- El adaptador de demostración vive en `src/lib/reclutamiento/demoStore.js`. Usar datos ficticios, mantener aviso visible y aislar las pruebas por usuario/empresa.
- Conservar las rutas públicas y la autenticación existentes. La vista de prueba usa `/reclutamiento-demo/` y no debe presentarse como una vacante pública real.
- Sucursal y modalidad son IDs de catálogos separados. Las preguntas conservan su ID al reordenarse; las respuestas guardan una instantánea de la pregunta.
- Móvil: formularios de una columna, acciones accesibles sin desbordamiento, controles etiquetados y alternativa al arrastre.
- Verificar el recorrido completo y las pantallas móvil/escritorio antes de subir cambios. Documentar lo pendiente de backend sin simular que ya funciona en producción.
