import { ensure, parseJson, day } from "./validation.mjs";
const names = [
  "articulos",
  "ubicaciones",
  "existencias",
  "entregas",
  "entrega_detalle",
  "devolucion_detalle",
  "acuses",
  "mantenimientos",
  "movimientos",
  "paquetes",
  "paquete_detalle",
  "empleado_tallas",
  "solicitudes",
];
const normalizeRow = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      (k === "id" || k.startsWith("id_") || k.endsWith("_by")) && v !== null
        ? String(v)
        : v,
    ]),
  );
export async function readState(scope, connection) {
  const { companyId, self, employeeId } = scope;
  const localDay = (value) =>
    value
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: scope.user?.zona_horaria || "America/Mexico_City",
        }).format(new Date(String(value).replace(" ", "T") + "Z"))
      : "";
  const all = {};
  for (const name of names) {
    if (
      self &&
      ![
        "entregas",
        "entrega_detalle",
        "acuses",
        "devolucion_detalle",
        "empleado_tallas",
        "solicitudes",
      ].includes(name)
    ) {
      all[name] = [];
      continue;
    }
    let filter = "";
    const params = [companyId];
    if (self) {
      if (name === "entrega_detalle")
        filter =
          " AND id_entrega IN (SELECT id FROM cau_entregas WHERE id_empresa=? AND id_empleado=?)";
      else if (name === "devolucion_detalle")
        filter =
          " AND id_entrega_detalle IN (SELECT d.id FROM cau_entrega_detalle d JOIN cau_entregas e ON e.id_empresa=d.id_empresa AND e.id=d.id_entrega WHERE e.id_empresa=? AND e.id_empleado=?)";
      else filter = " AND id_empleado=?";
      if (["entrega_detalle", "devolucion_detalle"].includes(name))
        params.push(companyId);
      params.push(employeeId);
    }
    const [rows] = await connection.execute(
      `SELECT * FROM cau_${name} WHERE id_empresa=?${filter} ORDER BY id DESC LIMIT 10001`,
      params,
    );
    ensure(
      rows.length <= 10000,
      "El historial excede el tamaño de consulta del módulo. Solicita paginación del servidor antes de continuar.",
      413,
    );
    all[name] = rows.map(normalizeRow);
  }
  const [revision] = await connection.execute(
    "SELECT COALESCE(MAX(id),0) AS revision FROM cau_operaciones WHERE id_empresa=? AND estado='completada'",
    [companyId],
  );
  const locations = all.ubicaciones.map((l) => ({
    id: l.id,
    name: l.nombre,
    branchId: l.id_sucursal,
    description: l.descripcion || "",
    active: !!l.activo,
    version: l.version,
  }));
  const balances = all.existencias.map((e) => ({
    id: e.id,
    productId: e.id_articulo,
    locationId: e.id_ubicacion,
    stock: e.cantidad_disponible,
    repair: e.cantidad_revision,
    retired: e.cantidad_baja,
  }));
  const products = all.articulos.map((p) =>
    productView(p, balances, locations),
  );
  const employeeMap = new Map(scope.employees.map((e) => [e.id, e]));
  const employees = scope.employees.map((e) => {
    const t = all.empleado_tallas.find((t) => t.id_empleado === e.id);
    return {
      ...e,
      size: t?.talla_superior || "",
      pantsSize: t?.talla_pantalon || "",
      shoeSize: t?.talla_calzado || "",
      shoeSystem: t?.sistema_calzado || "",
      notes: t?.observaciones || "",
    };
  });
  const returned = new Map();
  for (const r of all.devolucion_detalle) {
    const totals = returned.get(r.id_entrega_detalle) || {
      returned: 0,
      lost: 0,
    };
    totals[r.condicion === "perdido" ? "lost" : "returned"] += r.cantidad;
    returned.set(r.id_entrega_detalle, totals);
  }
  const deliveries = all.entregas.map((d) => {
    const ack = all.acuses.find((a) => a.id_entrega === d.id),
      company = parseJson(d.snapshot_empresa);
    return {
      id: d.id,
      folio: d.folio,
      employeeId: d.id_empleado,
      employee: parseJson(d.snapshot_empleado),
      company,
      date: localDay(d.fecha_entrega),
      due: day(d.fecha_devolucion_prevista),
      mode: d.modalidad === "prestamo" ? "Préstamo" : "Asignación",
      note: d.observaciones || "",
      actor: company.deliveredBy || `Usuario ${d.created_by}`,
      status: d.estado === "cancelada" ? "cancelled" : "confirmed",
      acknowledgement: ack
        ? ack.resultado === "recibido"
          ? "accepted"
          : "difference"
        : "pending",
      ackNote: ack?.observaciones || "",
      ackDate: ack?.fecha_confirmacion || "",
      cancelReason: d.motivo_cancelacion || "",
      version: d.version,
      lines: all.entrega_detalle
        .filter((l) => l.id_entrega === d.id)
        .map((l) => ({
          id: l.id,
          productId: l.id_articulo,
          locationId: l.id_ubicacion_origen,
          qty: l.cantidad,
          ...(returned.get(l.id) || { returned: 0, lost: 0 }),
          snapshot: parseJson(l.snapshot_articulo),
        })),
    };
  });
  const roles = scope.roles || [];
  return {
    version: 1,
    companyId,
    revision: String(revision[0].revision),
    company: scope.company,
    employees,
    roles,
    branches: scope.branches || [],
    locations,
    balances,
    products,
    deliveries,
    movements: all.movimientos.map((m) => ({
      id: m.id,
      date: m.fecha,
      type: movementLabels[m.tipo] || m.tipo,
      productId: m.id_articulo,
      productName: products.find((p) => p.id === m.id_articulo)?.name || "",
      qty: m.cantidad,
      actor: `Usuario ${m.created_by}`,
      note: m.motivo,
      employeeId: m.id_empleado,
      employeeName: employeeMap.get(m.id_empleado)?.name || "",
      deliveryId: all.entrega_detalle.find((l) => l.id === m.id_entrega_detalle)
        ?.id_entrega,
      originId: m.id_ubicacion_origen,
      destinationId: m.id_ubicacion_destino,
    })),
    maintenance: all.mantenimientos.map((m) => ({
      id: m.id,
      productId: m.id_articulo,
      locationId: m.id_ubicacion,
      qty: m.cantidad,
      date: localDay(m.fecha_ingreso),
      due: day(m.fecha_estimada),
      reason: m.motivo,
      supplier: m.proveedor || "",
      cost: Number(m.costo),
      status: { abierto: "open", reparado: "repaired", baja: "retired" }[
        m.estado
      ],
      resolution: m.resolucion || "",
      closedAt: m.fecha_cierre,
    })),
    kits: all.paquetes
      .filter((k) => k.activo)
      .map((k) => ({
        id: k.id,
        name: k.nombre,
        roleId: k.id_puesto || "",
        role:
          roles.find((r) => r.id === k.id_puesto)?.name || "Todos los puestos",
        lines: all.paquete_detalle
          .filter((l) => l.id_paquete === k.id)
          .map((l) => ({ productId: l.id_articulo, qty: l.cantidad })),
      })),
    requests: all.solicitudes.map((r) => ({
      id: r.id,
      employeeId: r.id_empleado,
      kind: requestLabels[r.tipo],
      note: r.descripcion,
      date: localDay(r.created_at),
      status: ["resuelta", "rechazada"].includes(r.estado)
        ? "resolved"
        : "pending",
      resolution: r.respuesta || "",
      resolvedAt: r.fecha_resolucion,
    })),
    self,
    employeeId: self ? employeeId : null,
  };
}
export const requestLabels = {
  falla_equipo: "Falla de equipo",
  cambio_talla: "Cambio de talla",
  reposicion: "Reposición",
  otro: "Otro",
};
const movementLabels = {
  entrada: "Entrada",
  entrega: "Entrega",
  devolucion: "Devolución",
  traslado: "Traslado",
  ajuste: "Baja / ajuste",
  perdida: "Pérdida",
  mantenimiento_ingreso: "Ingreso a revisión",
  mantenimiento_salida: "Cierre de revisión",
  reversion: "Reversión",
};
export function productView(p, balances = [], locations = []) {
  const own = balances.filter((b) => b.productId === String(p.id));
  const first = own.find((b) => b.stock > 0) || own[0];
  const withStock = own.filter((b) => b.stock || b.repair);
  return {
    id: String(p.id),
    type: p.tipo === "activo" ? "asset" : "uniform",
    name: p.nombre,
    code: p.codigo,
    category: p.categoria,
    serial: p.numero_serie || "",
    variant:
      p.tipo === "activo"
        ? [p.marca, p.modelo].filter(Boolean).join(" ")
        : [p.talla, p.color].filter(Boolean).join(" · "),
    size: p.talla || "",
    color: p.color || "",
    returnable: !!p.retornable,
    minimum: p.stock_minimo,
    cost: Number(p.costo_referencia),
    renewalMonths: p.meses_reposicion,
    active: !!p.activo,
    version: p.version,
    stock: own.reduce((s, b) => s + b.stock, 0),
    repair: own.reduce((s, b) => s + b.repair, 0),
    retired: own.reduce((s, b) => s + b.retired, 0),
    locationId: first?.locationId || "",
    location:
      withStock.length > 1
        ? "Varias ubicaciones"
        : locations.find((l) => l.id === first?.locationId)?.name ||
          "Sin existencias",
  };
}
export async function snapshot(scope) {
  const c = await scope.pool.getConnection();
  try {
    await c.query("SET time_zone = '+00:00'");
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await c.beginTransaction();
    const state = await readState(scope, c);
    await c.commit();
    return state;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
