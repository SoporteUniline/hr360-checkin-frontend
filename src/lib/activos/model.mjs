// Cálculos de pantalla del módulo de activos y uniformes (sin red ni base de datos).
// (20/11/2026) Se quitó el modelo de demostración (datos semilla y motor de comandos en memoria):
// la fuente de verdad es el servidor (src/lib/activos/server/commands.mjs) y sus pruebas con MySQL.
// Probado en scripts/test-activos.mjs.

// Fecha de hoy en CDMX ("YYYY-MM-DD"), la del calendario de la empresa.
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const required = (x, message) => {
  if (!x) throw new Error(message);
};

// Empresas de la sesión (sin repetir), con su nombre.
export function companiesFor(user) {
  const entries = [
    ...(user?.empresas_detalle || []),
    ...(user?.empresas || []),
    ...(user?.id_empresa ? [user.id_empresa] : []),
  ];
  return [
    ...new Map(
      entries
        .map((e) => {
          const id = String(
            typeof e === "object" ? e.id_empresa ?? e.id ?? "" : e
          );
          return [
            id,
            {
              id,
              name:
                typeof e === "object"
                  ? e.nombre_empresa ||
                    e.nombre ||
                    e.razon_social ||
                    `Empresa ${id}`
                  : `Empresa ${id}`,
            },
          ];
        })
        .filter(([id]) => /^[1-9]\d*$/.test(id))
    ).values(),
  ].map((e) => {
    const detail = user?.empresas_detalle?.find(
      (d) => String(d.id_empresa) === e.id
    );
    return {
      ...e,
      name:
        detail?.nombre_empresa ||
        detail?.nombre ||
        detail?.razon_social ||
        e.name,
    };
  });
}

// Lo que el empleado aún tiene de una partida entregada.
export function outstanding(line) {
  return line.qty - line.returned - (line.lost || 0);
}
export function assigned(state, productId) {
  return state.deliveries
    .filter((d) => d.status === "confirmed")
    .reduce(
      (sum, d) =>
        sum +
        d.lines
          .filter((l) => l.productId === productId)
          .reduce((n, l) => n + outstanding(l), 0),
      0
    );
}
export function employeeLines(state, employeeId, type) {
  return state.deliveries
    .filter((d) => d.employeeId === employeeId && d.status === "confirmed")
    .flatMap((d) =>
      d.lines
        .filter((l) => !type || l.snapshot.type === type)
        .map((l) => ({ ...l, delivery: d, pending: outstanding(l) }))
    );
}
export function kitLines(state, kitId, employeeId) {
  const kit = state.kits.find((k) => k.id === kitId);
  required(kit, "Selecciona un paquete.");
  return kit.lines
    .map((l) => {
      const product = state.products.find((p) => p.id === l.productId);
      const held = employeeLines(state, employeeId)
        .filter((a) => a.productId === l.productId)
        .reduce((n, a) => n + a.pending, 0);
      return {
        productId: l.productId,
        qty: Math.min(
          Math.max(0, l.qty - held),
          product?.active ? product.stock : 0
        ),
      };
    })
    .filter((l) => l.qty > 0);
}
