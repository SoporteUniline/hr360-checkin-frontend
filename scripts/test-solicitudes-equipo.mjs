import assert from "node:assert/strict";
import test from "node:test";
import {
  canReview,
  csvText,
  isoDate,
  lastVacation,
  monthCells,
  nextWorkday,
  overlaps,
} from "../src/lib/solicitudes-equipo/model.mjs";

test("fechas civiles y calendario: bisiesto, lunes y cruce de año", () => {
  assert.equal(isoDate("2025-02-29"), null);
  assert.equal(isoDate("2024-02-29T00:00:00Z"), "2024-02-29");
  assert.ok(monthCells(2024, 1).includes("2024-02-29"));
  assert.equal(monthCells(2026, 0)[0], "2025-12-29");
  assert.equal(monthCells(2026, 7).length, 42);
  assert.ok(
    overlaps(
      { fecha_inicio: "2025-12-29", fecha_fin: "2026-01-06" },
      "2026-01-01",
      "2026-01-31",
    ),
  );
});
test("regreso respeta turno del empleado y festivos, sin inventar horario", () => {
  const row = {
    fecha_fin: "2026-10-02",
    dias_trabajo: "Lunes,Martes,Miércoles,Jueves,Viernes",
  };
  assert.equal(nextWorkday(row, ["2026-10-05"]), "2026-10-06");
  assert.equal(
    nextWorkday({ ...row, dias_trabajo: "Sábado,Domingo" }, []),
    "2026-10-03",
  );
  assert.equal(nextWorkday({ ...row, dias_trabajo: "" }, []), null);
  assert.equal(nextWorkday(row, [], false), null);
});
test("autorización separa vacaciones y permisos, nunca la solicitud propia", () => {
  const employee = {
    id_empleado: 2,
    id_autoriza_vacaciones: 1,
    id_autoriza_permisos: 3,
  };
  assert.ok(canReview(employee, 1, { descuenta_vacaciones: 1 }));
  assert.equal(
    canReview(employee, 1, {
      descuenta_vacaciones: 0,
      tipo_permiso_nombre: "Permiso",
    }),
    false,
  );
  assert.ok(canReview(employee, 3, { tipo_permiso_nombre: "Permiso" }));
  assert.equal(
    canReview({ ...employee, id_autoriza_vacaciones: 2 }, 2, {
      descuenta_vacaciones: 1,
    }),
    false,
  );
});
test("últimas vacaciones excluye futuras, pendientes, otro empleado y solicitud actual", () => {
  const base = { id_empleado: 2, estado: "Aprobado", descuenta_vacaciones: 1 };
  const rows = [
    { ...base, id: 1, fecha_fin: "2026-05-01" },
    { ...base, id: 2, fecha_fin: "2026-09-20" },
    { ...base, id: 3, estado: "Pendiente", fecha_fin: "2026-09-30" },
    { ...base, id: 4, fecha_fin: "2026-12-01" },
    { ...base, id: 5, id_empleado: 3, fecha_fin: "2026-09-30" },
  ];
  assert.equal(lastVacation(rows, 2, "2026-10-01", 2).id, 1);
  assert.equal(lastVacation(rows, 2, "2026-10-01").id, 2);
});
test("CSV conserva texto y neutraliza fórmulas de hojas de cálculo", () => {
  const csv = csvText([
    ["Nombre", "Estado"],
    ["=HYPERLINK(1)", "Aprobado"],
    [" \t+1", "Texto, con coma"],
    ['María "M"', "ñ"],
  ]);
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes('"\'=HYPERLINK(1)"'));
  assert.ok(csv.includes('"\' \t+1"'));
  assert.ok(csv.includes('"María ""M"""'));
});
