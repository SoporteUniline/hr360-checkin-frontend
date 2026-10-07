import { escapeDocumentText } from "../plantillasAdamia.js";

const LFT = "https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf";
const DATOS = "https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf";
const AUTOR = "https://www.diputados.gob.mx/LeyesBiblio/pdf/LFDA.pdf";
const campo = (key, label, type = "text", extra = {}) => ({ key, label, type, required: true, ...extra });
const texto = (key, label, extra = {}) => campo(key, label, "textarea", extra);
const fecha = (key, label, extra = {}) => campo(key, label, "date", extra);
const numero = (key, label, extra = {}) => campo(key, label, "number", { min: 0, max: 100000000, ...extra });
const opcion = (key, label, options, extra = {}) => campo(key, label, "select", { options, ...extra });
const filas = (key, label, columns) => campo(key, label, "rows", { columns, maxRows: 15 });
const inventario = [campo("articulo", "Artículo y características"), numero("cantidad", "Cantidad", { min: 1, integer: true }), campo("identificador", "Serie, talla o identificación"), campo("estado", "Estado y accesorios")];
const sinDescuentos = "La firma acredita la entrega o recepción descrita. No autoriza descuentos automáticos, multas ni cobros por desgaste normal. Cualquier responsabilidad deberá determinarse con hechos verificables y conforme a la legislación aplicable, incluido el artículo 110 de la LFT.";
const reserva = "Este documento no implica renuncia a derechos laborales ni valida condiciones contrarias a la ley. Se entrega copia a la persona interesada y se conserva en el expediente con acceso restringido.";
const base = (codigo, nombre, grupo, descripcion, campos, clausulas, extra = {}) => ({
  codigo, nombre, grupo, descripcion, campos, clausulas, version: "1.0", revision: "2026-10-07", categoria: "RRHH", fuentes: [LFT], firmas: "ambas", ...extra,
});

/** Formatos declarativos: el contenido individual nunca se guarda en la plantilla base. */
export const FORMATOS_RRHH = [
  base("confidencialidad-laboral", "Acuerdo de confidencialidad laboral", "Información y privacidad", "Define información protegida, uso permitido y obligaciones de cuidado.", [
    texto("informacion", "Información confidencial que se protege", { placeholder: "Ej. precios no públicos, expedientes de clientes y procesos internos" }),
    texto("finalidad", "Uso autorizado de la información"), texto("medidas", "Medidas de cuidado y canales autorizados"),
    campo("contacto", "Contacto para reportar incidentes"), texto("devolucion", "Procedimiento de devolución o eliminación autorizada"),
    texto("vigencia", "Vigencia y criterios para mantener la confidencialidad", { placeholder: "Definir duración y supuestos; distinguir información que conserva legítimamente su carácter reservado" }),
  ], [
    ["Objeto y uso permitido", "La empresa y la persona trabajadora acuerdan proteger exclusivamente la información identificada en este documento a la que se acceda por razón del trabajo. Su utilización se limita a la finalidad indicada y al acceso necesario para las funciones asignadas."],
    ["Obligaciones de cuidado", "La persona trabajadora observará las medidas descritas, evitará copias o comunicaciones no autorizadas y reportará oportunamente pérdidas, accesos indebidos o divulgaciones. La empresa facilitará medios, instrucciones y accesos adecuados para cumplir estas obligaciones."],
    ["Excepciones", "No queda comprendida la información que sea pública sin incumplimiento de este acuerdo, se conociera legítimamente con anterioridad o se obtenga lícitamente de un tercero sin deber de reserva. Tampoco se impide proporcionar información a autoridades competentes, denunciar conductas ilícitas ni ejercer o defender derechos laborales."],
    ["Cierre y alcance", "Al concluir el acceso se seguirá el procedimiento de devolución o eliminación indicado, respetando las obligaciones de conservación y la evidencia necesaria para la defensa de derechos. Este acuerdo no establece exclusividad, prohibición de trabajar para terceros ni penalizaciones automáticas. " + reserva],
  ], { aviso: "Delimita información y vigencia. La firma de la empresa debe completarse por su representante autorizado.", bilateral: true }),
  base("responsiva-equipo", "Responsiva de computadora, celular y equipo", "Equipo y recursos", "Documenta equipo, series, accesorios y condiciones de entrega.", [
    fecha("fecha_entrega", "Fecha de entrega"), filas("equipos", "Equipo entregado", inventario),
    texto("uso", "Uso autorizado y cuidados"), campo("soporte", "Contacto de soporte y reporte de incidentes"),
    texto("devolucion", "Condiciones y lugar de devolución"),
  ], [
    ["Entrega y recepción", "La empresa entrega a la persona trabajadora los bienes identificados, en las condiciones registradas. Las observaciones forman parte de esta constancia y deben revisarse antes de firmar."],
    ["Custodia y uso", "Los bienes se utilizarán para las actividades autorizadas y con los cuidados indicados. Las fallas, pérdidas o daños se reportarán al contacto señalado; su reparación y sustitución se coordinarán con la empresa. La persona trabajadora no deberá compartir contraseñas personales en este documento."],
    ["Devolución y responsabilidad", "La devolución se documentará mediante recepción e inventario. " + sinDescuentos],
  ]),
  base("constancia-laboral", "Constancia laboral", "Expediente y contratación", "Acredita la relación laboral, el puesto y la antigüedad.", [
    campo("destinatario", "Dirigida a", "text", { placeholder: "A quien corresponda" }), campo("puesto", "Puesto", "text", { auto: "empleado.puesto" }),
    fecha("ingreso", "Fecha de ingreso", { auto: "empleado.fecha_ingreso" }),
    opcion("situacion", "Situación laboral", ["Relación laboral vigente", "Relación laboral concluida"]),
    fecha("fin_relacion", "Fecha de conclusión", { when: ["situacion", "Relación laboral concluida"] }),
    texto("salario", "Salario y periodicidad, si se desea incluir", { required: false, placeholder: "Ej. importe bruto mensual, moneda y concepto; omitir si no se requiere" }),
    campo("finalidad", "Finalidad de la constancia"), campo("contacto", "Contacto para verificar la constancia"),
  ], [
    ["Constancia", "La empresa hace constar, con base en sus registros, la relación laboral, puesto y fechas indicados de la persona identificada. En caso de incluir salario, su importe, concepto y periodicidad son los expresamente descritos."],
    ["Expedición", "Se expide a solicitud de la persona interesada para la finalidad indicada. El responsable de emisión deberá comprobar los datos antes de firmar. Esta constancia no garantiza créditos, obligaciones frente a terceros ni una duración futura de la relación laboral."],
  ], { firmas: "empresa", aviso: "La constancia debe ser firmada por quien está autorizado para emitirla en la empresa." }),
  base("aviso-privacidad-empleados", "Aviso de privacidad para empleados y acuse de entrega", "Información y privacidad", "Informa el tratamiento de datos y registra la entrega del aviso.", [
    campo("responsable_legal", "Nombre o razón social del responsable"), texto("domicilio", "Domicilio del responsable"),
    texto("datos", "Datos personales tratados", { placeholder: "Enumerar categorías reales; identificar expresamente los datos sensibles, biométricos o de ubicación si se recaban" }),
    texto("finalidades", "Finalidades necesarias del tratamiento"), texto("secundarias", "Finalidades secundarias y mecanismo para negarse", { placeholder: "Indicar No se realizan si no existen finalidades secundarias" }),
    texto("transferencias", "Transferencias: destinatarios, finalidades y fundamento", { placeholder: "Distinguir encargados y terceros; identificar las transferencias que requieren consentimiento" }),
    texto("arco", "Procedimiento y contacto para derechos ARCO"), texto("limitacion", "Cómo limitar el uso o divulgación y revocar el consentimiento"),
    texto("cambios", "Medio para comunicar cambios al aviso"), campo("version", "Versión y fecha del aviso"),
    campo("entrega", "Medio de entrega y acceso al aviso completo"),
  ], [
    ["Información sobre el tratamiento", "El responsable identificado informa a la persona titular que sus datos serán tratados para las finalidades aquí descritas, aplicando medidas de seguridad, confidencialidad y conservación acordes con su naturaleza y con las obligaciones legales aplicables. La recolección se limitará a lo necesario para dichas finalidades."],
    ["Decisiones de la persona titular", "La persona titular podrá ejercer sus derechos de acceso, rectificación, cancelación y oposición mediante el procedimiento señalado, así como limitar el uso o divulgación y revocar su consentimiento cuando proceda. Las finalidades secundarias y transferencias sujetas a consentimiento requieren el mecanismo correspondiente, sin condicionar indebidamente la relación laboral."],
    ["Acuse de entrega", "La firma del acuse acredita que se puso a disposición este aviso y su medio de consulta. No equivale a una autorización general para cualquier tratamiento. Cuando se requiera consentimiento expreso, incluido el escrito para datos sensibles salvo excepción legal, deberá recabarse de forma específica y separada antes del tratamiento correspondiente."],
  ], { fuentes: [DATOS], aviso: "Personaliza este aviso con las prácticas reales de la empresa. El acuse no sustituye los consentimientos específicos que resulten necesarios." }),
  base("descripcion-puesto", "Descripción de puesto y acuse de conocimiento", "Expediente y contratación", "Deja claras funciones, responsabilidades y relaciones de trabajo.", [
    campo("puesto", "Nombre del puesto", "text", { auto: "empleado.puesto" }), campo("area", "Área o departamento", "text", { auto: "empleado.departamento" }),
    campo("jefe", "Jefe directo o puesto al que reporta"), texto("objetivo", "Objetivo del puesto"),
    texto("funciones", "Funciones y responsabilidades"), texto("alcance", "Facultades y límites de decisión"),
    texto("recursos", "Recursos y apoyos disponibles"), texto("indicadores", "Indicadores y criterios de seguimiento"), campo("version", "Versión del perfil y fecha de aplicación"),
  ], [
    ["Conocimiento del puesto", "La empresa comunica el objetivo, funciones, recursos y criterios de seguimiento descritos. La persona trabajadora manifiesta haber recibido esta descripción y conocer el canal de coordinación con su jefe directo."],
    ["Aplicación", "Las funciones se realizarán dentro de las condiciones de trabajo pactadas, con las medidas de seguridad y capacitación necesarias. Esta descripción no faculta cambios unilaterales de salario, jornada, categoría o condiciones esenciales. Las modificaciones que requieran acuerdo deberán documentarse por separado. " + reserva],
  ]),
  base("carta-oferta", "Carta oferta laboral", "Expediente y contratación", "Presenta una propuesta clara de puesto, condiciones e ingreso.", [
    campo("puesto", "Puesto ofrecido"), campo("area", "Área y jefe directo"), campo("centro", "Centro de trabajo y modalidad"),
    texto("jornada", "Días, horario, descansos y jornada"), texto("salario", "Salario bruto, moneda y periodicidad de pago"),
    texto("prestaciones", "Prestaciones legales y adicionales ofrecidas"), campo("duracion", "Tipo y duración de la relación propuesta"),
    fecha("ingreso", "Fecha propuesta de ingreso"), fecha("validez", "Fecha límite para responder"), campo("contacto", "Contacto y medio para responder"),
  ], [
    ["Propuesta de incorporación", "La empresa presenta a la persona destinataria la oferta de incorporación con las condiciones expresamente descritas. La aceptación, observaciones o solicitud de aclaración podrán comunicarse por el medio señalado dentro de la vigencia de la oferta."],
    ["Formalización", "Antes del inicio se documentarán las condiciones de trabajo aplicables. Esta carta no sustituye el contrato ni autoriza a omitir las obligaciones que nacen de una relación laboral efectiva. Cualquier periodo de prueba o capacitación inicial deberá ajustarse a los supuestos y requisitos legales, sin presumirse por esta oferta."],
    ["Alcance", "Las prestaciones ofrecidas respetarán los mínimos legales. No se exige renuncia a derechos, pagos para acceder al empleo ni entrega de documentos originales como garantía. La firma del destinatario expresa su respuesta a la propuesta descrita; la empresa deberá formalizar su propia aceptación mediante representante autorizado."],
  ], { candidato: true, bilateral: true, aviso: "Para un candidato sin alta puedes preparar un PDF. El expediente y la solicitud de firma del sistema requieren un empleado registrado." }),
  base("beneficiarios-laborales", "Designación y actualización de beneficiarios laborales", "Expediente y contratación", "Registra a las personas designadas y sus datos de contacto.", [
    opcion("movimiento", "Tipo de declaración", ["Designación inicial", "Actualización de designación anterior"]),
    filas("beneficiarios", "Personas designadas", [campo("nombre", "Nombre completo"), campo("relacion", "Parentesco o relación"), campo("contacto", "Medio de contacto")]),
    texto("observaciones", "Información para identificar o localizar a las personas", { required: false }),
  ], [
    ["Manifestación de voluntad", "La persona trabajadora manifiesta que designa a las personas relacionadas para los efectos laborales previstos en el artículo 25, fracción X, de la LFT. Si se trata de una actualización, solicita incorporar esta declaración al expediente y conservar el antecedente con su fecha."],
    ["Alcance legal", "La designación se interpretará junto con los artículos 501 y demás disposiciones aplicables. No determina por sí sola la titularidad definitiva ni el orden de concurrencia de quienes tengan derecho; cuando corresponda, la autoridad competente resolverá. No sustituye las designaciones del IMSS, AFORE, seguros o un testamento."],
    ["Conservación", "La persona trabajadora podrá solicitar una actualización. La empresa conservará los datos con acceso limitado a los fines indicados y conforme a su aviso de privacidad. No se requieren porcentajes que pretendan alterar los derechos establecidos por la ley."],
  ], { aviso: "Esta designación no sustituye los trámites ante IMSS, AFORE o aseguradoras, ni la determinación legal de beneficiarios." }),
  base("actualizacion-datos", "Actualización de datos y contacto de emergencia", "Expediente y contratación", "Mantiene actualizados los datos de contacto del expediente.", [
    campo("domicilio", "Domicilio actualizado"), campo("telefono", "Teléfono de contacto"), campo("correo", "Correo de contacto", "email", { auto: "empleado.email" }),
    filas("contactos", "Contactos de emergencia", [campo("nombre", "Nombre completo"), campo("relacion", "Relación con la persona trabajadora"), campo("telefono", "Teléfono")]),
    fecha("vigencia", "Fecha de actualización"), campo("aviso", "Referencia al aviso de privacidad disponible"),
  ], [
    ["Actualización solicitada", "La persona trabajadora comunica los datos indicados para su incorporación al expediente y solicita que las comunicaciones se realicen con la información actualizada. Los datos anteriores se conservarán únicamente cuando exista una finalidad o deber legal que lo justifique."],
    ["Contacto de emergencia", "Los contactos se utilizarán para comunicar una situación de emergencia relacionada con la persona trabajadora. Su registro no les concede representación legal, acceso general al expediente ni autorización para recibir pagos. La empresa atenderá las obligaciones de información y protección de datos de terceros."],
    ["Alcance", "Esta constancia documenta la solicitud de actualización; el responsable de RH deberá realizar y verificar los cambios en los registros correspondientes. La firma no autoriza usos ajenos al aviso de privacidad indicado."],
  ], { fuentes: [DATOS], aviso: "Generar el documento no modifica automáticamente los datos del empleado; RH debe actualizar su ficha." }),
  base("uniformes-herramientas", "Entrega de uniformes y herramientas", "Equipo y recursos", "Registra cantidades, tallas y condiciones de los artículos entregados.", [
    fecha("fecha_entrega", "Fecha de entrega"), filas("articulos", "Artículos entregados", inventario),
    texto("uso", "Uso, cuidado y reposición"), campo("contacto", "Responsable para reportar faltantes o deterioro"),
  ], [
    ["Recepción", "La persona trabajadora recibe los artículos relacionados para el desempeño de sus actividades. Las cantidades, tallas, identificadores y condiciones consignadas serán revisadas por ambas partes al realizar la entrega."],
    ["Conservación y reposición", "Se observarán las instrucciones de cuidado y se reportará oportunamente la necesidad de reposición. La empresa atenderá el suministro y mantenimiento que legalmente le corresponda. El desgaste derivado del uso normal se distinguirá de cualquier incidente que requiera aclaración."],
    ["Alcance", sinDescuentos],
  ]),
  base("equipo-proteccion", "Entrega de equipo de protección personal", "Equipo y recursos", "Registra el equipo y las instrucciones de seguridad proporcionadas.", [
    campo("actividad", "Puesto, actividad y riesgos identificados"), fecha("fecha_entrega", "Fecha de entrega"),
    filas("equipos", "Equipo de protección entregado", [campo("equipo", "Equipo y especificación"), numero("cantidad", "Cantidad", { min: 1, integer: true }), campo("talla", "Talla o ajuste"), campo("estado", "Estado y compatibilidad")]),
    texto("instrucciones", "Instrucciones de uso, revisión, limpieza y reposición"), campo("capacitacion", "Fecha y responsable de la instrucción"), campo("contacto", "Contacto para reportar defectos o falta de equipo"),
  ], [
    ["Entrega e instrucción", "La empresa entrega el equipo relacionado e informa las instrucciones descritas. La persona trabajadora verificará su recepción, ajuste y estado, y comunicará faltantes, defectos o incompatibilidades antes de realizar actividades que requieran protección."],
    ["Responsabilidades", "El equipo se utilizará conforme a las instrucciones y capacitación recibidas. La empresa mantiene sus obligaciones de identificar riesgos, seleccionar equipo adecuado, capacitar, mantener y reponer lo necesario. La firma no acredita por sí sola la eliminación de riesgos ni sustituye la evaluación del centro de trabajo."],
    ["Alcance", "Este registro no exime a la empresa de sus obligaciones de seguridad y salud ni autoriza cobros automáticos por reposición. " + reserva],
  ], { aviso: "El equipo debe corresponder a los riesgos reales del puesto y a las normas de seguridad aplicables." }),
  base("asignacion-vehiculo", "Asignación y recepción de vehículo", "Equipo y recursos", "Documenta vehículo, accesorios, documentos y uso autorizado.", [
    campo("vehiculo", "Marca, modelo, año, placas e identificación"), fecha("fecha_entrega", "Fecha de entrega"),
    numero("kilometraje", "Kilometraje inicial"), campo("combustible", "Nivel de combustible"),
    texto("estado", "Estado, accesorios y documentos entregados"), texto("uso", "Uso autorizado, conductores y zona de operación"),
    campo("seguro", "Póliza y contacto para siniestros"), texto("mantenimiento", "Mantenimiento y procedimiento ante incidentes"), texto("devolucion", "Condiciones de devolución"),
  ], [
    ["Asignación", "La empresa asigna el vehículo descrito para las actividades autorizadas. Ambas partes registran su estado, kilometraje, combustible y accesorios, incluyendo las observaciones que existan al momento de la entrega."],
    ["Uso y reporte", "La persona autorizada deberá contar con la licencia correspondiente, atender las disposiciones de tránsito y reportar incidentes por el canal indicado. La empresa coordinará mantenimiento, seguros y condiciones de operación seguras. Las jornadas y descansos se sujetan a las condiciones de trabajo y la ley."],
    ["Responsabilidad", "La asignación no transfiere automáticamente a la persona trabajadora los riesgos de la operación, deducibles, multas o daños. Cada hecho requiere revisión conforme a la ley. " + sinDescuentos],
  ]),
  base("devolucion-bienes", "Devolución de equipo y bienes de la empresa", "Equipo y recursos", "Cierra la entrega de bienes con inventario y recepción documentada.", [
    fecha("fecha_devolucion", "Fecha de devolución"), filas("bienes", "Bienes devueltos", inventario),
    texto("pendientes", "Faltantes o asuntos pendientes de aclaración", { placeholder: "Indicar Sin pendientes cuando corresponda" }),
    texto("recepcion", "Resultado de la revisión y observaciones del receptor"),
  ], [
    ["Recepción de bienes", "La empresa recibe de la persona identificada los bienes relacionados, en el estado descrito. Las observaciones y pendientes se registran para su revisión, sin presumir responsabilidad por la sola existencia de una diferencia."],
    ["Alcance de la devolución", "Este documento acredita exclusivamente la devolución registrada. No constituye finiquito, renuncia, liberación general de responsabilidades ni condición para pagar salarios o prestaciones. Cualquier aclaración se tramitará por separado, sin descuentos automáticos. " + reserva],
  ]),
  base("entrega-puesto", "Entrega y recepción de puesto", "Expediente y contratación", "Ordena pendientes, archivos y responsabilidades al cambiar de encargado.", [
    campo("puesto", "Puesto o función que se entrega", "text", { auto: "empleado.puesto" }), campo("receptor", "Nombre y puesto de quien recibe"), fecha("fecha_entrega", "Fecha de entrega"),
    filas("pendientes", "Asuntos y entregables", [campo("asunto", "Asunto o proyecto"), campo("estado", "Estado y siguiente acción"), campo("responsable", "Responsable de seguimiento"), fecha("fecha", "Fecha compromiso")]),
    texto("archivos", "Ubicación de archivos y documentos entregados"), texto("accesos", "Accesos a transferir o revocar, sin contraseñas"),
    texto("observaciones", "Observaciones y alcance de la recepción"),
  ], [
    ["Entrega operativa", "La persona que entrega informa el estado de los asuntos relacionados y pone a disposición los archivos y entregables indicados. Quien recibe revisará su disponibilidad y documentará las observaciones o pendientes dentro del seguimiento acordado."],
    ["Continuidad y seguridad", "La transferencia de accesos deberá coordinarse con los responsables autorizados. No se incorporarán contraseñas, códigos de autenticación ni llaves privadas. La recepción no acredita automáticamente que cada asunto esté concluido ni releva obligaciones legales."],
    ["Alcance", "Esta constancia se limita a la transición operativa y no sustituye documentos de modificación o terminación laboral. " + reserva],
  ], { firmaExtra: "receptor" }),
  base("induccion-puesto", "Constancia de inducción al puesto", "Capacitación y desempeño", "Registra temas explicados, responsables y actividades de incorporación.", [
    campo("puesto", "Puesto de incorporación", "text", { auto: "empleado.puesto" }), fecha("fecha_induccion", "Fecha de inducción"),
    filas("temas", "Temas impartidos", [campo("tema", "Tema y alcance"), campo("responsable", "Persona que lo explicó"), campo("evidencia", "Material o evidencia")]),
    texto("pendientes", "Dudas o actividades pendientes", { placeholder: "Indicar Sin pendientes cuando corresponda" }), campo("seguimiento", "Responsable y fecha de seguimiento"),
  ], [
    ["Participación", "Se hace constar la participación de la persona trabajadora en la inducción descrita. Los temas, responsables y materiales relacionados delimitan el alcance de la información proporcionada."],
    ["Seguimiento", "Las dudas y actividades pendientes serán atendidas por el responsable señalado. La persona trabajadora podrá solicitar explicaciones o práctica adicional. La constancia no presume competencia para tareas de riesgo ni sustituye capacitación, autorizaciones o evaluaciones específicas."],
    ["Registro", "La firma confirma la participación y permite dejar observaciones. No constituye una renuncia a recibir capacitación adicional ni una certificación oficial."],
  ]),
  base("capacitacion-interna", "Constancia interna de participación en capacitación", "Capacitación y desempeño", "Documenta una actividad de capacitación y su alcance real.", [
    campo("curso", "Nombre del curso o actividad"), campo("instructor", "Nombre del instructor y organización"),
    fecha("inicio", "Fecha de inicio"), fecha("fin", "Fecha de conclusión"), numero("horas", "Duración en horas", { min: 0.25, max: 1000 }),
    campo("modalidad", "Modalidad y lugar o plataforma"), texto("temario", "Temas desarrollados"),
    opcion("resultado", "Alcance de la constancia", ["Participación, sin evaluación de competencia", "Participación con evaluación interna"]),
    texto("evidencia", "Evidencia de asistencia y, en su caso, evaluación"),
  ], [
    ["Participación registrada", "La empresa hace constar que la persona identificada participó en la actividad, periodo y duración descritos, conforme a las evidencias señaladas. Si hubo evaluación interna, su alcance se limita a los criterios documentados."],
    ["Alcance de la constancia", "Este documento es una constancia interna de participación. No se presenta como DC-3, acreditación de la STPS, certificación profesional ni autorización para realizar actividades reguladas. La expedición de constancias de competencias o habilidades laborales y sus registros requiere atender los requisitos aplicables."],
  ], { firmas: "empresa", fuentes: [LFT, "https://sidof.segob.gob.mx/notas/docFuente/5302582"], aviso: "Constancia interna: no sustituye una DC-3 ni acredita por sí sola competencia para tareas de riesgo." }),
  base("plan-mejora", "Plan de mejora y seguimiento", "Capacitación y desempeño", "Establece objetivos, apoyos y revisiones acordadas con el colaborador.", [
    fecha("inicio", "Inicio del plan"), fecha("fin", "Fecha de revisión final"), campo("jefe", "Jefe o responsable de acompañamiento"),
    texto("contexto", "Situación observada y ejemplos verificables"),
    filas("objetivos", "Objetivos y apoyos", [campo("objetivo", "Objetivo concreto"), campo("indicador", "Evidencia o indicador"), campo("apoyo", "Apoyo de la empresa"), fecha("revision", "Fecha de revisión")]),
    texto("comentarios", "Comentarios del colaborador y acuerdos de revisión"),
  ], [
    ["Finalidad del plan", "Las partes establecen un seguimiento para apoyar la mejora en los aspectos descritos, con objetivos observables, recursos y fechas de revisión. Los avances se valorarán con evidencia y tomando en cuenta los apoyos efectivamente proporcionados."],
    ["Participación y seguimiento", "La persona trabajadora podrá presentar observaciones, aclaraciones y necesidades de capacitación. Cada revisión deberá registrar avances y ajustes acordados; el documento no implica aceptación forzada de hechos controvertidos."],
    ["Alcance", "Este plan no constituye sanción, acta administrativa ni causal automática de terminación. No condiciona el pago de derechos adquiridos ni sustituye los procedimientos legales aplicables. " + reserva],
  ]),
  base("promocion-puesto", "Convenio de promoción o cambio de puesto", "Expediente y contratación", "Documenta las condiciones acordadas y su fecha de aplicación.", [
    campo("puesto_anterior", "Puesto anterior", "text", { auto: "empleado.puesto" }), campo("puesto_nuevo", "Nuevo puesto y área"), fecha("vigencia", "Fecha de aplicación"),
    texto("funciones", "Funciones acordadas"), texto("salario", "Salario bruto, moneda y periodicidad acordados"),
    texto("jornada", "Jornada, horario, descansos y centro de trabajo"), texto("prestaciones", "Prestaciones y demás condiciones acordadas"),
    texto("antecedente", "Contrato o documento de referencia y condiciones que se conservan"),
  ], [
    ["Acuerdo de modificación", "La empresa, por conducto de su representante autorizado, y la persona trabajadora acuerdan la modificación expresamente descrita a partir de la fecha indicada. Las condiciones restantes del vínculo laboral continúan vigentes en cuanto no hayan sido modificadas válidamente."],
    ["Continuidad de derechos", "El cambio no reinicia la antigüedad ni extingue derechos o prestaciones devengados. Las nuevas condiciones respetarán la legislación, los contratos aplicables y los derechos de la persona trabajadora; no podrán interpretarse como renuncia a mínimos legales."],
    ["Formalización", "Ambas partes deberán revisar el contenido y firmarlo, conservando una copia. Las aclaraciones o desacuerdos se resolverán antes de formalizarlo. La generación o una sola firma no acreditan por sí mismas el consentimiento de ambas partes."],
  ], { bilateral: true, aviso: "Requiere acuerdo y firma de ambas partes. El formato no actualiza automáticamente puesto, salario ni horario en ADAMIA." }),
  base("conflicto-interes", "Declaración de posibles conflictos de interés", "Información y privacidad", "Permite informar situaciones que pueden influir en decisiones del puesto.", [
    texto("ambito", "Decisiones o funciones a las que se refiere la declaración"),
    opcion("situacion", "Situación declarada", ["No identifico un conflicto en el ámbito descrito", "Declaro una situación para revisión"]),
    texto("detalle", "Descripción de la situación", { when: ["situacion", "Declaro una situación para revisión"] }),
    texto("medidas", "Medidas propuestas o canal de consulta"), campo("contacto", "Responsable que recibirá y revisará la declaración"),
  ], [
    ["Declaración", "La persona trabajadora informa la situación seleccionada con base en su conocimiento y en las funciones delimitadas. La finalidad es detectar y gestionar circunstancias que puedan afectar la imparcialidad de decisiones, sin presumir por ello una conducta indebida."],
    ["Revisión", "La empresa valorará la relevancia del caso, escuchará aclaraciones y acordará medidas proporcionales. Se evitará solicitar datos personales ajenos al propósito de la revisión y se restringirá el acceso a la información recibida."],
    ["Actualización y alcance", "Si cambian las circunstancias relevantes, podrá presentarse una actualización. La declaración no establece prohibiciones generales de relaciones personales o de actividades lícitas, ni sanciones automáticas. " + reserva],
  ]),
  base("viaticos", "Entrega y comprobación de viáticos", "Equipo y recursos", "Registra anticipo, gastos comprobados y saldo de un viaje.", [
    campo("motivo", "Motivo, destino y autorización del viaje"), fecha("inicio", "Fecha de salida"), fecha("fin", "Fecha de regreso"),
    opcion("moneda", "Moneda", ["MXN", "USD", "EUR"]), numero("anticipo", "Anticipo recibido"),
    filas("gastos", "Gastos presentados", [fecha("fecha", "Fecha"), campo("concepto", "Concepto"), campo("comprobante", "Referencia del comprobante"), numero("importe", "Importe")]),
    campo("plazo", "Plazo y responsable de revisión"), texto("observaciones", "Observaciones", { required: false }),
  ], [
    ["Registro del viaje", "La persona trabajadora declara el anticipo recibido y presenta los gastos relacionados para su revisión. Los importes deben expresarse en la moneda indicada; si hubo conversión, deberá documentarse por separado el tipo de cambio y su evidencia."],
    ["Comprobación y saldo", "El saldo mostrado es aritmético y queda sujeto a la validación de comprobantes y gastos autorizados. Un importe a devolver o reembolsar no acredita por sí solo una deuda exigible ni autoriza una retención salarial. Las diferencias y su regularización se documentarán de común acuerdo y conforme a la ley."],
    ["Alcance", "Esta constancia no sustituye comprobantes fiscales ni garantiza la deducibilidad de los gastos. " + sinDescuentos],
  ]),
  base("imagen-voz", "Autorización voluntaria de uso de imagen y voz", "Información y privacidad", "Delimita materiales, finalidad, canales y vigencia de una autorización.", [
    opcion("decision", "Decisión de la persona", ["Autorizo los usos expresamente descritos", "No autorizo el uso de mi imagen y voz"]),
    texto("materiales", "Fotografías, grabaciones o sesión identificada"), texto("finalidad", "Finalidad específica"),
    texto("medios", "Medios, cuentas, destinatarios y alcance territorial"), fecha("inicio", "Inicio de vigencia"), fecha("fin", "Fin de vigencia"),
    texto("edicion", "Ediciones permitidas y límites"), campo("contraprestacion", "Contraprestación acordada o carácter gratuito"),
    campo("contacto", "Contacto y procedimiento para retirar la autorización"), campo("aviso", "Aviso de privacidad aplicable"),
  ], [
    ["Decisión y alcance", "La decisión seleccionada al inicio de este documento prevalece sobre cualquier descripción de uso. Si se indica No autorizo, no se concede permiso alguno. Si se autoriza, el permiso se limita a los materiales, finalidad, medios, vigencia y condiciones expresamente identificados."],
    ["Voluntariedad", "Otorgar o negar la autorización no condiciona el empleo, salario, prestaciones ni evaluaciones. No se permiten usos denigrantes, engañosos, ajenos a la finalidad acordada, cesiones indeterminadas ni generación o clonación de identidad mediante inteligencia artificial sin una autorización específica adicional."],
    ["Retiro y protección de datos", "La persona podrá solicitar el retiro de la autorización y ejercer los derechos sobre sus datos por el canal señalado. La empresa atenderá la solicitud conforme al marco aplicable e informará las medidas respecto de publicaciones, materiales distribuidos y usos futuros. No se pacta irrevocabilidad ni renuncia general de derechos."],
  ], { fuentes: [DATOS, AUTOR], aviso: "La autorización debe ser voluntaria y referirse a materiales y usos concretos. No firmar en nombre del colaborador." }),
];

export const CAMPOS_COMUNES_RRHH = [campo("lugar", "Lugar de emisión"), fecha("emision", "Fecha de emisión"), campo("responsable", "Responsable de la empresa", "text", { auto: "empresa.representante" }), campo("cargo_responsable", "Cargo del responsable")];
export function obtenerFormatoRRHH(codigo) { return FORMATOS_RRHH.find((f) => f.codigo === codigo); }
export function campoVisible(campoActual, datos) { return !campoActual.when || datos[campoActual.when[0]] === campoActual.when[1]; }
export function fechaLocalISO(hoy = new Date()) { return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`; }
export function camposFormato(formato) { return [...CAMPOS_COMUNES_RRHH, ...formato.campos]; }
export function completarDatosFormato(formato, datos = {}, variables = {}, hoy = new Date()) {
  return Object.fromEntries(camposFormato(formato).map((f) => {
    let valor = datos[f.key] ?? (f.auto ? variables[f.auto] : "") ?? "";
    if (f.key === "emision" && datos[f.key] == null) valor = fechaLocalISO(hoy);
    if (f.type === "date" && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)) valor = valor.split("/").reverse().join("-");
    if (f.type === "rows") valor = Array.isArray(datos[f.key]) ? datos[f.key] : [Object.fromEntries(f.columns.map((c) => [c.key, ""]))];
    return [f.key, valor];
  }));
}
function validarCampo(f, value) {
  const s = String(value ?? "").trim();
  if (!s) return f.required ? `Completa ${f.label.toLocaleLowerCase("es-MX")}.` : "";
  if (s.length > (f.type === "textarea" ? 3000 : 500)) return `${f.label}: el texto excede la longitud permitida.`;
  if (f.type === "number" && (!Number.isFinite(Number(s)) || Number(s) < f.min || Number(s) > f.max || (f.integer && !Number.isInteger(Number(s))))) return `Revisa el importe o cantidad de ${f.label.toLocaleLowerCase("es-MX")}.`;
  if (f.type === "date") {
    const d = new Date(`${s}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== s) return `Revisa la fecha de ${f.label.toLocaleLowerCase("es-MX")}.`;
  }
  if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "Revisa el correo electrónico.";
  if (f.type === "select" && !f.options.includes(s)) return `Selecciona una opción válida en ${f.label.toLocaleLowerCase("es-MX")}.`;
  return "";
}
export function validarDatosFormato(formato, datos) {
  for (const f of camposFormato(formato).filter((c) => campoVisible(c, datos))) {
    if (f.type === "rows") {
      const rows = datos[f.key];
      if (!Array.isArray(rows) || !rows.length || rows.length > f.maxRows) return `${f.label}: agrega entre 1 y ${f.maxRows} registros.`;
      for (const [i, row] of rows.entries()) for (const c of f.columns) {
        const error = validarCampo(c, row?.[c.key]);
        if (error) return `${f.label}, registro ${i + 1}: ${error}`;
      }
    } else {
      const error = validarCampo(f, datos[f.key]);
      if (error) return error;
    }
  }
  if (datos.inicio && datos.fin && datos.fin < datos.inicio) return "La fecha final debe ser igual o posterior a la inicial.";
  if (datos.situacion === "Relación laboral concluida" && datos.ingreso && datos.fin_relacion && datos.fin_relacion < datos.ingreso) return "La fecha de conclusión no puede ser anterior al ingreso.";
  return "";
}
const fechaLegible = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value).split("-").reverse().join("/") : value;
const seguro = (value) => escapeDocumentText(value).replace(/\n/g, "<br/>");
function valorHTML(f, value, basePlantilla) {
  if (f.type === "rows") {
    const rows = Array.isArray(value) && value.length ? value : [{}];
    return `<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:11px;"><thead><tr>${f.columns.map((c) => `<th style="text-align:left;border-bottom:1px solid #94a3b8;padding:6px;">${seguro(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${f.columns.map((c) => `<td style="vertical-align:top;border-bottom:1px solid #e2e8f0;padding:6px;overflow-wrap:anywhere;">${valorHTML(c, row[c.key], basePlantilla)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  const val = f.type === "date" ? fechaLegible(value) : value;
  return String(val ?? "").trim() ? seguro(val) : `<span style="color:#64748b;">[${basePlantilla ? "Completar: " : "Pendiente: "}${seguro(f.label)}]</span>`;
}
export function resumenViaticos(datos) {
  const anticipo = Math.round(Number(datos.anticipo || 0) * 100);
  const comprobado = (datos.gastos || []).reduce((sum, row) => sum + Math.round(Number(row.importe || 0) * 100), 0);
  return { anticipo: anticipo / 100, comprobado: comprobado / 100, saldo: (anticipo - comprobado) / 100 };
}
export function renderFormatoRRHH(formato, datos = {}, variables = {}, { basePlantilla = false } = {}) {
  const variable = (key) => basePlantilla ? `{{${key}}}` : seguro(variables[key] || `[Pendiente: ${key}]`);
  const campos = camposFormato(formato).filter((f) => basePlantilla || campoVisible(f, datos)).filter((f) => f.required || String(datos[f.key] ?? "").trim());
  const contenido = campos.map((f) => `<div style="margin:0 0 10px;break-inside:avoid;"><strong style="font-size:11px;">${seguro(f.label)}</strong>${f.type === "rows" ? valorHTML(f, datos[f.key], basePlantilla) : `<p style="margin:3px 0 0;">${valorHTML(f, datos[f.key], basePlantilla)}</p>`}</div>`).join("");
  const v = formato.codigo === "viaticos" && !basePlantilla ? resumenViaticos(datos) : null;
  const dinero = (n) => Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const balance = v ? `<p><strong>Anticipo:</strong> ${dinero(v.anticipo)} ${seguro(datos.moneda)} · <strong>Gastos presentados:</strong> ${dinero(v.comprobado)} ${seguro(datos.moneda)}<br/><strong>${v.saldo >= 0 ? "Saldo por devolver" : "Reembolso por revisar"}:</strong> ${dinero(Math.abs(v.saldo))} ${seguro(datos.moneda)}</p>` : "";
  const firma = (nombre, leyenda) => `<div style="margin-top:25px;border-top:1px solid #94a3b8;padding-top:8px;break-inside:avoid;"><strong>${nombre}</strong><br/>${leyenda}<br/><span style="font-size:10px;color:#64748b;">Firma: ____________________ Fecha: ____________________</span></div>`;
  return `<!-- ADAMIA:rh:${formato.codigo}:${formato.version} -->
<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#1f2937;overflow-wrap:anywhere;">
<p style="color:#64748b;font-size:11px;">${variable("empresa.nombre")}</p><h1 style="font-size:21px;margin:0 0 14px;">${seguro(formato.nombre)}</h1>
<p><strong>${formato.candidato ? "Persona destinataria" : "Persona trabajadora"}:</strong> ${variable("empleado.nombre")}</p>
${contenido}${balance}
${formato.clausulas.map(([titulo, cuerpo]) => `<section><h2 style="font-size:14px;margin:18px 0 7px;">${seguro(titulo)}</h2><p>${seguro(cuerpo)}</p></section>`).join("")}
${formato.firmas !== "empresa" ? firma(variable("empleado.nombre"), formato.codigo === "imagen-voz" ? "Manifestación voluntaria de la decisión indicada" : "Persona interesada: recepción o manifestación según el contenido") : ""}
${firma(valorHTML({ label: "Responsable" }, datos.responsable, basePlantilla), "Responsable autorizado de la empresa")}
${formato.firmaExtra ? firma(valorHTML({ label: "Quien recibe" }, datos[formato.firmaExtra], basePlantilla), "Recepción del puesto") : ""}
<p style="font-size:10px;color:#64748b;margin-top:20px;">Formato base ADAMIA ${formato.version} · Revisión ${formato.revision}. No es un formato oficial ni una certificación de cumplimiento. Las firmas electrónicas que se obtengan deben conservarse con su evidencia vinculada al documento.</p></div>`;
}
export function prepararBaseFormato(formato) {
  const contenido_html = renderFormatoRRHH(formato, {}, {}, { basePlantilla: true });
  return { codigo: `AD-RH-${formato.codigo}-V1`, nombre: formato.nombre, descripcion: formato.descripcion, categoria: formato.categoria, contenido_html, variables: "empresa.nombre, empleado.nombre" };
}
export function detectarFormatoBase(plantilla) {
  if (!plantilla?.codigo?.startsWith("AD-RH-")) return null;
  return FORMATOS_RRHH.find((f) => {
    const baseActual = prepararBaseFormato(f);
    return baseActual.codigo === plantilla.codigo && baseActual.contenido_html === plantilla.contenido_html;
  }) || null;
}
