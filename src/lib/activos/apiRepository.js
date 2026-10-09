export function createApiRepository(companyId, self = false) {
  const url = `/api/control-activos${self ? "/mis-recursos" : ""}?empresa=${encodeURIComponent(companyId)}`;
  const pending = new Map();
  async function request(options = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        data.error?.message || "No se pudo completar la solicitud.",
      );
      error.status = response.status;
      throw error;
    }
    return data;
  }
  return {
    async read() {
      const data = await request();
      if (!data.state || data.state.companyId !== String(companyId))
        throw new Error("La respuesta no corresponde a esta empresa.");
      return data.state;
    },
    async execute(command, revision) {
      const fingerprint = JSON.stringify({ command, revision });
      const key = pending.get(fingerprint) || crypto.randomUUID();
      pending.set(fingerprint, key);
      const data = await request({
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({ command, revision }),
      });
      if (!data.result?.operationId)
        throw new Error(
          "No se recibió confirmación. Reintenta la misma solicitud.",
        );
      pending.delete(fingerprint);
      return data.result;
    },
  };
}
