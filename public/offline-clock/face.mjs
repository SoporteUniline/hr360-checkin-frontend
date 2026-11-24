import { isTurnConflict, validClockState, blocksQueue } from './turn-state.mjs?v=3';
import { caraSola, unoAUno, coseno, debeReportar, UMBRAL_1A1, UMBRAL_EMPRESA } from './rostro-reglas.mjs?v=1';
export { debeReportar, UMBRAL_1A1, UMBRAL_EMPRESA };
export const MODEL = 'face-api-0.22.2-128-cosine-v1';
export function fail(message, code = 'LOCAL_FACE_INVALID') {
  throw Object.assign(new Error(message), { code, response: { status: 422, data: { error: message, code } } });
}
// Same metric as before (kept for callers and tests); comparisons use rostro-reglas.mjs.
export const cosine = coseno;
function ready(dataset, now) {
  if (!dataset || !Array.isArray(dataset.employees) || dataset.model !== MODEL || Date.parse(dataset.expires_at) <= now || !Number.isFinite(Date.parse(dataset.expires_at))) fail('Abre el reloj de la empresa con internet para descargar o renovar los rostros automáticamente.', 'LOCAL_FACE_NOT_READY');
}
// A failed comparison carries what RH sees later (never the descriptor): candidate, reason and scores.
function refuse(message, code, result, metodo) {
  const error = Object.assign(new Error(message), { code, response: { status: 422, data: { error: message, code } } });
  if (result && result.motivo !== 'codigo_requerido') error.intento = { metodo, motivo: result.motivo, id_empleado: result.empleado ? Number(result.empleado.id) : null, mejor: result.mejor, segundo: result.segundo, id_segundo: result.idSegundo };
  throw error;
}
// Company clock: face alone against every employee (best reference per person, with margin over the second person).
// Employee app (dataset.mode === 'employee'): only the signed-in employee's own references, one to one.
export function matchFace(descriptor, dataset, now = Date.now()) {
  ready(dataset, now);
  if (dataset.mode === 'employee') {
    const own = dataset.employees.find(employee => Number(employee.id) === Number(dataset.employee)) || (dataset.employees.length === 1 ? dataset.employees[0] : null);
    const result = unoAUno(descriptor, own, UMBRAL_1A1, 'sin_coincidencia');
    if (result.motivo === 'sin_referencias') refuse('Aún no tienes tu rostro registrado. Regístralo en Mi espacio → Mi rostro.', 'FACE_NOT_REGISTERED', result, 'cara');
    if (!result.ok) refuse('No te reconocimos. Mira de frente a la cámara, con buena luz, e intenta de nuevo.', 'FACE_NOT_MATCHED', result, 'cara');
    return { employee: own, score: result.exacto };
  }
  const result = caraSola(descriptor, dataset.employees);
  if (result.ok) return { employee: result.empleado, score: result.exacto, segundo: result.segundo };
  if (result.motivo === 'codigo_requerido') refuse('Escribe tu código para checar.', 'CODE_REQUIRED', result, 'cara');
  if (result.motivo === 'ambiguo') refuse('No pudimos distinguirte de otra persona. Escribe tu código y mira a la cámara.', 'FACE_AMBIGUOUS', result, 'cara');
  refuse('No se encontró coincidencia facial en este dispositivo. Mejora la iluminación y vuelve a intentar.', 'FACE_NOT_MATCHED', result.motivo === 'sin_referencias' ? null : result, 'cara');
}
// «Código y cara»: the code identifies the person; the face is compared only with that person's references.
export function matchFaceCode(descriptor, dataset, codeIdentity, now = Date.now()) {
  ready(dataset, now);
  const owners = dataset.employees.filter(employee => employee.code_identity === codeIdentity);
  if (owners.length !== 1) {
    const known = (dataset.code_references || []).filter(reference => reference.code_identity === codeIdentity);
    if (owners.length === 0 && known.length === 1) refuse('Aún no tienes tu rostro registrado. Pide a Recursos Humanos que lo registre.', 'FACE_NOT_REGISTERED', { motivo: 'sin_referencias', empleado: { id: known[0].id }, mejor: null, segundo: null, idSegundo: null }, 'codigo_cara');
    refuse('Ese código no existe. Revísalo e intenta de nuevo.', 'CODE_NOT_FOUND', { motivo: 'codigo_invalido', empleado: null, mejor: null, segundo: null, idSegundo: null }, 'codigo_cara');
  }
  const result = unoAUno(descriptor, owners[0], UMBRAL_1A1, 'codigo_no_coincide');
  if (result.motivo === 'sin_referencias') refuse('Aún no tienes tu rostro registrado. Pide a Recursos Humanos que lo registre.', 'FACE_NOT_REGISTERED', result, 'codigo_cara');
  if (!result.ok) refuse('La cara no coincide con ese código. Mira de frente a la cámara e intenta de nuevo.', 'FACE_CODE_NOT_MATCHED', result, 'codigo_cara');
  return { employee: owners[0], score: result.exacto };
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
export function localAction(employee, dataset, events, requested = 'auto', { online = false } = {}) {
  const previous = events.filter(event => Number(event.company) === Number(dataset.company) && event.status !== 'rejected' &&
    (event.local_employee ? Number(event.local_employee) === employee.id : Number(event.employee) === employee.id || event.identity === employee.code_identity))
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at));
  let state = validClockState(employee.clock_state, dataset.company, employee.id) ? employee.clock_state : null;
  for (const event of previous) {
    if (validClockState(event.clock_state, dataset.company, employee.id) && (!state || event.clock_state.revision >= state.revision)) state = event.clock_state;
  }
  let open = state ? state.open : employee.open;
  let pendingAutomatic = false;
  for (const event of previous) {
    if (event.status === 'review') {
      if (isTurnConflict(event)) {
        if (!state && !online) fail('Conecta el dispositivo para actualizar el estado del turno. La captura anterior se conserva para revisión.', 'LOCAL_CLOCK_STATE_REQUIRED');
        continue; // Rejected captures never change the employee turn state.
      }
      if (!blocksQueue(event)) continue;
      fail('Resuelve la captura anterior de este empleado antes de registrar otra.', 'LOCAL_PREVIOUS_REVIEW');
    }
    if (event.status === 'decision') fail('Selecciona cómo cerrar el turno anterior antes de registrar otra checada.', 'LOCAL_PREVIOUS_REVIEW');
    if (!online && event.status === 'pending' && event.action === 'auto') pendingAutomatic = true;
    if (event.status === 'synced') {
      if (validClockState(event.clock_state, dataset.company, employee.id)) continue;
      // Compatibility with receipts created before versioned turn snapshots.
      if ((event.confirmed_at || event.captured_at) < (state?.observed_at || dataset.prepared_at)) continue;
    }
    const action = event.resolvedAction || event.action;
    open = action === 'auto' ? !open : action === 'entrada';
  }
  if (pendingAutomatic) {
    if (requested === 'auto') return 'auto';
    fail('Espera a que se suba la checada anterior de este empleado antes de elegir un movimiento.', 'LOCAL_CLOCK_PENDING');
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
