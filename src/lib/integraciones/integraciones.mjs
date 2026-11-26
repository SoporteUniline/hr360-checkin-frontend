// API de integración v1 por empresa (26/12/2026): reglas del panel «Integraciones» y contenido de la página pública
// /desarrolladores. Sin red ni React: probado en scripts/test-integraciones.mjs. La verdad está en el servidor
// (backend docs/api-integracion.md y docs/openapi-integracion-v1.json); los PERMISOS son los mismos que
// modules/integracion/services/llaves.js. Si cambias uno, cámbialo en los dos.

export const PERMISOS = Object.freeze([
  Object.freeze({ clave: "empleados:leer", nombre: "Consultar empleados", descripcion: "Lista y ficha de empleados (sin contraseña, PIN, rostro ni nómina)." }),
  Object.freeze({ clave: "empleados:escribir", nombre: "Crear y actualizar empleados", descripcion: "Altas y cambios con las mismas reglas del panel. No borra." }),
  Object.freeze({ clave: "asistencias:leer", nombre: "Consultar asistencias", descripcion: "Asistencias por fecha o rango de hasta 31 días." }),
]);
export const CLAVES_PERMISO = PERMISOS.map((p) => p.clave);
const POR_CLAVE = new Map(PERMISOS.map((p) => [p.clave, p]));
export const nombrePermiso = (clave) => POR_CLAVE.get(clave)?.nombre ?? clave;

export const VIGENCIAS = Object.freeze([
  Object.freeze({ dias: 90, nombre: "90 días" }),
  Object.freeze({ dias: 365, nombre: "1 año" }),
  Object.freeze({ dias: 30, nombre: "30 días" }),
  Object.freeze({ dias: null, nombre: "Sin vencimiento" }),
]);

export const LIMITE_POR_MINUTO = 60;
export const MAX_DIAS_ASISTENCIAS = 31;
export const RUTA_DOCS = "/desarrolladores";

/** Base de la API v1 a partir de NEXT_PUBLIC_RUTA_BACKEND (…/api). */
export function urlBaseApi(rutaBackend) {
  const base = String(rutaBackend ?? "").trim().replace(/\/+$/, "");
  return `${base || "https://adamia.com.mx/api"}/integracion/v1`;
}

/** Valida el formulario de «Crear llave». → { ok, errores: { campo: mensaje }, datos } */
export function validarNuevaLlave({ nombre, permisos, vigencia } = {}) {
  const errores = {};
  const limpio = String(nombre ?? "").replace(/\s+/g, " ").trim();
  if (limpio.length < 3 || limpio.length > 80) errores.nombre = "Escribe un nombre de 3 a 80 caracteres (p. ej. «Nómina externa»).";
  const lista = CLAVES_PERMISO.filter((c) => (permisos ?? []).includes(c));
  if (!lista.length) errores.permisos = "Elige al menos un permiso.";
  const dias = vigencia === null || vigencia === undefined || vigencia === "" ? null : Number(vigencia);
  if (dias !== null && (!Number.isInteger(dias) || dias < 1 || dias > 1095)) errores.vigencia = "Elige una vigencia válida.";
  return { ok: Object.keys(errores).length === 0, errores, datos: { nombre: limpio, permisos: lista, expira_en_dias: dias } };
}

const ESTADOS = {
  activa: { texto: "Activa", tono: "verde" },
  expirada: { texto: "Vencida", tono: "ambar" },
  revocada: { texto: "Revocada", tono: "gris" },
};
export const estadoLlave = (estado) => ESTADOS[estado] ?? { texto: String(estado ?? "—"), tono: "gris" };

/** Fecha de la base («2026-12-26 10:15:00», hora de CDMX) → «26 dic 2026, 10:15». */
export function fechaCorta(valor) {
  if (!valor) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(valor));
  if (!m) return String(valor);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(m[3])} ${meses[Number(m[2]) - 1]} ${m[1]}, ${m[4]}:${m[5]}`;
}

export const textoUltimoUso = (llave) => (llave?.ultimo_uso_en
  ? `${fechaCorta(llave.ultimo_uso_en)}${llave.ultimo_uso_ip ? ` · ${llave.ultimo_uso_ip}` : ""}`
  : "Sin uso todavía");

/** Tono del estado HTTP de la bitácora. */
export function tonoHttp(estado) {
  const n = Number(estado);
  if (n >= 200 && n < 300) return "verde";
  if (n === 429 || (n >= 400 && n < 500)) return "ambar";
  return "rojo";
}

/** Prefijo visible para la lista: «adk_live_Ab12Cd34…». */
export const prefijoVisible = (prefijo) => (prefijo ? `${prefijo}…` : "—");

// ── Documentación pública ─────────────────────────────────────────────────────────────────────────────────────────
export const ERRORES = Object.freeze([
  ["400", "PARAMETRO_INVALIDO", "Parámetros o cuerpo inválidos (incluye JSON mal formado)."],
  ["400", "LLAVE_EN_URL", "Mandaste la llave en la URL. Usa la cabecera y revoca esa llave."],
  ["401", "NO_AUTENTICADO", "Falta la cabecera Authorization: Bearer <llave>."],
  ["401", "LLAVE_INVALIDA", "La llave no existe o está mal copiada."],
  ["401", "LLAVE_REVOCADA", "El dueño revocó la llave."],
  ["401", "LLAVE_EXPIRADA", "La llave venció."],
  ["403", "PERMISO_INSUFICIENTE", "La llave no tiene el permiso de esa operación (ver permiso_requerido)."],
  ["403", "EMPRESA_NO_ACTIVA", "La empresa de la llave está suspendida o inactiva."],
  ["404", "EMPLEADO_NO_ENCONTRADO", "No existe en tu empresa (un id de otra empresa también da 404)."],
  ["404", "RUTA_NO_EXISTE", "La ruta no existe en la v1."],
  ["409", "IDEMPOTENCIA_EN_PROCESO", "La misma Idempotency-Key sigue en proceso."],
  ["422", "VALIDACION", "Revisa «campos»: mensaje por cada campo con error."],
  ["422", "IDEMPOTENCIA_CONFLICTO", "Usaste la misma Idempotency-Key con otro contenido."],
  ["429", "LIMITE_EXCEDIDO", "Pasaste el límite por minuto. Espera lo que diga Retry-After."],
  ["503", "API_NO_DISPONIBLE", "Servicio no disponible temporalmente. Reintenta."],
  ["500", "ERROR_INTERNO", "Error del servidor. Comparte el id_peticion con soporte."],
].map(([http, codigo, cuando]) => Object.freeze({ http, codigo, cuando })));

export const CAMPOS_EMPLEADO = Object.freeze([
  ["nombre", "texto (60)", true, "Nombre(s)."],
  ["apellido_paterno", "texto (60)", true, ""],
  ["apellido_materno", "texto (60)", true, ""],
  ["correo", "correo", true, "Único en la empresa y que no sea de un usuario del sistema."],
  ["puesto", "texto (100)", true, "Se crea si no existe."],
  ["sucursal", "texto (100)", true, "Unidad de negocio que ya exista en la empresa."],
  ["departamento", "texto (100)", false, "Debe existir en la empresa."],
  ["nip", "texto (1–20)", false, "Código de empleado del checador. Único en la empresa. No es el PIN."],
  ["telefono", "texto (7–20)", false, ""],
  ["correo_notificaciones", "correo", false, ""],
  ["fecha_nacimiento", "AAAA-MM-DD", false, ""],
  ["fecha_ingreso", "AAAA-MM-DD", false, "Si no llega, la fecha de hoy."],
  ["curp", "18 caracteres", false, "Única en la empresa."],
  ["rfc", "12–13 caracteres", false, "Único en la empresa."],
  ["nss", "11 dígitos", false, "Único en la empresa."],
  ["direccion", "texto (255)", false, ""],
  ["id_jefe_inmediato", "entero", false, "Id de un empleado de la misma empresa."],
  ["hrs_por_dia", "número 0–24", false, ""],
  ["hrs_de_comida", "número 0–12", false, ""],
  ["estado", "Activo | Inactivo | Baja", false, "Solo en PATCH. Dar de baja cierra sus sesiones y lo quita de los checadores."],
  ["fecha_baja", "AAAA-MM-DD", false, "Solo en PATCH."],
  ["motivo_baja", "texto (200)", false, "Solo en PATCH."],
].map(([campo, tipo, obligatorio, nota]) => Object.freeze({ campo, tipo, obligatorio, nota })));

export function ejemplos(base) {
  const b = urlBaseApi(base);
  return {
    listar: `curl -s "${b}/empleados?activo=true&por_pagina=100" \\\n  -H "Authorization: Bearer $ADAMIA_LLAVE"`,
    uno: `curl -s "${b}/empleados/1284" \\\n  -H "Authorization: Bearer $ADAMIA_LLAVE"`,
    crear: `curl -s -X POST "${b}/empleados" \\\n  -H "Authorization: Bearer $ADAMIA_LLAVE" \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: alta-2026-12-26-0001" \\\n  -d '{"nombre":"Ana","apellido_paterno":"Torres","apellido_materno":"López","correo":"ana.torres@empresa.mx","puesto":"Cajera","sucursal":"Centro","nip":"1284"}'`,
    actualizar: `curl -s -X PATCH "${b}/empleados/1284" \\\n  -H "Authorization: Bearer $ADAMIA_LLAVE" \\\n  -H "Content-Type: application/json" \\\n  -d '{"puesto":"Supervisora","telefono":"5598765432"}'`,
    asistencias: `curl -s "${b}/asistencias?fecha=2026-12-15" \\\n  -H "Authorization: Bearer $ADAMIA_LLAVE"`,
    rango: `curl -s "${b}/asistencias?desde=2026-12-01&hasta=2026-12-15&empleado=1284&pagina=2" \\\n  -H "Authorization: Bearer $ADAMIA_LLAVE"`,
  };
}

export const RESPUESTA_EMPLEADOS = `{
  "data": [
    {
      "id": 1284, "nombre": "Ana", "apellido_paterno": "Torres", "apellido_materno": "López",
      "correo": "ana.torres@empresa.mx", "puesto": "Cajera", "departamento": "Ventas", "sucursal": "Centro",
      "nip": "1284", "estado": "Activo", "activo": true, "fecha_ingreso": "2026-12-01",
      "creado_en": "2026-12-01T09:12:44-06:00", "actualizado_en": "2026-12-20T17:03:10-06:00"
    }
  ],
  "paginacion": { "pagina": 1, "por_pagina": 100, "total": 1, "total_paginas": 1 }
}`;

export const RESPUESTA_ASISTENCIAS = `{
  "data": [
    {
      "id": 99812, "fecha": "2026-12-15",
      "empleado": { "id": 1284, "nombre": "Ana", "apellido_paterno": "Torres", "nip": "1284", "sucursal": "Centro" },
      "entrada": "2026-12-15T09:05:00-06:00", "salida": "2026-12-15T18:01:00-06:00",
      "asistio": true, "estado_asistencia": "Tardanza",
      "horario_programado": { "entrada": "09:00", "salida": "18:00", "salida_comida": null, "regreso_comida": null },
      "checadas": [{ "entrada": "2026-12-15T09:05:00-06:00", "salida": "2026-12-15T18:01:00-06:00" }],
      "minutos_trabajados": 536, "horas_extra": false, "zona_horaria": "America/Mexico_City"
    }
  ],
  "paginacion": { "pagina": 1, "por_pagina": 100, "total": 1, "total_paginas": 1 },
  "resumen": { "desde": "2026-12-15", "hasta": "2026-12-15", "total_asistencias": 1, "total_ausencias": 0 }
}`;

export const RESPUESTA_ERROR = `{
  "error": {
    "codigo": "VALIDACION",
    "mensaje": "Revisa los campos marcados.",
    "campos": { "correo": "Ya existe un empleado con ese correo en tu empresa." },
    "id_peticion": "5f0c1d2e-6a51-4c1e-9a43-0d3f7b2e9c11"
  }
}`;
