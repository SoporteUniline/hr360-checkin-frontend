// Reglas del sistema de diseño que se revisan en el navegador (28/11/2026; docs/sistema-diseno.md). Las usan
// scripts/verify-diseno.mjs y scripts/verify-permiso-acta-pagina.mjs: letra de 16/17 px (lo marcado data-chico, 15/16),
// botones de 48 px, títulos en 700, sin degradados, grises no más claros que #4B5563 y sin desborde horizontal.
import assert from "node:assert/strict";

export async function revisarDiseno(page, movil, donde, raizSelector = "[data-vista]") {
  const r = await page.evaluate(({ minimo, raizSelector }) => {
    const raiz = document.querySelector(raizSelector) ?? document.body;
    const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const LIMITE_GRIS = lum([75, 85, 99]); // #4B5563
    const chicos = []; const botones = []; const titulos = []; const degradados = []; const grises = [];
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
      if (tieneTexto && !chico && parseFloat(s.fontSize) < minimo) chicos.push(`${el.tagName} ${parseFloat(s.fontSize)}px «${el.textContent.trim().slice(0, 40)}»`);
      if (tieneTexto && chico && parseFloat(s.fontSize) < 15) chicos.push(`${el.tagName} ${parseFloat(s.fontSize)}px «${el.textContent.trim().slice(0, 40)}» (data-chico, mínimo 15)`);
      // Botones de acción: ≥ 48 px. No cuentan los de renglones de tabla (44 px), la X de las ventanas (44 px, se
      // revisa aparte) ni los interruptores y casillas.
      if (el.tagName === "BUTTON" && !el.closest("table") && !el.matches("[role=switch], [role=checkbox], [role=radio], [aria-label='Cerrar']") && el.getBoundingClientRect().height < 47.5) botones.push(`«${(el.textContent.trim() || el.getAttribute("aria-label") || "").slice(0, 30)}» ${Math.round(el.getBoundingClientRect().height)}px`);
      if (/^H[1-3]$/.test(el.tagName) && Number(s.fontWeight) !== 700) titulos.push(`${el.tagName} ${s.fontWeight} «${el.textContent.trim().slice(0, 30)}»`);
      if (tieneTexto && !el.closest("button,[disabled],[data-estado]")) {
        const c = rgb(s.color);
        const gris = Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3)) < 40;
        const l = lum(c);
        if (gris && l > LIMITE_GRIS + 0.002 && l < 0.85) grises.push(`${el.tagName} ${s.color} «${el.textContent.trim().slice(0, 30)}»`);
      }
    }
    return { chicos, botones, titulos, degradados, grises, doc: document.documentElement.scrollWidth, ventana: window.innerWidth };
  }, { minimo: movil ? 17 : 16, raizSelector });
  assert.deepEqual(r.chicos, [], `${donde}: letra chica`);
  assert.deepEqual(r.botones, [], `${donde}: botones de menos de 48 px`);
  assert.deepEqual(r.titulos, [], `${donde}: títulos que no son 700`);
  assert.deepEqual(r.degradados, [], `${donde}: fondos degradados`);
  assert.deepEqual(r.grises, [], `${donde}: texto gris más claro que #4B5563`);
  assert.ok(r.doc <= r.ventana + 1, `${donde}: desborde horizontal (${r.doc} > ${r.ventana})`);
}
