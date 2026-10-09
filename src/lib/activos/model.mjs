// Modelo de demostración. No llama APIs ni modifica registros reales.
export const VERSION = 1;
export const LOCATIONS = [
  "Almacén principal",
  "Sucursal Centro",
  "Oficina administrativa",
];
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
export const uid = () => globalThis.crypto.randomUUID();
const copy = (x) => JSON.parse(JSON.stringify(x));
const required = (x, message) => {
  if (!x) throw new Error(message);
};
const integer = (x) => Number.isInteger(Number(x)) && Number(x) > 0;
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
export function scopeKey(userId, companyId) {
  required(
    userId && companyId && companyId !== "all",
    "Selecciona una empresa."
  );
  return `adamia:activos:demo:v${VERSION}:${encodeURIComponent(
    userId
  )}:${encodeURIComponent(companyId)}`;
}
export function seed(companyId) {
  const date = today();
  const base = {
    location: LOCATIONS[0],
    returnable: true,
    minimum: 0,
    repair: 0,
    retired: 0,
    cost: 0,
    renewalMonths: 0,
    active: true,
  };
  const products = [
    {
      id: "demo-laptop",
      type: "asset",
      name: "Laptop Lenovo ThinkPad",
      code: "EQ-001",
      serial: "DEMO-PF4K821",
      category: "Computación",
      variant: "T14 · 16 GB / 512 GB",
      stock: 1,
      cost: 18500,
    },
    {
      id: "demo-charger",
      type: "asset",
      name: "Cargador USB-C",
      code: "AC-001",
      serial: "DEMO-CH65041",
      category: "Accesorios",
      variant: "Lenovo · 65 W",
      stock: 1,
      cost: 850,
    },
    {
      id: "demo-phone",
      type: "asset",
      name: "Samsung Galaxy A55",
      code: "EQ-002",
      serial: "DEMO-R58X401",
      category: "Telefonía",
      variant: "128 GB · Azul",
      stock: 0,
      cost: 6500,
    },
    {
      id: "demo-dell",
      type: "asset",
      name: "Laptop Dell Latitude",
      code: "EQ-003",
      serial: "DEMO-DL54207",
      category: "Computación",
      variant: "5420 · 8 GB / 256 GB",
      stock: 0,
      repair: 1,
      cost: 12500,
    },
    {
      id: "demo-polo-m",
      type: "uniform",
      name: "Polo institucional",
      code: "UN-001-M",
      serial: "",
      category: "Uniforme",
      variant: "Azul marino · M",
      size: "M",
      color: "Azul marino",
      stock: 12,
      minimum: 5,
      renewalMonths: 6,
      cost: 250,
    },
    {
      id: "demo-polo-l",
      type: "uniform",
      name: "Polo institucional",
      code: "UN-001-L",
      serial: "",
      category: "Uniforme",
      variant: "Azul marino · L",
      size: "L",
      color: "Azul marino",
      stock: 3,
      minimum: 5,
      renewalMonths: 6,
      cost: 250,
    },
    {
      id: "demo-boots",
      type: "uniform",
      name: "Botas de seguridad",
      code: "UN-002-27",
      serial: "",
      category: "Protección personal",
      variant: "Negro · 27",
      size: "27",
      color: "Negro",
      stock: 8,
      minimum: 3,
      renewalMonths: 12,
      cost: 890,
    },
  ].map((p) => ({ ...base, ...p }));
  const employee = {
    id: "demo-ana",
    name: "Ana Flores",
    role: "Community Manager",
    department: "Marketing",
    size: "M",
    shoeSize: "27",
    demo: true,
  };
  const lines = [
    {
      id: "demo-line-1",
      productId: "demo-phone",
      qty: 1,
      returned: 0,
      lost: 0,
    },
    {
      id: "demo-line-2",
      productId: "demo-polo-m",
      qty: 2,
      returned: 0,
      lost: 0,
    },
  ].map((l) => ({
    ...l,
    snapshot: copy(products.find((p) => p.id === l.productId)),
  }));
  return {
    version: VERSION,
    companyId: String(companyId),
    revision: 0,
    employees: [employee, { ...employee, id: "demo-luis", name: "Luis Pérez" }],
    products,
    deliveries: [
      {
        id: "demo-delivery",
        folio: "RS-0001",
        employeeId: employee.id,
        employee: copy(employee),
        date,
        due: "",
        mode: "Asignación",
        note: "Entrega de ejemplo en buen estado.",
        actor: "RH · Demo",
        status: "confirmed",
        acknowledgement: "pending",
        lines,
      },
    ],
    movements: [
      {
        id: "demo-move",
        date,
        type: "Entrega",
        productId: "demo-phone",
        productName: "Samsung Galaxy A55",
        qty: 1,
        employeeId: employee.id,
        employeeName: employee.name,
        actor: "RH · Demo",
        note: "RS-0001",
        deliveryId: "demo-delivery",
      },
      {
        id: "demo-move-2",
        date,
        type: "Entrega",
        productId: "demo-polo-m",
        productName: "Polo institucional",
        qty: 2,
        employeeId: employee.id,
        employeeName: employee.name,
        actor: "RH · Demo",
        note: "RS-0001",
        deliveryId: "demo-delivery",
      },
    ],
    maintenance: [
      {
        id: "demo-maint",
        productId: "demo-dell",
        qty: 1,
        date,
        due: date,
        reason: "Diagnóstico de batería",
        supplier: "Soporte técnico",
        cost: 0,
        status: "open",
      },
    ],
    requests: [],
    kits: [
      {
        id: "demo-kit",
        name: "Kit de ingreso · Community Manager",
        role: "Community Manager",
        lines: [
          { productId: "demo-laptop", qty: 1 },
          { productId: "demo-charger", qty: 1 },
          { productId: "demo-polo-m", qty: 2 },
        ],
      },
    ],
  };
}
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
export function validateState(state, companyId) {
  required(
    state?.version === VERSION && state.companyId === String(companyId),
    "Los datos de demostración no corresponden a esta empresa."
  );
  for (const key of [
    "products",
    "employees",
    "deliveries",
    "movements",
    "maintenance",
    "requests",
    "kits",
  ])
    required(
      Array.isArray(state[key]),
      "La demostración guardada no es válida. Puedes restablecerla."
    );
  required(
    Number.isInteger(state.revision),
    "Versión de demostración inválida."
  );
  state.products.forEach((p) => {
    for (const key of ["stock", "repair", "retired"])
      required(
        Number.isInteger(p[key]) && p[key] >= 0,
        "Existencias inválidas."
      );
  });
  return state;
}
// Operaciones puras y atómicas en la demo: cualquier error descarta la copia completa.
export function applyCommand(current, command, actor = "RH · Demo") {
  const s = copy(current),
    p = command.payload || {},
    date = today();
  const get = (id) => {
    const item = s.products.find((x) => x.id === id);
    required(item, "Artículo no encontrado.");
    return item;
  };
  const move = (type, product, qty, extra = {}) =>
    s.movements.unshift({
      id: uid(),
      date,
      type,
      productId: product.id,
      productName: product.name,
      qty,
      actor,
      note: p.note || p.reason || "",
      ...extra,
    });
  const positive = (n) => {
    required(integer(n), "La cantidad debe ser un entero mayor a cero.");
    return Number(n);
  };
  let result = {};
  switch (command.type) {
    case "employee.upsert": {
      required(p.id && p.name?.trim(), "Falta el empleado.");
      const index = s.employees.findIndex((e) => e.id === String(p.id));
      const employee = {
        id: String(p.id),
        name: p.name.trim(),
        role: p.role || "Sin puesto",
        department: p.department || "",
        size: p.size || "",
        shoeSize: p.shoeSize || "",
        demo: !String(p.id).startsWith("real-"),
      };
      if (index < 0) s.employees.push(employee);
      else s.employees[index] = employee;
      break;
    }
    case "product.save": {
      const existing = p.id ? get(p.id) : null;
      required(
        ["asset", "uniform"].includes(p.type),
        "Tipo de artículo inválido."
      );
      required(
        p.name?.trim() && p.code?.trim() && p.location,
        "Completa nombre, código y ubicación."
      );
      required(
        !s.products.some(
          (i) =>
            i.id !== p.id &&
            i.code.toLowerCase() === p.code.trim().toLowerCase()
        ),
        "Ese código ya existe."
      );
      required(
        !p.serial ||
          !s.products.some(
            (i) =>
              i.id !== p.id &&
              i.serial &&
              i.serial.toLowerCase() === p.serial.trim().toLowerCase()
          ),
        "El número de serie ya está registrado."
      );
      required(
        p.type !== "uniform" || p.size?.trim(),
        "Indica la talla o variante del uniforme."
      );
      for (const field of ["minimum", "cost", "renewalMonths"])
        required(
          Number.isFinite(Number(p[field] || 0)) && Number(p[field] || 0) >= 0,
          "Los valores no pueden ser negativos."
        );
      required(
        Number.isInteger(Number(p.minimum || 0)) &&
          Number.isInteger(Number(p.renewalMonths || 0)),
        "Mínimo y meses deben ser enteros."
      );
      if (existing)
        required(
          existing.type === p.type,
          "No se puede cambiar el tipo de un artículo registrado."
        );
      const qty = existing
        ? existing.stock
        : p.type === "asset"
        ? 1
        : positive(p.stock);
      const data = {
        ...(existing || {
          id: uid(),
          stock: qty,
          repair: 0,
          retired: 0,
          active: true,
        }),
        type: p.type,
        name: p.name.trim(),
        code: p.code.trim(),
        serial: (p.serial || "").trim(),
        category: p.category || "General",
        variant:
          p.type === "uniform"
            ? [p.color, p.size].filter(Boolean).join(" · ")
            : p.variant || "",
        size: p.size || "",
        color: p.color || "",
        location: p.location,
        returnable: Boolean(p.returnable),
        minimum: Number(p.minimum || 0),
        cost: Number(p.cost || 0),
        renewalMonths: Number(p.renewalMonths || 0),
      };
      if (existing) Object.assign(existing, data);
      else {
        s.products.push(data);
        move("Alta", data, qty);
      }
      result.id = data.id;
      break;
    }
    case "product.archive": {
      const i = get(p.id);
      required(
        !assigned(s, i.id) && !i.stock && !i.repair,
        "Primero resuelve las asignaciones y existencias pendientes."
      );
      i.active = !i.active;
      move(i.active ? "Reactivación" : "Archivo", i, 0);
      break;
    }
    case "stock.move": {
      const i = get(p.id),
        qty = positive(p.qty);
      required(i.active, "Artículo archivado.");
      required(p.note?.trim(), "Indica el motivo o referencia.");
      if (p.operation === "entrada") {
        required(
          i.type === "uniform",
          "Registra cada activo como una unidad con código propio."
        );
        i.stock += qty;
        move("Entrada", i, qty);
      } else if (p.operation === "ajuste") {
        required(qty <= i.stock, "No hay suficientes unidades disponibles.");
        i.stock -= qty;
        i.retired += qty;
        move("Baja / ajuste", i, qty);
      } else if (p.operation === "traslado") {
        required(
          i.stock && !assigned(s, i.id) && !i.repair,
          "Traslada únicamente registros sin asignaciones ni reparaciones."
        );
        required(
          p.location && p.location !== i.location,
          "Selecciona otra ubicación."
        );
        const previous = i.location;
        i.location = p.location;
        move("Traslado", i, i.stock, {
          note: `${previous} → ${p.location}. ${p.note}`,
        });
      } else throw new Error("Movimiento no válido.");
      break;
    }
    case "delivery.create": {
      const employee = s.employees.find((e) => e.id === p.employeeId);
      required(employee, "Selecciona al empleado.");
      required(p.lines?.length, "Agrega al menos un artículo.");
      required(
        ["Asignación", "Préstamo"].includes(p.mode),
        "Tipo de entrega inválido."
      );
      required(
        p.mode !== "Préstamo" ||
          (/^\d{4}-\d{2}-\d{2}$/.test(p.due) && p.due >= date),
        "Indica una fecha de devolución vigente."
      );
      required(
        new Set(p.lines.map((l) => l.productId)).size === p.lines.length,
        "Hay artículos repetidos."
      );
      const id = uid(),
        folio = `RS-${String(s.deliveries.length + 1).padStart(4, "0")}`;
      const lines = p.lines.map((l) => {
        const i = get(l.productId),
          qty = positive(l.qty);
        required(
          i.active && qty <= i.stock,
          "No hay disponibilidad suficiente de " + i.name
        );
        required(
          i.type !== "asset" || qty === 1,
          "Cada activo se entrega por unidad."
        );
        const snapshot = copy(i);
        i.stock -= qty;
        move("Entrega", i, qty, {
          employeeId: employee.id,
          employeeName: employee.name,
          deliveryId: id,
          note: folio,
        });
        return {
          id: uid(),
          productId: i.id,
          qty,
          returned: 0,
          lost: 0,
          snapshot,
        };
      });
      s.deliveries.unshift({
        id,
        folio,
        employeeId: employee.id,
        employee: copy(employee),
        date,
        due: p.mode === "Préstamo" ? p.due : "",
        mode: p.mode,
        note: p.note || "En buen estado",
        actor,
        status: "confirmed",
        acknowledgement: "pending",
        lines,
      });
      result.id = id;
      break;
    }
    case "delivery.return": {
      required(p.lines?.length, "Selecciona artículos para recibir.");
      required(
        new Set(p.lines.map((l) => l.lineId)).size === p.lines.length,
        "Hay partidas repetidas."
      );
      for (const line of p.lines) {
        const d = s.deliveries.find(
            (d) => d.id === line.deliveryId && d.status === "confirmed"
          ),
          l = d?.lines.find((l) => l.id === line.lineId);
        required(
          l && d.employeeId === p.employeeId,
          "La asignación no corresponde al empleado."
        );
        const qty = positive(line.qty),
          i = get(l.productId);
        required(qty <= outstanding(l), "La devolución supera lo asignado.");
        required(
          ["good", "review", "lost"].includes(line.condition),
          "Selecciona la condición."
        );
        required(
          l.snapshot.returnable,
          "Este artículo no requiere devolución."
        );
        if (line.condition !== "good")
          required(p.note?.trim(), "Describe el daño o pérdida.");
        if (line.condition === "lost") {
          l.lost += qty;
          i.retired += qty;
        } else {
          l.returned += qty;
          if (line.condition === "good") i.stock += qty;
          else {
            i.repair += qty;
            s.maintenance.unshift({
              id: uid(),
              productId: i.id,
              qty,
              date,
              due: "",
              reason: p.note,
              supplier: "Pendiente",
              cost: 0,
              status: "open",
            });
          }
        }
        move(
          line.condition === "lost" ? "Pérdida registrada" : "Devolución",
          i,
          qty,
          {
            employeeId: d.employeeId,
            employeeName: d.employee.name,
            deliveryId: d.id,
            note: [
              p.note,
              line.condition === "good"
                ? "Buen estado"
                : line.condition === "review"
                ? "En revisión"
                : "Baja por pérdida",
            ]
              .filter(Boolean)
              .join(" · "),
          }
        );
      }
      break;
    }
    case "uniform.exchange": {
      const d = s.deliveries.find((d) => d.id === p.deliveryId),
        line = d?.lines.find((l) => l.id === p.lineId),
        replacement = get(p.productId);
      required(
        line?.snapshot.type === "uniform" &&
          replacement.type === "uniform" &&
          line.productId !== replacement.id,
        "Selecciona otra variante de uniforme."
      );
      const qty = positive(p.qty);
      required(p.note?.trim(), "Describe el motivo del cambio.");
      const received = applyCommand(
        s,
        {
          type: "delivery.return",
          payload: {
            employeeId: d.employeeId,
            note: p.note,
            lines: [
              {
                deliveryId: d.id,
                lineId: line.id,
                qty,
                condition: p.condition || "good",
              },
            ],
          },
        },
        actor
      );
      const delivered = applyCommand(
        received.state,
        {
          type: "delivery.create",
          payload: {
            employeeId: d.employeeId,
            mode: "Asignación",
            note: `Cambio de uniforme: ${p.note}`,
            lines: [{ productId: replacement.id, qty }],
          },
        },
        actor
      );
      delivered.state.revision = current.revision + 1;
      return delivered;
    }
    case "delivery.cancel": {
      const d = s.deliveries.find((d) => d.id === p.id);
      required(
        d?.status === "confirmed" && d.acknowledgement === "pending",
        "Solo se puede revertir una entrega pendiente de acuse."
      );
      required(
        d.lines.every((l) => !l.returned && !l.lost),
        "No se puede revertir una entrega con devoluciones."
      );
      required(p.note?.trim(), "Indica el motivo de la reversión.");
      d.status = "cancelled";
      d.cancelReason = p.note;
      d.lines.forEach((l) => {
        const i = get(l.productId);
        i.stock += l.qty;
        move("Reversión de entrega", i, l.qty, {
          employeeId: d.employeeId,
          employeeName: d.employee.name,
          deliveryId: d.id,
        });
      });
      break;
    }
    case "delivery.ack": {
      const d = s.deliveries.find((d) => d.id === p.id);
      required(
        d?.status === "confirmed" && d.acknowledgement === "pending",
        "La entrega ya fue revisada o revertida."
      );
      required(
        ["accepted", "difference"].includes(p.status),
        "Acuse inválido."
      );
      required(
        p.status !== "difference" || p.note?.trim(),
        "Describe la diferencia."
      );
      d.acknowledgement = p.status;
      d.ackNote = p.note || "";
      d.ackDate = date;
      d.lines.forEach((l) =>
        move("Acuse simulado", get(l.productId), l.qty, {
          employeeId: d.employeeId,
          employeeName: d.employee.name,
          deliveryId: d.id,
          note:
            p.status === "accepted" ? "Recepción confirmada (demo)" : p.note,
        })
      );
      break;
    }
    case "maintenance.open": {
      const i = get(p.productId),
        qty = positive(p.qty);
      required(qty <= i.stock && i.active, "No hay unidades disponibles.");
      required(p.reason?.trim(), "Describe el motivo.");
      i.stock -= qty;
      i.repair += qty;
      s.maintenance.unshift({
        id: uid(),
        productId: i.id,
        qty,
        date,
        due: p.due || "",
        reason: p.reason,
        supplier: p.supplier || "Pendiente",
        cost: 0,
        status: "open",
      });
      move("Mantenimiento", i, qty);
      break;
    }
    case "maintenance.close": {
      const m = s.maintenance.find((m) => m.id === p.id);
      required(m?.status === "open", "El mantenimiento ya está cerrado.");
      required(
        ["repaired", "retired"].includes(p.outcome),
        "Selecciona el resultado."
      );
      required(
        Number.isFinite(Number(p.cost)) && Number(p.cost) >= 0,
        "Costo inválido."
      );
      required(p.note?.trim(), "Describe el trabajo realizado.");
      const i = get(m.productId);
      i.repair -= m.qty;
      if (p.outcome === "repaired") i.stock += m.qty;
      else i.retired += m.qty;
      Object.assign(m, {
        status: p.outcome,
        cost: Number(p.cost),
        resolution: p.note,
        closedAt: date,
      });
      move(
        p.outcome === "repaired" ? "Fin de mantenimiento" : "Baja definitiva",
        i,
        m.qty
      );
      break;
    }
    case "kit.save": {
      required(
        p.name?.trim() && p.role?.trim() && p.lines?.length,
        "Completa el paquete, puesto y artículos."
      );
      required(
        new Set(p.lines.map((l) => l.productId)).size === p.lines.length,
        "Hay artículos repetidos."
      );
      const lines = p.lines.map((l) => {
        const i = get(l.productId);
        const qty = positive(l.qty);
        required(
          i.active && (i.type !== "asset" || qty === 1),
          "Revisa los artículos del paquete."
        );
        return { productId: i.id, qty };
      });
      const k = {
        id: p.id || uid(),
        name: p.name.trim(),
        role: p.role.trim(),
        lines,
      };
      const idx = s.kits.findIndex((k) => k.id === p.id);
      if (idx < 0) s.kits.push(k);
      else s.kits[idx] = k;
      break;
    }
    case "request.create": {
      required(
        s.employees.some((e) => e.id === p.employeeId),
        "Selecciona el empleado."
      );
      required(p.note?.trim(), "Describe la solicitud.");
      required(
        ["Falla de equipo", "Cambio de talla", "Reposición", "Otro"].includes(
          p.kind
        ),
        "Selecciona el tipo de solicitud."
      );
      s.requests.unshift({
        id: uid(),
        employeeId: p.employeeId,
        kind: p.kind,
        note: p.note,
        date,
        status: "pending",
        resolution: "",
      });
      break;
    }
    case "request.resolve": {
      const r = s.requests.find((r) => r.id === p.id);
      required(r?.status === "pending", "Solicitud ya atendida.");
      required(p.note?.trim(), "Indica la respuesta.");
      r.status = "resolved";
      r.resolution = p.note;
      r.resolvedAt = date;
      break;
    }
    default:
      throw new Error("Operación no disponible.");
  }
  s.revision += 1;
  validateState(s, s.companyId);
  return { state: s, ...result };
}
