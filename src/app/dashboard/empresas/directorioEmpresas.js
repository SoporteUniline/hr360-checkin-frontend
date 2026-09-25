// One shared cache entry for the complete directory, independent of UI pagination.
export const COMPANY_DIRECTORY_KEY = "empresas:directorio";
const BATCH_SIZE = 100;
const CONCURRENT_PAGES = 3;

export async function loadCompanyDirectory(fetchPage) {
  const readPage = async (page) => {
    const result = await fetchPage(
      `/empresas?page=${page}&limit=${BATCH_SIZE}`
    );
    const total = Number(result?.total);
    if (
      !["string", "number"].includes(typeof result?.total) ||
      String(result.total).trim() === "" ||
      !Number.isSafeInteger(total) ||
      total < 0 ||
      !Array.isArray(result?.data)
    )
      throw new Error("No se pudo leer el directorio de empresas.");
    return { data: result.data, total };
  };

  const first = await readPage(1);
  const rows = [...first.data];
  // Respect a smaller page size if the API caps the requested limit.
  const pageSize = first.data.length;
  if (first.total > 0 && pageSize === 0) {
    throw new Error("El directorio está incompleto. Vuelve a cargarlo.");
  }
  const pageCount = pageSize ? Math.ceil(first.total / pageSize) : 1;
  for (let start = 2; start <= pageCount; start += CONCURRENT_PAGES) {
    const pages = await Promise.all(
      Array.from(
        { length: Math.min(CONCURRENT_PAGES, pageCount - start + 1) },
        (_, offset) => readPage(start + offset)
      )
    );
    for (const page of pages) {
      if (page.total !== first.total) {
        throw new Error(
          "El directorio cambió durante la consulta. Actualízalo."
        );
      }
      rows.push(...page.data);
    }
  }
  const ids = new Set(rows.map((row) => String(row.id_empresa ?? "")));
  if (ids.has("") || ids.size !== first.total || rows.length !== first.total) {
    throw new Error("El directorio está incompleto. Vuelve a cargarlo.");
  }
  return { data: rows, total: first.total };
}

export function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function indexCompanies(rows) {
  return rows.map((company) => ({
    company,
    text: normalizeSearch(
      [
        company.nombre_empresa,
        company.nombre_duenio,
        company.correo_empresa,
        company.celular,
        company.giro,
      ]
        .filter(Boolean)
        .join(" ")
    ),
    phone: String(company.celular ?? "").replace(/\D/g, ""),
  }));
}

export function searchCompanies(index, { search, status }, order = "asc") {
  const query = normalizeSearch(search);
  const terms = query.split(/\s+/).filter(Boolean);
  const phone = /^[+\d\s().-]+$/.test(query) ? query.replace(/\D/g, "") : "";
  return index
    .filter(
      (entry) =>
        (status === "Todos" || entry.company.estado === status) &&
        (terms.every((term) => entry.text.includes(term)) ||
          (phone && entry.phone.includes(phone)))
    )
    .map((entry) => entry.company)
    .sort(
      (a, b) =>
        (order === "desc" ? -1 : 1) *
          String(a.nombre_empresa ?? "").localeCompare(
            String(b.nombre_empresa ?? ""),
            "es",
            { sensitivity: "base", numeric: true }
          ) ||
        String(a.id_empresa).localeCompare(String(b.id_empresa), "es", {
          numeric: true,
        })
    );
}
