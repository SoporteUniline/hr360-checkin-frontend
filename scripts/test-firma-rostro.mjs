// Pruebas puras: reglas del PIN (iguales al servidor) y promedio de lecturas del rostro. node scripts/test-firma-rostro.mjs
import assert from "node:assert/strict";
import { errorPin } from "../src/lib/firma/pin.mjs";
import { promediarLecturas } from "../src/lib/rostro/lecturas.mjs";

for (const malo of ["", "12345", "1234567", "12a456", "111111", "123456", "654321", "890123", "210987"]) assert.ok(errorPin(malo), `debía rechazar ${malo}`);
for (const bueno of ["482913", "135790", "112233", "000123"]) assert.equal(errorPin(bueno), null, `debía aceptar ${bueno}`);

const base = Array.from({ length: 128 }, (_, i) => Math.sin(i + 1) * 0.1);
const cerca = (k) => base.map((v, i) => v + Math.cos(i * k) * 0.004);
const r = promediarLecturas([cerca(1), cerca(2), cerca(3)]);
assert.equal(r.ok, true);
assert.equal(r.descriptor.length, 128);
assert.ok(Math.abs(r.descriptor[5] - (cerca(1)[5] + cerca(2)[5] + cerca(3)[5]) / 3) < 1e-12);
assert.equal(promediarLecturas([cerca(1), cerca(2)]).ok, false, "faltan lecturas");
const otra = Array.from({ length: 128 }, (_, i) => Math.cos(i * 7) * 0.1);
assert.equal(promediarLecturas([cerca(1), cerca(2), otra]).ok, false, "otra cara no se mezcla");
assert.equal(promediarLecturas([cerca(1), cerca(2), [...cerca(3).slice(0, 127), NaN]]).ok, false, "lectura inválida");
console.log("firma/rostro: ok");
