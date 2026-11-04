import { getConfig, listEvents, saveEvent, readToken, fingerprint, ownEvents, syncEvents, syncCompanyEvents } from './store.mjs?v=4';

const $ = id => document.getElementById(id);
const labels = { entrada: 'Entrada', salida: 'Salida', salida_temporal: 'Salida temporal', cerrar_turno: 'Cerrar turno' };
let profile;
let stream;
let busy = false;
let syncing = false;
let faceLoading;

function message(text) { $('message').textContent = text; }
function stopCamera() {
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  $('video').srcObject = null;
}

async function render() {
  $('connection').textContent = navigator.onLine ? 'Con conexión: se intentará enviar los pendientes.' : 'Sin conexión: las checadas quedarán pendientes.';
  const records = profile ? ownEvents(await listEvents(), profile) : [];
  $('events').replaceChildren(...records.map(event => {
    const item = document.createElement('li');
    item.textContent = `${event.employeeName || event.alias || ''} ${labels[event.action]} · ${new Date(event.captured_at).toLocaleString('es-MX')} · ${event.status === 'synced' ? 'Sincronizada' : 'Pendiente de sincronizar'}${event.error ? ` — ${event.error}` : ''}`;
    return item;
  }));
  $('sync').disabled = syncing || !profile || !navigator.onLine;
}

async function currentSession() {
  if (!profile || Date.now() - Date.parse(profile.prepared_at) > 7 * 86400000 || (profile.scope !== 'company' && profile.session !== await fingerprint(readToken()))) {
    throw new Error('Conéctate e inicia sesión con tu cuenta para preparar nuevamente el reloj offline. Tus pendientes se conservan.');
  }
}

async function request(path, body) {
  const token = readToken();
  if (!token && profile.scope !== 'company') throw new Error('Inicia sesión nuevamente para sincronizar. Tus checadas siguen guardadas.');
  const response = await fetch(`${profile.api}${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'No se pudo sincronizar'), { response: { status: response.status, data } });
  return data;
}

async function sync() {
  if (syncing || busy || !profile || !navigator.onLine) return;
  syncing = true;
  try {
    await render();
    const records = ownEvents(await listEvents(), profile);
    if (!records.some(event => event.status !== 'synced')) return;
    // Validate the live account before sending stored credentials or biometrics.
    const company = profile.scope === 'company';
    if (!company) {
      const account = await request('/checador/reloj/offline/perfil');
      if (account.id_empleado !== profile.id_empleado || account.id_empresa !== profile.id_empresa) throw new Error('Inicia sesión con la cuenta que creó estas checadas para sincronizarlas.');
    }
    await (company ? syncCompanyEvents : syncEvents)(records, event => request(company ? '/checador/reloj/offline/empresa/sincronizar' : '/checador/reloj/offline/sincronizar', {
      id: event.id, action: event.action, captured_at: event.captured_at,
      method: event.method, code: event.code, descriptor: event.descriptor,
      latitude: event.latitude, longitude: event.longitude,
      ...(company ? { grant: event.grant || profile.grant } : {}),
    }), saveEvent);
  } catch (error) {
    message(error.message || 'No hay conexión con el servidor. Los pendientes se conservan.');
  } finally {
    syncing = false;
    await render();
  }
}

async function loadFace() {
  if (!faceLoading) faceLoading = (async () => {
    if (!window.faceapi) await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/face-api/face-api-0.22.2.min.js';
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(new Error('Prepara el reloj con internet para descargar el reconocimiento facial.')); };
      document.head.append(script);
    });
    await Promise.all([window.faceapi.nets.ssdMobilenetv1, window.faceapi.nets.faceLandmark68Net, window.faceapi.nets.faceRecognitionNet].map(net => net.params ? undefined : net.loadFromUri('/models')));
  })().catch(error => { faceLoading = null; throw error; });
  return faceLoading;
}

$('camera').onclick = async () => {
  try {
    await currentSession();
    $('camera').disabled = true;
    await loadFace();
    stopCamera();
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    $('video').srcObject = stream;
    await $('video').play();
    message('Cámara lista. Selecciona el movimiento y guarda la checada.');
  } catch (error) { message(error.message); }
  finally { $('camera').disabled = false; }
};

$('method').onchange = () => {
  const facial = $('method').value === 'facial';
  $('face-field').hidden = !facial;
  $('code-field').hidden = facial;
  if (!facial) stopCamera();
};

$('clock').onsubmit = async event => {
  event.preventDefault();
  if (busy || syncing) return;
  busy = true;
  $('save').disabled = true;
  try {
    await currentSession();
    const method = $('method').value;
    const captured_at = new Date().toISOString();
    let descriptor;
    const code = $('code').value.trim();
    if (method === 'codigo' && !/^\d{1,32}$/.test(code)) throw new Error('Escribe tu código de empleado.');
    if (method === 'facial') {
      if (!stream || $('video').readyState < 2) throw new Error('Activa la cámara antes de guardar.');
      const faces = await window.faceapi.detectAllFaces($('video')).withFaceLandmarks().withFaceDescriptors();
      if (faces.length !== 1) throw new Error('Debe aparecer exactamente un rostro en la cámara.');
      descriptor = Array.from(faces[0].descriptor);
    }
    let latitude = null;
    let longitude = null;
    if (profile.checar_gps || profile.scope === 'company') {
      message('Obteniendo ubicación…');
      try {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (error) {
        if (profile.scope !== 'company') throw error;
        message('Sin ubicación: los empleados que requieren GPS deberán validarse al sincronizar.');
      }
    }
    await saveEvent({ id: crypto.randomUUID(), employee: profile.id_empleado, company: profile.id_empresa, scope: profile.scope, alias: profile.scope === 'company' ? (method === 'codigo' ? `Código •••${code.slice(-3)}` : 'Rostro por validar') : '', identity: method === 'codigo' ? await fingerprint(code) : 'facial', grant: profile.scope === 'company' ? profile.grant : undefined, action: $('action').value, captured_at, method, code: method === 'codigo' ? code : undefined, descriptor, latitude, longitude, status: 'pending', error: '' });
    $('code').value = '';
    stopCamera();
    message('Checada guardada en este celular. Pendiente de validación y sincronización.');
    await render();
  } catch (error) {
    message(error.code === 1 ? 'Permite el acceso a la ubicación para guardar.' : error.message || 'No se pudo guardar la checada. No se ha registrado.');
  } finally {
    busy = false;
    $('save').disabled = false;
  }
  void sync();
};

$('sync').onclick = sync;
window.addEventListener('online', () => { void render(); void sync(); });
window.addEventListener('offline', () => { void render(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamera();
  else void sync();
});
window.addEventListener('pagehide', stopCamera);
setInterval(() => { void sync(); }, 30000);

try {
  profile = await getConfig();
  if (!profile) throw new Error('Primero abre el reloj de empresa o el del empleado con internet y pulsa “Preparar reloj offline”.');
  await currentSession();
  $('employee').textContent = profile.nombre;
  const actions = profile.scope === 'company' ? ['entrada', 'salida', 'salida_temporal', 'cerrar_turno'] : profile.cierre_turno === 'Manual' ? ['entrada', 'salida_temporal', 'cerrar_turno'] : ['entrada', 'salida'];
  for (const action of actions) $('action').add(new Option(labels[action], action));
  const methods = profile.metodo === 'codigo' ? ['codigo'] : profile.metodo === 'facial' ? ['facial'] : ['codigo', 'facial'];
  for (const method of methods) $('method').add(new Option(method === 'codigo' ? 'Código / contenido numérico del QR' : 'Reconocimiento facial', method));
  $('method').onchange();
  $('clock').hidden = false;
  await render();
  void sync();
} catch (error) {
  profile = null;
  $('employee').textContent = 'Reloj offline sin preparar para esta sesión';
  message(error.message);
  await render();
}
