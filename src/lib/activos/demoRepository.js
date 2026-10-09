import { applyCommand, scopeKey, seed, validateState } from "./model.mjs";

// Punto de sustitución para Cano: implementar read/execute sobre la API real.
// Nunca activar un fallback a demo si falla una futura API de producción.
export function createDemoRepository(
  userId,
  companyId,
  storage = window.localStorage
) {
  const key = scopeKey(userId, companyId);
  return {
    key,
    read() {
      const raw = storage.getItem(key);
      return raw ? validateState(JSON.parse(raw), companyId) : seed(companyId);
    },
    execute(command, revision, actor) {
      const current = this.read();
      if (current.revision !== revision)
        throw new Error(
          "La demostración cambió en otra vista. Recarga antes de guardar."
        );
      const result = applyCommand(current, command, actor);
      storage.setItem(key, JSON.stringify(result.state));
      window.dispatchEvent(
        new CustomEvent("adamia-activos-demo", { detail: key })
      );
      return result;
    },
    reset() {
      storage.removeItem(key);
      window.dispatchEvent(
        new CustomEvent("adamia-activos-demo", { detail: key })
      );
      return seed(companyId);
    },
  };
}
