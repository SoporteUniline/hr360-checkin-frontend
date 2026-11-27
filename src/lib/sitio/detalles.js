// Contenido de las páginas de detalle de Funciones. Solo funciones que existen en el sistema.
export const DETALLE = {
  "reloj-checador": {
    ruta: "/funcionalidades/reloj-checador",
    color: "#2c56e8",
    eyebrow: "Reloj checador",
    titulo: "Checa con su rostro. Donde trabaja.",
    lead: "Tu gente registra entrada y salida desde el celular o una tablet, con reconocimiento facial y validación GPS.",
    resumen: ["Reconocimiento facial", "Geocerca de 10 a 1,000 m", "Checada con QR o código", "Reportes en Excel"],
    bloques: [
      {
        titulo: "Nadie checa por otro.",
        texto: "Cada registro se valida con el rostro de la persona. Si prefieres, también con código o QR.",
        puntos: [
          { t: "Reconocimiento facial", d: "Compara el rostro con el registrado antes de aceptar la checada." },
          { t: "Código o QR", d: "Otras formas de checar para quien las necesite." },
          { t: "Foto como evidencia", d: "Queda la foto de cada registro para revisarla después." },
          { t: "Relojes físicos", d: "También recibe checadas de relojes compatibles." },
        ],
      },
      {
        titulo: "Solo cuenta si está en su lugar.",
        texto: "Defines el área de cada sucursal u obra. Fuera de ella, la checada no se acepta y la persona ve el aviso «Fuera del área».",
        puntos: [
          { t: "Geocerca por lugar", d: "Radio de 10 a 1,000 metros alrededor de cada punto de trabajo." },
          { t: "Ubicación precisa", d: "Exige buena precisión y una ubicación reciente para evitar engaños." },
          { t: "Equipos en campo", d: "Varios lugares de trabajo por persona, para quien se mueve." },
        ],
      },
      {
        titulo: "Sin señal, también.",
        texto: "Si se cae el internet, la checada se guarda en el equipo y se envía sola al volver la conexión.",
        puntos: [
          { t: "Registro sin conexión", d: "Guarda hora y evidencia en el momento real." },
          { t: "Envío automático", d: "Al reconectar, se sincroniza sin que nadie haga nada." },
        ],
      },
      {
        titulo: "Las horas, listas para pagar.",
        texto: "RH ve cada día con entradas, salidas, comida y horas extra, y lo exporta a Excel.",
        puntos: [
          { t: "Horas trabajadas", d: "Calculadas con todos los tramos checados del día." },
          { t: "Horas extra autorizadas", d: "Dobles y triples con los límites de la ley." },
          { t: "Filtros", d: "Por fecha, persona, departamento, sucursal o estado." },
          { t: "Exportar a Excel", d: "El periodo completo, listo para tu nómina." },
        ],
      },
    ],
    faq: [
      { p: "¿Necesito comprar un reloj?", r: "No. Se usa desde el celular de cada persona o desde una tablet en la entrada. Si ya tienes relojes compatibles, también pueden enviar sus checadas." },
      { p: "¿Qué pasa si no hay internet?", r: "La checada se guarda en el equipo con su hora real y se envía en cuanto vuelve la conexión." },
      { p: "¿Sirve para la ley de registro de jornada de 2027?", r: "ADAMIA registra cada entrada y salida de forma electrónica por persona. Revisa nuestra guía de la reforma para ver los detalles." },
    ],
  },
  colaboradores: {
    ruta: "/funcionalidades/colaboradores",
    color: "#5a3cf4",
    eyebrow: "Colaboradores",
    titulo: "Todo de cada persona. En un solo lugar.",
    lead: "Alta, ficha completa, documentos e historial de cada colaborador, ordenados por departamento, puesto y sucursal.",
    resumen: ["Expediente 360°", "Altas y bajas con historial", "Campos personalizados", "Portal del empleado"],
    bloques: [
      {
        titulo: "Una ficha completa.",
        texto: "Datos personales, laborales y de contacto, más los que tu empresa necesite.",
        puntos: [
          { t: "Datos laborales", d: "Puesto, departamento, sucursal, horario, jefe y fecha de ingreso." },
          { t: "Datos oficiales", d: "NSS, RFC, CURP y contactos de emergencia." },
          { t: "Campos personalizados", d: "Agrega a la ficha los datos propios de tu empresa." },
        ],
      },
      {
        titulo: "El expediente, sin papeles.",
        texto: "Contratos, documentos y movimientos de cada persona, a un clic.",
        puntos: [
          { t: "Documentos", d: "Sube y consulta los documentos de cada colaborador." },
          { t: "Generar documentos", d: "Llena plantillas con sus datos y fírmalas en línea." },
          { t: "Historial", d: "Asistencias, permisos, vacaciones y actas en orden." },
        ],
      },
      {
        titulo: "Altas y bajas en orden.",
        texto: "Das de alta en minutos y, al dar de baja, el historial se conserva.",
        puntos: [
          { t: "Alta guiada", d: "Formulario con validaciones para no dejar datos fuera." },
          { t: "Baja con motivo", d: "La persona sale del día a día y su información queda guardada." },
          { t: "Finiquito", d: "Calcula y genera el documento de salida." },
        ],
      },
      {
        titulo: "Tu gente también entra.",
        texto: "Cada colaborador tiene su portal y su app para checar, ver sus datos y pedir permisos o vacaciones.",
        puntos: [
          { t: "Mi espacio", d: "Sus checadas, sus saldos de vacaciones y sus solicitudes." },
          { t: "Jefes", d: "Cada jefe ve y aprueba las solicitudes de su equipo." },
        ],
      },
    ],
    faq: [
      { p: "¿Puedo manejar varias empresas o sucursales?", r: "Sí. Una sola cuenta puede tener varias empresas y sucursales, con permisos por usuario." },
      { p: "¿Se pierde la información al dar de baja a alguien?", r: "No. La baja conserva el historial de la persona para consultas y auditorías." },
    ],
  },
  contratos: {
    ruta: "/funcionalidades/contratos",
    color: "#0b1033",
    eyebrow: "Contratos",
    titulo: "Ningún contrato vence sin que lo sepas.",
    lead: "Registra cada contrato con sus condiciones, recibe avisos antes de que venza y genera el documento para firmarlo en línea.",
    resumen: ["Avisos antes del vencimiento", "Todos los tipos de contrato", "Duplicar desde uno existente", "Firma en línea"],
    bloques: [
      {
        titulo: "Todas las condiciones, claras.",
        texto: "Cada contrato guarda lo que se acordó con la persona.",
        puntos: [
          { t: "Tipo y vigencia", d: "Indefinido, por tiempo determinado, temporal o de capacitación." },
          { t: "Compensación", d: "Salario base, periodicidad de pago y moneda." },
          { t: "Jornada", d: "Turno, horas a la semana y horario." },
          { t: "Prestaciones", d: "Vacaciones, aguinaldo, prima vacacional y prestaciones superiores." },
        ],
      },
      {
        titulo: "Avisos a tiempo.",
        texto: "ADAMIA te avisa por correo cuando un contrato está por vencer, para renovarlo o decidir a tiempo.",
        puntos: [
          { t: "Por vencer", d: "Ves cuáles vencen en los próximos días." },
          { t: "Vencidos", d: "Los que ya vencieron, separados para atenderlos." },
          { t: "Reglas de aviso", d: "Tú decides a quién y con cuánta anticipación." },
        ],
      },
      {
        titulo: "Menos captura.",
        texto: "Crea contratos nuevos a partir de uno que ya tienes y genera el documento con los datos de la persona.",
        puntos: [
          { t: "Duplicar", d: "Copia condiciones de un contrato existente." },
          { t: "Documento listo", d: "Plantillas que se llenan con los datos del contrato." },
          { t: "Firma en línea", d: "La persona firma desde su celular, con evidencia." },
        ],
      },
    ],
    faq: [
      { p: "¿Puedo usar mis propias plantillas?", r: "Sí. Puedes crear plantillas de documentos y llenarlas con los datos de cada persona y contrato." },
      { p: "¿Quién recibe el aviso de vencimiento?", r: "Las personas que configures en las reglas de aviso, con la anticipación que elijas." },
    ],
  },
  "notificaciones-reglas": {
    ruta: "/funcionalidades/notificaciones-reglas",
    color: "#15803d",
    eyebrow: "Notificaciones y reglas",
    titulo: "ADAMIA avisa por ti.",
    lead: "Reglas que mandan correos solos: retardos, faltas, contratos por vencer, cumpleaños y aniversarios. Y aprobaciones de permisos por WhatsApp.",
    resumen: ["Correos automáticos", "Aprobación por WhatsApp", "Tú eliges quién recibe", "Documentos por vencer"],
    bloques: [
      {
        titulo: "Lo importante, sin buscarlo.",
        texto: "Crea reglas y ADAMIA envía el aviso a las personas que elijas.",
        puntos: [
          { t: "Llegadas tarde", d: "Quién llegó tarde, para actuar el mismo día." },
          { t: "Inasistencias", d: "Quién no checó su entrada." },
          { t: "Contratos por vencer", d: "Con la anticipación que definas." },
        ],
      },
      {
        titulo: "Cuida a tu gente.",
        texto: "Recordatorios y felicitaciones para que ninguna fecha importante pase desapercibida.",
        puntos: [
          { t: "Cumpleaños", d: "Aviso a RH y felicitación a la persona." },
          { t: "Aniversarios", d: "Aviso y felicitación por años en la empresa." },
        ],
      },
      {
        titulo: "Decide desde WhatsApp.",
        texto: "Cuando alguien pide un permiso o vacaciones, su jefe lo aprueba o rechaza desde WhatsApp, sin abrir una computadora.",
        puntos: [
          { t: "Aprobación al momento", d: "El saldo de vacaciones se actualiza solo." },
          { t: "Documentos por vencer", d: "Avisos de documentos del expediente próximos a vencer." },
        ],
      },
    ],
    faq: [
      { p: "¿Puedo elegir quién recibe cada aviso?", r: "Sí. Cada regla tiene sus destinatarios y su periodicidad." },
      { p: "¿Los jefes necesitan entrar al sistema para aprobar?", r: "No es necesario: pueden aprobar o rechazar desde WhatsApp." },
    ],
  },
  "dashboard-empleados": {
    ruta: "/funcionalidades/dashboard-empleados",
    color: "#b45309",
    eyebrow: "Panel de empleados",
    titulo: "Tu empresa, de un vistazo.",
    lead: "Quién llegó, quién falta, quién está de vacaciones y qué necesita tu atención hoy, en una sola pantalla.",
    resumen: ["Presentes y tardanzas en vivo", "Ausencias y permisos del día", "Contratos y cumpleaños", "Por empresa y sucursal"],
    bloques: [
      {
        titulo: "El día, en vivo.",
        texto: "Las checadas llegan al panel al instante.",
        puntos: [
          { t: "Presentes", d: "Cuántas personas ya llegaron." },
          { t: "Tardanzas", d: "Quién llegó después de su horario y tolerancia." },
          { t: "Ausencias y por llegar", d: "Quién falta y quién aún está en tiempo." },
        ],
      },
      {
        titulo: "Cada persona, a detalle.",
        texto: "Abre a cualquier colaborador y ve su asistencia del periodo.",
        puntos: [
          { t: "Porcentaje de asistencia", d: "Días trabajados y días con falta." },
          { t: "Entradas y salidas", d: "Hora de entrada, salida y horas trabajadas por día." },
          { t: "Permisos y vacaciones", d: "Lo pedido, lo aprobado y lo que le queda." },
        ],
      },
      {
        titulo: "Lo que viene.",
        texto: "Contratos por vencer, cumpleaños y aniversarios para que nada te tome por sorpresa.",
        puntos: [
          { t: "Contratos", d: "Activos, por vencer y vencidos." },
          { t: "Fechas especiales", d: "Cumpleaños y aniversarios del mes." },
        ],
      },
    ],
    faq: [
      { p: "¿Puedo ver solo una sucursal?", r: "Sí. Filtra por empresa, sucursal o departamento." },
      { p: "¿Cada cuánto se actualiza?", r: "Las checadas aparecen al momento en que se registran." },
    ],
  },
};
