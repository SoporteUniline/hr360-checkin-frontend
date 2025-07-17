import { z } from "zod";

// Al inicio donde defines el schema
const horarioSchema = z.object({
  dia: z.string().min(1),
  entrada: z.string().nullable().optional(),
  salida_comida: z.string().nullable().optional(), // ← nuevo campo
  regreso_comida: z.string().nullable().optional(), // ← nuevo campo
  salida: z.string().nullable().optional(),
});

export const schemaEmpleado = z
  .object({
    nombre: z.string().min(1, "El nombre del empleado es obligatorio"),
    puesto: z.string().min(1, "El puesto es obligatorio"),
    apellido_paterno: z.string().min(1, "El apellido paterno es obligatorio"),
    apellido_materno: z.string().min(1, "El apellido materno es obligatorio"),
    fecha_nacimiento: z
      .string()
      .min(1, "La fecha de nacimiento es obligatoria"),
    telefono: z.string().min(1, "El teléfono es obligatorio"),
    correo: z.string().email("Correo electrónico no válido"),
    curp: z
      .string()
      .length(18, "La CURP debe tener 18 caracteres")
      .regex(
        /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/,
        "Formato de CURP inválido"
      ),
    rfc: z
      .string()
      .length(13, "El RFC debe tener 13 caracteres")
      .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, "Formato de RFC inválido"),
    nss: z
      .string()
      .length(11, "El NSS debe tener 11 caracteres")
      .regex(/^\d+$/, "Solo números para el NSS"),
    sexo: z.string().min(1, "El sexo es obligatorio"),
    estado_civil: z.string().min(1, "El estado civil es obligatorio"),
    direccion: z.string().min(1, "La dirección es obligatoria"),

    // Laborales
    nombre_empresa: z.string().optional(), // visible pero no editable
    sucursal: z.string().min(1, "La sucursal es obligatoria"),
    departamento: z.string().min(1, "El departamento es obligatorio"),
    fecha_ingreso: z.string().min(1, "La fecha de ingreso es obligatoria"),
    nip: z.string().min(1, "El código de empleado es obligatorio"),

    // Jornada
    dias_trabajo: z.string(),
    hrs_por_dia: z
      .number({ invalid_type_error: "Las horas por día deben ser un número" })
      .min(0, "Las horas por día son obligatorias"),

    hrs_de_comida: z
      .number({ invalid_type_error: "Las horas de comida deben ser un número" })
      .min(0, "Las horas de comida son obligatorias"),

    // Otros
    id_empresa: z
      .union([z.string(), z.number()])
      .transform((val) => Number(val))
      .refine((val) => !isNaN(val), {
        message: "id_empresa debe ser un número válido",
      }),
    periodo_pago: z.enum(
      ["Diario", "Semanal", "Catorcenal", "Quincenal", "Mensual", "Por hora"],
      {
        errorMap: () => ({ message: "Selecciona un periodo de pago" }),
      }
    ),
    forma_pago: z.enum(["Fijo", "Comisiones", "Fijo + Comisiones"], {
      errorMap: () => ({ message: "Selecciona una forma de pago" }),
    }),
    forma_calculo: z.enum(["$", "%", "Ambos"], {
      errorMap: () => ({ message: "Selecciona una forma de cálculo" }),
    }),
    sueldo_por_hora: z.coerce.number().nullable().optional(),
    porcentaje: z.coerce.number().nullable().optional(),
    id_jefe_inmediato: z.union([z.string(), z.number()]).nullable().optional(),
    id_autoriza_vacaciones: z
      .union([z.string(), z.number()])
      .nullable()
      .optional(),
    id_autoriza_permisos: z
      .union([z.string(), z.number()])
      .nullable()
      .optional(),
    horarios: z
      .array(horarioSchema)
      .min(1, "Debes definir al menos un horario")
      .optional(),
    solicitar_gps: z.enum(["Sí", "No"]),
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

    banco: z.string().min(1, "Selecciona un banco"),
    otro_banco: z.string().optional(),
    tipo_cuenta: z.enum(["Cuenta", "CLABE"]),
    numero_cuenta: z
      .string()
      .min(10, "Debe tener al menos 10 dígitos")
      .max(18, "Máximo 18 dígitos")
      .regex(/^\d+$/, "Solo números"),
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
      if (!data.lugar_checkin) {
        ctx.addIssue({
          path: ["lugar_checkin"],
          code: z.ZodIssueCode.custom,
          message: "Debes seleccionar el punto de check-in",
        });
      }
      if (!data.lugar_checkout) {
        ctx.addIssue({
          path: ["lugar_checkout"],
          code: z.ZodIssueCode.custom,
          message: "Debes seleccionar el punto de check-out",
        });
      }
    }
  });
