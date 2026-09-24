// Run: node --test scripts/test-directorio-empresas.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Import the actual production module without changing this Next project's module type.
const source = await readFile(
  new URL(
    "../src/app/dashboard/empresas/directorioEmpresas.js",
    import.meta.url
  ),
  "utf8"
);
const { loadCompanyDirectory, indexCompanies, searchCompanies } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const companies = Array.from({ length: 435 }, (_, i) => ({
  id_empresa: i + 1,
  nombre_empresa: `Empresa ${i + 1}`,
  estado: i % 2 ? "Activo" : "Inactivo",
}));
companies[434] = {
  id_empresa: 435,
  nombre_empresa: "Tecnología HR360",
  nombre_duenio: "José León",
  correo_empresa: "contacto@spine.test",
  celular: "+52 (341) 123-4567",
  estado: "Suspendido",
};
const search = (rows, query, status = "Todos", order = "asc") =>
  searchCompanies(indexCompanies(rows), { search: query, status }, order);

for (const cap of [100, 25]) {
  test(`search covers every record with API page size ${cap}`, async () => {
    let active = 0,
      maxActive = 0;
    const calls = [];
    const directory = await loadCompanyDirectory(async (url) => {
      const params = new URL(url, "https://fixture.test").searchParams;
      const page = Number(params.get("page"));
      calls.push(page);
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, page % 3));
      active--;
      return {
        data: companies.slice((page - 1) * cap, page * cap),
        total: String(companies.length),
      };
    });
    assert.deepEqual(directory.data, companies);
    assert.equal(calls.length, Math.ceil(companies.length / cap));
    assert(maxActive <= 3);
    for (const query of [
      "TECNOLOGIA",
      "  leon   jose ",
      "contacto@spine.test",
      "3411234567",
      "+52 341 123 4567",
      "tecnologia jose",
    ]) {
      assert.deepEqual(
        search(directory.data, query).map((c) => c.id_empresa),
        [435],
        query
      );
    }
    assert.deepEqual(
      search(directory.data, "360").map((c) => c.id_empresa),
      [360, 435]
    );
    assert.equal(search(directory.data, "", "Activo").length, 217);
    assert.equal(search(directory.data, "tecnologia", "Activo").length, 0);
    assert.equal(search(directory.data, "sin coincidencias").length, 0);
    assert.deepEqual(
      search(directory.data.slice(0, 15), "", "Todos", "desc")
        .slice(0, 2)
        .map((c) => c.id_empresa),
      [15, 14]
    );
  });
}

test("partial, duplicate or changing pages cannot masquerade as complete search results", async () => {
  for (const second of [
    { data: [], total: 2 },
    { data: [companies[0]], total: 2 },
    { data: [companies[1]], total: 3 },
  ]) {
    let calls = 0;
    await assert.rejects(
      loadCompanyDirectory(async () =>
        ++calls === 1 ? { data: [companies[0]], total: 2 } : second
      )
    );
  }
  let calls = 0;
  await assert.rejects(
    loadCompanyDirectory(async () => {
      if (++calls > 1) throw new Error("Network failure");
      return { data: [companies[0]], total: 2 };
    }),
    /Network failure/
  );
});

test("empty directory is valid; missing or invalid totals are not reported as zero", async () => {
  assert.deepEqual(
    await loadCompanyDirectory(async () => ({ data: [], total: 0 })),
    { data: [], total: 0 }
  );
  for (const total of [undefined, null, "", " ", false, -1, 1.5]) {
    await assert.rejects(
      loadCompanyDirectory(async () => ({ data: [], total }))
    );
  }
  assert.deepEqual(
    search([{ id_empresa: 1, nombre_empresa: null, celular: null }], "foo"),
    []
  );
});
