// Copia del catálogo de variables de contrato del backend (modules/attendance/services/contratoTexto.js, VARIABLES):
// el editor de plantillas pinta con esto sus botones «Datos que se llenan solos». El backend también lo devuelve en
// GET /contratos/plantillas-base y es quien llena los valores; scripts/test-contratos.mjs revisa que cada variable de
// la copia tenga etiqueta y grupo. Si agregas una variable, agrégala en los dos.
export const VARIABLES_CONTRATO = [
  {
    "grupo": "Contrato",
    "claves": [
      [
        "contrato.puesto",
        "Puesto"
      ],
      [
        "contrato.lugar_de_trabajo",
        "Lugar de trabajo"
      ],
      [
        "contrato.sueldo",
        "Sueldo"
      ],
      [
        "contrato.sueldo_letra",
        "Sueldo con letra"
      ],
      [
        "contrato.sueldo_diario",
        "Sueldo diario"
      ],
      [
        "contrato.sueldo_mensual",
        "Sueldo mensual"
      ],
      [
        "contrato.sueldo_mensual_letra",
        "Sueldo mensual con letra"
      ],
      [
        "contrato.periodicidad",
        "Periodicidad"
      ],
      [
        "contrato.fecha_inicio",
        "Fecha de inicio"
      ],
      [
        "contrato.fecha_fin",
        "Fecha de fin"
      ],
      [
        "contrato.duracion_dias",
        "Duración en días"
      ],
      [
        "contrato.tipo",
        "Tipo de contrato"
      ],
      [
        "contrato.causa",
        "Causa u obra (notas)"
      ],
      [
        "contrato.horario",
        "Horario"
      ],
      [
        "contrato.tipo_jornada",
        "Tipo de jornada"
      ],
      [
        "contrato.horas_semanales",
        "Horas a la semana"
      ],
      [
        "contrato.dia_descanso",
        "Día de descanso"
      ],
      [
        "contrato.modalidad",
        "Modalidad"
      ],
      [
        "contrato.prestaciones",
        "Prestaciones"
      ],
      [
        "contrato.vacaciones_ley",
        "Vacaciones por ley"
      ],
      [
        "contrato.dias_vacaciones",
        "Días de vacaciones"
      ],
      [
        "contrato.prima_vacacional",
        "Prima vacacional"
      ],
      [
        "contrato.aguinaldo_dias",
        "Días de aguinaldo"
      ],
      [
        "contrato.folio",
        "Folio"
      ]
    ]
  },
  {
    "grupo": "Persona",
    "claves": [
      [
        "empleado.nombre_completo",
        "Nombre completo"
      ],
      [
        "empleado.curp",
        "CURP"
      ],
      [
        "empleado.rfc",
        "RFC"
      ],
      [
        "empleado.nss",
        "Número de seguro social"
      ],
      [
        "empleado.domicilio",
        "Domicilio"
      ],
      [
        "empleado.fecha_ingreso",
        "Fecha de ingreso"
      ],
      [
        "empleado.salario",
        "Sueldo vigente"
      ]
    ]
  },
  {
    "grupo": "Empresa",
    "claves": [
      [
        "empresa.razon_social",
        "Razón social"
      ],
      [
        "empresa.rfc",
        "RFC de la empresa"
      ],
      [
        "empresa.representante",
        "Representante"
      ],
      [
        "empresa.domicilio_fiscal",
        "Domicilio fiscal"
      ],
      [
        "empresa.nombre",
        "Nombre comercial"
      ]
    ]
  },
  {
    "grupo": "Fecha",
    "claves": [
      [
        "fecha.completa",
        "Fecha de hoy"
      ],
      [
        "fecha.dia",
        "Día"
      ],
      [
        "fecha.mes",
        "Mes"
      ],
      [
        "fecha.anio",
        "Año"
      ]
    ]
  }
];

export const ETIQUETA_VARIABLE = new Map(VARIABLES_CONTRATO.flatMap((g) => g.claves));
export const CLAVES_CONTRATO = VARIABLES_CONTRATO.flatMap((g) => g.claves.map(([c]) => c));

// Lo que pide el mockup como accesos rápidos del editor (el resto, en «Ver todos los datos»).
export const RAPIDAS = {
  Contrato: ["contrato.sueldo", "contrato.sueldo_letra", "contrato.periodicidad", "contrato.fecha_inicio", "contrato.horario", "contrato.prestaciones"],
  Persona: ["empleado.nombre_completo", "empleado.curp", "empleado.rfc", "empleado.domicilio"],
  Empresa: ["empresa.razon_social", "empresa.representante", "empresa.domicilio_fiscal"],
};
