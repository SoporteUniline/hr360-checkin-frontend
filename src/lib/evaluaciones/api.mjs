// Transport contract for the existing ADAMIA authenticated Axios client.
export const PREFIX = "/api/checador/evaluaciones-desempeno";
export const sid = (value) => (value == null ? null : String(value));
export function apiPath(baseURL = "") {
  return /\/api\/?$/.test(baseURL) ? PREFIX.slice(4) : PREFIX;
}
export function normalizeTemplate(t) {
  return {
    ...t,
    id: sid(t.id),
    categories: t.categories || [],
    scale: (t.scale || []).map((s, i) => ({ ...s, value: i + 1 })),
    areaId: sid(t.areaId),
    positionId: sid(t.positionId),
  };
}
export function normalizeCampaign(c, templates = []) {
  const templateId = (versionId) =>
    templates.find(
      (t) => String(t.versionId ?? t.templateVersionId) === String(versionId)
    )?.id || "";
  return {
    ...c,
    id: sid(c.id),
    periodStart: c.periodStart || "",
    periodEnd: c.periodEnd || "",
    opensOn: c.opensOn || "",
    dueOn: c.dueOn || "",
    settings: c.settings || {},
    subjectIds: (
      c.subjectIds ||
      c.subjects?.map((s) => s.employeeId) ||
      []
    ).map(sid),
    templateId: templateId(c.primaryTemplateVersionId),
    recurrence: c.recurrence || "none",
    groups: (c.groups || []).map((g) => ({
      ...g,
      templateId: templateId(g.templateVersionId),
    })),
    reminders: c.reminders || [],
  };
}
export function normalizeAssignment(a, campaignId) {
  return {
    ...a,
    id: sid(a.id),
    campaignId: sid(a.campaignId ?? campaignId),
    subjectId: sid(a.subjectId),
    evaluatorId:
      a.evaluatorEmployeeId != null
        ? sid(a.evaluatorEmployeeId)
        : `user:${a.evaluatorUserId}`,
    template: a.template ? normalizeTemplate(a.template) : undefined,
  };
}
export function createEvaluationApi(http, company) {
  const prefix = apiPath(http.defaults?.baseURL);
  async function request(method, path, data, options = {}) {
    try {
      const response = await http.request({
        method,
        url: prefix + path,
        data,
        ...options,
        params: { ...options.params, ...(company ? { empresa: company } : {}) },
      });
      return response.data;
    } catch (cause) {
      const body = cause.response?.data?.error;
      const error = new Error(
        body?.message ||
          (cause.response?.status === 401
            ? "Tu sesión venció. Vuelve a iniciar sesión."
            : "No se pudo conectar con Evaluación de Desempeño. Intenta de nuevo.")
      );
      error.code = body?.code;
      error.fields = body?.fields || [];
      error.requestId = body?.requestId;
      error.status = cause.response?.status;
      throw error;
    }
  }
  const get = async (path, params = {}, signal) =>
    request("GET", path, undefined, { params, signal });
  // Used only for complete selector catalogs, never to infer permissions or scores.
  async function all(path, params = {}, signal) {
    const rows = [];
    for (let page = 1; ; page++) {
      const result = await get(
        path,
        { ...params, page, pageSize: 100 },
        signal
      );
      if (!Array.isArray(result.data))
        throw new Error("La API no devolvió el listado esperado.");
      rows.push(...result.data);
      if (
        !result.pagination ||
        rows.length >= result.pagination.total ||
        result.data.length === 0
      )
        return rows;
    }
  }
  async function mutate(
    method,
    path,
    body,
    { version, idempotent = false, key } = {}
  ) {
    const requiresVersion =
      /\/(versions|archive|draft|submit|extend|close|updates)$/.test(path) ||
      /^\/templates\/[^/]+\/duplicate$/.test(path) ||
      (method === "PATCH" && !path.startsWith("/levels/")) ||
      (method === "PUT" && /\/assignments$/.test(path));
    if (version === undefined && requiresVersion)
      throw new Error("Recarga el detalle antes de guardar: falta su versión.");
    return (
      await request(
        method,
        path,
        version === undefined ? body : { ...body, version },
        {
          headers: idempotent
            ? { "Idempotency-Key": key || crypto.randomUUID() }
            : {},
        }
      )
    ).data;
  }
  async function exportCsv(kind, filters = {}) {
    const job = await mutate("POST", "/exports", { kind, filters });
    const blob = await request(
      "GET",
      `/exports/${job.id}/download`,
      undefined,
      { params: { token: job.token }, responseType: "blob" }
    );
    return { blob, filename: `evaluaciones-${kind}.csv` };
  }
  return { get, all, mutate, exportCsv };
}
