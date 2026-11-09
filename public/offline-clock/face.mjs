export const MODEL = 'face-api-0.22.2-128-cosine-v1';
export function fail(message, code = 'LOCAL_FACE_INVALID') {
  throw Object.assign(new Error(message), { code, response: { status: 422, data: { error: message, code } } });
}
export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 128 || b.length !== 128 || !a.every(Number.isFinite) || !b.every(Number.isFinite)) return 0;
  return a.reduce((sum, value, index) => sum + value * b[index], 0) / (Math.hypot(...a) * Math.hypot(...b)) || 0;
}
export function matchFace(descriptor, dataset, now = Date.now()) {
  if (!dataset || !Array.isArray(dataset.employees) || dataset.model !== MODEL || Date.parse(dataset.expires_at) <= now || !Number.isFinite(Date.parse(dataset.expires_at))) fail('El reconocimiento offline necesita descargar sus referencias con una sesión autorizada y conexión.', 'LOCAL_FACE_NOT_READY');
  const matches = dataset.employees.map(employee => ({ employee, score: cosine(descriptor, employee.descriptor) })).filter(match => match.score >= 0.95).sort((a, b) => b.score - a.score);
  if (!matches.length) fail('No se encontró coincidencia facial en este dispositivo. Mejora la iluminación y vuelve a intentar.', 'FACE_NOT_MATCHED');
  if (matches.length > 1) fail('El rostro coincide con más de un empleado. RH debe revisar las referencias faciales.', 'FACE_AMBIGUOUS');
  return matches[0];
}
export function validateCaptureTime(dataset, captured_at, now = Date.now()) {
  const captured = Date.parse(captured_at), prepared = Date.parse(dataset.prepared_at), expires = Date.parse(dataset.expires_at);
  if (!Number.isFinite(captured) || !Number.isFinite(prepared) || !Number.isFinite(expires) || new Date(captured).toISOString() !== captured_at || captured < prepared - 120000 || captured > expires || captured > now + 120000 || captured < now - 7 * 86400000) fail('La hora del dispositivo no corresponde al periodo preparado. Revisa fecha y hora automáticas.', 'LOCAL_CLOCK_TIME_INVALID');
}
function coordinate(value, min, max) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}
export function validateLocalLocation(employee, event) {
  if (!employee.checar_gps) return;
  const lat = coordinate(event.latitude, -90, 90), lon = coordinate(event.longitude, -180, 180);
  if (lat === null || lon === null) fail('Faltan coordenadas de ubicación', 'GPS_REQUIRED');
  const precision = coordinate(event.precision_metros, 0, Number.MAX_VALUE), timestamp = Number(event.ubicacion_timestamp), now = Date.parse(event.captured_at);
  if (!precision || !Number.isFinite(timestamp) || timestamp > now + 5000 || now - timestamp > 60000) fail('Obtén una ubicación reciente con precisión disponible y vuelve a intentar', 'GPS_REFRESH_REQUIRED');
  const areas = employee.areas.filter(area => coordinate(area.latitud, -90, 90) !== null && coordinate(area.longitud, -180, 180) !== null && coordinate(area.radio_metros, 10, 1000) !== null);
  if (!areas.length) fail('No hay áreas válidas asignadas. Contacta al administrador', 'AREA_INVALID');
  const acceptable = areas.filter(area => precision <= Math.min(area.radio_metros, 50));
  if (!acceptable.length) fail(`Ubicación imprecisa (±${Math.ceil(precision)} m). Activa ubicación precisa y vuelve a intentar.`, 'GPS_INACCURATE');
  const rad = value => value * Math.PI / 180;
  const inside = acceptable.some(area => {
    const h = Math.sin(rad(area.latitud - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(area.latitud)) * Math.sin(rad(area.longitud - lon) / 2) ** 2;
    return 2 * 6378137 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) <= area.radio_metros;
  });
  if (!inside) fail('Fuera del área de checado autorizada en este dispositivo', 'GPS_OUTSIDE_AREA');
}
export function localAction(employee, dataset, events, requested = 'auto') {
  let open = employee.open;
  const previous = events.filter(event => Number(event.company) === Number(dataset.company) && event.status !== 'rejected' &&
    (event.local_employee ? Number(event.local_employee) === employee.id : Number(event.employee) === employee.id || event.identity === employee.code_identity) &&
    (event.status !== 'synced' || event.captured_at >= dataset.prepared_at)).sort((a, b) => a.captured_at.localeCompare(b.captured_at));
  for (const event of previous) {
    if (event.status === 'decision' || event.status === 'review') fail('Resuelve la captura anterior de este empleado antes de registrar otra.', 'LOCAL_PREVIOUS_REVIEW');
    const action = event.resolvedAction || event.action;
    open = action === 'auto' ? !open : action === 'entrada';
  }
  if (requested !== 'auto') {
    if (requested === 'entrada' ? open : !open) fail('El movimiento no coincide con el turno guardado en este dispositivo.', 'LOCAL_TRANSITION_INVALID');
    return requested;
  }
  return open ? (employee.cierre_turno === 'Manual' ? 'decision' : 'salida') : 'entrada';
}
export function canonical(event) {
  return JSON.stringify([event.id, event.captured_at, event.action, event.method, Number(event.company), Number(event.local_employee),
    event.latitude ?? null, event.longitude ?? null, event.precision_metros ?? null, event.ubicacion_timestamp ?? null,
    event.local_verification?.device_id, event.local_verification?.model, event.local_verification?.reference, event.local_verification?.score, event.local_verification?.grant]);
}
const creatingDevices = new WeakMap();
export async function deviceIdentity(store) {
  if (creatingDevices.has(store)) return creatingDevices.get(store);
  const creating = (async () => {
    let device = await store.getValue('face:device:v1');
    if (!device) {
      const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
      device = { id: crypto.randomUUID(), privateKey: pair.privateKey, publicKey: await crypto.subtle.exportKey('jwk', pair.publicKey) };
      await store.setValue('face:device:v1', device);
    }
    return device;
  })();
  creatingDevices.set(store, creating);
  try { return await creating; } finally { creatingDevices.delete(store); }
}
export async function signEvent(event, store) {
  const device = await deviceIdentity(store);
  if (device.id !== event.local_verification.device_id) fail('Esta captura pertenece a otro dispositivo.', 'LOCAL_FACE_DEVICE_CHANGED');
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, device.privateKey, new TextEncoder().encode(canonical(event))));
  return { ...event, local_verification: { ...event.local_verification, signature: btoa(String.fromCharCode(...signature)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '') } };
}
