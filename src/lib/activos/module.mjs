export function resourceHref(type, to = "", companyId = "", self = false) {
  const targetType = to.startsWith("/uniformes")
    ? "uniform"
    : to.startsWith("/activos")
    ? "asset"
    : type;
  const root = self
    ? "/empleado/panel/mis-recursos"
    : targetType === "uniform"
    ? "/panel/control-uniformes"
    : "/panel/control-activos";
  let path =
    targetType === "uniform"
      ? to.replace(/^\/uniformes(?=\/|\?|$)/, "/prendas")
      : to;
  if (self && to === "/resguardos") path = "";
  return `${root}${path}${
    path.includes("?") ? "&" : "?"
  }empresa=${encodeURIComponent(companyId)}`;
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
