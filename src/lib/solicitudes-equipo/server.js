import { cookies } from "next/headers";
import {
  canReview,
  employeeName,
  isoDate,
  isVacation,
  numberOrNull,
  normalize,
} from "./model.mjs";

export class TeamError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}
const id = (value) =>
  /^\d+$/.test(String(value)) && Number(value) > 0 ? String(value) : null;
const pick = (object, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => object[key] !== undefined)
      .map((key) => [key, object[key]]),
  );
export async function session() {
  const token = (await cookies()).get("token")?.value;
  if (!token)
    throw new TeamError(
      "Inicia sesión para consultar las solicitudes de tu equipo.",
      401,
    );
  const base = process.env.NEXT_PUBLIC_RUTA_BACKEND;
  if (!base)
    throw new TeamError("El servicio de solicitudes no está configurado.", 503);
  const api = async (path, options = {}) => {
    let response;
    try {
      response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
        ...options,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch {
      throw new TeamError(
        "No se pudo conectar con el servicio. Vuelve a intentar.",
        503,
      );
    }
    if (!response.ok) {
      const status = response.status;
      if (status === 401)
        throw new TeamError(
          "Tu sesión terminó. Inicia sesión nuevamente.",
          401,
        );
      if (status === 403)
        throw new TeamError(
          "Tu cuenta no tiene acceso a esta información en el servicio de ADAMIA.",
          403,
        );
      if (status === 404)
        throw new TeamError("El registro ya no está disponible.", 404);
      if ([400, 409, 422].includes(status)) {
        const data = await response.json().catch(() => ({}));
        throw new TeamError(
          typeof data.error === "string"
            ? data.error
            : typeof data.message === "string"
              ? data.message
              : "El servicio no pudo aplicar el cambio. Actualiza la solicitud.",
          status,
        );
      }
      throw new TeamError(
        "No se pudo consultar la información completa. Vuelve a intentar.",
      );
    }
    if (response.status === 204) return {};
    return response.json();
  };
  // Verificación en el backend: identidad y empresa nunca se aceptan del navegador.
  const verified = await api("/users/verify/token");
  const user = verified.user;
  if (!user || !["Empleado", "Recruiter", "User"].includes(user.tipo_usuario))
    throw new TeamError(
      "Esta vista está disponible para responsables vinculados a un empleado.",
      403,
    );
  const company = id(
    user.id_empresa ||
      user.empresas_detalle?.[0]?.id_empresa ||
      user.empresas?.[0],
  );
  if (!company)
    throw new TeamError("Tu cuenta no tiene una empresa asignada.", 403);
  let employeeId = id(user.id_empleado);
  if (!employeeId && (user.correo || user.email)) {
    const found = await api(
      `/checador/empleados/por-correo?${new URLSearchParams({ empresa: company, correo: user.correo || user.email })}`,
    );
    employeeId = id(found.id_empleado);
  }
  if (!employeeId)
    throw new TeamError(
      "Vincula tu cuenta con tu registro de empleado para consultar tu equipo.",
      403,
    );
  return { api, user, company, employeeId };
}
function arrayResponse(data, key) {
  const value = Array.isArray(data) ? data : data?.[key];
  const array = Array.isArray(value)
    ? value
    : Array.isArray(value?.data)
      ? value.data
      : null;
  if (!array)
    throw new TeamError(
      "El servicio no devolvió el listado esperado. No se mostraron resultados parciales.",
    );
  return array;
}
export async function allPages(api, path, key) {
  const output = [],
    seen = new Set();
  for (let page = 1; page <= 100; page++) {
    const data = await api(
      `${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=200`,
    );
    const rows = arrayResponse(data, key);
    let added = 0;
    for (const row of rows) {
      const keyId = String(row.id ?? row.id_empleado);
      if (!seen.has(keyId)) {
        seen.add(keyId);
        output.push(row);
        added++;
      }
    }
    const total = numberOrNull(data.total ?? data[key]?.total);
    // El servicio puede limitar el tamaño de página a menos de 200.
    if (total !== null ? output.length >= total : !rows.length) return output;
    if (!rows.length || !added)
      throw new TeamError(
        "No se pudieron recuperar todas las páginas. Actualiza para volver a intentar.",
      );
  }
  throw new TeamError(
    "El historial excede el límite de consulta. Solicita un reporte por periodo a RH.",
  );
}
export async function scope() {
  const current = await session();
  const staff = await allPages(
    current.api,
    `/checador/empleados?empresa=${current.company}`,
    "data",
  );
  // El endpoint de empresa ya está acotado; se comprueba además el dato si viene en la fila.
  const companyStaff = staff.filter(
    (person) =>
      !person.id_empresa || String(person.id_empresa) === current.company,
  );
  const self = companyStaff.find(
    (person) => String(person.id_empleado) === current.employeeId,
  );
  if (!self)
    throw new TeamError(
      "No se pudo verificar tu vínculo con esta empresa.",
      403,
    );
  const team = companyStaff.filter(
    (person) =>
      String(person.id_empleado) !== current.employeeId &&
      [person.id_autoriza_vacaciones, person.id_autoriza_permisos].some(
        (value) => value && String(value) === current.employeeId,
      ),
  );
  return { ...current, team };
}
function requestView(row, employee) {
  return {
    ...pick(row, [
      "id",
      "id_tipo_permiso",
      "tipo_permiso_nombre",
      "descuenta_vacaciones",
      "estado",
      "motivo",
      "notas",
      "marca_tiempo",
      "fecha_actualizacion",
      "actualizado_por_nombre",
      "dias_solicitados",
      "id_periodo_vacaciones",
    ]),
    id_empleado: employee.id_empleado,
    empleado_nombre: employeeName(employee),
    puesto: row.puesto || employee.puesto || employee.nombre_puesto || "",
    dias_trabajo: row.dias_trabajo || employee.dias_trabajo || "",
    fecha_inicio: isoDate(row.fecha_inicio),
    fecha_fin: isoDate(row.fecha_fin || row.fecha_inicio),
  };
}
export async function teamRequests(current) {
  const results = [];
  // Lotes limitados: no disparar una petición simultánea por cada colaborador.
  for (let offset = 0; offset < current.team.length; offset += 4) {
    const batch = await Promise.all(
      current.team.slice(offset, offset + 4).map(async (employee) => {
        const rows = await allPages(
          current.api,
          `/checador/solicitudes-permiso/empleado/${employee.id_empleado}`,
          "results",
        );
        return rows
          .filter(
            (row) =>
              String(row.id_empleado) === String(employee.id_empleado) &&
              canReview(employee, current.employeeId, row),
          )
          .map((row) => requestView(row, employee));
      }),
    );
    results.push(...batch.flat());
  }
  return results.sort((a, b) =>
    String(b.marca_tiempo || b.fecha_inicio).localeCompare(
      String(a.marca_tiempo || a.fecha_inicio),
    ),
  );
}
export async function findRequest(current, requestId) {
  if (!id(requestId)) throw new TeamError("Solicitud no válida.", 404);
  // El listado por empleado verifica pertenencia incluso si getById no devuelve autoriza/empresa.
  const rows = await teamRequests(current);
  const row = rows.find((item) => String(item.id) === String(requestId));
  if (!row)
    throw new TeamError(
      "No tienes acceso a esta solicitud o ya no está disponible.",
      404,
    );
  return row;
}
export async function vacationDetails(current, row) {
  if (!isVacation(row)) return { balance: null, periods: [], warning: null };
  const query = new URLSearchParams({
    empresa: current.company,
    id_empresa: current.company,
  });
  const results = await Promise.allSettled([
    current.api(`/checador/vacaciones/reporte?empresa=${current.company}`),
    current.api(`/checador/vacaciones/cargados/${row.id_empleado}?${query}`),
  ]);
  if (
    results.some(
      (result) => result.status === "rejected" && result.reason.status === 401,
    )
  )
    throw new TeamError("Tu sesión terminó. Inicia sesión nuevamente.", 401);
  const summary =
    results[0].status === "fulfilled" && Array.isArray(results[0].value)
      ? results[0].value.find(
          (person) => String(person.id_empleado) === String(row.id_empleado),
        )
      : null;
  const periods =
    results[1].status === "fulfilled" &&
    Array.isArray(results[1].value?.periodos)
      ? results[1].value.periodos.map((period) => ({
          ...pick(period, ["id", "anios", "dias", "estado"]),
          fecha_inicio: isoDate(period.fecha_inicio),
          fecha_fin: isoDate(period.fecha_fin),
        }))
      : [];
  return {
    balance: summary
      ? {
          assigned: numberOrNull(summary.dias_cargados),
          taken: numberOrNull(summary.dias_tomados),
          available: numberOrNull(summary.dias_disponibles),
        }
      : null,
    periods,
    // No inferir un periodo de cargo ni saldos históricos a partir del saldo actual.
    allocatedPeriod: row.id_periodo_vacaciones
      ? periods.find(
          (period) => String(period.id) === String(row.id_periodo_vacaciones),
        ) || null
      : null,
    warning:
      !summary || results[1].status === "rejected"
        ? "No se pudo consultar todo el saldo o los periodos. El servicio de vacaciones debe permitir su lectura al responsable asignado."
        : null,
  };
}
export async function holidays(current) {
  try {
    const data = await current.api(
      `/checador/holidays/${current.company}?page=1&limit=5000&filter=`,
    );
    if (
      !Array.isArray(data.festivos) ||
      Number(data.total || 0) > data.festivos.length
    )
      throw new Error("Incomplete holidays");
    return {
      holidays: data.festivos
        .map((item) => isoDate(item.fecha))
        .filter(Boolean),
      holidaysAvailable: true,
    };
  } catch (error) {
    if (error.status === 401) throw error;
    return { holidays: [], holidaysAvailable: false };
  }
}
export function checkOrigin(request) {
  const origin = request.headers.get("origin");
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    /* Origen no válido. */
  }
  if (!host || host !== request.headers.get("host"))
    throw new TeamError("La solicitud debe enviarse desde ADAMIA.", 403);
}
export const noStore = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
export function errorResponse(error) {
  return Response.json(
    {
      error:
        error instanceof TeamError
          ? error.message
          : "No se pudo completar la consulta. Vuelve a intentar.",
    },
    {
      status: error instanceof TeamError ? error.status : 500,
      headers: noStore,
    },
  );
}
export async function resolveRequest(current, row, state) {
  if (!["Aprobado", "Rechazado"].includes(state))
    throw new TeamError("Estado no permitido.", 400);
  if (normalize(row.estado) !== "pendiente")
    throw new TeamError(
      "La solicitud ya fue resuelta. Actualiza para consultar su estado.",
      409,
    );
  const pending = await allPages(
    current.api,
    "/checador/solicitudes-permiso/por-autorizar",
    "results",
  );
  if (
    !pending.some(
      (item) =>
        String(item.id) === String(row.id) &&
        String(item.id_empleado) === String(row.id_empleado) &&
        normalize(item.estado) === "pendiente",
    )
  )
    throw new TeamError("La solicitud ya no está pendiente a tu cargo.", 409);
  await current.api(`/checador/solicitudes-permiso/${row.id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({
      estado: state,
      actualizado_por: current.user.id_usuario || null,
    }),
  });
}
