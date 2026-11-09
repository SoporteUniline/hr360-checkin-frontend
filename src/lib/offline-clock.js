import axios, { ensureOfflineCache } from './axios';
import Cookies from 'js-cookie';

let storeLoading;
let registrationLoading;
let synchronizing = false;
const initializing = new Map();
const warmed = new Set();
export const clockStore = () => storeLoading ||= import(/* webpackIgnore: true */ '/offline-clock/store.mjs?v=6');
export const faceEngine = () => import(/* webpackIgnore: true */ '/offline-clock/face.mjs?v=1');
const notify = () => window.dispatchEvent(new Event('adamia-queue'));
const profileKey = (company, employee) => employee ? `clock:employee:${company}:${employee}` : `clock:company:${company}`;
const faceKey = (company, employee, session) => employee ? `faces:employee:${company}:${employee}:${session}` : `faces:company:${company}`;
const preparingFaces = new Map();

export async function prepareLocalFaces({ company, employee = null, force = false }) {
  if (!navigator.onLine || !Cookies.get('token')) return;
  const store = await clockStore();
  const session = employee ? await store.fingerprint(Cookies.get('token')) : null;
  const key = faceKey(company, employee, session);
  if (preparingFaces.has(key)) return preparingFaces.get(key);
  const prepare = (async () => {
    const existing = await store.getValue(key);
    if (!force && existing && Date.now() - Date.parse(existing.prepared_at) < 3600000) return existing;
    const engine = await faceEngine();
    const device = await engine.deviceIdentity(store);
    const { data } = await axios.post('/checador/reloj/offline/referencias', { id_empresa: Number(company), id_empleado: employee || undefined, device_id: device.id, public_key: device.publicKey }, { timeout: 30000 });
    if (data.kind !== 'local-face' || data.model !== engine.MODEL || Number(data.company) !== Number(company) || data.device_id !== device.id || (employee ? data.mode !== 'employee' || Number(data.employee) !== Number(employee) : data.mode !== 'company') || !Array.isArray(data.employees)) throw new Error('Las referencias no corresponden a este reloj');
    // Do not advertise a prepared clock before the recognition assets can be
    // reopened without a network (the worker precaches the engine and models).
    await installOfflineWorker();
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
    event = { ...old, action: payload.accion || old.action, status: 'pending', error: '' };
    if (!['entrada', 'salida', 'salida_temporal', 'cerrar_turno'].includes(event.action)) throw new Error('Selecciona cómo cerrar el turno');
  } else {
    const dataset = await localFaceStatus(context);
    const { employee, score } = engine.matchFace(payload.descriptor_facial, dataset);
    const events = await store.listEvents();
    const action = engine.localAction(employee, dataset, events, payload.accion || 'auto');
    event = { id: original?.id || crypto.randomUUID(), company: Number(context.company), employee: context.employee ? Number(context.employee) : undefined,
      local_employee: employee.id, identity: employee.code_identity || `employee:${employee.id}`, employeeName: employee.nombre, alias: employee.nombre,
      scope: context.employee ? 'employee' : 'company', session: profile.session, grant: context.employee ? undefined : profile.grant,
      captured_at: original?.captured_at || payload.captured_at || new Date().toISOString(), method: 'facial', action: action === 'decision' ? 'auto' : action,
      latitude: payload.latitud_actual ?? null, longitude: payload.longitud_actual ?? null, precision_metros: payload.precision_metros ?? null, ubicacion_timestamp: payload.ubicacion_timestamp ?? null,
      local_verification: { grant: employee.grant, device_id: dataset.device_id, model: dataset.model, reference: employee.reference, score },
      local_validated: true, status: action === 'decision' ? 'decision' : 'pending', error: action === 'decision' ? 'Selecciona cómo cerrar el turno' : '' };
    engine.validateCaptureTime(dataset, event.captured_at);
    engine.validateLocalLocation(employee, event);
  }
  event = await engine.signEvent(event, store);
  await store.saveEvent(event);
  notify();
  if (event.status === 'decision') return { data: { requiereDecision: true, offline_event: event, empleado: { nombre: event.employeeName } } };
  if (navigator.onLine && window.__adamiaOffline !== true) void synchronizeClockQueue().catch(() => {});
  return { data: { pending: true, local_validated: true, offline_event: event, empleado: { nombre: event.employeeName, apellido_paterno: '' }, movimiento: `${event.action === 'entrada' ? 'Entrada' : 'Salida'} reconocida en este dispositivo · pendiente de subir` } };
}

export async function installOfflineWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return null;
  if (!registrationLoading) registrationLoading = (async () => {
    const registration = await navigator.serviceWorker.register('/offline-clock-sw.js', { scope: '/' });
    await registration.update();
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
    notify();
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
  const method = payload.descriptor_facial ? 'facial' : 'codigo';
  const code = method === 'codigo' ? String(payload.codigo || '').trim() : undefined;
  const event = {
    ...(old || {}), id: old?.id || crypto.randomUUID(), captured_at: old?.captured_at || payload.captured_at || new Date().toISOString(),
    action: payload.accion || 'auto', method, code, descriptor: payload.descriptor_facial,
    latitude: payload.latitud_actual ?? old?.latitude ?? null, longitude: payload.longitud_actual ?? old?.longitude ?? null,
    precision_metros: payload.precision_metros ?? old?.precision_metros ?? null, ubicacion_timestamp: payload.ubicacion_timestamp ?? old?.ubicacion_timestamp ?? null,
    employee: employee ? Number(employee) : undefined, company: Number(company), scope: employee ? 'employee' : 'company',
    session: employee ? profile.session : null, grant: employee ? undefined : profile.grant,
    identity: employee ? `employee:${employee}` : method === 'codigo' ? await store.fingerprint(code) : 'facial',
    alias: employee ? profile.nombre : method === 'codigo' ? `Código •••${code.slice(-3)}` : 'Rostro por validar',
    status: 'pending', error: '',
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
    if (current?.status === 'synced') return { data: { empleado: { nombre: current.employeeName || event.alias, apellido_paterno: '' }, movimiento: current.resolvedAction === 'entrada' ? 'Entrada registrada' : 'Salida registrada' } };
    if (current?.status === 'review') throw Object.assign(new Error(current.error), { response: { status: current.httpStatus || 422, data: { error: current.error, code: current.errorCode } } });
    if (current?.status === 'decision') return { data: { requiereDecision: true, offline_event: event, descriptor_facial: event.descriptor } };
    return queued();
  }
  try {
    const { data } = await sendEvent(event);
    if (data.requiereDecision) {
      await store.saveEvent({ ...event, status: 'decision', error: 'Selecciona cómo cerrar el turno' }); notify();
      return { data: { ...data, offline_event: event, descriptor_facial: payload.descriptor_facial } };
    }
    await store.saveEvent({ ...event, status: 'synced', employeeName: data.employee?.nombre, resolvedAction: data.action, code: undefined, descriptor: undefined, grant: undefined });
    notify();
    return { data: { ...data, empleado: { nombre: data.employee?.nombre || event.alias, apellido_paterno: '' }, movimiento: data.action === 'entrada' ? 'Entrada registrada' : 'Salida registrada' } };
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
    ...(company ? { grant: event.grant } : {}),
  }, { timeout: 15000 });
}
export async function synchronizeClockQueue() {
  if (synchronizing || !navigator.onLine) return;
  synchronizing = true;
  try {
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
    notify();
  } finally { synchronizing = false; }
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
