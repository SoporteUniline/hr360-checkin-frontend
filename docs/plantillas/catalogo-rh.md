# Catálogo RH ADAMIA · 20 formatos

Versión 1.0, revisión de contenido: 7 de octubre de 2026.

## Uso y disponibilidad

Gestión documental → Plantillas → Plantillas ADAMIA. El catálogo incluye estas 20 bases y el acuse de políticas existente (21 en total). La búsqueda ignora acentos y consulta el catálogo completo; los filtros agrupan por tema.

1. Seleccionar formato y empresa autorizada.
2. Elegir al empleado. La búsqueda por nombre se realiza en el servidor con paginación, usando los parámetros existentes de empleados.
3. Completar los campos y revisar el documento. Se admiten hasta 15 registros por inventario/listado.
4. Generar: se crea o reutiliza una base de esa empresa y se guarda el HTML resuelto del documento individual.
5. Descargar el PDF o abrir Documentos emitidos para usar el flujo de firma existente.

La carta oferta permite escribir el nombre de un candidato sin alta. En ese caso se prepara únicamente un PDF local: no se crea empleado, expediente ni solicitud de firma. Debe descargarse antes de salir.

## Formatos

| Formato | Información principal |
| --- | --- |
| Acuerdo de confidencialidad laboral | Información protegida, finalidad, cuidados, vigencia y devolución |
| Responsiva de computadora, celular y equipo | Inventario, series, accesorios, estado y soporte |
| Constancia laboral | Puesto, ingreso, situación laboral y salario opcional con periodicidad |
| Aviso de privacidad para empleados y acuse de entrega | Responsable, datos, finalidades, transferencias, ARCO, mecanismos y versión |
| Descripción de puesto y acuse de conocimiento | Funciones, recursos, facultades, jefe y criterios |
| Carta oferta laboral | Puesto, jornada, remuneración, prestaciones, ingreso y vigencia |
| Designación y actualización de beneficiarios laborales | Personas designadas, relación y contacto |
| Actualización de datos y contacto de emergencia | Domicilio, contacto y personas a quienes avisar |
| Entrega de uniformes y herramientas | Inventario, tallas, cantidades, estado y reposición |
| Entrega de equipo de protección personal | Actividad, riesgos, especificaciones, instrucciones y contacto |
| Asignación y recepción de vehículo | Vehículo, kilometraje, accesorios, seguro y uso |
| Devolución de equipo y bienes de la empresa | Bienes recibidos, estado y pendientes |
| Entrega y recepción de puesto | Asuntos, archivos, accesos, responsables y fechas |
| Constancia de inducción al puesto | Temas explicados, evidencias y seguimiento |
| Constancia interna de participación en capacitación | Curso, instructor, periodo, horas y alcance |
| Plan de mejora y seguimiento | Objetivos, indicadores, apoyos, comentarios y revisiones |
| Convenio de promoción o cambio de puesto | Condiciones anteriores/nuevas, vigencia y continuidad de derechos |
| Declaración de posibles conflictos de interés | Ámbito, declaración, situación y revisión |
| Entrega y comprobación de viáticos | Anticipo, moneda, gastos y saldo aritmético sujeto a revisión |
| Autorización voluntaria de uso de imagen y voz | Decisión expresa, materiales, finalidad, medios, vigencia y retiro |

## Integración sin migraciones

No requiere SQL ni endpoints nuevos. Se utilizan las APIs existentes de plantillas, documentos, empleados, empresas y firma digital. El catálogo se distribuye con el frontend; abrirlo no crea registros en la base de datos.

- `src/lib/documentos/formatosRRHH.js`: metadatos, contenido, campos, validación y renderizado seguro.
- `src/components/documentos/FormularioFormatoRRHH.jsx`: controles reutilizables y listados repetibles.
- `src/components/documentos/CatalogoAdamia.jsx`: catálogo y navegación.
- `src/app/panel/gestion-documental/generar/page.jsx`: flujo existente ampliado.
- `src/lib/plantillasAdamia.js`: `guardarCopiaPlantilla` reutiliza la API; conserva el alias `guardarCopiaPoliticas`.
- `src/lib/documentos/paginacionPdf.js`: cortes de página sin partir líneas ni bloques cortos. El conversor PDF comprime imágenes y conserva el marco corporativo.

Cada base usa un código estable `AD-RH-<slug>-V1`. Nunca se almacenan en ella series, beneficiarios, viáticos ni valores del documento individual. Sólo el documento generado contiene los campos completados. Cambiar de empleado o empresa reinicia los datos específicos.

La base guardada se reconoce por código y HTML exacto. Si alguien modifica o desactiva una base, no se sobrescribe: el generador informa el conflicto. Para una redacción propia se debe crear una plantilla independiente y retirar el marcador de base; los campos adicionales de las bases guiadas no son variables disponibles en el editor tradicional. Una futura revisión del texto debe usar una nueva versión/código, con compatibilidad expresa para las anteriores, sin reescribir documentos emitidos.

El control de doble clic y la consulta antes/después de guardar reducen duplicados de plantillas. No sustituyen una restricción única o idempotencia en el servidor. La creación de documentos conserva el comportamiento del backend existente; un fallo de red posterior al guardado debe comprobarse en Documentos emitidos antes de repetir.

La selección de empresas se limita a las de la sesión. Se comprueba la empresa de las respuestas cuando la API devuelve `id_empresa`. La autorización definitiva y el aislamiento de datos siguen siendo responsabilidad del backend.

## Firmas y alcance

La integración actual solicita la firma digital de un empleado. No se añade firma múltiple de empresa, empleado y terceros ni se marca un acuerdo como firmado por todos. Los formatos incluyen espacios y avisos para completar la firma del responsable autorizado y, en entrega de puesto, del receptor. Constancia laboral y constancia interna de capacitación requieren firma de quien las expide; una firma del empleado no la sustituye.

Los documentos de actualización de datos y promoción no modifican automáticamente fichas, salarios, puestos u horarios. La información de viáticos es una comprobación documental, no un movimiento contable o de nómina.

El contenido es una base adaptable al caso real, no un formato oficial ni una certificación de cumplimiento. Se preservan, entre otros, estos límites:

- Confidencialidad delimitada, con excepciones para información pública, autoridades y ejercicio de derechos.
- Responsivas sin multas, descuentos automáticos o cobros por desgaste normal.
- Acuse de privacidad distinto de los consentimientos específicos que correspondan.
- Beneficiarios sin porcentajes que alteren derechos legales; no sustituye IMSS, AFORE o seguros.
- Capacitación interna sin presentar la constancia como DC-3 o acreditación de la STPS.
- Plan de mejora sin sanciones o terminación automáticas.
- Promoción con continuidad de antigüedad, derechos y consentimiento de ambas partes.
- Imagen y voz con decisión expresa, sin opción preseleccionada ni autorización irrevocable/general.

Fuentes oficiales consultadas para redactar las bases:

- [Ley Federal del Trabajo](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf).
- [Ley Federal de Protección de Datos Personales en Posesión de los Particulares](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf).
- [Ley Federal del Derecho de Autor](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFDA.pdf).
- [Acuerdo de capacitación y constancias de competencias o habilidades laborales](https://sidof.segob.gob.mx/notas/docFuente/5302582).

## Verificación

```sh
node --test scripts/test-formatos-rrhh.mjs scripts/test-plantillas-adamia.mjs scripts/test-paginacion-pdf.mjs
```

36 pruebas: veinte formatos completos, validaciones, escape de HTML/variables, fechas, decisiones expresas, saldo de viáticos, aislamiento/reutilización de bases, regresión del acuse y paginación PDF. Los datos de `scripts/fixtures/formatos-rrhh.mjs` son ficticios y exclusivos de pruebas.

Se verificó con navegador local y API simulada: generación de los veinte formatos, recuperación tras error de guardado, segunda empresa, cambio de empleado sin arrastrar inventarios, reutilización desde Mis plantillas, candidato sin alta, búsqueda de empleados fuera del listado inicial y solicitud de firma del documento generado. También se repitió el flujo del acuse existente. No hubo errores de JavaScript ni desbordamiento horizontal en las vistas revisadas a 390 px.

Se descargaron y revisaron PDF de confidencialidad, privacidad, carta oferta y viáticos, además del acuse existente. La revisión del aviso de privacidad identificó y corrigió un corte de línea en el conversor anterior. Estas pruebas no acreditan persistencia o firma en producción; no se emitieron documentos reales ni se enviaron solicitudes a empleados reales durante el desarrollo.

## Publicación

La disponibilidad para todas las empresas requiere desplegar el frontend. El workflow `deploy-prod.yml` existente es manual (`workflow_dispatch`) y toma `main`. Integrar el PR a `main` no ejecuta automáticamente producción. No se modifica ese mecanismo.
