import { RESPONSABLE as R, pendiente } from "./responsable";

// Documentos legales de ADAMIA (borrador para revisión de un abogado antes de producción).
// `version` se guarda con cada aceptación: si un texto cambia de fondo, cambia la versión.
// Marco: Ley Federal de Protección de Datos Personales en Posesión de los Particulares (DOF 20/03/2025).

const correo = () => pendiente(R.correoPrivacidad, "correo de privacidad");

export const AVISO_PRIVACIDAD = {
  id: "aviso_privacidad",
  ruta: "/aviso-privacidad",
  titulo: "Aviso de privacidad integral",
  version: "2026-11-25",
  fecha: "25 de noviembre de 2026",
  intro: `${R.nombre}, ${R.calidad}, con domicilio en ${R.domicilio} («ADAMIA»), es responsable del tratamiento de los datos personales que se describen en este aviso, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.`,
  secciones: [
    {
      id: "a-quien-aplica",
      titulo: "A quién aplica",
      parrafos: [
        "Este aviso aplica a las personas que visitan nuestra página, solicitan una demostración o cotización, contratan ADAMIA o usan la plataforma como administradores de una empresa cliente.",
        "Los datos de los empleados que una empresa cliente registra en ADAMIA (asistencia, rostro, ubicación al checar, expediente) los decide y controla esa empresa, que es su responsable. ADAMIA los trata solo por su cuenta, como encargado. Para esos datos aplica el aviso de privacidad de la empresa empleadora; ponemos a su disposición una plantilla en «Aviso para empleados».",
      ],
    },
    {
      id: "datos",
      titulo: "Datos personales que tratamos",
      lista: [
        "Identificación y contacto: nombre, empresa, puesto, correo electrónico y número de WhatsApp o teléfono.",
        "Datos de la cuenta: usuario, contraseña cifrada, empresa, número de empleados, RFC si lo proporcionas y datos para facturar.",
        "Datos de pago: los procesa directamente nuestro proveedor de pagos (Stripe). ADAMIA no guarda los números de tu tarjeta.",
        "Uso de la plataforma y del sitio: registros de acceso, dirección IP, dispositivo, navegador y páginas visitadas.",
        "Si activas la entrada con Face ID, huella o passkey: ADAMIA guarda solo una llave pública y datos del dispositivo (nombre, fecha de alta y último uso). Tu cara o tu huella nunca salen de tu teléfono ni llegan a ADAMIA; no es un dato biométrico que ADAMIA reciba ni guarde.",
        "Lo que nos escribes: mensajes de soporte, de contacto y conversaciones con el asistente comercial del sitio.",
      ],
      parrafos: ["Para estas finalidades ADAMIA no solicita datos personales sensibles de las personas a las que aplica este aviso."],
    },
    {
      id: "finalidades",
      titulo: "Para qué usamos tus datos",
      parrafos: ["Finalidades necesarias para la relación contigo:"],
      lista: [
        "Responder tus solicitudes de información, demostración y cotización.",
        "Verificar tu número de WhatsApp con un código.",
        "Crear y administrar tu cuenta y darte acceso a la plataforma.",
        "Cobrar el servicio, emitir comprobantes y aplicar promociones o cupones.",
        "Dar soporte, avisarte de cambios en el servicio y mantener la seguridad de la plataforma.",
        "Cumplir obligaciones legales y atender requerimientos de autoridad.",
      ],
      despues: [
        "Finalidades adicionales, que no son necesarias para el servicio: enviarte información comercial y medir la efectividad de nuestra publicidad (por ejemplo, con el Pixel de Meta). Puedes negarte en cualquier momento escribiendo al correo de privacidad o rechazando las cookies de publicidad; tu negativa no afecta el servicio.",
      ],
    },
    {
      id: "transferencias",
      titulo: "Con quién compartimos tus datos",
      parrafos: [
        "ADAMIA no vende tus datos. Los comparte con proveedores que nos prestan servicios y los tratan por nuestra cuenta, bajo obligaciones de confidencialidad:",
      ],
      lista: [
        "Alojamiento y almacenamiento en la nube (Amazon Web Services).",
        "Procesamiento de pagos (Stripe).",
        "Envío de correos, mapas y servicios de Google.",
        "Envío de mensajes y códigos por WhatsApp.",
        "Medición de publicidad (Meta), solo si aceptas las cookies de publicidad.",
      ],
      despues: [
        "Algunos de estos proveedores pueden tratar los datos fuera de México. También podemos comunicar datos cuando lo exija una autoridad competente o la ley, sin necesidad de tu consentimiento en los casos que la ley prevé.",
      ],
    },
    {
      id: "derechos",
      titulo: "Tus derechos (ARCO) y cómo ejercerlos",
      parrafos: [
        `Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su tratamiento, así como revocar tu consentimiento o limitar su uso, enviando una solicitud a ${correo()}.`,
        "Tu solicitud debe incluir tu nombre, un medio para responderte, el documento que acredite tu identidad (o la de tu representante), la descripción clara de los datos y del derecho que quieres ejercer, y cualquier documento que ayude a localizarlos.",
        "Te responderemos en los plazos que marca la ley. Si consideras que tu derecho no fue atendido, puedes acudir a la autoridad competente en materia de protección de datos personales.",
      ],
    },
    {
      id: "cookies",
      titulo: "Cookies y tecnologías similares",
      parrafos: [
        "Usamos cookies necesarias para que el sitio y la sesión funcionen, y almacenamiento del navegador para recordar preferencias (por ejemplo, qué promociones ya viste).",
        "Con tu permiso usamos también cookies de publicidad (Pixel de Meta) para medir nuestras campañas. Las puedes aceptar o rechazar en el aviso de cookies del sitio y cambiar tu decisión borrando las cookies de tu navegador.",
      ],
    },
    {
      id: "seguridad",
      titulo: "Conservación y seguridad",
      parrafos: [
        "Conservamos tus datos mientras exista la relación contigo y después solo el tiempo necesario para cumplir obligaciones legales o defender derechos. Aplicamos medidas de seguridad administrativas, técnicas y físicas, como conexiones cifradas, contraseñas cifradas y control de accesos.",
      ],
    },
    {
      id: "cambios",
      titulo: "Cambios a este aviso",
      parrafos: [
        "Si este aviso cambia, publicaremos la nueva versión en esta página con su fecha. Cuando el cambio requiera tu consentimiento, te lo pediremos de nuevo.",
      ],
    },
  ],
};

// PROPUESTA del aviso de privacidad (Lumo fase B1, 25/11/2026) — NO publicada: ninguna página la usa. La publica el dueño
// (después de revisarla con su abogado) cambiando `AVISO_PRIVACIDAD` por esta. Motivo: Mapbox es un encargado nuevo que
// recibe el texto de la colonia del candidato para proponerle la sucursal más cercana. Al revisarlo se encontró que el
// aviso vigente no menciona a los candidatos de las vacantes ni al proveedor de IA que los entrevista por WhatsApp; la
// propuesta lo agrega. Cambia la versión porque cambian las finalidades y los encargados.
const conSeccion = (secciones, id, cambio) => secciones.map((s) => (s.id === id ? cambio(s) : s));
export const AVISO_PRIVACIDAD_PROPUESTA = {
  ...AVISO_PRIVACIDAD,
  version: "2026-12-18",
  fecha: "18 de diciembre de 2026 (propuesta, sin publicar)",
  borrador: true,
  secciones: [AVISO_PRIVACIDAD.secciones]
    .map((l) => conSeccion(l, "a-quien-aplica", (s) => ({
      ...s,
      parrafos: [
        ...s.parrafos,
        "También aplica a las personas que se postulan a una vacante publicada en ADAMIA (por la página de la vacante o por WhatsApp). En ese caso la empresa que publica la vacante decide sobre la contratación y ADAMIA trata los datos de la postulación para operar el proceso de reclutamiento.",
      ],
    })))
    .map((l) => conSeccion(l, "datos", (s) => ({
      ...s,
      lista: [
        ...s.lista,
        "Si te postulas: lo que contestas en la entrevista por WhatsApp o en el formulario de la vacante (experiencia, escolaridad, disponibilidad, expectativa de sueldo y documentos que decidas subir) y, si nos la das, la colonia o el municipio donde vives, para proponerte la sucursal más cercana. No guardamos las coordenadas de tu ubicación.",
      ],
    })))
    .map((l) => conSeccion(l, "transferencias", (s) => ({
      ...s,
      lista: [
        ...s.lista,
        "Inteligencia artificial que conduce la entrevista por WhatsApp (Google Gemini).",
        "Cálculo de la sucursal más cercana (Mapbox): recibe solo el texto de la colonia o municipio que escribes, sin tu nombre ni tu teléfono.",
      ],
    })))[0],
};

export const TERMINOS = {
  id: "terminos",
  ruta: "/terminos-condiciones",
  titulo: "Términos y condiciones del servicio",
  version: "2026-11-21",
  fecha: "21 de noviembre de 2026",
  intro: `Estos términos regulan el uso de la plataforma ADAMIA, que presta ${R.nombre}, ${R.calidad} (RFC ${R.rfc}), con domicilio en ${R.domicilio} («ADAMIA»), a la empresa o persona que la contrata («el Cliente»). Al crear una cuenta o usar la plataforma, el Cliente los acepta.`,
  secciones: [
    {
      id: "servicio",
      titulo: "El servicio",
      parrafos: [
        "ADAMIA es un software de Recursos Humanos en la nube: control de asistencia, permisos, vacaciones, contratos, documentos y las demás funciones descritas en el sitio. Se ofrece «como servicio», con mejoras continuas; las funciones pueden cambiar o agregarse con el tiempo.",
      ],
    },
    {
      id: "cuenta",
      titulo: "Cuenta y usuarios",
      lista: [
        "El Cliente debe dar información verdadera y mantenerla actualizada.",
        "El Cliente es responsable de sus usuarios, de las contraseñas y de los permisos que otorga dentro de la plataforma.",
        "El Cliente debe avisar de inmediato a ADAMIA si detecta un uso no autorizado de su cuenta.",
      ],
    },
    {
      id: "precio",
      titulo: "Precio, pago y suspensión",
      lista: [
        "El precio es el publicado en la sección Contratar al momento de contratar, o el de la cotización aceptada. Se cobra mensualmente según los empleados registrados y su estado.",
        "Los pagos se procesan a través de Stripe. Los cupones aplican en los términos y plazos de cada promoción.",
        "Si un pago no se cubre, ADAMIA puede suspender el acceso después de avisar al Cliente. Al pagar, el acceso se restablece.",
        "ADAMIA puede actualizar sus precios avisando al Cliente con anticipación razonable; el nuevo precio aplica a partir del siguiente periodo.",
      ],
    },
    {
      id: "cancelacion",
      titulo: "Cancelación",
      parrafos: [
        "El Cliente puede cancelar en cualquier momento; la cancelación surte efecto al terminar el periodo pagado. Antes de cancelar, el Cliente puede descargar su información con las herramientas de exportación de la plataforma.",
      ],
    },
    {
      id: "uso",
      titulo: "Uso aceptable",
      lista: [
        "No registrar información falsa, engañosa o sin autorización de su titular.",
        "No intentar acceder a datos de otros clientes ni vulnerar la seguridad de la plataforma.",
        "No usar la plataforma para fines ilícitos ni contrarios a los derechos de los trabajadores.",
      ],
    },
    {
      id: "datos",
      titulo: "Datos de los empleados del Cliente",
      parrafos: [
        "El Cliente es el responsable de los datos personales de sus empleados que registra en ADAMIA. ADAMIA actúa como encargado: los trata solo para prestar el servicio y según las instrucciones del Cliente.",
      ],
      lista: [
        "El Cliente debe dar a sus empleados su aviso de privacidad y obtener su consentimiento expreso y por escrito para los datos sensibles, como el reconocimiento facial. ADAMIA ofrece una plantilla y una pantalla de consentimiento en la app.",
        "ADAMIA guarda esos datos con confidencialidad y medidas de seguridad, no los usa para fines propios y no los comparte salvo con los proveedores necesarios para operar el servicio (subencargados) o por mandato de autoridad.",
        "ADAMIA avisará al Cliente sin demora si conoce una vulneración de seguridad que afecte sus datos.",
        "Al terminar el servicio, ADAMIA conservará los datos solo el tiempo necesario para que el Cliente los descargue y para cumplir obligaciones legales, y después los eliminará.",
      ],
    },
    {
      id: "apoyo",
      titulo: "Cálculos y apoyo legal",
      parrafos: [
        "Los cálculos de la plataforma (horas trabajadas y extra, vacaciones, aguinaldo, finiquito, límites legales) y los contenidos del blog son herramientas de apoyo. No sustituyen la asesoría de un abogado o contador; el Cliente es responsable de revisar y de cumplir sus obligaciones laborales y fiscales.",
      ],
    },
    {
      id: "disponibilidad",
      titulo: "Disponibilidad y responsabilidad",
      parrafos: [
        "ADAMIA procura que la plataforma esté disponible y funcione correctamente, pero puede haber interrupciones por mantenimiento, fallas de terceros (internet, proveedores en la nube) o causas fuera de su control. En la medida que la ley lo permita, la responsabilidad de ADAMIA se limita al monto pagado por el Cliente en los últimos tres meses.",
      ],
    },
    {
      id: "propiedad",
      titulo: "Propiedad intelectual",
      parrafos: [
        "El software, la marca y los contenidos de ADAMIA le pertenecen. El Cliente recibe un derecho de uso mientras su cuenta esté vigente. La información que el Cliente registra es del Cliente.",
      ],
    },
    {
      id: "cambios",
      titulo: "Cambios, ley aplicable y contacto",
      parrafos: [
        "ADAMIA puede modificar estos términos publicando la nueva versión con su fecha; los cambios importantes se avisarán al Cliente.",
        `Estos términos se rigen por las leyes de México. Para cualquier controversia, las partes se someten a los tribunales competentes de ${pendiente(R.jurisdiccion, "ciudad de los tribunales")}.`,
        `Contacto: ${correo()}.`,
      ],
    },
  ],
};

export const AVISO_EMPLEADOS = {
  id: "aviso_empleados",
  ruta: "/aviso-empleados",
  titulo: "Aviso de privacidad para empleados (plantilla)",
  version: "2026-11-25",
  fecha: "25 de noviembre de 2026",
  intro: "Plantilla para que cada empresa que usa ADAMIA informe a su personal. La empresa empleadora es la responsable de estos datos; ADAMIA los trata por su cuenta como encargado. La empresa debe completar sus datos (nombre, domicilio y medio de contacto) y entregarla a cada persona.",
  secciones: [
    {
      id: "responsable",
      titulo: "Quién es responsable",
      parrafos: [
        "[Nombre de la empresa], con domicilio en [domicilio de la empresa], es responsable de tus datos personales. Usa la plataforma ADAMIA para administrar la asistencia y los procesos de Recursos Humanos.",
      ],
    },
    {
      id: "datos",
      titulo: "Datos que se tratan",
      lista: [
        "Identificación, contacto y datos laborales: nombre, puesto, área, horario, NSS, RFC, CURP y contactos de emergencia.",
        "Asistencia: fecha y hora de cada entrada y salida, permisos, vacaciones e incidencias.",
        "Ubicación: solo en el momento de checar, para validar que estás en tu lugar de trabajo.",
        "Fotografía al checar, como evidencia del registro.",
        "Dato personal sensible: el patrón de tu rostro (dato biométrico), si checas con reconocimiento facial.",
        "Si activas la entrada con Face ID, huella o passkey: ADAMIA guarda solo una llave pública y datos del dispositivo (nombre, fecha de alta y último uso). Tu cara o tu huella nunca salen de tu teléfono ni llegan a ADAMIA; no es un dato biométrico que ADAMIA reciba ni guarde.",
      ],
    },
    {
      id: "finalidades",
      titulo: "Para qué",
      lista: [
        "Registrar y comprobar tu jornada de trabajo, como lo exige la ley laboral.",
        "Calcular horas, permisos, vacaciones y demás prestaciones.",
        "Administrar tu expediente, contratos y documentos laborales.",
        "Confirmar tu identidad al checar, para evitar que otra persona registre por ti.",
      ],
    },
    {
      id: "rostro",
      titulo: "Reconocimiento facial",
      parrafos: [
        "El patrón de tu rostro es un dato sensible: solo se registra con tu consentimiento expreso, que das en la app antes de registrarlo. Si no lo das, puedes checar con otro método que la empresa te indique, como código o QR. Puedes revocar tu consentimiento en cualquier momento con la empresa.",
      ],
    },
    {
      id: "derechos",
      titulo: "Tus derechos",
      parrafos: [
        "Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos, o revocar tu consentimiento, con [área y medio de contacto de la empresa].",
      ],
    },
  ],
};

// Texto del consentimiento de datos biométricos (pantalla de la app antes del primer registro facial).
export const CONSENTIMIENTO_BIOMETRICO = {
  id: "biometricos",
  version: "2026-11-21",
  titulo: "Tu consentimiento para usar tu rostro",
  texto: [
    "Para checar con reconocimiento facial, ADAMIA guardará el patrón de tu rostro (dato biométrico, sensible) por cuenta de tu empresa, que es la responsable de tus datos.",
    "Se usa solo para confirmar que eres tú al registrar tu entrada y salida. No se usa para otro fin ni se comparte con terceros ajenos al servicio.",
    "Puedes no aceptar y checar con otro método que tu empresa te indique, o revocar tu consentimiento después con tu empresa.",
  ],
  acepto: "Acepto, de forma expresa, que se use mi rostro para checar",
};

export const DOCUMENTOS = { aviso_privacidad: AVISO_PRIVACIDAD, terminos: TERMINOS, aviso_empleados: AVISO_EMPLEADOS };
