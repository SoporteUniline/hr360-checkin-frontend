# Acuse de recepción y lectura de políticas

Formato base ADAMIA 1.0, revisado el 7 de octubre de 2026.

## Uso

1. Gestión documental → Plantillas → Plantillas ADAMIA.
2. Ver y usar plantilla → seleccionar empresa y completar lugar, medio de entrega y contacto.
3. Identificar cada política por nombre, versión o fecha de emisión y referencia para consulta.
4. Guardar copia y usar → seleccionar empleado → revisar → generar.
5. Documentos emitidos → abrir documento → solicitar firma, usando la integración existente.

El catálogo es común y de solo lectura. La copia se crea por empresa a través de la API existente únicamente al pulsar Guardar copia y usar. No hay SQL, migraciones, modificaciones de backend, creación masiva al iniciar sesión ni envío automático al trabajador. Los datos de la política se incorporan al HTML de la copia; el empleado y la empresa se resuelven al generar el documento.

## Alcance del texto

Fuente oficial: [Ley Federal del Trabajo, texto vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf), consultada el 7 de octubre de 2026.

- Arts. 5 y 33: reserva de derechos, sin renuncias, descuentos o sanciones automáticas.
- Art. 134, fracción I: observancia de disposiciones laborales aplicables.
- Arts. 422 a 425: distingue políticas de un Reglamento Interior de Trabajo y no sustituye los procedimientos de este último.

No se presenta como formato oficial obligatorio ni como validación jurídica de las políticas de cada empresa. El trabajador debe recibir los documentos identificados y leerlos antes de firmar. La firma se refiere a esas versiones, no a cambios futuros. El sistema no puede comprobar por sí solo que las políticas se entregaron ni que fueron leídas.

## Integración y controles

- Catálogo y construcción segura del HTML: `src/lib/plantillasAdamia.js`.
- La referencia de copia usa SHA-256 de empresa y contenido. Se consulta antes de crear y se vuelve a consultar después de un error de guardado. No se sobrescriben copias editadas o inactivas.
- El botón evita envíos simultáneos en la misma vista. La unicidad absoluta entre dispositivos depende de las restricciones de la API/BD existente; no se afirma idempotencia de servidor.
- Generador y documentos emitidos conservan la empresa elegida. Los identificadores de URL se contrastan con las empresas de la sesión. La autorización real sigue siendo responsabilidad del servidor.
- Las entradas de texto se escapan como texto, incluyendo llaves, para impedir que incorporen HTML o variables adicionales.
- Se guarda el HTML resuelto y se usa esa misma instantánea en la descarga posterior a generar.
- No se modifica la firma digital ni se firma o emite ningún documento real como parte del desarrollo.

## Verificación

`node scripts/test-plantillas-adamia.mjs` verifica campos requeridos, escape de texto, separación por empresa, reutilización de una copia, recuperación tras timeout y protección de personalizaciones. Las pruebas de API usan dobles locales y no prueban el backend de producción.

`docs/plantillas/acuse-lectura-politicas.html` permite revisar el formato sin crear registros; conserva marcadores de los datos que debe completar cada empresa.

También se verificó en navegador con una API simulada: catálogo → copia en la segunda empresa de la sesión → empleado → documento → PDF → solicitud de firma. Se comprobó que no se crean copias al abrir el catálogo, no se acepta una empresa ajena a la sesión y no hay errores de JavaScript ni desbordamiento horizontal a 390 px. El PDF de prueba se revisó visualmente. Esta prueba no acredita persistencia ni firma en el backend real.

## Publicación

El workflow existente `.github/workflows/deploy-prod.yml` despliega `main` y se inicia manualmente mediante `workflow_dispatch`. Subir el commit a `main` no ejecuta por sí solo ese despliegue. No se cambia este mecanismo ni se omiten sus validaciones.
