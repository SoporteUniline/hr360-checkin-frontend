import assert from "node:assert/strict";
import test from "node:test";
import dayjs from "dayjs";
import { hora12 } from "../src/lib/hora12.mjs";

test("hora en 12 horas con a.m./p.m.", () => {
  assert.equal(hora12("16:49"), "4:49 p.m.");
  assert.equal(hora12("09:05"), "9:05 a.m.");
  assert.equal(hora12("00:15"), "12:15 a.m.");
  assert.equal(hora12("12:00"), "12:00 p.m.");
  assert.equal(hora12("23:59:07", { segundos: true }), "11:59:07 p.m.");
  assert.equal(hora12(dayjs("2026-11-19 13:18:00")), "1:18 p.m.");
  assert.equal(hora12(null), "");
  assert.equal(hora12("—"), "—");
});
