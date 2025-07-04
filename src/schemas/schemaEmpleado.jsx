import { z } from "zod";

export const schemaEmpleado = z.object({
  nombre: z.string().min(1, "El nombre del empleado es obligatorio"),
  puesto: z.string().min(1, "El puesto es obligatorio"),
  apellido_paterno: z.string().min(1, "El apellido paterno es obligatorio"),
  apellido_materno: z.string().min(1, "El apellido materno es obligatorio"),
  fecha_nacimiento: z.string().min(1, "La fecha de nacimiento es obligatoria"),
  telefono: z.string().min(1, "El teléfono es obligatorio"),
  correo: z.string().email("Correo electrónico no válido"),
  curp: z
    .string()
    .length(18, "La CURP debe tener 18 caracteres")
    .regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/, "Formato de CURP inválido"),
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
  dias_trabajo: z.string().min(1, "Debes seleccionar al menos un día"),
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
});
