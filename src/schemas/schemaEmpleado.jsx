import { z } from "zod";

const horarioSchema = z.object({
  dia: z.string().min(1),
  entrada: z.string().nullable().optional(),
  salida_comida: z.string().nullable().optional(),
  regreso_comida: z.string().nullable().optional(),
  salida: z.string().nullable().optional(),
});

export const schemaEmpleado = z
  .object({
    nombre: z.string().min(1, "El nombre del empleado es obligatorio"),
    apellido_paterno: z.string().min(1, "El apellido paterno es obligatorio"),
    apellido_materno: z.string().min(1, "El apellido materno es obligatorio"),
    puesto: z
      .string()
      .min(1, "El nombre del empleado y el puesto son campos obligatorios"),
    fecha_nacimiento: z.string().optional(),
    telefono: z.string().optional(),
    correo: z
      .string()
      .min(1, "El correo electrónico es obligatorio")
      .email("Correo electrónico no válido"),
    correo_notificaciones: z
      .string()
      .email("Correo de notificaciones no válido")
      .optional()
      .or(z.literal("")),
    curp: z.string().optional().or(z.literal("")),
    rfc: z.string().optional().or(z.literal("")),
    nss: z
      .string()
      .regex(/^\d*$/, "Solo números para el NSS")
      .optional()
      .or(z.literal("")),
    sexo: z
      .string()
      .transform((val) => (val === "sin-seleccion" ? "" : val))
      .optional(),
    estado_civil: z
      .string()
      .transform((val) => (val === "sin-seleccion" ? "" : val))
      .optional(),
    direccion: z.string().optional(),

    // ✅ Laborales - OBLIGATORIOS
    sucursal: z.string().min(1, "La sucursal es obligatoria"),

    // Laborales - OPCIONALES
    new_pass: z.string().optional().or(z.literal("")),
    departamento: z.string().optional(),
    nombre_empresa: z.string().optional(),
    fecha_ingreso: z.string().optional(),
    nip: z.string().optional(),
    checar_gps: z.boolean().default(false).optional(),
    enviar_asistencia_automatica: z.boolean().default(true).optional(),
    autoriza_horas_extra: z.boolean().default(false).optional(),
    metodo_chequeo: z
      .enum(["codigo", "facial", "ambos"])
      .default("ambos")
      .optional(),

    cierre_turno: z.string().optional().default("Automático"),

    // Jornada - OBLIGATORIOS
    hrs_por_dia: z
      .number({ invalid_type_error: "Las horas por día deben ser un número" })
      .min(0, "Las horas por día son obligatorias"),

    hrs_de_comida: z
      .number({ invalid_type_error: "Las horas de comida deben ser un número" })
      .min(0, "Las horas de comida son obligatorias"),
    horarios: z.array(horarioSchema).min(7),

    // Jornada - OPCIONALES
    areasAsignadas: z.array(z.number()).optional(),

    // Nómina - OBLIGATORIOS
    periodo_pago: z
      .string()
      .min(1, "Selecciona un periodo de pago")
      .refine((val) => val !== "sin-seleccion", {
        message: "Selecciona un periodo de pago",
      }),

    forma_pago: z
      .string()
      .min(1, "Selecciona una forma de pago")
      .refine((val) => val !== "sin-seleccion", {
        message: "Selecciona una forma de pago",
      }),

    forma_calculo: z
      .string()
      .min(1, "Selecciona una forma de cálculo")
      .refine((val) => val !== "sin-seleccion", {
        message: "Selecciona una forma de cálculo",
      }),

    // Nómina - OPCIONALES
    sueldo: z.coerce.number().nullable().optional(),
    porcentaje: z.coerce.number().nullable().optional(),

    // Otros campos opcionales
    id_empresa: z
      .union([z.string(), z.number()])
      .transform((val) => Number(val))
      .refine((val) => Number.isInteger(val) && val > 0, {
        message: "Selecciona una empresa válida",
      }),

    id_jefe_inmediato: z.union([z.string(), z.number()]).nullable().optional(),
    id_autoriza_vacaciones: z
      .union([z.string(), z.number()])
      .nullable()
      .optional(),
    id_autoriza_permisos: z
      .union([z.string(), z.number()])
      .nullable()
      .optional(),
    solicitar_gps: z.enum(["Sí", "No"]).optional().or(z.literal("")),
    lugar_checkin: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .nullable()
      .optional(),
    lugar_checkout: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .nullable()
      .optional(),

    // ✅ Cuentas bancarias - OPCIONALES
    banco: z.string().optional(),
    otro_banco: z.string().optional(),
    tipo_cuenta: z.enum(["Cuenta", "CLABE"]).optional(),
    numero_cuenta: z
      .string()
      .min(10, "Debe tener al menos 10 dígitos")
      .max(18, "Máximo 18 dígitos")
      .regex(/^\d+$/, "Solo números")
      .optional()
      .or(z.literal("")),
    descriptor_facial: z
      .union([z.array(z.number()), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) {
          return [];
        }
        return val;
      }),
  })
  .superRefine((data, ctx) => {
    if (
      data.banco === "Otro" &&
      (!data.otro_banco || data.otro_banco.trim() === "")
    ) {
      ctx.addIssue({
        path: ["otro_banco"],
        code: z.ZodIssueCode.custom,
        message: "Especifica el nombre del banco",
      });
    }

    if (data.solicitar_gps === "Sí") {
      if (
        !data.lugar_checkin ||
        Object.keys(data.lugar_checkin || {}).length === 0
      ) {
        ctx.addIssue({
          path: ["lugar_checkin"],
          code: z.ZodIssueCode.custom,
          message: "Debes seleccionar el punto de check-in",
        });
      }
      if (
        !data.lugar_checkout ||
        Object.keys(data.lugar_checkout || {}).length === 0
      ) {
        ctx.addIssue({
          path: ["lugar_checkout"],
          code: z.ZodIssueCode.custom,
          message: "Debes seleccionar el punto de check-out",
        });
      }
    }

    const diasCompletos = data.horarios.filter(
      (horario) =>
        horario.entrada &&
        horario.salida_comida &&
        horario.regreso_comida &&
        horario.salida,
    );

    if (diasCompletos.length === 0) {
      ctx.addIssue({
        path: ["horarios"],
        code: z.ZodIssueCode.custom,
        message:
          "Debes completar al menos un día con entrada, salida comida, regreso comida y salida",
      });
    }

    if (data.forma_calculo !== "sin-seleccion") {
      if (data.forma_calculo === "$" || data.forma_calculo === "Ambos") {
        if (
          data.sueldo === null ||
          data.sueldo === undefined ||
          data.sueldo <= 0
        ) {
          ctx.addIssue({
            path: ["sueldo"],
            code: z.ZodIssueCode.custom,
            message:
              "El sueldo es requerido cuando la forma de cálculo es $ o Ambos",
          });
        }
      }

      if (data.forma_calculo === "%" || data.forma_calculo === "Ambos") {
        if (
          data.porcentaje === null ||
          data.porcentaje === undefined ||
          data.porcentaje <= 0
        ) {
          ctx.addIssue({
            path: ["porcentaje"],
            code: z.ZodIssueCode.custom,
            message:
              "El porcentaje es requerido cuando la forma de cálculo es % o Ambos",
          });
        }
      }
    }
  });
