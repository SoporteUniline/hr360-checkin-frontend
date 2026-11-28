// Reglas del sistema de diseño que se revisan en el navegador (28/11/2026; docs/sistema-diseno.md). Las usan
// scripts/verify-diseno.mjs, verify-contratos.mjs, verify-permiso-acta-pagina.mjs y verify-prestamos.mjs.
//
// (28/11/2026, mockup v3 aprobado) En ESCRITORIO (≥ 1024 px) los botones y campos bajaron porque se usan con el mouse:
//   botón ≥ 38 px (el de solo ícono ≥ 36), campo ≥ 42 px, letra de 16 px (la etiqueta del campo, el texto de los
//   botones y de las pestañas, y lo marcado data-chico pueden ser de 15).
// En CELULAR (< 1024 px) se queda como antes, porque se tocan con el dedo: botón ≥ 48 px, letra de 17 px (lo marcado
//   data-chico, 15). Campos ≥ 48 px.
// (28/11/2026) Campos «en línea» (solo línea abajo, el contrato; data-variante="linea"): ≥ 40 px en escritorio (el dueño
//   pidió 36–40) y ≥ 48 en celular.
// En las dos: títulos en 700, sin degradados, grises no más claros que #4B5563 y sin desborde horizontal.
import assert from "node:assert/strict";

/** Medidas mínimas (px) según el ancho. Las usan también las pruebas que revisan un botón o un campo suelto. */
export const MINIMOS = {
  escritorio: { boton: 38, icono: 36, campo: 42, campoLinea: 40, principal: 38, letra: 16, letraControl: 15, chico: 15 },
  movil: { boton: 48, icono: 44, campo: 48, campoLinea: 48, principal: 56, letra: 17, letraControl: 17, chico: 15 },
};
export const minimos = (movil) => (movil ? MINIMOS.movil : MINIMOS.escritorio);

export async function revisarDiseno(page, movil, donde, raizSelector = "[data-vista]") {
  const r = await page.evaluate(({ m, raizSelector }) => {
    const raiz = document.querySelector(raizSelector) ?? document.body;
    const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const LIMITE_GRIS = lum([75, 85, 99]); // #4B5563
    const chicos = []; const botones = []; const campos = []; const titulos = []; const degradados = []; const grises = [];
    for (const el of raiz.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const s = getComputedStyle(el);
      if (/gradient/.test(s.backgroundImage)) degradados.push(el.tagName);
      const tieneTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      // Pueden ser de 15 px: lo marcado data-chico (ayuda, ruta, etiquetas de estado), la ayuda y el error de los
      // campos de shadcn (form-description / form-message, 15 px en escritorio como el mockup). Los encabezados de tabla
      // (th) siguen la regla global de tablas de globals.css (12.5 px) y no se revisan aquí.
      if (el.closest("th")) continue;
      const chico = el.closest("[data-chico], [data-slot='form-description'], [data-slot='form-message']");
      // Etiquetas de campo (<label> o con la clase text-etiqueta), botones y pestañas: 15 px en escritorio (mockup v3);
      // en celular, como el texto normal.
      const control = el.closest("label, .text-etiqueta, [data-slot='form-label'], [data-slot='label'], button, [role=tab], [data-slot='button']");
      const minimo = chico ? m.chico : control ? m.letraControl : m.letra;
      if (tieneTexto && parseFloat(s.fontSize) < minimo) chicos.push(`${el.tagName} ${parseFloat(s.fontSize)}px «${el.textContent.trim().slice(0, 40)}»${chico ? " (data-chico)" : control ? " (etiqueta o botón)" : ""} · mínimo ${minimo}`);
      // Botones de acción. No cuentan los de renglones de tabla, la X de las ventanas (se revisa aparte) ni los
      // interruptores y casillas. El de solo ícono (size="icon") puede ser un poco menor.
      const alto = el.getBoundingClientRect().height;
      if (el.tagName === "BUTTON" && !el.closest("table") && !el.matches("[role=switch], [role=checkbox], [role=radio], [aria-label='Cerrar']")) {
        const min = el.dataset.tamano === "icon" ? m.icono : m.boton;
        if (alto < min - 0.5) botones.push(`«${(el.textContent.trim() || el.getAttribute("aria-label") || "").slice(0, 30)}» ${Math.round(alto)}px (mínimo ${min})`);
      }
      // Campos: input, select y los disparadores marcados data-control="campo" (no casillas ni campos compactos, ni el
      // <select> escondido que Radix pone junto a su lista para los formularios: aria-hidden y de 1 px).
      const oculto = el.closest("[aria-hidden=true]") || el.getBoundingClientRect().width <= 2;
      const esCampo = !oculto && el.matches("input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=hidden]):not([type=color]), select, [data-control='campo']:not(textarea)");
      const minCampo = el.matches("[data-variante='linea']") ? m.campoLinea : m.campo;
      if (esCampo && !el.closest("table, [data-compacto]") && !el.matches("[data-compacto]") && alto < minCampo - 0.5) {
        campos.push(`${el.tagName} #${el.id || el.getAttribute("name") || "?"} ${Math.round(alto)}px (mínimo ${minCampo})`);
      }
      if (/^H[1-3]$/.test(el.tagName) && Number(s.fontWeight) !== 700) titulos.push(`${el.tagName} ${s.fontWeight} «${el.textContent.trim().slice(0, 30)}»`);
      if (tieneTexto && !el.closest("button,[disabled],[data-estado]")) {
        const c = rgb(s.color);
        const gris = Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3)) < 40;
        const l = lum(c);
        if (gris && l > LIMITE_GRIS + 0.002 && l < 0.85) grises.push(`${el.tagName} ${s.color} «${el.textContent.trim().slice(0, 30)}»`);
      }
    }
    return { chicos, botones, campos, titulos, degradados, grises, doc: document.documentElement.scrollWidth, ventana: window.innerWidth };
  }, { m: minimos(movil), raizSelector });
  const m = minimos(movil);
  assert.deepEqual(r.chicos, [], `${donde}: letra chica`);
  assert.deepEqual(r.botones, [], `${donde}: botones de menos de ${m.boton} px`);
  assert.deepEqual(r.campos, [], `${donde}: campos de menos de ${m.campo} px`);
  assert.deepEqual(r.titulos, [], `${donde}: títulos que no son 700`);
  assert.deepEqual(r.degradados, [], `${donde}: fondos degradados`);
  assert.deepEqual(r.grises, [], `${donde}: texto gris más claro que #4B5563`);
  assert.ok(r.doc <= r.ventana + 1, `${donde}: desborde horizontal (${r.doc} > ${r.ventana})`);
}
