export const FORMATOS_PUESTO = [
  {
    id: "perfil",
    codigo: "FR-RH-03",
    nombre: "Perfil de puesto",
    descripcion: "Requisitos, experiencia y competencias",
  },
  {
    id: "descripcion",
    codigo: "FR-RH-04",
    nombre: "Descripción de puesto",
    descripcion: "Misión, funciones y relaciones de trabajo",
  },
  {
    id: "actividades",
    codigo: "FR-RH-05",
    nombre: "Lista de actividades diarias",
    descripcion: "Actividades al inicio, durante y al cierre del turno",
  },
];

export const textoSeguro = (value) =>
  String(value ?? "").replace(
    /[&<>"'{}]/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "{": "&#123;",
        "}": "&#125;",
      }[c])
  );
export const normalizarPuesto = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
export const nombrePuesto = (puesto) =>
  puesto?.nombre_puesto || puesto?.nombre || "Puesto";
export const idPuesto = (puesto) =>
  String(puesto?.id_puesto ?? puesto?.id ?? "");

export function codigoDocumentoPuesto(empresa, puesto, tipo) {
  if (
    !/^[1-9]\d*$/.test(String(empresa)) ||
    !/^[1-9]\d*$/.test(String(puesto)) ||
    !FORMATOS_PUESTO.some((f) => f.id === tipo)
  )
    throw new Error("Selecciona una empresa y un puesto del catálogo.");
  return `AD-PUESTO-${empresa}-${puesto}-${tipo}`;
}

export function perteneceDocumentoPuesto(doc, empresa, codigo) {
  return Boolean(
    doc &&
      doc.codigo === codigo &&
      codigo.startsWith(`AD-PUESTO-${empresa}-`) &&
      (doc.id_empresa == null || String(doc.id_empresa) === String(empresa))
  );
}

// El código relaciona la copia con su empresa, puesto y formato sin cambiar el contrato de la API.
export async function guardarDocumentoPuesto(
  api,
  empresa,
  payload,
  anterior = null
) {
  if (
    !/^AD-PUESTO-([1-9]\d*)-([1-9]\d*)-(perfil|descripcion|actividades)$/.test(
      payload.codigo
    ) ||
    !payload.codigo.startsWith(`AD-PUESTO-${empresa}-`)
  )
    throw new Error("La empresa del documento no coincide.");
  const buscar = async () => {
    const result = await api.listar({ empresa, search: payload.codigo });
    const item = (result?.data || []).find((d) =>
      perteneceDocumentoPuesto(d, empresa, payload.codigo)
    );
    if (!item) return null;
    const full = await api.getById(item.id_plantilla);
    if (!perteneceDocumentoPuesto(full, empresa, payload.codigo))
      throw new Error("No se pudo verificar la empresa del documento.");
    return { ...full, id_plantilla: item.id_plantilla };
  };
  const actual = await buscar();
  if (actual) {
    if (
      !anterior ||
      String(actual.id_plantilla) !== String(anterior.id_plantilla) ||
      actual.contenido_html !== anterior.contenido_html
    ) {
      if (
        actual.contenido_html === payload.contenido_html &&
        actual.nombre === payload.nombre
      )
        return actual;
      throw new Error(
        "Ya existe una versión nueva. Vuelve al catálogo y ábrela antes de guardar para conservar sus cambios."
      );
    }
    await api.actualizar(actual.id_plantilla, payload);
  } else {
    if (anterior)
      throw new Error(
        "Este documento fue eliminado. Recarga el catálogo antes de crear otra versión."
      );
    try {
      await api.crear({ empresa }, payload);
    } catch (error) {
      const recovered = await buscar();
      if (
        recovered?.contenido_html === payload.contenido_html &&
        recovered.nombre === payload.nombre
      )
        return recovered;
      throw error;
    }
  }
  const guardado = await buscar();
  if (
    !guardado ||
    guardado.contenido_html !== payload.contenido_html ||
    guardado.nombre !== payload.nombre
  )
    throw new Error(
      "No fue posible confirmar el guardado. Tus cambios siguen abiertos; revisa antes de intentarlo otra vez."
    );
  return guardado;
}

const BASES = [
  {
    match: /community|redes sociales|marketing|mercadotec|comunicacion/,
    area: "Comunicación y marketing",
    formacion:
      "Mercadotecnia, Comunicación, Publicidad o experiencia equivalente demostrable.",
    experiencia:
      "Gestión de comunidades digitales, creación de contenido y seguimiento de campañas.",
    herramientas:
      "Herramientas de diseño, edición de video, programación de publicaciones y análisis de resultados.",
    mision:
      "Gestionar la presencia digital y la comunicación de la empresa mediante contenido relevante y atención oportuna a su comunidad, para fortalecer la marca y apoyar los objetivos comerciales.",
    funciones: [
      "Crear contenido adaptado a cada canal y a la identidad de la empresa.",
      "Planear el calendario de publicaciones y coordinar su aprobación.",
      "Publicar y verificar los contenidos, enlaces y mensajes autorizados.",
      "Responder consultas y canalizar los casos que requieren apoyo de otras áreas.",
      "Analizar los resultados y proponer mejoras de contenido y campañas.",
      "Coordinar la difusión de productos, eventos y avisos con las áreas responsables.",
    ],
    habilidades: [
      "Redacción y comunicación",
      "Creatividad y organización",
      "Análisis de resultados",
      "Atención a la comunidad",
    ],
    internas: [
      ["Gerencia", "Validar prioridades, productos y campañas."],
      [
        "Ventas y operación",
        "Confirmar información y dar seguimiento a consultas.",
      ],
    ],
    externas: [["Clientes", "Resolver dudas y canalizar solicitudes."]],
    reportes: [
      ["Calendario de publicaciones", "Semanal", "Responsable del área"],
      ["Resultados de contenido y campañas", "Mensual", "Gerencia"],
    ],
  },
  {
    match: /financier|contad|contab|tesorer|nomina/,
    area: "Administración y finanzas",
    formacion:
      "Contaduría, Finanzas, Administración o experiencia equivalente.",
    experiencia:
      "Control de movimientos, conciliaciones, registros y preparación de información financiera.",
    herramientas:
      "Sistema contable o ERP, hojas de cálculo y herramientas de control documental autorizadas.",
    mision:
      "Mantener información financiera confiable y oportuna mediante el registro, revisión y control de operaciones, para apoyar la planeación y las decisiones de la empresa.",
    funciones: [
      "Revisar y registrar las operaciones con sus comprobantes y autorizaciones.",
      "Conciliar saldos y dar seguimiento a diferencias o movimientos pendientes.",
      "Controlar vencimientos y preparar información para cobros y pagos.",
      "Integrar reportes periódicos y explicar desviaciones relevantes.",
      "Resguardar los soportes y mantener trazabilidad de cada movimiento.",
    ],
    habilidades: [
      "Análisis y atención al detalle",
      "Organización y seguimiento",
      "Confidencialidad",
      "Comunicación de riesgos",
    ],
    internas: [
      ["Gerencia", "Presentar resultados y alertas."],
      ["Compras y ventas", "Validar documentos y movimientos."],
    ],
    externas: [
      [
        "Proveedores y clientes",
        "Aclarar movimientos y documentación dentro del alcance autorizado.",
      ],
    ],
    reportes: [
      ["Movimientos y conciliaciones", "Semanal", "Responsable de finanzas"],
      ["Cierre del periodo", "Mensual", "Gerencia"],
    ],
  },
  {
    match: /desarroll|programador|software|sistemas|informat|tecnolog/,
    area: "Tecnología",
    formacion:
      "Sistemas, Software o experiencia técnica equivalente demostrable.",
    experiencia:
      "Desarrollo o mantenimiento de sistemas, pruebas y trabajo con control de versiones.",
    herramientas:
      "Herramientas del stack de la empresa, control de versiones, pruebas y seguimiento de incidencias.",
    mision:
      "Desarrollar y mantener soluciones tecnológicas confiables, transformando necesidades validadas en funcionalidades verificadas y documentadas que apoyen la operación.",
    funciones: [
      "Analizar los requerimientos y confirmar criterios de aceptación.",
      "Implementar cambios siguiendo los estándares técnicos del equipo.",
      "Integrar servicios y manejar permisos, errores y estados de carga.",
      "Probar los cambios y atender observaciones de revisión.",
      "Investigar incidencias y documentar su solución.",
      "Preparar entregas y acompañar despliegues conforme al proceso autorizado.",
    ],
    habilidades: [
      "Solución de problemas",
      "Colaboración y revisión de trabajo",
      "Comunicación técnica",
      "Calidad y atención al detalle",
    ],
    internas: [
      ["Producto y operación", "Validar necesidades y resultados."],
      ["Soporte y calidad", "Priorizar y resolver incidencias."],
    ],
    externas: [
      [
        "Proveedores tecnológicos",
        "Dar seguimiento a incidencias autorizadas.",
      ],
    ],
    reportes: [
      ["Avance de tareas y bloqueos", "Diario", "Líder de desarrollo"],
      ["Notas de entrega", "Por liberación", "Equipo responsable"],
    ],
  },
  {
    match: /recursos humanos|recluta|talento|personal/,
    area: "Recursos humanos",
    formacion:
      "Administración, Psicología, Recursos Humanos o experiencia equivalente.",
    experiencia:
      "Administración de personal, reclutamiento, inducción y seguimiento de expedientes.",
    herramientas:
      "Sistema de recursos humanos, hojas de cálculo y herramientas de control de expedientes.",
    mision:
      "Coordinar procesos de personal con información confiable y atención oportuna, para facilitar la incorporación, administración y desarrollo de los colaboradores.",
    funciones: [
      "Dar seguimiento a vacantes, entrevistas y comunicación con candidatos.",
      "Mantener completos y actualizados los expedientes del personal.",
      "Validar incidencias y movimientos para el responsable de nómina.",
      "Coordinar ingresos, inducciones y actividades de capacitación.",
      "Atender solicitudes de colaboradores y registrar su seguimiento.",
    ],
    habilidades: [
      "Organización",
      "Comunicación y escucha",
      "Confidencialidad",
      "Atención al colaborador",
    ],
    internas: [
      ["Líderes de área", "Coordinar necesidades y movimientos de personal."],
      ["Nómina", "Validar incidencias y documentación."],
    ],
    externas: [["Candidatos", "Coordinar entrevistas y comunicar avances."]],
    reportes: [
      ["Vacantes y seguimiento", "Semanal", "Gerencia"],
      ["Movimientos e incidencias", "Por periodo", "Nómina"],
    ],
  },
  {
    match: /venta|comercial|vendedor|ejecutivo de cuenta/,
    area: "Comercial",
    formacion:
      "Formación o experiencia relacionada con ventas y atención al cliente.",
    experiencia:
      "Prospección, presentación de propuestas, seguimiento comercial y atención a clientes.",
    herramientas:
      "CRM, catálogo vigente, herramientas de cotización y canales de atención autorizados.",
    mision:
      "Desarrollar relaciones comerciales mediante la identificación de necesidades y el seguimiento de oportunidades, para concretar ventas y mantener una atención consistente.",
    funciones: [
      "Prospectar y registrar oportunidades con información completa.",
      "Identificar necesidades y presentar soluciones del catálogo vigente.",
      "Preparar propuestas con precios y condiciones autorizados.",
      "Dar seguimiento a cotizaciones y compromisos con los clientes.",
      "Coordinar la entrega con operación y verificar la atención posterior.",
    ],
    habilidades: [
      "Comunicación y negociación",
      "Orientación al cliente",
      "Seguimiento",
      "Organización",
    ],
    internas: [
      ["Operación", "Confirmar disponibilidad y entregas."],
      ["Administración", "Validar condiciones comerciales."],
    ],
    externas: [
      [
        "Clientes y prospectos",
        "Identificar necesidades y dar seguimiento a acuerdos.",
      ],
    ],
    reportes: [
      ["Oportunidades y seguimiento", "Semanal", "Responsable comercial"],
      ["Ventas y compromisos", "Por periodo", "Gerencia"],
    ],
  },
  {
    match: /meser|cajer|recepcion|atencion|servicio al cliente/,
    area: "Atención y servicio",
    formacion:
      "Formación básica y capacitación en los procesos de atención de la empresa.",
    experiencia:
      "Atención al cliente, registro de solicitudes y coordinación con áreas de servicio.",
    herramientas:
      "Sistema de atención o punto de venta, catálogo vigente y canales de comunicación interna.",
    mision:
      "Brindar atención clara y oportuna, registrando correctamente las solicitudes y coordinando su seguimiento para ofrecer una experiencia consistente al cliente.",
    funciones: [
      "Recibir y orientar al cliente con información actualizada.",
      "Registrar solicitudes o pedidos y confirmar sus detalles.",
      "Coordinar la atención con las áreas responsables.",
      "Dar seguimiento a pendientes e informar los avances al cliente.",
      "Mantener ordenados el área de trabajo y los registros de servicio.",
    ],
    habilidades: [
      "Trato cordial",
      "Comunicación",
      "Atención al detalle",
      "Trabajo en equipo",
    ],
    internas: [
      ["Operación", "Coordinar la ejecución del servicio."],
      ["Supervisor", "Reportar incidencias y necesidades."],
    ],
    externas: [["Clientes", "Atender solicitudes y aclaraciones."]],
    reportes: [
      ["Pendientes e incidencias", "Por turno", "Supervisor"],
      ["Resumen de atención", "Diario", "Responsable del área"],
    ],
  },
  {
    match:
      /almacen|logistic|repart|chofer|operador|produccion|mantenimiento|limpieza/,
    area: "Operación",
    formacion:
      "Formación y capacitación técnica relacionadas con las actividades y equipos asignados.",
    experiencia:
      "Ejecución de procesos operativos, uso de herramientas y registro de actividades.",
    herramientas:
      "Equipos y herramientas autorizados, registros de operación y elementos de protección definidos para la actividad.",
    mision:
      "Ejecutar las actividades operativas asignadas con orden, calidad y cuidado de los recursos, para mantener la continuidad del servicio y cumplir la programación del área.",
    funciones: [
      "Revisar las condiciones del área, herramientas y materiales antes de iniciar.",
      "Ejecutar las actividades conforme al procedimiento y prioridades asignadas.",
      "Verificar el resultado y registrar avances o desviaciones.",
      "Reportar fallas, faltantes o condiciones que impidan continuar.",
      "Entregar el área, equipos y pendientes al cierre del turno.",
    ],
    habilidades: [
      "Orden y disciplina operativa",
      "Atención al detalle",
      "Trabajo en equipo",
      "Seguimiento de procedimientos",
    ],
    internas: [
      ["Supervisor", "Recibir prioridades y comunicar incidencias."],
      ["Áreas relacionadas", "Coordinar materiales, entregas y continuidad."],
    ],
    externas: [
      [
        "Proveedores o clientes",
        "Coordinar entregas únicamente dentro del alcance autorizado.",
      ],
    ],
    reportes: [
      ["Bitácora de actividades", "Por turno", "Supervisor"],
      ["Incidencias y faltantes", "Al detectar", "Responsable del área"],
    ],
  },
  {
    match: /geren|director|coordin|supervisor|jefe|administrador/,
    area: "Administración y coordinación",
    formacion:
      "Administración o formación relacionada con el área, o experiencia equivalente en coordinación de equipos.",
    experiencia:
      "Planeación de trabajo, seguimiento de indicadores y coordinación de recursos y personas.",
    herramientas:
      "Sistema de gestión del área, hojas de cálculo y herramientas de seguimiento de acuerdos.",
    mision:
      "Coordinar recursos, personas y procesos para cumplir los objetivos del área, mediante planeación, seguimiento y solución oportuna de desviaciones.",
    funciones: [
      "Definir prioridades y distribuir actividades conforme a los objetivos acordados.",
      "Dar seguimiento al avance del equipo y resolver bloqueos dentro de su alcance.",
      "Verificar calidad y cumplimiento de las entregas.",
      "Analizar resultados e informar desviaciones y necesidades.",
      "Proponer mejoras y dar seguimiento a los acuerdos con otras áreas.",
    ],
    habilidades: [
      "Planeación",
      "Liderazgo y comunicación",
      "Análisis",
      "Seguimiento de acuerdos",
    ],
    internas: [
      ["Dirección", "Acordar prioridades y presentar resultados."],
      [
        "Equipo y áreas relacionadas",
        "Coordinar trabajo, recursos y entregas.",
      ],
    ],
    externas: [
      ["Proveedores o clientes", "Dar seguimiento a los acuerdos autorizados."],
    ],
    reportes: [
      ["Avance y acuerdos", "Semanal", "Dirección"],
      ["Resultados del área", "Mensual", "Dirección"],
    ],
  },
];
const GENERAL = {
  area: "Área por confirmar",
  formacion:
    "Formación relacionada con las actividades del puesto o experiencia equivalente demostrable.",
  experiencia:
    "Experiencia aplicable a los procesos, herramientas y responsabilidades asignadas.",
  herramientas:
    "Sistemas y herramientas autorizados por el responsable del área.",
  mision:
    "Ejecutar las responsabilidades del puesto con calidad y oportunidad, coordinando las actividades asignadas y registrando sus resultados para contribuir a los objetivos del área.",
  funciones: [
    "Revisar prioridades y confirmar el resultado esperado de cada actividad.",
    "Ejecutar las tareas asignadas conforme a los procedimientos del área.",
    "Verificar la calidad del trabajo y registrar avances.",
    "Comunicar incidencias, riesgos y necesidades de apoyo.",
    "Documentar pendientes y coordinar su seguimiento.",
  ],
  habilidades: [
    "Organización",
    "Comunicación",
    "Atención al detalle",
    "Colaboración",
  ],
  internas: [
    ["Responsable del área", "Acordar prioridades y revisar resultados."],
  ],
  externas: [
    [
      "Contactos autorizados",
      "Coordinar asuntos relacionados con las funciones asignadas.",
    ],
  ],
  reportes: [["Avances y pendientes", "Diario", "Responsable del área"]],
};

export function baseParaPuesto(nombre) {
  return (
    BASES.find((base) => base.match.test(normalizarPuesto(nombre))) || GENERAL
  );
}

export function tablaPuesto(rows, headers = [], kind = "") {
  return `<table class="${kind}">${
    headers.length
      ? `<thead><tr>${headers
          .map((h) => `<th scope="col">${textoSeguro(h)}</th>`)
          .join("")}</tr></thead>`
      : ""
  }<tbody>${rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, i) => {
            const tag =
              i === 0 && ["puesto-fields", "puesto-numbered"].includes(kind)
                ? "th"
                : "td";
            return `<${tag}${tag === "th" ? ' scope="row"' : ""}>${textoSeguro(
              cell
            ).replace(/\n/g, "<br>")}</${tag}>`;
          })
          .join("")}</tr>`
    )
    .join("")}</tbody></table>`;
}

export function seccionPuesto(
  title,
  rows = [["Escribe el contenido de esta sección."]],
  headers = [],
  kind = ""
) {
  return `<section class="puesto-section"><h3>${textoSeguro(
    title
  )}</h3>${tablaPuesto(rows, headers, kind)}</section>`;
}

export function crearDocumentoPuesto(tipo, puesto, empresa, legacy = {}) {
  const format = FORMATOS_PUESTO.find((item) => item.id === tipo);
  if (!format) throw new Error("Formato desconocido.");
  const name = nombrePuesto(puesto),
    b = baseParaPuesto(name);
  const val = (key, fallback) =>
    typeof legacy[key] === "string" && legacy[key].trim()
      ? legacy[key]
      : fallback;
  const list = (title, values) =>
    seccionPuesto(
      title,
      values.map((v, i) => [i + 1, v]),
      [],
      "puesto-numbered"
    );
  const fields = (title, rows) =>
    seccionPuesto(title, rows, [], "puesto-fields");
  const rows = (key, fallback) =>
    Array.isArray(legacy[key]) &&
    legacy[key].some((row) => Object.values(row).some(Boolean))
      ? legacy[key].map((row) => Object.values(row))
      : fallback;
  let body;
  if (tipo === "perfil") {
    body =
      fields("Datos generales", [
        ["Puesto", val("puesto", name)],
        ["Plazas", val("plazas", "Por definir por la empresa")],
        ["Área", val("area", puesto.nombre_departamento || b.area)],
        ["Supervisor", val("supervisor", "Responsable del área")],
      ]) +
      fields("Perfil requerido", [
        ["Sexo", val("sexo", "Indistinto")],
        ["Edad", val("edad", "No especificada")],
        ["Estado civil", val("estadoCivil", "Indistinto")],
      ]) +
      fields("Jornada laboral", [
        [
          "Jornada laboral",
          val("jornada", "Conforme a las condiciones acordadas para el puesto"),
        ],
        ["Días de trabajo", val("diasTrabajo", "Por confirmar con la empresa")],
        ["Horario", val("horario", "Por confirmar con la empresa")],
      ]) +
      seccionPuesto("Misión del puesto", [[val("mision", b.mision)]]) +
      list(
        "Objetivos del puesto",
        val(
          "objetivos",
          "Cumplir las actividades y entregas acordadas con el responsable del área.\nMantener información y evidencias suficientes para dar seguimiento al trabajo.\nDetectar y comunicar oportunidades de mejora en los procesos."
        )
          .split("\n")
          .filter(Boolean)
      ) +
      fields("Formación y conocimientos", [
        ["Formación académica", val("formacion", b.formacion)],
        [
          "Programas especializados requeridos",
          val("programas", b.herramientas),
        ],
        [
          "Conocimientos sobre ofimática",
          val(
            "ofimatica",
            "Documentos, hojas de cálculo y comunicación digital según las actividades asignadas."
          ),
        ],
        [
          "Idiomas",
          val(
            "idiomas",
            "Español. Otros idiomas según las necesidades reales del puesto."
          ),
        ],
      ]) +
      fields("Experiencia", [
        ["Experiencia", val("experiencia", b.experiencia)],
      ]) +
      list(
        "Habilidades",
        legacy.habilidades
          ? String(legacy.habilidades).split("\n")
          : b.habilidades
      ) +
      fields("Esfuerzos y condiciones", [
        [
          "Esfuerzos",
          val(
            "esfuerzos",
            "Atención sostenida y coordinación de las actividades. Confirmar las demandas físicas y de desplazamiento del puesto."
          ),
        ],
        [
          "Condiciones",
          val(
            "condiciones",
            "Herramientas, lugar de trabajo y medidas de seguridad definidos por la empresa para las actividades asignadas."
          ),
        ],
      ]);
  } else if (tipo === "descripcion") {
    body =
      fields("Identificación del puesto", [
        ["Nombre del puesto", val("nombrePuesto", name)],
        ["Jefe inmediato", val("jefeInmediato", "Responsable del área")],
        [
          "Áreas a su cargo",
          val("areasCargo", "Por confirmar según el organigrama"),
        ],
        ["No. de personas a su cargo", val("personasCargo", "Por confirmar")],
        [
          "Puestos que le reportan",
          val("puestosReportan", "Por confirmar según el organigrama"),
        ],
      ]) +
      seccionPuesto("Misión", [[val("mision", b.mision)]]) +
      (Array.isArray(legacy.funciones) &&
      legacy.funciones.some((r) => Object.values(r).some(Boolean))
        ? seccionPuesto(
            "Funciones del puesto",
            rows("funciones", []),
            Object.keys(legacy.funciones[0])
          )
        : list("Funciones del puesto", b.funciones)) +
      seccionPuesto(
        "Relaciones internas",
        rows("relacionesInternas", b.internas),
        legacy.relacionesInternas?.some((r) => Object.values(r).some(Boolean))
          ? Object.keys(legacy.relacionesInternas[0])
          : ["Área o puesto", "Relación"]
      ) +
      seccionPuesto(
        "Relaciones externas",
        rows("relacionesExternas", b.externas),
        legacy.relacionesExternas?.some((r) => Object.values(r).some(Boolean))
          ? Object.keys(legacy.relacionesExternas[0])
          : ["Contacto", "Relación"]
      ) +
      seccionPuesto("Decisiones que puede tomar", [
        [
          val(
            "decisiones",
            "Organizar sus actividades dentro de las prioridades acordadas. Los cambios de alcance, compromisos con terceros y uso de recursos requieren la autorización correspondiente."
          ),
        ],
      ]) +
      seccionPuesto("Reportes que elabora", rows("reportes", b.reportes), [
        "Nombre",
        "Periodicidad",
        "Destino",
      ]);
    for (const [key, title] of [
      ["procesos", "Procesos en que participa"],
      ["indicadores", "Indicadores"],
    ]) {
      if (
        Array.isArray(legacy[key]) &&
        legacy[key].some((row) => Object.values(row).some(Boolean))
      )
        body += seccionPuesto(
          title,
          rows(key, []),
          Object.keys(legacy[key][0])
        );
    }
    if (legacy.formacionInicial)
      body += seccionPuesto("Formación que debe recibir", [
        [legacy.formacionInicial],
      ]);
  } else {
    body = fields("Datos del turno", [
      ["Puesto", val("puesto", name)],
      ["Hora de inicio", val("horaInicio", "Según turno asignado")],
      ["Hora de término", val("horaTermino", "Según turno asignado")],
    ]);
    const moments = [
      [
        "inicioTurno",
        "Inicio del turno",
        [
          "Revisar prioridades, solicitudes y pendientes del periodo anterior.",
          "Confirmar herramientas, información y recursos necesarios para las actividades.",
        ],
      ],
      ["medioTurno", "Medio turno", b.funciones.slice(0, 4)],
      [
        "terminoTurno",
        "Término del turno",
        [
          "Verificar las entregas y registrar avances e incidencias.",
          "Comunicar pendientes, responsables y próximos pasos.",
          "Resguardar información y dejar el área y los recursos en condiciones de uso.",
        ],
      ],
    ];
    for (const [key, title, defaults] of moments)
      body += legacy[key]?.some((r) => Object.values(r).some(Boolean))
        ? seccionPuesto(title, rows(key, []), Object.keys(legacy[key][0]))
        : list(title, defaults);
    if (legacy.observaciones)
      body += seccionPuesto("Observaciones", [[legacy.observaciones]]);
  }
  const logo = urlLogoSeguro(empresa.logo);
  return `<div class="puesto-header">${
    logo
      ? `<img class="puesto-logo" src="${textoSeguro(
          logo
        )}" alt="Logo de la empresa">`
      : ""
  }<div><strong>${textoSeguro(
    empresa.nombre
  )}</strong><p>Gestión de talento</p></div><div class="puesto-code">${
    format.codigo
  }<br>Versión 1.0</div></div><h2>${textoSeguro(
    format.nombre
  )}</h2><p class="puesto-subtitle">${textoSeguro(
    name
  )}</p>${body}<div class="puesto-footer">${textoSeguro(
    empresa.nombre
  )} · Uso interno · ${format.codigo}</div>`;
}

export function urlLogoSeguro(value) {
  const url = String(value || "").trim();
  return /^https?:\/\/[^\s<>"']+$/i.test(url) ||
    /^\/(?!\/)[^\s<>"']+$/.test(url)
    ? url
    : "";
}

// Allowlist shared by load, save, preview and print. Document CSS never enters the app shell.
export function limpiarDocumentoPuesto(html, Parser = globalThis.DOMParser) {
  if (!Parser) throw new Error("El editor necesita un navegador.");
  const parsed = new Parser().parseFromString(String(html || ""), "text/html");
  const allowed = new Set([
    "section",
    "div",
    "span",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "td",
    "th",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "br",
    "ul",
    "ol",
    "li",
    "img",
  ]);
  const blocked = new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "svg",
    "math",
    "template",
    "form",
    "input",
    "button",
    "link",
    "meta",
  ]);
  const classes = new Set([
    "puesto-section",
    "puesto-fields",
    "puesto-numbered",
    "puesto-header",
    "puesto-logo",
    "puesto-code",
    "puesto-subtitle",
    "puesto-footer",
  ]);
  const walk = (node, depth = 0) => {
    if (depth > 30) return "";
    if (node.nodeType === 3) return textoSeguro(node.textContent);
    if (node.nodeType !== 1) return "";
    const tag = node.nodeName.toLowerCase();
    if (blocked.has(tag)) return "";
    const children = Array.from(node.childNodes || [])
      .map((n) => walk(n, depth + 1))
      .join("");
    if (!allowed.has(tag)) return children;
    let attrs = "";
    const cls = (node.getAttribute("class") || "")
      .split(/\s+/)
      .filter((c) => classes.has(c))
      .join(" ");
    if (cls) attrs += ` class="${cls}"`;
    if (["td", "th"].includes(tag)) {
      for (const name of ["colspan", "rowspan"]) {
        const value = node.getAttribute(name);
        if (/^[1-9]\d?$/.test(value || "")) attrs += ` ${name}="${value}"`;
      }
      if (["row", "col"].includes(node.getAttribute("scope")))
        attrs += ` scope="${node.getAttribute("scope")}"`;
    }
    const styles = (node.getAttribute("style") || "")
      .split(";")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) =>
        /^(text-align:\s*(left|center|right|justify)|font-weight:\s*(bold|normal|400|700)|font-style:\s*(italic|normal)|text-decoration(-line)?:\s*(underline|line-through|none))$/.test(
          entry
        )
      );
    if (styles.length) attrs += ` style="${styles.join(";")}"`;
    if (tag === "img") {
      const url = urlLogoSeguro(node.getAttribute("src"));
      return url
        ? `<img${attrs} src="${textoSeguro(url)}" alt="${textoSeguro(
            node.getAttribute("alt") || "Imagen"
          )}">`
        : "";
    }
    if (tag === "br") return "<br>";
    return `<${tag}${attrs}>${children}</${tag}>`;
  };
  const body =
    parsed.body ||
    parsed.getElementsByTagName("body")[0] ||
    parsed.documentElement;
  return Array.from(body.childNodes)
    .map((node) => walk(node))
    .join("");
}
