import { cookies } from "next/headers";
import { ActivosError, ensure, id } from "./validation.mjs";
import { activosPool } from "./database";
import { employeeName, normalize } from "@/lib/solicitudes-equipo/model.mjs";
export const noStore = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
export function checkOrigin(request) {
  let origin;
  try {
    origin = new URL(request.headers.get("origin"));
  } catch {}
  ensure(
    origin && origin.host === request.headers.get("host"),
    "La solicitud debe enviarse desde ADAMIA.",
    403,
  );
}
export function errorResponse(error) {
  if (!(error instanceof ActivosError))
    console.error("Control activos:", error.code || error.name);
  const missing = error.code === "ER_NO_SUCH_TABLE";
  return Response.json(
    {
      error: {
        message:
          error instanceof ActivosError
            ? error.message
            : missing
              ? "Faltan las tablas de Control de Activos en la base de este entorno."
              : "No se pudo completar la operación. Actualiza y vuelve a intentar.",
      },
    },
    {
      status:
        error instanceof ActivosError ? error.status : missing ? 503 : 500,
      headers: noStore,
    },
  );
}
export async function getScope(request, self = false) {
  const token = (await cookies()).get("token")?.value;
  ensure(token, "Inicia sesión para continuar.", 401);
  const base = process.env.NEXT_PUBLIC_RUTA_BACKEND;
  ensure(base, "El servicio de identidad no está configurado.", 503);
  const api = async (path) => {
    let response;
    try {
      response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new ActivosError(
        "No se pudo consultar el servicio de empleados. Intenta nuevamente.",
        503,
      );
    }
    ensure(
      response.ok,
      response.status === 401
        ? "Tu sesión terminó."
        : "No se pudo consultar el catálogo autorizado.",
      [401, 403, 404].includes(response.status) ? response.status : 502,
    );
    return response.json();
  };
  const { user } = await api("/users/verify/token");
  const actorId = id.safeParse(user?.id_usuario ?? user?.id);
  ensure(actorId.success, "Sesión no válida.", 401);
  const role = String(user.tipo_usuario || "").trim();
  ensure(
    self
      ? ["Empleado", "Recruiter", "User"].includes(role)
      : ["Recruiter", "User"].includes(role),
    "Tu cuenta no tiene acceso a esta operación.",
    403,
  );
  const requested = new URL(request.url).searchParams.get("empresa");
  const companyId = id.safeParse(requested);
  ensure(
    companyId.success && Number(companyId.data) <= 2147483647,
    "Selecciona una empresa válida.",
    400,
  );
  const pool = activosPool();
  if (!self) {
    const [rows] = await pool.execute(
      `SELECT e.id_empresa FROM empresas e WHERE e.id_empresa=? AND e.estado='Activo' AND (e.id_usuario=? OR EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.id_empresa=e.id_empresa AND ue.id_usuario=? AND ue.estado='Activo'))`,
      [companyId.data, actorId.data, actorId.data],
    );
    ensure(rows.length, "No tienes acceso a esta empresa.", 403);
  } else {
    const companies = [
      user.id_empresa,
      ...(user.empresas || []).map((e) =>
        typeof e === "object" ? e.id_empresa : e,
      ),
      ...(user.empresas_detalle || []).map((e) => e.id_empresa),
    ]
      .filter(Boolean)
      .map(String);
    ensure(
      companies.includes(companyId.data),
      "No tienes acceso a esta empresa.",
      403,
    );
    const [rows] = await pool.execute(
      "SELECT id_empresa FROM empresas WHERE id_empresa=? AND estado='Activo'",
      [companyId.data],
    );
    ensure(rows.length, "Empresa no disponible.", 403);
  }
  const scope = {
    pool,
    api,
    user,
    self,
    companyId: companyId.data,
    actorId: actorId.data,
    actor: user.nombre_completo || user.nombre || `Usuario ${actorId.data}`,
  };
  if (self) {
    // El vínculo siempre procede del servicio autenticado, jamás del payload.
    let eid =
      String(user.id_empresa) === scope.companyId ? user.id_empleado : null;
    if (!eid && (user.correo || user.email)) {
      const found = await api(
        `/checador/empleados/por-correo?${new URLSearchParams({ empresa: scope.companyId, correo: user.correo || user.email })}`,
      );
      ensure(
        !found.id_empresa || String(found.id_empresa) === scope.companyId,
        "Empleado fuera de la empresa.",
        403,
      );
      eid = found.id_empleado;
    }
    ensure(
      id.safeParse(eid).success,
      "Tu cuenta no está vinculada a un empleado.",
      403,
    );
    scope.employeeId = String(eid);
  }
  return scope;
}
export async function loadCatalogs(scope) {
  const { api, companyId, self } = scope;
  if (self) {
    const detail = scope.user.empresas_detalle?.find(
      (e) => String(e.id_empresa) === companyId,
    );
    scope.employees = [
      {
        id: scope.employeeId,
        name: employeeName(scope.user),
        role: "",
        department: "",
        active: true,
      },
    ];
    scope.roles = [];
    scope.branches = [];
    scope.company = {
      id: companyId,
      name: detail?.nombre_empresa || detail?.nombre || `Empresa ${companyId}`,
    };
    return scope;
  }
  // La lista ligera del expediente no garantiza estado laboral en dev.
  // Se usa el mismo catálogo paginado que Personal para autorizar entregas.
  const employeeRows = await catalogPages(
    api,
    `/checador/empleados?empresa=${companyId}`,
    "data",
    "id_empleado",
  );
  const employees = employeeRows
    .filter((e) => !e.id_empresa || String(e.id_empresa) === companyId)
    .map((e) => ({
      id: String(e.id_empleado),
      name: employeeName(e),
      role: e.puesto || e.nombre_puesto || "",
      department: e.departamento || e.nombre_departamento || "",
      active: normalize(e.estado) === "activo",
      roleId: e.id_puesto ? String(e.id_puesto) : "",
      size: "",
      pantsSize: "",
      shoeSize: "",
      shoeSystem: "",
      notes: "",
    }));
  scope.employees = employees;
  const detail = scope.user.empresas_detalle?.find(
    (e) => String(e.id_empresa) === companyId,
  );
  const [company, roles, branchRows] = await Promise.all([
    api(`/empresas/${companyId}`),
    catalogPages(
      api,
      `/checador/puestos?id_empresa=${companyId}`,
      "puestos",
      "id_puesto",
    ),
    catalogPages(
      api,
      `/checador/sucursales?id_empresa=${companyId}`,
      "sucursales",
      "id_sucursal",
    ),
  ]);
  scope.roles = roles
    .filter((p) => !p.id_empresa || String(p.id_empresa) === companyId)
    .map((p) => ({
      id: String(p.id_puesto),
      name: p.nombre_puesto || p.nombre,
    }));
  scope.branches = branchRows
    .filter((p) => !p.id_empresa || String(p.id_empresa) === companyId)
    .map((p) => ({ id: String(p.id_sucursal), name: p.nombre }));
  scope.company = {
    id: companyId,
    name:
      company.nombre_empresa ||
      detail?.nombre_empresa ||
      `Empresa ${companyId}`,
    logo: company.url_imagen || "",
    rfc: company.rfc || "",
  };
  return scope;
}

async function catalogPages(api, path, key, idField) {
  const out = [],
    seen = new Set();
  for (let page = 1; page <= 100; page++) {
    const data = await api(`${path}&page=${page}&limit=200`),
      rows = Array.isArray(data) ? data : data[key];
    ensure(
      Array.isArray(rows),
      "El servicio no devolvió el catálogo esperado.",
      502,
    );
    let added = 0;
    for (const row of rows) {
      const id = String(row[idField]);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(row);
        added++;
      }
    }
    const total = Number(data.total ?? out.length);
    if (out.length >= total) return out;
    ensure(
      added && rows.length,
      "No se pudo recuperar el catálogo completo.",
      502,
    );
  }
  throw new ActivosError("El catálogo excede el límite de consulta.", 413);
}
