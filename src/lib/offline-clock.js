import axios, { ensureOfflineCache } from './axios';
import Cookies from 'js-cookie';
import { motivoPendiente, errorDelServidor, textoChecada, preguntaRepetida } from './reloj/motivoPendiente.mjs';

// Candado de 5 min: el servidor no registró una checada repetida. Se devuelve la pregunta
// y el payload para «Sí, registrar» (se reenvía como captura nueva con repetir: true).
const repetida = (payload, nombre, rebote, mensaje) => ({ data: {
  repetida: true, pregunta: preguntaRepetida(rebote, mensaje), movimiento: textoChecada('ignorada', mensaje),
  empleado: { nombre: nombre || '', apellido_paterno: '' },
  reintentar: { ...payload, offline_event: undefined, captured_at: undefined, repetir: true },
} });

let storeLoading;
let registrationLoading;
let synchronizing = false;
const initializing = new Map();
const warmed = new Set();
// Opening stored check-ins does not require the offline shell to finish updating.
export const clockStore = () => storeLoading ||= import(/* webpackIgnore: true */ '/offline-clock/store.mjs?v=12');
export const faceEngine = () => import(/* webpackIgnore: true */ '/offline-clock/face.mjs?v=7');
// motivo 'perfil': solo se preparó el reloj; no cambió ninguna checada (las tablas no recargan).
const notify = (motivo) => window.dispatchEvent(new CustomEvent('adamia-queue', { detail: { motivo } }));
const profileKey = (company, employee) => employee ? `clock:employee:${company}:${employee}` : `clock:company:${company}`;
const faceKey = (company, employee, session) => employee ? `faces:employee:${company}:${employee}:${session}` : `faces:company:${company}`;
const preparingFaces = new Map();

export async function prepareLocalFaces({ company, employee = null, slug = null, force = false }) {
  const token = Cookies.get('token');
  if (!navigator.onLine || (employee && !token)) return;
  const store = await clockStore();
  const session = employee ? await store.fingerprint(Cookies.get('token')) : null;
  const key = faceKey(company, employee, session);
  if (preparingFaces.has(key)) return preparingFaces.get(key);
  const prepare = (async () => {
    const existing = await store.getValue(key);
    if (!force && existing && Date.now() - Date.parse(existing.prepared_at) < 5 * 60000) return existing;
    const engine = await faceEngine();
    const device = await engine.deviceIdentity(store);
    const profile = employee ? null : await initializeClock({ company, slug });
    const { data } = await axios.post(employee ? '/checador/reloj/offline/referencias' : '/checador/reloj/offline/empresa/referencias', { id_empresa: Number(company), id_empleado: employee || undefined, grant: profile?.grant, device_id: device.id, public_key: device.publicKey }, { timeout: 30000 });
    if (data.kind !== 'local-face' || data.model !== engine.MODEL || Number(data.company) !== Number(company) || data.device_id !== device.id || (employee ? data.mode !== 'employee' || Number(data.employee) !== Number(employee) : data.mode !== 'company') || !Array.isArray(data.employees)) throw new Error('Las referencias no corresponden a este reloj');
    // Do not advertise a prepared clock before the recognition assets can be
    // reopened without a network (the worker precaches the engine and models).
    await installOfflineWorker();
    if (employee && Cookies.get('token') !== token) return;
    await store.setValue(key, data);
    window.dispatchEvent(new Event('adamia-face-ready'));
    return data;
  })();
  preparingFaces.set(key, prepare);
  try { return await prepare; } finally { preparingFaces.delete(key); }
}

export async function localFaceStatus({ company, employee = null }) {
  const store = await clockStore();
  const session = employee ? await store.fingerprint(Cookies.get('token')) : null;
  const dataset = await store.getValue(faceKey(company, employee, session));
  if (dataset && Date.parse(dataset.expires_at) <= Date.now()) await store.setValue(faceKey(company, employee, session), null);
  return dataset && Date.parse(dataset.expires_at) > Date.now() ? dataset : null;
}

async function registerLocalFace(payload, context, profile, original = null) {
  const store = await clockStore();
  const engine = await faceEngine();
  const old = payload.offline_event?.local_verification ? payload.offline_event : null;
  let event;
  if (old) {
    event = { ...old, action: payload.accion || old.action, status: 'pending', error: '', ...(payload.repetir === true ? { repetir: true } : {}) };
    if (!['entrada', 'salida', 'salida_temporal', 'cerrar_turno', 'salida_comida'].includes(event.action)) throw new Error('Selecciona cómo cerrar el turno');
  } else {
    const dataset = await localFaceStatus(context);
    // «Código y cara»: the typed code picks the person and the face is compared only with that person (1 to 1).
    const codeFace = Boolean(payload.codigo && payload.descriptor_facial);
    const { employee, score, segundo } = codeFace
      ? engine.matchFaceCode(payload.descriptor_facial, dataset, await store.fingerprint(String(payload.codigo).trim()))
      : engine.matchFace(payload.descriptor_facial, dataset);
    const events = await store.listEvents();
    const requested = payload.accion || 'auto';
    // The online button has always meant "entry or exit". Resolve that intent
    // once against the locked server state, without repeating facial matching.
    // Offline captures keep the explicit action decided on the device.
    const onlineAuto = navigator.onLine && window.__adamiaOffline !== true && requested === 'auto';
    const localAction = engine.localAction(employee, dataset, events, requested, { online: onlineAuto });
    const action = onlineAuto ? 'auto' : localAction;
    event = { id: original?.id || crypto.randomUUID(), company: Number(context.company), employee: context.employee ? Number(context.employee) : undefined,
      local_employee: employee.id, identity: employee.code_identity || `employee:${employee.id}`, employeeName: employee.nombre, alias: employee.nombre,
      scope: context.employee ? 'employee' : 'company', session: profile.session, grant: context.employee ? undefined : profile.grant,
      captured_at: original?.captured_at || payload.captured_at || new Date().toISOString(), method: 'facial', action: action === 'decision' ? 'auto' : action,
      latitude: payload.latitud_actual ?? null, longitude: payload.longitud_actual ?? null, precision_metros: payload.precision_metros ?? null, ubicacion_timestamp: payload.ubicacion_timestamp ?? null,
      // «Código y cara»: the code travels too, so the server checks it belongs to the recognized person (1 to 1, ≥ 0.92).
      ...(codeFace ? { code: String(payload.codigo).trim() } : {}),
      local_verification: { grant: employee.grant, device_id: dataset.device_id, model: dataset.model, reference: employee.reference, score, ...(Number.isFinite(segundo) ? { segundo } : {}) },
      local_validated: true, status: action === 'decision' ? 'decision' : 'pending', error: action === 'decision' ? 'Selecciona cómo cerrar el turno' : '',
      ...(payload.repetir === true ? { repetir: true } : {}) };
    engine.validateCaptureTime(dataset, event.captured_at);
    engine.validateLocalLocation(employee, event);
  }
  event = await engine.signEvent(event, store);
  await store.saveEvent(event);
  notify();
  if (event.status === 'decision') return { data: { requiereDecision: true, opciones: event.opciones, message: event.error, offline_event: event, empleado: { nombre: event.employeeName } } };
  if (navigator.onLine && window.__adamiaOffline !== true) {
    // Keep the original online confirmation: show success only after the
    // server acknowledges this UUID, using the already recognized local face.
    await synchronizeClockQueue().catch(() => {});
    let current = (await store.listEvents()).find(saved => saved.id === event.id);
    // A background pass may have taken its queue snapshot before this capture
    // was saved. Send one fresh pass if this event has not been attempted yet.
    if (current?.status === 'pending' && !current.error && navigator.onLine && window.__adamiaOffline !== true) {
      await synchronizeClockQueue().catch(() => {});
      current = (await store.listEvents()).find(saved => saved.id === event.id);
    }
    if (current?.status === 'synced' && current.resolvedAction === 'ignorada') return repetida(payload, current.employeeName || event.employeeName, current.resolvedRebote, current.resolvedMessage);
    if (current?.status === 'synced') return { data: {
      pending: false, local_validated: true,
      empleado: { nombre: current.employeeName || event.employeeName, apellido_paterno: '' },
      movimiento: textoChecada(current.resolvedAction || event.action),
    } };
    if (current?.status === 'review') throw Object.assign(new Error(current.error), {
      response: { status: current.httpStatus || 422, data: { error: current.error, code: current.errorCode } },
    });
    if (current?.status === 'decision') return { data: { requiereDecision: true, opciones: current.opciones, message: current.error, offline_event: current, empleado: { nombre: current.employeeName || event.employeeName } } };
  }
  const guardado = (await store.listEvents()).find(saved => saved.id === event.id) || event;
  return { data: { pending: true, local_validated: true, offline_event: event, motivo: motivoPendiente(guardado), errorServidor: errorDelServidor(guardado), empleado: { nombre: event.employeeName, apellido_paterno: '' }, movimiento: errorDelServidor(guardado) ? 'Rostro reconocido · el servidor no la aceptó todavía' : `${event.action === 'auto' ? 'Checada' : event.action === 'entrada' ? 'Entrada' : 'Salida'} reconocida en este dispositivo · pendiente de subir` } };
}

export async function installOfflineWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return null;
  if (!registrationLoading) registrationLoading = (async () => {
    const registration = await navigator.serviceWorker.register('/offline-clock-sw.js', { scope: '/', type: 'module' });
    // A previously prepared clock must still start when Wi-Fi is connected
    // but the internet is unavailable. Updating is optional with an active worker.
    try { await registration.update(); }
    catch (error) { if (!registration.active) throw error; }
    const worker = registration.installing || registration.waiting || registration.active;
    if (worker && worker.state !== 'activated') await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Descarga offline pendiente')), 120000);
      const changed = () => {
        if (['activated', 'redundant'].includes(worker.state)) {
          clearTimeout(timeout); worker.removeEventListener('statechange', changed);
          if (worker.state === 'activated') resolve(); else reject(new Error('Descarga offline incompleta'));
        }
      };
      worker.addEventListener('statechange', changed); changed();
    });
    registration.active?.postMessage?.({ type: 'SCHEDULE_CLOCK_SYNC' });
    return registration;
  })().catch(error => { registrationLoading = null; throw error; });
  return registrationLoading;
}
export async function warmOfflineAssets() {
  const registration = await installOfflineWorker();
  const worker = registration?.active;
  worker?.postMessage({ type: 'WARM_ASSETS', urls: performance.getEntriesByType('resource').map(entry => entry.name) });
}

export async function initializeClock({ company, employee = null, slug = null }) {
  if (!company) return null;
  const key = profileKey(company, employee);
  if (initializing.has(key)) return initializing.get(key);
  const promise = (async () => {
    const store = await clockStore();
    let profile = await store.getValue(key);
    const session = employee ? await store.fingerprint(Cookies.get('token')) : null;
    if (profile && employee && profile.session !== session) profile = null;
    if (navigator.onLine && (!profile || Date.now() - Date.parse(profile.prepared_at) > 3600000)) {
      try {
      if (!employee && !slug) slug = (await axios.get(`/empresas/id/${company}/slug`, { timeout: 10000 })).data.slug;
      const { data } = await axios.get(employee ? '/checador/reloj/offline/perfil' : `/checador/reloj/offline/empresa/perfil?slug=${encodeURIComponent(slug)}`, { timeout: 10000 });
      if (Number(data.id_empresa) !== Number(company) || (employee && Number(data.id_empleado) !== Number(employee))) throw new Error('La cuenta del reloj cambió');
      profile = { ...data, session, api: new URL(process.env.NEXT_PUBLIC_RUTA_BACKEND, location.origin).href.replace(/\/$/, '') };
      await store.setValue(key, profile);
      await store.setConfig(profile); // Compatibility with pending records from the former screen.
      } catch (error) { if (!profile || error.response?.status === 401 || error.response?.status === 403) throw error; }
    }
    if (!profile) throw new Error('Este reloj aún no ha podido descargar su configuración. Se necesita conexión una primera vez.');
    if (!employee) {
      const cache = await ensureOfflineCache();
      cache?.rememberCompany(profile);
      if (navigator.onLine && !warmed.has(key)) {
        warmed.add(key);
        void Promise.allSettled([
          axios.get(`/empresas/slug/${profile.slug}`),
          fetch(`/api/empresas/check-subscription/${company}`),
          axios.get(`/checador/reloj/registros-del-dia?id_empresa=${company}`),
        ]);
        void installOfflineWorker().then(registration => registration?.active?.postMessage({ type: 'WARM_COMPANY', slug: profile.slug, company: Number(company) })).catch(() => {});
      }
    }
    void warmOfflineAssets().catch(() => {});
    notify('perfil');
    return profile;
  })();
  initializing.set(key, promise);
  try { return await promise; } finally { initializing.delete(key); }
}

export async function registerClockMovement(payload, { company, employee = null, slug = null }) {
  const facial = Boolean(payload.descriptor_facial || payload.offline_event?.local_verification);
  const offline = () => !navigator.onLine || window.__adamiaOffline === true;
  const store = await clockStore();
  const profile = await initializeClock({ company, employee, slug });
  if (Date.now() - Date.parse(profile.prepared_at) > 7 * 86400000) throw new Error('El reloj necesita actualizar su configuración cuando vuelva internet.');
  if (payload.offline_event?.local_verification || (facial && !payload.offline_event && (offline() || await localFaceStatus({ company, employee })))) return registerLocalFace(payload, { company, employee, slug }, profile);
  if (!facial && offline() && employee && profile.metodo === 'facial') {
    throw new Error('Tu cuenta solo permite reconocimiento facial. Necesitas conexión para checar; solicita a RH la habilitación de código si corresponde.');
  }
  const old = payload.offline_event;
  // «Código y cara»: method 'facial' + descriptor + code; the code identifies the person and the server compares the
  // face only with that person (1 to 1).
  const method = payload.descriptor_facial ? 'facial' : 'codigo';
  const code = payload.codigo || old?.code ? String(payload.codigo || old?.code).trim() : undefined;
  const codeIdentity = code ? await store.fingerprint(code) : null;
  const dataset = code ? await localFaceStatus({ company, employee }) : null;
  const matches = dataset && Number(dataset.company) === Number(company) && Array.isArray(dataset.code_references)
    ? dataset.code_references.filter(reference => reference.code_identity === codeIdentity) : [];
  const identified = matches.length === 1 && typeof matches[0].nombre === 'string' && matches[0].nombre.trim() ? matches[0] : null;
  const event = {
    ...(old || {}), id: old?.id || crypto.randomUUID(), captured_at: old?.captured_at || payload.captured_at || new Date().toISOString(),
    action: payload.accion || 'auto', method, code, descriptor: payload.descriptor_facial,
    latitude: payload.latitud_actual ?? old?.latitude ?? null, longitude: payload.longitud_actual ?? old?.longitude ?? null,
    precision_metros: payload.precision_metros ?? old?.precision_metros ?? null, ubicacion_timestamp: payload.ubicacion_timestamp ?? old?.ubicacion_timestamp ?? null,
    employee: employee ? Number(employee) : undefined, company: Number(company), scope: employee ? 'employee' : 'company',
    session: employee ? profile.session : null, grant: employee ? undefined : profile.grant,
    device_id: employee ? undefined : (await (await faceEngine()).deviceIdentity(store)).id,
    identity: employee ? `employee:${employee}` : code ? codeIdentity : 'facial',
    employeeName: identified?.nombre,
    alias: identified?.nombre || (employee ? profile.nombre : code ? `Código •••${code.slice(-3)}` : 'Rostro por validar'),
    status: 'pending', error: '',
    ...(payload.repetir === true ? { repetir: true } : {}),
  };
  await store.saveEvent(event);
  notify();
  const queued = () => ({ data: { pending: true, offline_event: event, empleado: { nombre: event.alias, apellido_paterno: '' }, movimiento: 'Guardado en el celular · pendiente de sincronizar' } });
  if (facial && !old && offline()) {
    await store.saveEvent({ ...event, status: 'rejected', descriptor: undefined, grant: undefined, error: 'Captura facial cancelada antes de enviarse: sin conexión.' });
    notify();
    return registerLocalFace(payload, { company, employee, slug }, profile, event);
  }
  if (!navigator.onLine) return queued();
  const earlier = (await store.listEvents()).some(other => other.id !== event.id && other.company === event.company && (other.scope || 'employee') === event.scope && other.identity === event.identity && other.status !== 'synced' && other.status !== 'rejected' && other.captured_at <= event.captured_at);
  if (earlier) {
    await synchronizeClockQueue().catch(() => {});
    const current = (await store.listEvents()).find(other => other.id === event.id);
    if (current?.status === 'synced' && current.resolvedAction === 'ignorada') return repetida(payload, current.employeeName || event.alias, current.resolvedRebote, current.resolvedMessage);
    if (current?.status === 'synced') return { data: { empleado: { nombre: current.employeeName || event.alias, apellido_paterno: '' }, movimiento: textoChecada(current.resolvedAction) } };
    if (current?.status === 'review') throw Object.assign(new Error(current.error), { response: { status: current.httpStatus || 422, data: { error: current.error, code: current.errorCode } } });
    if (current?.status === 'decision') return { data: { requiereDecision: true, opciones: current.opciones, message: current.error, offline_event: event, descriptor_facial: event.descriptor } };
    return queued();
  }
  try {
    const { data } = await sendEvent(event);
    if (data.requiereDecision) {
      await store.saveEvent({ ...event, status: 'decision', opciones: data.opciones, error: data.message || 'Selecciona cómo cerrar el turno' }); notify();
      return { data: { ...data, offline_event: event, descriptor_facial: payload.descriptor_facial } };
    }
    await store.saveEvent({ ...event, status: 'synced', employeeName: data.employee?.nombre, resolvedAction: data.action, code: undefined, descriptor: undefined, grant: undefined });
    notify();
    if (data.action === 'ignorada') return repetida(payload, data.employee?.nombre || event.alias, data.rebote, data.message);
    return { data: { ...data, empleado: { nombre: data.employee?.nombre || event.alias, apellido_paterno: '' }, movimiento: textoChecada(data.action, data.message) } };
  } catch (error) {
    if (!error.response || error.response.status >= 500) {
      await store.saveEvent(store.syncFailure(event, error));
      notify();
      return queued();
    }
    // Immediate denials are already visible in the active form/camera. Do not
    // turn automatic facial retries into a growing list of "pending" captures.
    // Previously queued captures retain their evidence and enter manual review.
    const immediateDenial = !old && [400, 403, 404, 422].includes(error.response.status);
    await store.saveEvent(immediateDenial ? { ...event, status: 'rejected', code: undefined, descriptor: undefined, grant: undefined, errorCode: error.response.data?.code, error: error.response.data?.error || error.message } : store.syncFailure(event, error));
    notify();
    throw error;
  }
}
async function sendEvent(event) {
  const company = event.scope === 'company';
  return axios.post(company ? '/checador/reloj/offline/empresa/sincronizar' : '/checador/reloj/offline/sincronizar', {
    id: event.id, captured_at: event.captured_at, action: event.action, method: event.method,
    code: event.code, descriptor: event.descriptor, latitude: event.latitude, longitude: event.longitude,
    ...(event.local_verification ? { company: event.company, local_employee: event.local_employee, local_verification: event.local_verification } : {}),
    precision_metros: event.precision_metros, ubicacion_timestamp: event.ubicacion_timestamp,
    ...(event.repetir === true ? { repetir: true } : {}),
    ...(company ? { grant: event.grant } : {}),
    ...(company && event.device_id ? { device_id: event.device_id } : {}),
  }, { timeout: 15000 });
}
export async function synchronizeClockQueue() {
  if (synchronizing) return synchronizing;
  if (!navigator.onLine) return;
  synchronizing = (async () => {
    const store = await clockStore();
    const session = await store.fingerprint(Cookies.get('token'));
    const events = await store.listEvents();
    const groups = new Map();
    for (const event of events.filter(event => event.status !== 'synced' && event.status !== 'rejected')) {
      if (event.scope !== 'company' && !session) continue;
      if (event.scope !== 'company') {
        const profile = await store.getValue(profileKey(event.company, event.employee));
        if (!profile || profile.session !== session) continue;
      }
      const key = `${event.scope || 'employee'}:${event.company}:${event.employee || ''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    }
    for (const group of groups.values()) {
      group.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
      const run = group[0].scope === 'company' ? store.syncCompanyEvents : store.syncEvents;
      await run(group, async event => (await sendEvent(event)).data, store.saveEvent);
    }
    // Solo avisa si alguna checada cambió de estado. Esta sincronización corre cada 30 s y al abrir
    // cada pantalla: con capturas en revisión avisaba siempre y Asistencias pedía todo dos veces.
    if (groups.size) {
      const antes = new Map([...groups.values()].flat().map(event => [event.id, `${event.status}|${event.error || ''}`]));
      const cambio = (await store.listEvents()).some(event => antes.has(event.id) && antes.get(event.id) !== `${event.status}|${event.error || ''}`);
      if (cambio) notify();
    }
    await flushFaceAttempts(store).catch(() => {});
  })();
  try { await synchronizing; } finally { synchronizing = false; }
}
export async function resolveClockDecision(event, action) {
  const store = await clockStore();
  const next = { ...event, action, status: 'pending', error: '' };
  await store.saveEvent(event.local_verification ? await (await faceEngine()).signEvent(next, store) : next);
  notify();
  await synchronizeClockQueue();
}
export async function retryClockEvent(event) {
  const store = await clockStore();
  await store.saveEvent({ ...event, status: 'pending', error: '' });
  notify();
  await synchronizeClockQueue();
}

export async function discardClockEvent(event) {
  const store = await clockStore();
  await store.discardReviewedEvent(event.id);
  notify();
}

// Failed facial attempts (motivo and %, never the descriptor) for RH. Rate limited per device: at most one per candidate and
// motivo every 30 s (engine.debeReportar). Saved first, like check-ins, and sent when there is a connection.
const ATTEMPTS_KEY = 'face:attempts:v1';
const ATTEMPTS_SENT_KEY = 'face:attempts:sent:v1';
const MAX_ATTEMPTS = 100;
export async function reportFaceAttempt(attempt, { company, employee = null }) {
  if (!attempt || !company) return false;
  const store = await clockStore();
  const engine = await faceEngine();
  const now = Date.now();
  const decision = engine.debeReportar(await store.getValue(ATTEMPTS_SENT_KEY), attempt, now);
  await store.setValue(ATTEMPTS_SENT_KEY, decision.enviados);
  if (!decision.reportar) return false;
  const device = await engine.deviceIdentity(store);
  const session = employee ? await store.fingerprint(Cookies.get('token')) : null;
  const entry = {
    id: crypto.randomUUID(), scope: employee ? 'employee' : 'company', company: Number(company), session,
    creado_en: new Date(now).toISOString(), modo: employee ? 'app' : 'kiosco', metodo: attempt.metodo === 'codigo_cara' ? 'codigo_cara' : 'cara',
    motivo: attempt.motivo, id_empleado: attempt.id_empleado ?? null, mejor: attempt.mejor ?? null, segundo: attempt.segundo ?? null,
    id_segundo: attempt.id_segundo ?? null, dispositivo: device.id,
  };
  const queue = [...((await store.getValue(ATTEMPTS_KEY)) || []), entry].slice(-MAX_ATTEMPTS);
  await store.setValue(ATTEMPTS_KEY, queue);
  if (navigator.onLine && window.__adamiaOffline !== true) void flushFaceAttempts(store).catch(() => {});
  return true;
}
let flushingAttempts = null;
async function flushFaceAttempts(store) {
  if (flushingAttempts) return flushingAttempts;
  flushingAttempts = (async () => {
    const queue = (await store.getValue(ATTEMPTS_KEY)) || [];
    if (!queue.length || !navigator.onLine || window.__adamiaOffline === true) return;
    const session = await store.fingerprint(Cookies.get('token'));
    const done = new Set();
    const groups = new Map();
    for (const entry of queue) {
      // Personal attempts go only with the same signed-in account that saved them.
      if (entry.scope === 'employee' && entry.session !== session) continue;
      const key = `${entry.scope}:${entry.company}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
    for (const group of groups.values()) {
      const { scope, company } = group[0];
      const profile = scope === 'company' ? await store.getValue(profileKey(company, null)) : null;
      if (scope === 'company' && !profile?.grant) continue;
      for (const entry of group) {
        const body = scope === 'company'
          ? { grant: profile.grant, id_empleado: entry.id_empleado ?? undefined, metodo: entry.metodo, motivo: entry.motivo, mejor: entry.mejor ?? undefined, segundo: entry.segundo ?? undefined, id_segundo: entry.id_segundo ?? undefined, dispositivo: entry.dispositivo, capturado_en: entry.creado_en }
          : { metodo: entry.metodo, motivo: entry.motivo, mejor: entry.mejor ?? undefined, dispositivo: entry.dispositivo, capturado_en: entry.creado_en };
        try {
          // 201 { guardado: true } or 200 { guardado: false } (repeated): either way it is done.
          await axios.post(scope === 'company' ? '/checador/reloj/offline/empresa/intentos' : '/checador/reloj/offline/intentos', body, { timeout: 15000 });
          done.add(entry.id);
        } catch (error) {
          // Rejected for good (invalid, unknown route…): drop it. Network, server, session and rate-limit errors keep it.
          const status = error.response?.status;
          if (status && status < 500 && ![401, 408, 429].includes(status)) done.add(entry.id);
          if (!status || status >= 500 || status === 429) break;
        }
      }
    }
    if (done.size) {
      const current = (await store.getValue(ATTEMPTS_KEY)) || [];
      await store.setValue(ATTEMPTS_KEY, current.filter(entry => !done.has(entry.id)));
    }
  })();
  try { await flushingAttempts; } finally { flushingAttempts = null; }
}

// «Código y cara» in the company clock: before turning to the camera, check the code against the downloaded references so
// an unknown code (or one without a registered face) answers at once. null: nothing downloaded; the server decides.
export async function checkFaceCode({ company, code }) {
  const dataset = await localFaceStatus({ company });
  if (!dataset || !Array.isArray(dataset.employees)) return null;
  const store = await clockStore();
  const identity = await store.fingerprint(String(code || '').trim());
  const withFace = dataset.employees.filter(employee => employee.code_identity === identity);
  if (withFace.length === 1) return { estado: 'ok', id_empleado: Number(withFace[0].id) };
  const known = (dataset.code_references || []).filter(reference => reference.code_identity === identity);
  if (!withFace.length && known.length === 1) return { estado: 'sin_referencias', id_empleado: Number(known[0].id) };
  return { estado: 'invalido', id_empleado: null };
}
