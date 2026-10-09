import {
  ActivosError,
  ensure,
  validateCommand,
  commandHash,
  parseJson,
  id as idSchema,
} from "./validation.mjs";
import { productView, requestLabels } from "./read.mjs";
const types = {
  "location.save": "articulo_guardar",
  "product.save": "articulo_guardar",
  "product.archive": "articulo_archivar",
  "delivery.create": "entrega",
  "delivery.return": "devolucion",
  "uniform.exchange": "cambio_uniforme",
  "delivery.cancel": "reversion",
  "delivery.ack": "acuse",
  "maintenance.open": "mantenimiento_abrir",
  "maintenance.close": "mantenimiento_cerrar",
  "employee.sizes": "tallas_guardar",
  "kit.save": "paquete_guardar",
  "request.create": "solicitud_crear",
  "request.resolve": "solicitud_resolver",
};
export async function executeCommand(scope, input, key, expectedRevision) {
  const command = validateCommand(input),
    { type, payload: p } = command;
  ensure(
    typeof key === "string" && /^[A-Za-z0-9:_-]{16,128}$/.test(key),
    "Falta una clave de operación válida.",
    400,
  );
  ensure(
    /^\d+$/.test(String(expectedRevision)),
    "Actualiza la pantalla antes de guardar.",
    409,
  );
  if (scope.self)
    ensure(
      ["delivery.ack", "request.create", "employee.sizes"].includes(type),
      "Esta operación corresponde a Recursos Humanos.",
      403,
    );
  else
    ensure(
      type !== "delivery.ack",
      "El acuse debe registrarlo el empleado desde su cuenta.",
      403,
    );
  if (scope.self && type !== "delivery.ack")
    ensure(
      String(p.employeeId || p.id) === scope.employeeId,
      "Solo puedes modificar tus propios recursos.",
      403,
    );
  const hash = commandHash(command),
    c = await scope.pool.getConnection();
  try {
    await c.query("SET time_zone = '+00:00'");
    await c.beginTransaction();
    // Una cola de escritura por empresa: protege altas sin saldo previo y operaciones
    // que afectan varios articulos. Otras empresas pueden operar en paralelo.
    const [company] = await c.execute(
      "SELECT id_empresa FROM empresas WHERE id_empresa=? AND estado='Activo' FOR UPDATE",
      [scope.companyId],
    );
    ensure(company.length, "Empresa no disponible.", 403);
    const [prior] = await c.execute(
      "SELECT * FROM cau_operaciones WHERE id_empresa=? AND idempotency_key=?",
      [scope.companyId, key],
    );
    if (prior.length) {
      ensure(
        prior[0].request_hash === hash &&
          String(prior[0].created_by) === scope.actorId,
        "La clave ya se utilizó para otra operación.",
        409,
      );
      ensure(
        prior[0].estado === "completada",
        "La operación aún no está confirmada.",
        409,
      );
      await c.commit();
      return parseJson(prior[0].resultado_json);
    }
    const [rev] = await c.execute(
      "SELECT COALESCE(MAX(id),0) AS revision FROM cau_operaciones WHERE id_empresa=? AND estado='completada'",
      [scope.companyId],
    );
    ensure(
      String(rev[0].revision) === String(expectedRevision),
      "El inventario cambió. Actualiza y revisa los datos antes de guardar.",
      409,
    );
    const tx = new Transaction(c, scope);
    tx.operation = await tx.insert("operaciones", {
      tipo: types[type] || p.operation,
      idempotency_key: key,
      request_hash: hash,
      estado: "procesando",
    });
    const result = await run(tx, type, p);
    const response = {
      ...result,
      actor: scope.actor,
      operationId: tx.operation,
    };
    await c.execute(
      "UPDATE cau_operaciones SET estado='completada',resultado_json=?,http_status=200,completed_at=UTC_TIMESTAMP(6) WHERE id_empresa=? AND id=?",
      [JSON.stringify(response), scope.companyId, tx.operation],
    );
    await c.commit();
    return response;
  } catch (e) {
    await c.rollback();
    if (e.code === "ER_DUP_ENTRY")
      throw new ActivosError(
        "Ya existe un registro con ese código, serie o nombre.",
        409,
      );
    if (["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(e.code))
      throw new ActivosError(
        "Otra operación está en curso. Reintenta con la misma solicitud.",
        409,
      );
    throw e;
  } finally {
    c.release();
  }
}
class Transaction {
  constructor(c, scope) {
    this.c = c;
    this.s = scope;
    this.sequence = 0;
  }
  async rows(sql, params = []) {
    const [rows] = await this.c.execute(sql, [this.s.companyId, ...params]);
    return rows;
  }
  async get(table, id) {
    ensure(idSchema.safeParse(id).success, "Identificador no válido.", 400);
    const rows = await this.rows(
      `SELECT * FROM cau_${table} WHERE id_empresa=? AND id=? FOR UPDATE`,
      [id],
    );
    ensure(rows.length, "Registro no encontrado en esta empresa.", 404);
    return rows[0];
  }
  async insert(table, data) {
    const row = {
      id_empresa: this.s.companyId,
      ...data,
      created_by: this.s.actorId,
    };
    const cols = Object.keys(row);
    const [r] = await this.c.execute(
      `INSERT INTO cau_${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
      Object.values(row),
    );
    return String(r.insertId);
  }
  async update(table, id, data) {
    const cols = Object.keys(data);
    await this.c.execute(
      `UPDATE cau_${table} SET ${cols.map((k) => `${k}=?`).join(",")},version=version+1,updated_by=? WHERE id_empresa=? AND id=?`,
      [...Object.values(data), this.s.actorId, this.s.companyId, id],
    );
  }
  employee(id, active = false) {
    const e = this.s.employees.find((e) => e.id === String(id));
    ensure(e, "Empleado no encontrado en esta empresa.", 404);
    if (active)
      ensure(e.active, "No se pueden hacer entregas a un empleado inactivo.");
    return e;
  }
  async location(id) {
    const l = await this.get("ubicaciones", id);
    ensure(l.activo, "La ubicación está archivada.");
    return String(l.id);
  }
  async product(id) {
    const p = await this.get("articulos", id);
    ensure(p.activo, "El artículo está archivado.");
    return p;
  }
  async chooseLocation(productId, requested, qty = 1) {
    if (requested) return this.location(requested);
    const rows = await this.rows(
      "SELECT id_ubicacion FROM cau_existencias WHERE id_empresa=? AND id_articulo=? AND cantidad_disponible>=? ORDER BY id_ubicacion",
      [productId, qty],
    );
    ensure(
      rows.length,
      "No hay existencia suficiente en una ubicación. Selecciona otra cantidad.",
    );
    return this.location(String(rows[0].id_ubicacion));
  }
  async balance(productId, locationId, bucket, delta) {
    ensure(
      ["disponible", "revision", "baja"].includes(bucket),
      "Estado de inventario no válido.",
    );
    let rows = await this.rows(
      "SELECT * FROM cau_existencias WHERE id_empresa=? AND id_articulo=? AND id_ubicacion=? FOR UPDATE",
      [productId, locationId],
    );
    if (!rows.length) {
      ensure(delta >= 0, "Existencias insuficientes.", 409);
      await this.insert("existencias", {
        id_articulo: productId,
        id_ubicacion: locationId,
      });
      rows = await this.rows(
        "SELECT * FROM cau_existencias WHERE id_empresa=? AND id_articulo=? AND id_ubicacion=? FOR UPDATE",
        [productId, locationId],
      );
    }
    const row = rows[0],
      field = `cantidad_${bucket}`,
      value = Number(row[field]) + delta;
    ensure(
      Number.isSafeInteger(value) && value >= 0 && value <= 4294967295,
      "Existencias insuficientes o cantidad fuera de rango.",
      409,
    );
    await this.update("existencias", row.id, { [field]: value });
  }
  async movement(
    productId,
    qty,
    type,
    from,
    to,
    origin,
    destination,
    note,
    extra = {},
  ) {
    return this.insert("movimientos", {
      id_operacion: this.operation,
      secuencia: ++this.sequence,
      id_articulo: productId,
      cantidad: qty,
      tipo: type,
      estado_origen: from,
      estado_destino: to,
      id_ubicacion_origen: origin || null,
      id_ubicacion_destino: destination || null,
      motivo: note || "Movimiento de inventario",
      ...extra,
    });
  }
  async pending(line) {
    const rows = await this.rows(
      "SELECT COALESCE(SUM(cantidad),0) AS total FROM cau_devolucion_detalle WHERE id_empresa=? AND id_entrega_detalle=?",
      [String(line.id)],
    );
    return Number(line.cantidad) - Number(rows[0].total);
  }
  async assigned(productId) {
    const rows = await this.rows(
      `SELECT COALESCE(SUM(d.cantidad-COALESCE(r.qty,0)),0) total FROM cau_entrega_detalle d JOIN cau_entregas e ON e.id_empresa=d.id_empresa AND e.id=d.id_entrega LEFT JOIN (SELECT id_empresa,id_entrega_detalle,SUM(cantidad) qty FROM cau_devolucion_detalle GROUP BY id_empresa,id_entrega_detalle) r ON r.id_empresa=d.id_empresa AND r.id_entrega_detalle=d.id WHERE d.id_empresa=? AND d.id_articulo=? AND e.estado='confirmada'`,
      [productId],
    );
    return Number(rows[0].total);
  }
}
async function createDelivery(tx, p) {
  const employee = tx.employee(p.employeeId, true);
  ensure(
    p.mode !== "Préstamo" || p.due,
    "Indica la fecha prevista de devolución.",
  );
  ensure(
    new Set(p.lines.map((l) => l.productId)).size === p.lines.length,
    "No repitas artículos en una entrega.",
  );
  const delivery = await tx.insert("entregas", {
    folio: `ENT-${tx.s.companyId}-${tx.operation}`,
    id_empleado: employee.id,
    id_operacion: tx.operation,
    modalidad: p.mode === "Préstamo" ? "prestamo" : "asignacion",
    fecha_devolucion_prevista: p.due || null,
    observaciones: p.note || null,
    snapshot_empresa: JSON.stringify({
      ...tx.s.company,
      deliveredBy: tx.s.actor,
    }),
    snapshot_empleado: JSON.stringify(employee),
  });
  for (const line of p.lines) {
    const product = await tx.product(line.productId);
    ensure(
      product.tipo !== "activo" || line.qty === 1,
      "Un activo individual se entrega de uno en uno.",
    );
    if (product.tipo === "activo")
      ensure(
        (await tx.assigned(line.productId)) === 0,
        "El activo ya está asignado.",
        409,
      );
    const location = await tx.chooseLocation(
      line.productId,
      line.locationId,
      line.qty,
    );
    await tx.balance(line.productId, location, "disponible", -line.qty);
    const detail = await tx.insert("entrega_detalle", {
      id_entrega: delivery,
      id_articulo: line.productId,
      id_ubicacion_origen: location,
      cantidad: line.qty,
      snapshot_articulo: JSON.stringify(productView(product)),
    });
    await tx.movement(
      line.productId,
      line.qty,
      "entrega",
      "disponible",
      "asignado",
      location,
      null,
      p.note,
      { id_empleado: employee.id, id_entrega_detalle: detail },
    );
  }
  return { id: delivery };
}
async function returnDelivery(tx, p) {
  tx.employee(p.employeeId);
  ensure(
    new Set(p.lines.map((l) => l.lineId)).size === p.lines.length,
    "No repitas partidas en una devolución.",
  );
  const returned = await tx.insert("devoluciones", {
    folio: `DEV-${tx.s.companyId}-${tx.operation}`,
    id_empleado: p.employeeId,
    id_operacion: tx.operation,
    observaciones: p.note || null,
  });
  for (const line of p.lines) {
    const original = await tx.get("entrega_detalle", line.lineId),
      delivery = await tx.get("entregas", String(original.id_entrega));
    ensure(
      String(delivery.id) === line.deliveryId &&
        String(delivery.id_empleado) === p.employeeId &&
        delivery.estado === "confirmada",
      "La partida no corresponde a una entrega vigente del empleado.",
    );
    ensure(
      parseJson(original.snapshot_articulo).returnable,
      "El artículo no requiere devolución.",
    );
    ensure(
      line.qty <= (await tx.pending(original)),
      "La cantidad supera lo pendiente por devolver.",
      409,
    );
    ensure(
      line.condition === "good" || p.note.trim(),
      "Indica el motivo del daño o pérdida.",
    );
    const productId = String(original.id_articulo),
      location =
        line.condition === "lost"
          ? String(original.id_ubicacion_origen)
          : await tx.location(
              line.locationId || String(original.id_ubicacion_origen),
            );
    const condition = { good: "bueno", review: "revision", lost: "perdido" }[
      line.condition
    ];
    const detail = await tx.insert("devolucion_detalle", {
      id_devolucion: returned,
      id_entrega_detalle: line.lineId,
      id_ubicacion_destino: line.condition === "lost" ? null : location,
      cantidad: line.qty,
      condicion: condition,
      motivo: p.note || null,
    });
    const bucket = { good: "disponible", review: "revision", lost: "baja" }[
      line.condition
    ];
    await tx.balance(productId, location, bucket, line.qty);
    const extra = {
      id_empleado: p.employeeId,
      id_entrega_detalle: line.lineId,
      id_devolucion_detalle: detail,
    };
    if (line.condition === "review")
      extra.id_mantenimiento = await tx.insert("mantenimientos", {
        id_articulo: productId,
        id_ubicacion: location,
        id_devolucion_detalle: detail,
        id_operacion_apertura: tx.operation,
        cantidad: line.qty,
        motivo: p.note,
      });
    await tx.movement(
      productId,
      line.qty,
      line.condition === "lost" ? "perdida" : "devolucion",
      "asignado",
      bucket,
      null,
      location,
      p.note,
      extra,
    );
  }
  return { id: returned };
}
async function run(tx, type, p) {
  switch (type) {
    case "location.save": {
      if (p.branchId)
        ensure(
          tx.s.branches.some((b) => b.id === p.branchId),
          "La sucursal no pertenece a esta empresa.",
        );
      const data = {
        nombre: p.name,
        descripcion: p.description || null,
        id_sucursal: p.branchId || null,
      };
      if (p.id) {
        await tx.get("ubicaciones", p.id);
        await tx.update("ubicaciones", p.id, data);
        return { id: p.id };
      }
      return { id: await tx.insert("ubicaciones", data) };
    }
    case "product.save": {
      const data = {
        tipo: p.type === "asset" ? "activo" : "uniforme",
        nombre: p.name,
        codigo: p.code,
        categoria: p.category,
        numero_serie: p.serial || null,
        modelo: p.variant || null,
        talla: p.size || null,
        color: p.color || null,
        retornable: p.returnable ? 1 : 0,
        stock_minimo: p.minimum,
        costo_referencia: p.cost,
        meses_reposicion: p.renewalMonths,
      };
      if (p.type === "uniform") ensure(p.size, "Indica la talla o variante.");
      if (p.id) {
        const before = await tx.get("articulos", p.id);
        ensure(
          before.tipo === data.tipo,
          "No se puede cambiar el tipo de un artículo.",
        );
        ensure(
          p.version === before.version,
          "El artículo cambió. Actualiza antes de editar.",
          409,
        );
        await tx.update("articulos", p.id, data);
        return { id: p.id };
      }
      ensure(p.locationId, "Selecciona una ubicación de inventario.");
      const location = await tx.location(p.locationId);
      ensure(
        p.type !== "asset" || p.stock === 1,
        "Registra cada activo físico con su propio código.",
      );
      const product = await tx.insert("articulos", data);
      if (p.stock) {
        await tx.balance(product, location, "disponible", p.stock);
        await tx.movement(
          product,
          p.stock,
          "entrada",
          "externo",
          "disponible",
          null,
          location,
          "Inventario inicial",
        );
      }
      return { id: product };
    }
    case "product.archive": {
      const product = await tx.get("articulos", p.id);
      const rows = await tx.rows(
        "SELECT COALESCE(SUM(cantidad_disponible+cantidad_revision),0) total FROM cau_existencias WHERE id_empresa=? AND id_articulo=?",
        [p.id],
      );
      ensure(
        !Number(rows[0].total) && !(await tx.assigned(p.id)),
        "El artículo tiene existencias, revisión o asignaciones pendientes.",
      );
      await tx.update("articulos", p.id, { activo: product.activo ? 0 : 1 });
      return { id: p.id };
    }
    case "stock.move": {
      const product = await tx.product(p.id),
        location = await tx.location(p.locationId);
      if (p.operation === "entrada") {
        ensure(
          product.tipo === "uniforme",
          "Registra cada nuevo activo con su propio código.",
        );
        await tx.balance(p.id, location, "disponible", p.qty);
        await tx.movement(
          p.id,
          p.qty,
          "entrada",
          "externo",
          "disponible",
          null,
          location,
          p.note,
        );
      } else {
        await tx.balance(p.id, location, "disponible", -p.qty);
        if (p.operation === "traslado") {
          ensure(
            p.destinationId && p.destinationId !== location,
            "Selecciona una ubicación de destino distinta.",
          );
          const target = await tx.location(p.destinationId);
          await tx.balance(p.id, target, "disponible", p.qty);
          await tx.movement(
            p.id,
            p.qty,
            "traslado",
            "disponible",
            "disponible",
            location,
            target,
            p.note,
          );
        } else {
          await tx.balance(p.id, location, "baja", p.qty);
          await tx.movement(
            p.id,
            p.qty,
            "ajuste",
            "disponible",
            "baja",
            location,
            location,
            p.note,
          );
        }
      }
      return { id: p.id };
    }
    case "delivery.create":
      return createDelivery(tx, p);
    case "delivery.return":
      return returnDelivery(tx, p);
    case "uniform.exchange": {
      const line = await tx.get("entrega_detalle", p.lineId),
        delivery = await tx.get("entregas", p.deliveryId);
      ensure(
        String(line.id_entrega) === p.deliveryId &&
          parseJson(line.snapshot_articulo).type === "uniform",
        "Selecciona una entrega de uniforme.",
      );
      ensure(
        String(line.id_articulo) !== p.productId,
        "Selecciona una variante distinta.",
      );
      const product = await tx.product(p.productId);
      ensure(
        product.tipo === "uniforme",
        "Selecciona un uniforme como reemplazo.",
      );
      await returnDelivery(tx, {
        employeeId: String(delivery.id_empleado),
        note: p.note,
        lines: [
          {
            deliveryId: p.deliveryId,
            lineId: p.lineId,
            qty: p.qty,
            condition: p.condition,
            locationId: p.locationId,
          },
        ],
      });
      return createDelivery(tx, {
        employeeId: String(delivery.id_empleado),
        mode: "Asignación",
        note: `Cambio de uniforme: ${p.note}`,
        lines: [
          { productId: p.productId, qty: p.qty, locationId: p.destinationId },
        ],
      });
    }
    case "delivery.cancel": {
      const delivery = await tx.get("entregas", p.id);
      ensure(
        delivery.estado === "confirmada",
        "La entrega ya está revertida.",
        409,
      );
      const a = await tx.rows(
        "SELECT id FROM cau_acuses WHERE id_empresa=? AND id_entrega=?",
        [p.id],
      );
      ensure(
        !a.length,
        "La entrega ya tiene un acuse y no puede revertirse.",
        409,
      );
      const lines = await tx.rows(
        "SELECT * FROM cau_entrega_detalle WHERE id_empresa=? AND id_entrega=?",
        [p.id],
      );
      for (const line of lines) {
        ensure(
          (await tx.pending(line)) === Number(line.cantidad),
          "La entrega ya tiene devoluciones o pérdidas.",
          409,
        );
        await tx.balance(
          String(line.id_articulo),
          String(line.id_ubicacion_origen),
          "disponible",
          line.cantidad,
        );
        const originals = await tx.rows(
          "SELECT id FROM cau_movimientos WHERE id_empresa=? AND id_entrega_detalle=? AND tipo='entrega'",
          [String(line.id)],
        );
        await tx.movement(
          String(line.id_articulo),
          line.cantidad,
          "reversion",
          "asignado",
          "disponible",
          null,
          String(line.id_ubicacion_origen),
          p.note,
          {
            id_empleado: String(delivery.id_empleado),
            id_entrega_detalle: String(line.id),
            id_movimiento_revertido: originals[0]?.id || null,
          },
        );
      }
      await tx.update("entregas", p.id, {
        estado: "cancelada",
        motivo_cancelacion: p.note,
        cancelled_at: new Date(),
        cancelled_by: tx.s.actorId,
        id_operacion_cancelacion: tx.operation,
      });
      return { id: p.id };
    }
    case "delivery.ack": {
      const delivery = await tx.get("entregas", p.id);
      ensure(
        String(delivery.id_empleado) === tx.s.employeeId,
        "Solo el empleado receptor puede confirmar esta entrega.",
        403,
      );
      ensure(
        delivery.estado === "confirmada",
        "La entrega está revertida.",
        409,
      );
      const a = await tx.rows(
        "SELECT id FROM cau_acuses WHERE id_empresa=? AND id_entrega=?",
        [p.id],
      );
      ensure(!a.length, "La entrega ya tiene acuse.", 409);
      ensure(
        p.status === "accepted" || p.note,
        "Describe la diferencia encontrada.",
      );
      await tx.insert("acuses", {
        id_entrega: p.id,
        id_operacion: tx.operation,
        id_empleado: tx.s.employeeId,
        id_usuario_confirma: tx.s.actorId,
        resultado: p.status === "accepted" ? "recibido" : "con_diferencia",
        observaciones: p.note || null,
      });
      return { id: p.id };
    }
    case "maintenance.open": {
      await tx.product(p.productId);
      const location = await tx.chooseLocation(
        p.productId,
        p.locationId,
        p.qty,
      );
      await tx.balance(p.productId, location, "disponible", -p.qty);
      await tx.balance(p.productId, location, "revision", p.qty);
      const maintenance = await tx.insert("mantenimientos", {
        id_articulo: p.productId,
        id_ubicacion: location,
        id_operacion_apertura: tx.operation,
        cantidad: p.qty,
        motivo: p.reason,
        proveedor: p.supplier || null,
        fecha_estimada: p.due || null,
      });
      await tx.movement(
        p.productId,
        p.qty,
        "mantenimiento_ingreso",
        "disponible",
        "revision",
        location,
        location,
        p.reason,
        { id_mantenimiento: maintenance },
      );
      return { id: maintenance };
    }
    case "maintenance.close": {
      const m = await tx.get("mantenimientos", p.id);
      ensure(m.estado === "abierto", "La revisión ya fue cerrada.", 409);
      const bucket = p.outcome === "repaired" ? "disponible" : "baja";
      await tx.balance(
        String(m.id_articulo),
        String(m.id_ubicacion),
        "revision",
        -m.cantidad,
      );
      await tx.balance(
        String(m.id_articulo),
        String(m.id_ubicacion),
        bucket,
        m.cantidad,
      );
      await tx.update("mantenimientos", p.id, {
        estado: p.outcome === "repaired" ? "reparado" : "baja",
        costo: p.cost,
        resolucion: p.note,
        fecha_cierre: new Date(),
        closed_by: tx.s.actorId,
        id_operacion_cierre: tx.operation,
      });
      await tx.movement(
        String(m.id_articulo),
        m.cantidad,
        "mantenimiento_salida",
        "revision",
        bucket,
        String(m.id_ubicacion),
        String(m.id_ubicacion),
        p.note,
        { id_mantenimiento: p.id },
      );
      return { id: p.id };
    }
    case "employee.sizes": {
      tx.employee(p.id);
      const rows = await tx.rows(
        "SELECT id FROM cau_empleado_tallas WHERE id_empresa=? AND id_empleado=?",
        [p.id],
      );
      const data = {
        talla_superior: p.size || null,
        talla_pantalon: p.pantsSize || null,
        talla_calzado: p.shoeSize || null,
        sistema_calzado: p.shoeSystem || null,
        observaciones: p.notes || null,
      };
      if (rows.length) await tx.update("empleado_tallas", rows[0].id, data);
      else await tx.insert("empleado_tallas", { id_empleado: p.id, ...data });
      return { id: p.id };
    }
    case "kit.save": {
      if (p.roleId)
        ensure(
          tx.s.roles.some((r) => r.id === p.roleId),
          "Selecciona un puesto de esta empresa.",
        );
      ensure(
        new Set(p.lines.map((l) => l.productId)).size === p.lines.length,
        "No repitas artículos en el paquete.",
      );
      for (const l of p.lines) await tx.product(l.productId);
      const data = { nombre: p.name, id_puesto: p.roleId || null };
      let kit = p.id;
      if (kit) {
        await tx.get("paquetes", kit);
        await tx.update("paquetes", kit, data);
        await tx.c.execute(
          "DELETE FROM cau_paquete_detalle WHERE id_empresa=? AND id_paquete=?",
          [tx.s.companyId, kit],
        );
      } else kit = await tx.insert("paquetes", data);
      for (const l of p.lines)
        await tx.insert("paquete_detalle", {
          id_paquete: kit,
          id_articulo: l.productId,
          cantidad: l.qty,
        });
      return { id: kit };
    }
    case "request.create": {
      tx.employee(p.employeeId);
      if (p.lineId) {
        const line = await tx.get("entrega_detalle", p.lineId),
          delivery = await tx.get("entregas", String(line.id_entrega));
        ensure(
          String(delivery.id_empleado) === p.employeeId,
          "La asignación no pertenece al empleado.",
          403,
        );
      }
      return {
        id: await tx.insert("solicitudes", {
          id_empleado: p.employeeId,
          id_entrega_detalle: p.lineId || null,
          tipo: Object.keys(requestLabels).find(
            (k) => requestLabels[k] === p.kind,
          ),
          descripcion: p.note,
        }),
      };
    }
    case "request.resolve": {
      const r = await tx.get("solicitudes", p.id);
      ensure(
        ["pendiente", "en_proceso"].includes(r.estado),
        "La solicitud ya fue resuelta.",
        409,
      );
      await tx.update("solicitudes", p.id, {
        estado: "resuelta",
        respuesta: p.resolution,
        fecha_resolucion: new Date(),
        resolved_by: tx.s.actorId,
        id_usuario_responsable: tx.s.actorId,
      });
      return { id: p.id };
    }
    default:
      throw new ActivosError("Operación no disponible.", 400);
  }
}
