import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = (await readFile(new URL("../src/hooks/Capacitor/useGPS.js", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");

test("native GPS does not request permissions on mount; explicit location requests still work", async () => {
  let permissionChecks = 0;
  let permissionRequests = 0;
  let locations = 0;
  const context = vm.createContext({
    useState: (value) => [value, () => {}],
    useEffect: (run) => run(),
    Capacitor: { isNativePlatform: () => true },
    Geolocation: {
      async checkPermissions() { permissionChecks++; return { location: "prompt" }; },
      async requestPermissions() { permissionRequests++; return { location: "granted" }; },
      async getCurrentPosition(options) { assert.equal(options.maximumAge, 0); locations++; return { timestamp: 12345, coords: { latitude: 1, longitude: 2, accuracy: 3 } }; },
    },
    console,
  });
  vm.runInContext(source, context);
  const gps = context.useGPS();
  await new Promise(setImmediate);
  assert.equal(permissionChecks, 0);
  assert.equal(permissionRequests, 0);
  assert.equal(locations, 0);
  const position = await gps.getCurrentLocation();
  assert.equal(permissionChecks, 1);
  assert.equal(permissionRequests, 1);
  assert.equal(locations, 1);
  assert.equal(position.lat, 1);
  assert.equal(position.lng, 2);
  assert.equal(position.timestamp, 12345);
  assert.equal(position.accuracy, 3);
});

test("web GPS preserves measurement time and precision instead of stamping cached fixes as new", async () => {
  const context = vm.createContext({
    useState: value => [value, () => {}],
    Capacitor: {isNativePlatform: () => false},
    navigator: {geolocation: {getCurrentPosition(success, failure, options) {
      assert.equal(options.maximumAge, 0);
      assert.equal(options.enableHighAccuracy, true);
      success({timestamp: 12345, coords: {latitude: 1, longitude: 2, accuracy: 2000}});
    }}}, console,
  });
  vm.runInContext(source, context);
  const position = await context.useGPS().getCurrentLocation();
  assert.equal(position.timestamp, 12345);
  assert.equal(position.accuracy, 2000);
});
