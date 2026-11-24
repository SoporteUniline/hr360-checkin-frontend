// Bolsa de trabajo pública: filtros → consulta del API, dirección de la página, sueldo,
// «hace X días», texto plano, paginación y datos estructurados JobPosting. Uso: node --test scripts/test-bolsa-trabajo.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FILTROS_INICIALES, consultaVacantes, filtrosDesdeUrl, urlDeFiltros, filtrosActivos, hayFiltros, cambiarFiltro, quitarFiltro,
  opcionesUbicacion, valorUbicacion, aplicarUbicacion, formatoSueldo, haceCuanto, esNueva, diasDesde, textoPlano,
  ubicacionVacante, paginas, totalPaginas, textoConteo, sueldoEstructurado, jobPostingLd, jsonLdSeguro,
} from "../src/lib/bolsaTrabajo.mjs";

test("la consulta a /vacantes/filter conserva nombres y orden del contrato", () => {
  assert.equal(consultaVacantes(FILTROS_INICIALES), "giro=&ciudad=&entidad=&pais=&titulo=&id_empresa=&tipo_contratacion=&page=1&limit=10");
  assert.equal(
    consultaVacantes({ titulo: "chofer & ayudante", entidad: "Nuevo León", tipo_contratacion: "Becario", id_empresa: 7, page: 3 }),
    "giro=&ciudad=&entidad=Nuevo%20Le%C3%B3n&pais=&titulo=chofer%20%26%20ayudante&id_empresa=7&tipo_contratacion=Becario&page=3&limit=10",
  );
  assert.match(consultaVacantes({ page: "x" }, 20), /&page=1&limit=20$/);
});

test("filtros ↔ dirección de la página (ida y vuelta, valores inválidos descartados)", () => {
  const f = { ...FILTROS_INICIALES, titulo: "cajera", ciudad: "Zapopan", tipo_contratacion: "Practicante", id_empresa: "12", page: 2 };
  assert.equal(urlDeFiltros(f), "?q=cajera&ciudad=Zapopan&tipo=Practicante&empresa=12&pagina=2");
  assert.deepEqual(filtrosDesdeUrl(urlDeFiltros(f)), f);
  assert.equal(urlDeFiltros(FILTROS_INICIALES), "");
  const malo = filtrosDesdeUrl("?tipo=Director&empresa=1;drop&pagina=-4&q=%20mesero%20");
  assert.deepEqual([malo.tipo_contratacion, malo.id_empresa, malo.page, malo.titulo], ["", "", 1, "mesero"]);
});

test("filtros activos, cambiar y quitar vuelven a la página 1", () => {
  const f = cambiarFiltro({ ...FILTROS_INICIALES, page: 4 }, "giro", "Logística");
  assert.equal(f.page, 1);
  assert.equal(hayFiltros(FILTROS_INICIALES), false);
  const g = { ...f, titulo: "chofer", id_empresa: "9", page: 3 };
  assert.deepEqual(filtrosActivos(g, { 9: "Empacadora del Norte" }).map((x) => x.etiqueta), ["«chofer»", "Logística", "Empacadora del Norte"]);
  assert.equal(filtrosActivos({ id_empresa: "5" })[0].etiqueta, "Empresa elegida");
  const sin = quitarFiltro(g, "titulo");
  assert.deepEqual([sin.titulo, sin.page, sin.giro], ["", 1, "Logística"]);
});

test("un solo selector de ubicación para estado o ciudad", () => {
  const o = opcionesUbicacion(["Jalisco", "Aguascalientes", "Jalisco", ""], ["Zapopan", " Autlán "]);
  assert.deepEqual(o.estados.map((x) => x.valor), ["estado:Aguascalientes", "estado:Jalisco"]);
  assert.deepEqual(o.ciudades.map((x) => x.texto), ["Autlán", "Zapopan"]);
  const a = aplicarUbicacion({ ...FILTROS_INICIALES, ciudad: "Zapopan", page: 5 }, "estado:Jalisco");
  assert.deepEqual([a.entidad, a.ciudad, a.page], ["Jalisco", "", 1]);
  assert.equal(valorUbicacion(a), "estado:Jalisco");
  const c = aplicarUbicacion(a, "ciudad:Zapopan");
  assert.deepEqual([c.entidad, c.ciudad, valorUbicacion(c)], ["", "Zapopan", "ciudad:Zapopan"]);
  assert.deepEqual([aplicarUbicacion(c, "").ciudad, valorUbicacion(FILTROS_INICIALES)], ["", ""]);
});

test("formato de sueldo", () => {
  assert.equal(formatoSueldo("12000"), "$12,000");
  assert.equal(formatoSueldo("$9,500.00"), "$9,500");
  assert.equal(formatoSueldo("10000 - 14000"), "$10,000 a $14,000");
  assert.equal(formatoSueldo("8,000 a 9,000 MXN"), "$8,000 a $9,000");
  assert.equal(formatoSueldo("$9,000 mensuales + bonos"), "$9,000 mensuales + bonos");
  assert.equal(formatoSueldo("A convenir"), "A convenir");
  for (const nada of [null, undefined, "", " ", "0", "No establecido", "N/A", "-"]) assert.equal(formatoSueldo(nada), null, String(nada));
  assert.equal(formatoSueldo("x".repeat(100)).length, 80);
});

test("hace cuánto se publicó (calendario de la Ciudad de México)", () => {
  const ahora = new Date("2026-11-23T18:00:00Z"); // 12:00 en CDMX
  assert.equal(haceCuanto("2026-11-23", ahora), "Publicada hoy");
  assert.equal(haceCuanto("2026-11-22T06:00:00.000Z", ahora), "Publicada ayer"); // DATE de MySQL serializado en UTC
  assert.equal(haceCuanto("2026-11-20 10:00:00", ahora), "Hace 3 días");
  assert.equal(haceCuanto("2026-11-16", ahora), "Hace 1 semana");
  assert.equal(haceCuanto("2026-11-02", ahora), "Hace 3 semanas");
  assert.equal(haceCuanto("2026-10-20", ahora), "Hace 1 mes");
  assert.equal(haceCuanto("2026-06-01", ahora), "Hace 5 meses");
  assert.equal(haceCuanto("2024-01-01", ahora), "Hace más de un año");
  assert.equal(haceCuanto("2026-12-01", ahora), "");
  assert.equal(haceCuanto("no es fecha", ahora), "");
  assert.equal(haceCuanto(null, ahora), "");
  // A las 23:30 de CDMX (05:30 UTC del día siguiente) sigue siendo «hoy» en México.
  assert.equal(diasDesde("2026-11-23", new Date("2026-11-24T05:30:00Z")), 0);
  assert.equal(esNueva("2026-11-21", ahora), true);
  assert.equal(esNueva("2026-11-20", ahora), false);
});

test("texto plano sin ejecutar HTML", () => {
  assert.equal(textoPlano("<p>Buscamos <strong>chofer</strong>&nbsp;con licencia.</p><ul><li>Uno</li><li>Dos</li></ul>"), "Buscamos chofer con licencia. Uno Dos");
  assert.equal(textoPlano('<img src=x onerror="alert(1)">Hola<script>alert(2)</script>'), "Hola");
  assert.equal(textoPlano("Se&ntilde;or &amp; se&#241;ora &#x2014; &iquest;listo?"), "Señor & señora — ¿listo?");
  assert.equal(textoPlano("uno dos tres cuatro cinco seis", 16), "uno dos tres…");
  assert.equal(textoPlano(null), "");
});

test("ubicación de la vacante", () => {
  assert.equal(ubicacionVacante({ ciudad: "Zapopan", entidad: "Jalisco" }), "Zapopan, Jalisco");
  assert.equal(ubicacionVacante({ ciudad: "Aguascalientes", entidad: "aguascalientes" }), "Aguascalientes");
  assert.equal(ubicacionVacante({ pais: "México" }), "México");
  assert.equal(ubicacionVacante({}), "");
});

test("paginación", () => {
  assert.equal(totalPaginas(0), 1);
  assert.equal(totalPaginas(31, 10), 4);
  assert.deepEqual(paginas(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(paginas(1, 12), [1, 2, 3, 4, "…", 12]);
  assert.deepEqual(paginas(6, 12), [1, "…", 5, 6, 7, "…", 12]);
  assert.deepEqual(paginas(12, 12), [1, "…", 9, 10, 11, 12]);
  assert.deepEqual(paginas(99, 3), [1, 2, 3]);
});

test("conteo de vacantes", () => {
  assert.equal(textoConteo(0, false), "0 vacantes abiertas");
  assert.equal(textoConteo(1, false), "1 vacante abierta");
  assert.equal(textoConteo(1250, false), "1,250 vacantes abiertas");
  assert.equal(textoConteo(1, true), "1 vacante con tu búsqueda");
  assert.equal(textoConteo(7, true), "7 vacantes con tu búsqueda");
});

const VACANTE = {
  titulo: "Chofer repartidor", descripcion: "<p>Reparte <b>pedidos</b> en la zona centro.</p>", responsabilidades: "<ul><li>Cargar unidad</li></ul>",
  fecha_publicacion: "2026-11-20T06:00:00.000Z", nombre_empresa: "Empacadora del Norte", url_imagen: "https://hr360-redlab.s3.us-west-1.amazonaws.com/logo.png",
  ciudad: "Monterrey", entidad: "Nuevo León", pais: "México", direccion: "Av. Constitución 100", modalidad: "Presencial",
  tipo_contrato: "Tiempo completo", tipo_contratacion: "Empleado", salario: "$12,000 a $14,000 mensuales",
};

test("sueldo estructurado solo cuando es inequívoco", () => {
  assert.deepEqual(sueldoEstructurado("$12,000 a $14,000 mensuales"), { "@type": "MonetaryAmount", currency: "MXN", value: { "@type": "QuantitativeValue", minValue: 12000, maxValue: 14000, unitText: "MONTH" } });
  assert.deepEqual(sueldoEstructurado("2,500 por semana").value, { "@type": "QuantitativeValue", value: 2500, unitText: "WEEK" });
  assert.equal(sueldoEstructurado("12000"), null, "sin periodo no se inventa");
  assert.equal(sueldoEstructurado("A convenir"), null);
  assert.equal(sueldoEstructurado("No establecido"), null);
});

test("JobPosting con los datos de la vacante", () => {
  const ld = jobPostingLd(VACANTE, "https://adamia.mx/vacante/chofer");
  assert.equal(ld["@type"], "JobPosting");
  assert.equal(ld.title, "Chofer repartidor");
  assert.equal(ld.description, "Reparte pedidos en la zona centro. Cargar unidad");
  assert.equal(ld.datePosted, "2026-11-20");
  assert.equal(ld.employmentType, "FULL_TIME");
  assert.deepEqual(ld.hiringOrganization, { "@type": "Organization", name: "Empacadora del Norte", logo: VACANTE.url_imagen });
  assert.deepEqual(ld.jobLocation.address, { "@type": "PostalAddress", streetAddress: "Av. Constitución 100", addressLocality: "Monterrey", addressRegion: "Nuevo León", addressCountry: "MX" });
  assert.equal(ld.baseSalary.value.unitText, "MONTH");
  assert.equal(ld.url, "https://adamia.mx/vacante/chofer");
  assert.equal(ld.jobLocationType, undefined);
  const remota = jobPostingLd({ ...VACANTE, modalidad: "Remoto", tipo_contratacion: "Becario", salario: "A convenir" });
  assert.equal(remota.jobLocationType, "TELECOMMUTE");
  assert.deepEqual(remota.employmentType, ["INTERN", "FULL_TIME"]);
  assert.equal(remota.baseSalary, undefined);
  assert.equal(jobPostingLd({ ...VACANTE, descripcion: "", responsabilidades: "" }), null, "sin descripción no hay JobPosting");
  assert.equal(jobPostingLd({ ...VACANTE, fecha_publicacion: null }), null);
  assert.equal(jobPostingLd(null), null);
});

test("el JSON-LD no puede cerrar la etiqueta <script>", () => {
  const s = jsonLdSeguro({ t: "</script><script>alert(1)</script> & \u2028" });
  assert.doesNotMatch(s, /<|>|&|\u2028/);
  assert.deepEqual(JSON.parse(s), { t: "</script><script>alert(1)</script> & \u2028" });
});
