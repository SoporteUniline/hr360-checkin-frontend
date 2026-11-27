// Bolsa de trabajo pública: filtros → consulta del API, dirección de la página, sueldo,
// «hace X días», texto plano, paginación y datos estructurados JobPosting. Uso: node --test scripts/test-bolsa-trabajo.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FILTROS_INICIALES, consultaVacantes, filtrosDesdeUrl, urlDeFiltros, filtrosActivos, hayFiltros, cambiarFiltro, quitarFiltro,
  opcionesUbicacion, valorUbicacion, aplicarUbicacion, formatoSueldo, haceCuanto, esNueva, diasDesde, textoPlano,
  ubicacionVacante, paginas, totalPaginas, textoConteo, sueldoEstructurado, jobPostingLd, jsonLdSeguro,
  whatsappDeVacante, etiquetaWhatsApp, apoyoWhatsApp, TEXTO_WHATSAPP,
  vacanteDeUrl, cuantosFiltros, sueldoVacante, distanciaTexto, iniciales, colorLogo, postulaPorWhatsApp, experienciaTexto,
  jornadaVacante, dondeVacante, horasDesde, ubicacionValida, textoSueldoMin,
} from "../src/lib/bolsaTrabajo.mjs";

test("la consulta a /vacantes/filter conserva nombres y orden del contrato", () => {
  // Bolsa v2: lo de antes sin cambios y, al final, el orden (siempre) y solo los filtros nuevos con valor.
  assert.equal(consultaVacantes(FILTROS_INICIALES), "giro=&ciudad=&entidad=&pais=&titulo=&id_empresa=&tipo_contratacion=&page=1&limit=10&orden=recientes");
  assert.equal(
    consultaVacantes({ titulo: "chofer & ayudante", entidad: "Nuevo León", tipo_contratacion: "Becario", id_empresa: 7, page: 3 }),
    "giro=&ciudad=&entidad=Nuevo%20Le%C3%B3n&pais=&titulo=chofer%20%26%20ayudante&id_empresa=7&tipo_contratacion=Becario&page=3&limit=10&orden=recientes",
  );
  assert.match(consultaVacantes({ page: "x" }, 20), /&page=1&limit=20&orden=recientes$/);
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
  // «Nueva» = 48 horas o menos (con solo el día: hoy o ayer).
  assert.equal(esNueva("2026-11-22", ahora), true);
  assert.equal(esNueva("2026-11-21", ahora), false);
  assert.equal(esNueva("2026-11-21 12:30:00", ahora), true, "47.5 h");
  assert.equal(esNueva("2026-11-21 11:30:00", ahora), false, "48.5 h");
  assert.equal(esNueva("2026-11-24 10:00:00", ahora), false, "futura");
  // Horas el mismo día (hora de CDMX guardada sin zona) y un DATE serializado a medianoche cuenta como día.
  assert.equal(haceCuanto("2026-11-23 10:00:00", ahora), "Hace 2 horas");
  assert.equal(haceCuanto("2026-11-23 11:20:00", ahora), "Hace menos de una hora");
  assert.equal(haceCuanto("2026-11-23T17:00:00.000Z", ahora), "Hace 1 hora");
  assert.equal(haceCuanto("2026-11-22 20:00:00", ahora), "Hace 16 horas");
  assert.equal(haceCuanto("2026-11-23T06:00:00.000Z", ahora), "Publicada hoy");
  assert.equal(horasDesde("2026-11-23", ahora), null);
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

test("WhatsApp de la vacante: solo enlaces https://wa.me/<número>; lo demás no se muestra", () => {
  const enlace = "https://wa.me/5215550000000?text=Hola%2C%20me%20interesa%20m%C3%A1s%20informaci%C3%B3n.%20ID%3A%20a1b2c3d4e5f6a1b2c3d4e5f6";
  assert.deepEqual(whatsappDeVacante({ whatsapp: { enlace, asistente: true } }), { enlace, asistente: true });
  assert.deepEqual(whatsappDeVacante({ whatsapp: { enlace } }), { enlace, asistente: false }, "asistente solo si es true");
  assert.deepEqual(whatsappDeVacante({ whatsapp: { enlace, asistente: "true" } }).asistente, false);
  for (const malo of [
    undefined, null, {}, { whatsapp: null }, { whatsapp: {} }, { whatsapp: { enlace: "" } }, { whatsapp: { enlace: 5 } },
    { whatsapp: { enlace: "javascript:alert(1)" } }, { whatsapp: { enlace: "http://wa.me/5215550000000" } },
    { whatsapp: { enlace: "https://wa.me.evil.mx/5215550000000" } }, { whatsapp: { enlace: "https://evil.mx/?wa.me/5215550000000" } },
    { whatsapp: { enlace: "https://wa.me/" } }, { whatsapp: { enlace: "https://wa.me/abc" } }, { whatsapp: { enlace: "https://user@wa.me/5215550000000" } },
    { whatsapp: { enlace: "https://wa.me:8443/5215550000000" } }, { whatsapp: { enlace: "no es url" } },
  ]) assert.equal(whatsappDeVacante(malo), null, JSON.stringify(malo));
});

test("WhatsApp de la vacante: nombre accesible y texto de apoyo", () => {
  assert.equal(TEXTO_WHATSAPP, "Pedir información por WhatsApp");
  assert.equal(etiquetaWhatsApp("  Chofer repartidor "), "Pedir información por WhatsApp sobre la vacante Chofer repartidor (se abre en otra pestaña)");
  assert.equal(etiquetaWhatsApp(""), "Pedir información por WhatsApp (se abre en otra pestaña)");
  assert.equal(apoyoWhatsApp({ asistente: true }), "Te responde nuestro asistente en minutos.");
  assert.equal(apoyoWhatsApp({ asistente: false }), "Te responde el equipo de reclutamiento.");
  assert.equal(apoyoWhatsApp(null), "Te responde el equipo de reclutamiento.");
});

// ——— Bolsa v2 (27/11/2026) ———

test("v2: filtros nuevos ↔ consulta y dirección (valores inválidos descartados; «cerca» y la ubicación nunca en la dirección)", () => {
  const f = { ...FILTROS_INICIALES, orden: "sueldo", sueldo_min: "9000", modalidad: "remoto", jornada: "medio-tiempo", publicada: "3d", whatsapp: "1", sin_experiencia: "1" };
  assert.equal(consultaVacantes(f), "giro=&ciudad=&entidad=&pais=&titulo=&id_empresa=&tipo_contratacion=&page=1&limit=10&orden=sueldo&sueldo_min=9000&modalidad=remoto&jornada=medio-tiempo&publicada=3d&whatsapp=1&sin_experiencia=1");
  assert.equal(urlDeFiltros(f, "cajera-1"), "?orden=sueldo&sueldo=9000&modalidad=remoto&jornada=medio-tiempo&publicada=3d&whatsapp=1&sinexp=1&v=cajera-1");
  assert.deepEqual(filtrosDesdeUrl(urlDeFiltros(f)), f);
  const cerca = { ...FILTROS_INICIALES, orden: "cerca" };
  assert.match(consultaVacantes(cerca, 10, { lat: 20.676543, lng: -103.347891 }), /&orden=cerca&lat=20\.68&lng=-103\.35$/, "redondeada a ~1 km");
  assert.match(consultaVacantes(cerca), /&orden=recientes$/, "sin ubicación: recientes");
  assert.match(consultaVacantes(cerca, 10, { lat: 0, lng: 0 }), /&orden=recientes$/);
  assert.equal(urlDeFiltros(cerca), "");
  assert.equal(filtrosDesdeUrl("?orden=cerca").orden, "");
  const malo = filtrosDesdeUrl("?orden=x&sueldo=9e3&modalidad=luna&jornada=1&publicada=ayer&whatsapp=si&sinexp=2");
  assert.deepEqual([malo.orden, malo.sueldo_min, malo.modalidad, malo.jornada, malo.publicada, malo.whatsapp, malo.sin_experiencia], ["", "", "", "", "", "", ""]);
  assert.equal(vacanteDeUrl("?v=cajera-de-piso-12"), "cajera-de-piso-12");
  assert.equal(vacanteDeUrl("?v=<script>"), "");
  assert.equal(vacanteDeUrl(""), "");
  assert.equal(ubicacionValida({ lat: 20.6, lng: -103.3 }), true);
  assert.equal(ubicacionValida({ lat: 120, lng: 0 }), false);
  assert.equal(ubicacionValida(null), false);
});

test("v2: filtros activos y cuántos cuenta «Filtros»", () => {
  const f = { ...FILTROS_INICIALES, titulo: "cajera", entidad: "Jalisco", sueldo_min: "8000", modalidad: "hibrido", whatsapp: "1", orden: "sueldo" };
  assert.deepEqual(filtrosActivos(f).map((a) => a.etiqueta), ["«cajera»", "Jalisco", "Desde $8,000 al mes", "Mixta (casa y oficina)", "Postúlate por WhatsApp"]);
  assert.equal(cuantosFiltros(f), 4, "sueldo, modalidad, WhatsApp y el orden; no puesto ni lugar");
  assert.equal(cuantosFiltros(FILTROS_INICIALES), 0);
  assert.equal(textoSueldoMin("12000"), "Desde $12,000 al mes");
  assert.equal(textoSueldoMin(""), "");
});

test("v2: sueldo de la tarjeta (publicado en el panel, texto de la vacante o «Sueldo a convenir»)", () => {
  assert.deepEqual(sueldoVacante({ sueldo_desde: "9500.00", sueldo_hasta: "11000.00" }), { texto: "$9,500 a $11,000 al mes", conocido: true });
  assert.deepEqual(sueldoVacante({ sueldo_desde: 10200, sueldo_hasta: null }), { texto: "$10,200 al mes", conocido: true });
  assert.deepEqual(sueldoVacante({ salario: "$9,500 - $11,000 MXN mensuales" }), { texto: "$9,500 - $11,000 al mes", conocido: true });
  assert.deepEqual(sueldoVacante({ salario: "No establecido" }), { texto: "Sueldo a convenir", conocido: false });
  assert.deepEqual(sueldoVacante({}), { texto: "Sueldo a convenir", conocido: false });
});

test("v2: distancia, iniciales, color, WhatsApp con asistente, experiencia, jornada y «Dónde»", () => {
  assert.equal(distanciaTexto(null), "");
  assert.equal(distanciaTexto("0.4"), "a menos de 1 km");
  assert.equal(distanciaTexto(4.04), "a 4 km");
  assert.equal(distanciaTexto(4.36), "a 4.4 km");
  assert.equal(distanciaTexto(123.6), "a 124 km");
  assert.equal(iniciales("Farmacias Lupita"), "FL");
  assert.equal(iniciales("Hotel de la Costa"), "HC");
  assert.equal(iniciales("ádamia"), "Á");
  assert.equal(iniciales(""), "?");
  assert.equal(colorLogo("Farmacias Lupita"), colorLogo("Farmacias Lupita"), "siempre el mismo color");
  assert.match(colorLogo("X"), /^#[0-9A-F]{6}$/);
  const enlace = "https://wa.me/5215550000000?text=Hola";
  assert.deepEqual(postulaPorWhatsApp({ whatsapp: { enlace, asistente: true } }), { enlace, asistente: true });
  assert.equal(postulaPorWhatsApp({ whatsapp: { enlace, asistente: false } }), null, "sin asistente no se postula por WhatsApp");
  assert.equal(postulaPorWhatsApp({ whatsapp: { enlace: "https://evil.mx/1", asistente: true } }), null);
  assert.equal(experienciaTexto({ experiencia: "<p>No necesaria</p>" }), "No necesaria");
  assert.equal(experienciaTexto({ experiencia: "<p>Sin experiencia, te capacitamos</p>" }), "No necesaria");
  assert.equal(experienciaTexto({ experiencia: "<p>1 año en caja</p>" }), "1 año en caja");
  assert.equal(experienciaTexto({}), "");
  assert.equal(jornadaVacante({ tipo_jornada: "Medio tiempo", tipo_contratacion: "Empleado" }), "Medio tiempo");
  assert.equal(jornadaVacante({ tipo_contratacion: "Becario" }), "Becario");
  assert.equal(dondeVacante({ direccion: "Av. Vallarta 1450", ciudad: "Guadalajara", entidad: "Jalisco" }), "Av. Vallarta 1450, Guadalajara, Jalisco");
  assert.equal(dondeVacante({ direccion: "Av. Vallarta 1450, Guadalajara", ciudad: "Guadalajara", entidad: "Jalisco" }), "Av. Vallarta 1450, Guadalajara");
  assert.equal(dondeVacante({ ciudad: "Zapopan", entidad: "Jalisco" }), "Zapopan, Jalisco");
});

test("v2: JobPosting con sueldo publicado, jornada del panel y validThrough (campos que pide Google)", () => {
  const ld = jobPostingLd({ ...VACANTE, salario: "", sueldo_desde: "9500.00", sueldo_hasta: "11000.00", tipo_jornada: "Medio tiempo", tipo_contratacion: "Medio tiempo", tipo_contrato: "", cierra_el: "2026-12-15" }, "https://adamia.mx/vacante/x");
  for (const campo of ["title", "description", "datePosted", "hiringOrganization", "jobLocation"]) assert.ok(ld[campo], `falta ${campo}`);
  assert.deepEqual(ld.baseSalary, { "@type": "MonetaryAmount", currency: "MXN", value: { "@type": "QuantitativeValue", minValue: 9500, maxValue: 11000, unitText: "MONTH" } });
  assert.equal(ld.employmentType, "PART_TIME");
  assert.equal(ld.validThrough, "2026-12-15T23:59:59-06:00");
  assert.equal(ld.jobLocation.address.addressCountry, "MX");
  const sinCierre = jobPostingLd({ ...VACANTE, cierra_el: null });
  assert.equal(sinCierre.validThrough, undefined, "sin fecha de cierre no se inventa");
  assert.equal(jobPostingLd({ ...VACANTE, sueldo_desde: 8000 }).baseSalary.value.value, 8000);
});
