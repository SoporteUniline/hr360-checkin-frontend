import assert from "node:assert/strict";
import {
  createEvaluationApi,
  apiPath,
  normalizeAssignment,
  normalizeCampaign,
  normalizeTemplate,
} from "../src/lib/evaluaciones/api.mjs";
assert.equal(
  apiPath("https://api.example/api/"),
  "/checador/evaluaciones-desempeno"
);
assert.equal(
  apiPath("https://api.example"),
  "/api/checador/evaluaciones-desempeno"
);
const calls = [];
let responder = () => ({ data: { id: 7 } });
const api = createEvaluationApi(
  {
    defaults: { baseURL: "https://example.test/api" },
    request: async (c) => {
      calls.push(c);
      return { data: await responder(c) };
    },
  },
  4
);
await api.mutate(
  "POST",
  "/assignments/15/submit",
  { answers: { q: false } },
  { version: 2, idempotent: true }
);
assert.equal(
  calls[0].url,
  "/checador/evaluaciones-desempeno/assignments/15/submit"
);
assert.deepEqual(calls[0].data, { answers: { q: false }, version: 2 });
assert.equal(calls[0].params.empresa, 4);
assert.ok(calls[0].headers["Idempotency-Key"]);
await api.mutate("POST", "/campaigns/7/launch", {}, { idempotent: true });
assert.notEqual(
  calls[0].headers["Idempotency-Key"],
  calls[1].headers["Idempotency-Key"]
);
await assert.rejects(api.mutate("PUT", "/assignments/15/draft", {}), /versión/);
responder = (c) => ({
  data: Array.from({ length: c.params.page === 1 ? 100 : 1 }, (_, i) => ({
    id: (c.params.page - 1) * 100 + i,
  })),
  pagination: { page: c.params.page, pageSize: 100, total: 101 },
});
assert.equal((await api.all("/people")).length, 101);
responder = () => {
  throw {
    response: {
      status: 409,
      data: {
        error: {
          code: "VERSION",
          message: "Recarga el detalle.",
          fields: [],
          requestId: "test",
        },
      },
    },
  };
};
await assert.rejects(
  api.mutate("PATCH", "/settings", {}, { version: 1 }),
  (e) => e.code === "VERSION" && e.message === "Recarga el detalle."
);
responder = (c) =>
  c.url.endsWith("/download")
    ? "csv data"
    : { data: { id: 9, token: "download-only" } };
await api.exportCsv("results", { campaignId: 7 });
assert.equal(calls.at(-1).responseType, "blob");
assert.deepEqual(calls.at(-1).params, { token: "download-only", empresa: 4 });
assert.equal(
  normalizeAssignment({ id: 2, subjectId: 101, evaluatorUserId: 1 }, 7)
    .evaluatorId,
  "user:1"
);
const template = normalizeTemplate({
  id: 8,
  versionId: 12,
  scale: [{ label: "Bajo" }],
});
assert.equal(template.scale[0].value, 1);
assert.equal(
  normalizeCampaign(
    {
      id: 7,
      primaryTemplateVersionId: 12,
      subjects: [{ id: 99, employeeId: 101 }],
      groups: [],
    },
    [template]
  ).subjectIds[0],
  "101"
);
assert.equal(
  normalizeCampaign({ id: 7, primaryTemplateVersionId: 12 }, [template])
    .templateId,
  "8"
);
console.log(
  "PASS: paths, company isolation, versions, idempotency, pagination, server errors, CSV, IDs and template versions"
);
