// Rutas del módulo «Activos y uniformes» (20/11/2026, propuesta aprobada «menos vistas»):
// una sola entrada /panel/activos con Inicio · Inventario · Personas y un botón Ajustes. Los componentes
// siguen pidiendo sus rutas de siempre ("/activos/7", "/entregas/nueva", "/empleados/3"…) y aquí se
// traducen a la ruta nueva; el tipo (activos | uniformes) viaja en ?tipo= solo donde importa.
// Las rutas viejas (/panel/control-activos, /panel/control-uniformes) redirigen (next.config.mjs).
export const RAIZ_ACTIVOS = "/panel/activos";
export const TIPO_URL = { asset: "activos", uniform: "uniformes" };
export const TIPO_DE_URL = { activos: "asset", uniformes: "uniform" };

const RUTAS_NUEVAS = [
  [/^\/entregas\/nueva$/, "/entregar"],
  [/^\/devoluciones$/, "/recibir"],
  [/^\/empleados(\/.*)?$/, "/personas$1"],
  [/^\/mantenimiento$/, "/revision"],
  [/^\/movimientos$/, "/historial"],
  [/^\/(categorias|ubicaciones|paquetes)$/, "/ajustes/$1"],
];

// Ruta vieja del módulo → { path, params } de la ruta nueva.
export function rutaActivos(type, to = "") {
  const [ruta, query = ""] = String(to).split("?");
  const params = new URLSearchParams(query);
  const inventario = /^\/(activos|uniformes|prendas)(\/.*)?$/.exec(ruta);
  if (inventario) {
    params.set("tipo", inventario[1] === "activos" ? "activos" : "uniformes");
    return { path: `/inventario${inventario[2] || ""}`, params };
  }
  const regla = RUTAS_NUEVAS.find(([re]) => re.test(ruta));
  const path = regla ? ruta.replace(regla[0], regla[1]) : ruta;
  // Las categorías son de un tipo: se conserva el del lugar desde donde se llega.
  if (path === "/ajustes/categorias" && type && !params.has("tipo")) params.set("tipo", TIPO_URL[type]);
  return { path, params };
}

export function resourceHref(type, to = "", companyId = "", self = false) {
  if (self) {
    // Portal del empleado: «Mis recursos» y sus resguardos (sin cambios).
    const path = to === "/resguardos" ? "" : to;
    return `/empleado/panel/mis-recursos${path}${path.includes("?") ? "&" : "?"}empresa=${encodeURIComponent(companyId)}`;
  }
  const { path, params } = rutaActivos(type, to);
  params.set("empresa", companyId);
  return `${RAIZ_ACTIVOS}${path}?${params.toString()}`;
}
export function moduleState(state, type) {
  if (!state || !type) return state;
  const products = state.products.filter((p) => p.type === type);
  const ids = new Set(products.map((p) => p.id));
  const productTypes = new Map(state.products.map((p) => [p.id, p.type]));
  const ownLine = (l) =>
    (l.snapshot?.type || productTypes.get(l.productId)) === type;
  return {
    ...state,
    products,
    categories: (state.categories || []).filter((c) => c.type === type),
    balances: state.balances.filter((b) => ids.has(b.productId)),
    movements: state.movements.filter((m) => ids.has(m.productId)),
    maintenance: state.maintenance.filter((m) => ids.has(m.productId)),
    deliveries: state.deliveries
      .map((d) => ({
        ...d,
        lines: d.lines.filter(ownLine),
        mixed: d.lines.some((l) => !ownLine(l)),
      }))
      .filter((d) => d.lines.length),
    // Nunca editar solo la mitad de un paquete antiguo mixto.
    kits: state.kits.filter(
      (k) => k.lines.length && k.lines.every((l) => ids.has(l.productId))
    ),
    mixedKits: state.kits.filter(
      (k) =>
        k.lines.some((l) => ids.has(l.productId)) &&
        k.lines.some((l) => !ids.has(l.productId))
    ),
    requests: state.requests.filter(
      (r) =>
        r.kind === "Otro" ||
        (type === "asset"
          ? r.kind === "Falla de equipo"
          : r.kind !== "Falla de equipo")
    ),
  };
}
