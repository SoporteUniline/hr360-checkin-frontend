// Regresión (INC-REC-003): la página pública de la vacante pintaba con dangerouslySetInnerHTML el HTML
// que manda el backend (descripción, responsabilidades, escolaridad…). Quien edita una vacante podía ejecutar código
// en el navegador de cada candidato (<img onerror>, <script>, enlaces javascript:). Ahora todo pasa por sanearHtml.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const raiz = new URL("../", import.meta.url).pathname;

test("las vistas de vacante solo insertan HTML saneado", async () => {
  // La vista pública de la vacante se movió a VacanteDetalle.jsx; page.jsx (servidor) solo inserta el JSON-LD.
  for (const archivo of ["src/app/(public)/vacante/[slug]/VacanteDetalle.jsx", "src/app/panel/empleados/DetalleVacante.jsx"]) {
    const texto = await readFile(`${raiz}${archivo}`, "utf8");
    const usos = [...texto.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]+?)\s*\}\}/g)].map((m) => m[1]);
    assert.ok(usos.length > 0, `${archivo} sin HTML insertado`);
    for (const uso of usos) assert.match(uso, /^sanearHtml\(/, `${archivo}: ${uso} sin sanear`);
  }
});

test("la página de servidor de la vacante solo inserta JSON-LD serializado con jsonLdSeguro", async () => {
  const texto = await readFile(`${raiz}src/app/(public)/vacante/[slug]/page.jsx`, "utf8");
  const usos = [...texto.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]+?)\s*\}\}/g)].map((m) => m[1]);
  assert.ok(usos.length > 0);
  for (const uso of usos) assert.match(uso, /^jsonLdSeguro\(/, `page.jsx: ${uso} sin serializar con jsonLdSeguro`);
});

const { sanearHtml: s } = await import("../src/lib/htmlSeguro.mjs").catch(() => ({ sanearHtml: null }));

test("conserva el formato permitido", { skip: !s && "falta src/lib/htmlSeguro.mjs" }, () => {
  assert.equal(s("<p>Hola <strong>mundo</strong></p><ul><li>uno</li><li><em>dos</em></li></ul>"), "<p>Hola <strong>mundo</strong></p><ul><li>uno</li><li><em>dos</em></li></ul>");
  assert.equal(s("<h3>Título</h3><h4>Sub</h4><ol><li><b>b</b> <i>i</i> <u>u</u></li></ol>a<br/>b<BR>c"), "<h3>Título</h3><h4>Sub</h4><ol><li><b>b</b> <i>i</i> <u>u</u></li></ol>a<br>b<br>c");
  assert.equal(s("Sueldo &amp; prestaciones &nbsp;"), "Sueldo &amp; prestaciones &nbsp;");
  assert.equal(s(null), "");
  assert.equal(s(undefined), "");
});

test("quita scripts, eventos y etiquetas no permitidas", { skip: !s && "falta src/lib/htmlSeguro.mjs" }, () => {
  assert.equal(s("<script>alert(1)</script><p>ok</p>"), "<p>ok</p>");
  assert.equal(s('<img src=x onerror="alert(1)">texto'), "texto");
  assert.equal(s('<p onclick="alert(1)" style="color:red" class="x">p</p>'), "<p>p</p>");
  assert.equal(s("<svg onload=alert(1)><circle/></svg>fin"), "fin");
  assert.equal(s('<iframe src="https://mal"></iframe><style>*{}</style><div>dentro</div>'), "dentro");
  assert.equal(s("<SCRIPT >alert(1)</SCRIPT >"), "");
  assert.equal(s("<scr<script>ipt>alert(1)</script>"), "ipt&gt;alert(1)");
  assert.equal(s("<script>sin cerrar"), "");
  assert.equal(s("<!-- <script>alert(1)</script> -->hola"), "hola");
  assert.equal(s('<p title="a>b" onmouseover=alert(1)>x</p>'), "<p>x</p>");
  assert.equal(s("1 < 2 y 3 > 2"), "1 &lt; 2 y 3 &gt; 2");
  assert.equal(s("<p>abierta"), "<p>abierta</p>");
  assert.equal(s("</li></ul>texto</p>"), "texto");
  assert.equal(s("<textarea><img src=x onerror=alert(1)></textarea>"), "");
  assert.equal(s('<math><mi xlink:href="javascript:alert(1)">x</mi></math>'), "");
});

test("enlaces: solo http, https y mailto, con rel y target fijos", { skip: !s && "falta src/lib/htmlSeguro.mjs" }, () => {
  const a = (href) => `<a href="${href}" rel="noopener noreferrer nofollow" target="_blank">`;
  assert.equal(s('<a href="https://adamia.mx/x?a=1&b=2" onclick="x()" target="_self">sitio</a>'), `${a("https://adamia.mx/x?a=1&amp;b=2")}sitio</a>`);
  assert.equal(s("<a href='mailto:rh@x.mx'>correo</a>"), `${a("mailto:rh@x.mx")}correo</a>`);
  assert.equal(s('<a href="javascript:alert(1)">x</a>'), "x");
  assert.equal(s('<a href="JaVaScRiPt:alert(1)">x</a>'), "x");
  assert.equal(s('<a href="&#106;avascript:alert(1)">x</a>'), "x");
  assert.equal(s('<a href="java\tscript:alert(1)">x</a>'), "x");
  assert.equal(s('<a href="javascript&colon;alert(1)">x</a>'), "x");
  assert.equal(s('<a href="data:text/html,<script>alert(1)</script>">x</a>'), "x");
  assert.equal(s('<a href="/relativa">x</a>'), "x");
  assert.equal(s("<a>sin href</a>"), "sin href");
  assert.equal(s('<a href=" https://x.mx/\n">x</a>'), `${a("https://x.mx/")}x</a>`);
  assert.equal(s('<a href="https://x.mx/" "><img src=x onerror=alert(1)>">x</a>'), `${a("https://x.mx/")}"&gt;x</a>`);
});

test("es la misma regla que el backend (utils/htmlSeguro.js)", { skip: !s && "falta src/lib/htmlSeguro.mjs" }, async () => {
  const texto = await readFile(`${raiz}src/lib/htmlSeguro.mjs`, "utf8");
  assert.match(texto, /PERMITIDAS = new Set\(\["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h3", "h4", "a"\]\)/);
});
