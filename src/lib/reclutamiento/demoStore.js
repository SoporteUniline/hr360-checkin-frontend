import { makeSeed, uid } from "./model";

// No importa axios ni conoce endpoints reales. Solo contiene datos de prueba.
const PREFIX = "adamia:reclutamiento-demo:v1:";
export const demoKey = (id) => `${PREFIX}workspace:${id}`;
export function openDemo(scope) {
  const key = `${PREFIX}scope:${scope}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = uid();
    localStorage.setItem(key, id);
  }
  let data = readDemo(id);
  if (!data) {
    data = makeSeed();
    writeDemo(id, data);
  }
  return { id, data };
}
export function readDemo(id) {
  if (!id || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) return null;
  const raw = localStorage.getItem(demoKey(id));
  if (!raw) return null;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Los datos de esta prueba no se pudieron leer. No se sobrescribieron.");
  }
  if (
    data?.version !== 1 ||
    !Array.isArray(data.vacancies) ||
    !Array.isArray(data.candidates) ||
    !Array.isArray(data.branches) ||
    !Array.isArray(data.modalities)
  )
    throw new Error("Esta prueba pertenece a otra versión. No se sobrescribió.");
  return data;
}
export function writeDemo(id, data) {
  localStorage.setItem(demoKey(id), JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("reclutamiento-demo-change", { detail: id }));
}
export function updateDemo(id, updater) {
  const latest = readDemo(id);
  if (!latest) throw new Error("No encontramos los datos de esta prueba.");
  const next = updater(latest);
  writeDemo(id, next);
  return next;
}
