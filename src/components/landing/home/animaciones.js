// Animaciones de la página de inicio (demo sincronizada, checada facial con GPS, reporte semanal,
// números y gráficas en vivo). Es la misma lógica del diseño aprobado, escrita sin dependencias.
// iniciarAnimaciones(raiz) arranca todo y devuelve la función que lo detiene: temporizadores,
// observadores y escuchas se registran aquí para limpiarse cuando React desmonta la página.
// Respeta «reducir movimiento» del sistema operativo (todo queda en su estado final).

export function iniciarAnimaciones(raiz) {
  if (!raiz) return undefined;
  const timers = new Set();
  const intervalos = new Set();
  const observadores = [];
  const escuchas = [];
  function setTimeout(fn, ms) { const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
  function clearTimeout(id) { window.clearTimeout(id); timers.delete(id); }
  function setInterval(fn, ms) { const id = window.setInterval(fn, ms); intervalos.add(id); return id; }
  function clearInterval(id) { window.clearInterval(id); intervalos.delete(id); }
  function observa(cb, opciones) { const o = new IntersectionObserver(cb, opciones); observadores.push(o); return o; }
  function escucha(el, tipo, fn, opciones) { el.addEventListener(tipo, fn, opciones); escuchas.push([el, tipo, fn, opciones]); }

var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var $ = function (id) { return document.getElementById(id); };
function despues(fn, ms) { setTimeout(fn, quieto ? 0 : ms); }


// ===== Portada: un solo guion mueve el celular y el panel (así nunca se desfasan) =====
var gente = [
  ["Ana Torres", "Planta Empaque", "08:58", "Presente"],
  ["Raúl Pérez", "Planta Empaque", "09:07", "Retardo"],
  ["Karla Romero", "Planta Empaque", "08:59", "Presente"]
];
var scr = $("h-scr"), btn = $("h-btn"), pill = $("h-pill"), rows = $("h-rows"), pres = $("k-pres"), presN = $("k-pres-n"), falta = $("k-falta");
var filasBase = rows.innerHTML, idx = 0;
// Rostro (malla facial) → GPS (el pin cae dentro de la geocerca) → registro → el panel lo recibe.
var distancias = [38, 61, 24];
function paso3(cual) { scr.querySelectorAll(".steps3 li").forEach(function (li) { var orden = ["cara", "gps", "ok"], i = orden.indexOf(li.dataset.s), j = orden.indexOf(cual); li.className = i < j ? "ok" : i === j ? "act" : ""; }); }
function checada() {
  var p = gente[idx % gente.length], dist = distancias[idx % gente.length];
  if (idx % gente.length === 0) { rows.innerHTML = filasBase; presN.textContent = "21"; falta.textContent = "3"; }
  idx++;
  scr.classList.remove("scanning", "mesh-on", "det", "gps", "done"); $("h-sbar").textContent = p[2]; paso3("cara");
  $("h-scan-txt").textContent = "Buscando rostro…"; $("h-dist").textContent = "140";
  despues(function () { btn.classList.add("tap"); }, 500);
  despues(function () { btn.classList.remove("tap"); scr.classList.add("scanning"); }, 750);
  despues(function () { scr.classList.add("mesh-on"); $("h-scan-txt").textContent = "Analizando rostro…"; }, 1400);
  despues(function () { scr.classList.add("det"); $("h-scan-txt").textContent = "Rostro verificado ✓"; }, 2500);
  despues(function () {
    scr.classList.add("gps"); paso3("gps"); $("h-scan-txt").textContent = "Validando ubicación…";
    var el = $("h-dist"), t0 = null;
    if (quieto) { el.textContent = dist; return; }
    requestAnimationFrame(function cuenta(t) { if (!t0) t0 = t; var q = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(140 - (140 - dist) * (1 - Math.pow(1 - q, 3))); if (q < 1) requestAnimationFrame(cuenta); });
  }, 3200);
  despues(function () {
    scr.classList.remove("gps"); scr.classList.add("done"); paso3("ok"); $("h-scan-txt").textContent = "Dentro de la geocerca ✓";
    $("h-ok-who").textContent = "Entrada registrada · " + p[0]; $("h-ok-h").textContent = p[2];
    scr.querySelector(".okcard .chk:last-child span").textContent = "Dentro de la geocerca · " + dist + " m de 100 m";
    pill.classList.add("go");
  }, 4700);
  despues(function () {
    pill.classList.remove("go");
    var r = document.createElement("div"); r.className = "trow nueva";
    r.innerHTML = "<b>" + p[0] + '</b><span class="s">' + p[1] + "</span><span>" + p[2] + '</span><span class="sal">—</span><span class="st' + (p[3] === "Retardo" ? " late" : "") + '">' + p[3] + "</span>";
    rows.insertBefore(r, rows.firstChild);
    if (rows.children.length > 6) rows.removeChild(rows.lastChild);
    presN.textContent = +presN.textContent + 1; falta.textContent = Math.max(0, +falta.textContent - 1);
    pres.classList.add("flash"); despues(function () { pres.classList.remove("flash"); }, 900);
  }, 5300);
}
checada(); if (!quieto) setInterval(checada, 8200);

// ===== Métodos de checada: Rostro · QR · Código · GPS =====
var qr = $("qr"), cel = "", semilla = 11;
for (var k = 0; k < 81; k++) {
  semilla = (semilla * 9301 + 49297) % 233280;
  var x = k % 9, y = Math.floor(k / 9), esq = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
  cel += '<i class="' + (esq ? ((x % 3 === 1 && y % 3 === 1) ? "" : (x % 3 === 1 || y % 3 === 1) ? "w" : "") : (semilla / 233280 > .5 ? "" : "w")) + '"></i>';
}
qr.innerHTML = cel;
var modos = document.querySelectorAll(".modes"), tags = $("m-tags").children, m = 0;
if (!quieto) setInterval(function () {
  m = (m + 1) % 4;
  modos.forEach(function (el, j) { el.classList.toggle("on", j === m); });
  Array.prototype.forEach.call(tags, function (t, j) { t.classList.toggle("on", j === m); });
}, 2600);

// ===== WhatsApp: llega la solicitud, el jefe aprueba, ADAMIA lo registra =====
function wa() {
  $("wa-n").classList.remove("vis"); $("wa-res").classList.remove("vis"); $("wa-ap").classList.remove("tap");
  despues(function () { $("wa-n").classList.add("vis"); }, 500);
  despues(function () { $("wa-ap").classList.add("tap"); }, 2300);
  despues(function () { $("wa-ap").classList.remove("tap"); $("wa-n").classList.remove("vis"); $("wa-res").classList.add("vis"); }, 2700);
}

// ===== Contratos: se llenan los registros y se firma el contrato =====
var docsData = [["Contrato · Ana Torres", "Firmado", ""], ["Contrato · Raúl Pérez", "Firmado", ""], ["Acta administrativa · J. Ruiz", "En revisión", "p"], ["Contrato · Karla Romero", "Firmado", ""], ["Constancia laboral · R. Vega", "Emitida", ""]];
function docs() {
  var d = $("docs"); d.innerHTML = "<h5>Contratos</h5>"; $("paper").classList.remove("sign");
  docsData.forEach(function (x, j) {
    despues(function () {
      var e = document.createElement("div"); e.className = "ldoc"; e.style.animation = "lh-linea .5s var(--ease) both";
      e.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 3H6v18h12V9z"/><path d="M14 3v6h6"/></svg><span>' + x[0] + '</span><em class="' + x[2] + '">' + x[1] + "</em>";
      d.appendChild(e);
    }, 300 + j * 280);
  });
  despues(function () { $("paper").classList.add("sign"); }, 1900);
}

// ===== Mi espacio: el saldo de vacaciones cuenta hasta 12 =====
function vac() { var n = 0, el = $("vac-n"); (function paso() { el.textContent = n; if (n++ < 12) despues(paso, 60); })(); }


// ===== Vida: números que cuentan, gráficas en vivo y fotos con profundidad =====
// Número animado de su valor actual al nuevo (en la primera vista, desde 0).
function fmtNum(v, fmt, dec) {
  if (fmt === "h") { var h = Math.floor(v + 1e-6), m = Math.round((v - h) * 60); if (m === 60) { h++; m = 0; } return h + " h" + (m ? " " + m + " min" : ""); }
  if (fmt === "%") return Math.round(v) + " %";
  if (fmt === "mxn") { var c = Math.round(v * 100) / 100; return "$" + c.toLocaleString("es-MX", { minimumFractionDigits: c % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  return dec ? v.toFixed(1) : String(Math.round(v));
}
function anima(el, a, b, ms) {
  var fmt = el.dataset.fmt || "", dec = (+el.dataset.to) % 1 ? 1 : 0, t0 = null; el._v = b;
  if (quieto) { el.textContent = fmtNum(b, fmt, dec); return; }
  requestAnimationFrame(function paso(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / (ms || 1500)), e = 1 - Math.pow(1 - p, 3); el.textContent = fmtNum(a + (b - a) * e, fmt, dec); if (p < 1) requestAnimationFrame(paso); });
}
function desdeCero(cont) { cont.querySelectorAll("[data-to]").forEach(function (el) { anima(el, 0, +el.dataset.to, 1600); }); }
// Lo que empieza fuera de la pantalla arranca en 0 (lo visible al cargar ya está completo).
document.querySelectorAll("[data-to]").forEach(function (el) {
  var arriba = el.getBoundingClientRect().top < window.innerHeight;
  el._v = arriba || quieto ? +el.dataset.to : 0;
  el.textContent = fmtNum(el._v, el.dataset.fmt || "", (+el.dataset.to) % 1 ? 1 : 0);
});

// Tarjetas sobre las fotos: aparecen una tras otra y se repiten.
function tarjetas(cont) {
  var cs = cont.querySelectorAll(".float-card");
  cs.forEach(function (c) { c.classList.remove("vis"); });
  cs.forEach(function (c, j) { despues(function () { c.classList.add("vis"); }, 300 + j * 650); });
}

// Horas extra: las barras cambian como una semana en curso y las cifras se recalculan.
var hxb = $("hx-block"), barras = hxb.querySelectorAll(".bars .b");
var semanaBase = [[40, 0], [40, 0], [45, 10], [30, 15], [25, 20], [12, 0], [0, 0]];
function pintaSemana(sem) {
  barras.forEach(function (b, k) { b.querySelector(".d").style.setProperty("--d", sem[k][0] + "%"); b.querySelector(".t").style.setProperty("--t", sem[k][1] + "%"); });
  // Escala de la gráfica: 17.5 % de altura = 1 h. Alerta de ley = día con 15 % o más al triple.
  var horas = Math.round(sem.reduce(function (s, x) { return s + (x[0] + x[1]) / 17.5; }, 0) * 2) / 2, doble = Math.min(9, horas), alertas = sem.filter(function (x) { return x[1] >= 15; }).length;
  var st = hxb.querySelectorAll(".stats b");
  anima(st[0], st[0]._v || 0, horas, 1100); anima(st[1], st[1]._v || 0, doble, 1100); anima(st[2], st[2]._v || 0, horas - doble, 1100); anima(st[3], st[3]._v || 0, alertas, 900);
}
function semanaNueva() {
  return semanaBase.map(function (x, k) { if (k === 6) return [0, 0]; var d = Math.max(5, Math.min(48, x[0] + Math.round((Math.random() - .5) * 20))); var t = x[1] ? Math.max(0, x[1] + Math.round((Math.random() - .5) * 12)) : 0; return [d, t]; });
}

// Indicadores: línea que recibe puntos nuevos, dona que se vuelve a dibujar y cifras en vivo.
var nb = $("num-block"), ln = nb.querySelector(".ln"), ar = nb.querySelector(".ar"), pts = [120, 96, 84, 90, 78, 132, 150, 104, 88, 70, 76, 60, 120, 144, 98];
var punto = document.createElementNS("http://www.w3.org/2000/svg", "circle"); punto.setAttribute("r", "5"); punto.setAttribute("class", "pt"); nb.querySelector(".line-svg").appendChild(punto);
function trazo(arr) { return arr.map(function (y, i) { return (i ? "L" : "M") + (10 + i * 500 / (arr.length - 1)).toFixed(1) + " " + y.toFixed(1); }).join(" "); }
function pintaLinea(arr) { var d = trazo(arr); ln.setAttribute("d", d); ar.setAttribute("d", d + " L510 170 L10 170 Z"); punto.setAttribute("cx", 510); punto.setAttribute("cy", arr[arr.length - 1]); }
function lineaAvanza() {
  var nuevo = Math.max(55, Math.min(150, pts[pts.length - 1] + (Math.random() - .5) * 60)), de = pts.slice(), a = pts.slice(1).concat(nuevo), t0 = null;
  ln.style.transition = "none"; ln.style.strokeDashoffset = 0;
  requestAnimationFrame(function paso(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - p, 3); pintaLinea(de.map(function (y, i) { return y + (a[i] - y) * e; })); if (p < 1) requestAnimationFrame(paso); else pts = a; });
}
function dona(vals) {
  var L = 2 * Math.PI * 52, total = vals.reduce(function (s, v) { return s + v; }, 0), off = 0;
  nb.querySelectorAll(".donut .seg").forEach(function (c, i) {
    var p = vals[i] / total; c.style.transition = "none"; c.style.strokeDasharray = "0 " + L; c.style.strokeDashoffset = -off * L; void c.getBoundingClientRect();
    c.style.transition = ""; (function (c, p) { despues(function () { c.style.strokeDasharray = (p * L) + " " + L; }, 120 + i * 250); })(c, p); off += p;
  });
  nb.querySelectorAll(".donut li b").forEach(function (b, i) { b.dataset.to = vals[i]; anima(b, b._v || 0, vals[i], 1200); });
}
var vivo = { pres: 128, ret: 4, hx: 11, asis: 97 };
function numerosEnVivo() {
  var n = nb.querySelectorAll(".nums b");
  vivo.pres = vivo.pres >= 132 ? 126 : vivo.pres + 1; if (Math.random() < .3) vivo.ret = vivo.ret >= 6 ? 3 : vivo.ret + 1; vivo.hx = Math.round((vivo.hx + .5) * 2) / 2; if (vivo.hx > 14) vivo.hx = 10; vivo.asis = 96 + Math.round(Math.random() * 2);
  anima(n[0], n[0]._v, vivo.asis, 800); anima(n[1], n[1]._v, vivo.pres, 800); anima(n[2], n[2]._v, vivo.ret, 800); anima(n[3], n[3]._v, vivo.hx, 800);
  n[1].parentNode.classList.remove("tick"); void n[1].offsetWidth; n[1].parentNode.classList.add("tick");
}

// Cada bloque se anima al entrar y sigue vivo mientras se ve; al salir se detiene.
var bloquesVivos = [
  { el: $("ley-block"), entra: function () { var b = $("ley-block"); b.classList.remove("on"); void b.offsetWidth; b.classList.add("on"); desdeCero(b); } },
  { el: hxb, entra: function () { hxb.classList.remove("on"); void hxb.offsetWidth; hxb.querySelectorAll(".stats b").forEach(function (b) { b._v = 0; }); hxb.classList.add("on"); pintaSemana(semanaBase); }, cada: 3200, vive: function () { pintaSemana(semanaNueva()); } },
  { el: nb, entra: function () { nb.classList.remove("on"); void nb.offsetWidth; nb.classList.add("on"); desdeCero(nb); ln.style.transition = ""; ln.style.strokeDashoffset = ""; pintaLinea(pts); dona([124, 4, 4]); vivo = { pres: 128, ret: 4, hx: 11, asis: 97 }; }, cada: 2600, vive: function () { lineaAvanza(); numerosEnVivo(); if (Math.random() < .35) dona([vivo.pres - vivo.ret, vivo.ret, Math.max(2, 132 - vivo.pres)]); } },
  { el: $("uni-photo"), entra: function () { tarjetas($("uni-photo")); }, cada: 7000, vive: function () { tarjetas($("uni-photo")); } },
  { el: $("eq-photo"), entra: function () { tarjetas($("eq-photo")); }, cada: 7000, vive: function () { tarjetas($("eq-photo")); } },
  { el: $("allm"), entra: function () { document.querySelectorAll("#allm li").forEach(function (li) { li.classList.add("pre2"); }); void document.body.offsetWidth; document.querySelectorAll("#allm li").forEach(function (li) { li.classList.remove("pre2"); }); document.querySelectorAll(".cat header span, .cnt").forEach(function (s) { s.dataset.to = s.dataset.to || s.textContent; anima(s, 0, +s.dataset.to, 1200); }); } }
];

// ===== Control semanal de horas: avanza día por día y llegan las notificaciones =====
var DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
var gentesem = [ // horas por día (L–S)
  ["Ana Torres", "Empaque", [9.6667, 9.6667, 9.6667, 9.6667, 9.6667, 0]],
  ["Carlos Méndez", "Almacén", [8.6667, 8.6667, 8.6667, 8.6667, 8.6667, 8]],
  ["Lucía Herrera", "Calidad", [7.6, 7.6, 7.6, 7.6, 7.6, 7.6]],
  ["Jorge Ruiz", "Empaque", [7.2, 6.8, 7.2, 7.2, 7.2, 6]],
  ["Raúl Pérez", "Almacén", [8, 8, 8, 0, 8, 6]]
];
var avisos = [ // [día en que llega, color, icono, título, detalle, origen]
  [1, "#d97706", "✉", "Jorge Ruiz llegó tarde", "Martes 09:14 · su entrada es 9:00", "Correo · Regla de aviso"],
  [2, "#b45309", "!", "Carlos Méndez va a pasar del límite", "Llevaría 52 h de 46 h esta semana", "Alerta en el panel"],
  [3, "#dc2626", "✉", "Raúl Pérez no se presentó", "Jueves · sin checada ni permiso", "Correo · Regla de aviso"],
  [4, "#dc2626", "▲", "Ana Torres pasó del límite semanal", "48 h 20 min de 46 h · horas extra en más de 4 días", "Alerta en el panel"],
  [5, "#2c56e8", "✓", "Reporte semanal listo", "PDF con la hoja de cada empleado para firma", "Reporte de horas"]
];
var wkRows = $("wk-rows"), wkFeed = $("wk-feed"), wkDays = $("wk-days").children;
wkRows.innerHTML = gentesem.map(function (g) { return '<div class="wk-row"><div><b>' + g[0] + "</b><small>" + g[1] + '</small></div><div class="wk-bar"><i></i><em>0 h</em></div><span class="wk-st">En límite</span></div>'; }).join("");
function hfmt(h) { var x = Math.floor(h + 1e-6), m = Math.round((h - x) * 60); if (m === 60) { x++; m = 0; } return x + " h" + (m ? " " + m : ""); }
function diaSemana(d) {
  $("wk-day").textContent = DIAS[d];
  Array.prototype.forEach.call(wkDays, function (s, k) { s.className = k < d ? "paso" : k === d ? "hoy" : ""; });
  wkRows.querySelectorAll(".wk-row").forEach(function (row, k) {
    var hs = gentesem[k][2].slice(0, d + 1), tot = hs.reduce(function (a, b) { return a + b; }, 0), trabajados = hs.filter(function (h) { return h > 0; }).length || 1;
    var proy = tot + (tot / trabajados) * (5 - d), st = tot > 46 ? "ex" : proy > 46 ? "va" : "";
    row.className = "wk-row " + st; row.querySelector(".wk-bar i").style.width = Math.min(100, tot / 50 * 100) + "%";
    var em = row.querySelector(".wk-bar em"), de = em._v || 0, t0 = null; em._v = tot;
    requestAnimationFrame(function c(t) { if (!t0) t0 = t; var q = Math.min(1, (t - t0) / 800); em.textContent = hfmt(de + (tot - de) * q); if (q < 1) requestAnimationFrame(c); });
    var b = row.querySelector(".wk-st"); b.className = "wk-st " + st; b.textContent = st === "ex" ? "Excede" : st === "va" ? "Va a pasar" : "En límite";
  });
  avisos.filter(function (a) { return a[0] === d; }).forEach(function (a, j) {
    despues(function () {
      var n = document.createElement("div"); n.className = "nt";
      n.innerHTML = '<i style="background:' + a[1] + '">' + a[2] + "</i><div><b>" + a[3] + "</b><span>" + a[4] + "</span><br><small>" + a[5] + "</small></div>";
      wkFeed.insertBefore(n, wkFeed.firstChild); while (wkFeed.children.length > 4) wkFeed.removeChild(wkFeed.lastChild);
    }, 350 + j * 300);
  });
}
var wkT = null, wkTo = null;
function semanaCorre() {
  clearInterval(wkT); clearTimeout(wkTo); wkFeed.innerHTML = ""; wkRows.querySelectorAll(".wk-bar em").forEach(function (e) { e._v = 0; }); var d = 0; diaSemana(0);
  if (quieto) { for (var k = 1; k < 6; k++) diaSemana(k); return; }
  wkT = setInterval(function () { d++; if (d > 5) { clearInterval(wkT); wkTo = setTimeout(semanaCorre, 3500); return; } diaSemana(d); }, 1500);
}
bloquesVivos.push({ el: $("wk"), entra: semanaCorre });

if ("IntersectionObserver" in window && !quieto) {
  var io2 = observa(function (es) {
    es.forEach(function (e) {
      var b = bloquesVivos.filter(function (x) { return x.el === e.target; })[0]; if (!b) return;
      if (e.isIntersecting) { b.entra(); if (b.vive) { clearInterval(b.t); b.t = setInterval(b.vive, b.cada); } }
      else { clearInterval(b.t); }
    });
  }, { threshold: .3 });
  bloquesVivos.forEach(function (b) { io2.observe(b.el); });
} else { bloquesVivos.forEach(function (b) { b.entra(); }); }

// Fotos con profundidad: se desplazan un poco al hacer scroll.
var fotos = document.querySelectorAll(".photo img");
if (!quieto) {
  var pend = false;
  function paralaje() { pend = false; var vh = window.innerHeight; fotos.forEach(function (img) { var r = img.parentNode.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return; var c = (r.top + r.height / 2 - vh / 2) / vh; img.style.transform = "scale(1.12) translateY(" + (c * -5).toFixed(2) + "%)"; }); }
  escucha(window, "scroll", function () { if (!pend) { pend = true; requestAnimationFrame(paralaje); } }, { passive: true }); paralaje();
}

// ===== Entradas al hacer scroll (como apuntamx.com) =====
var acciones = [[$("wa-stage"), function () { wa(); if (!quieto) setInterval(wa, 6500); }], [$("docs-stage"), function () { docs(); if (!quieto) setInterval(docs, 8000); }], [$("me-stage"), vac]];
var bloques = document.querySelectorAll(".reveal"), alto = window.innerHeight;
if ("IntersectionObserver" in window && !quieto) {
  bloques.forEach(function (b) { if (b.getBoundingClientRect().top > alto) b.classList.add("pre"); });
  var io = observa(function (es) {
    var orden = 0;
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      // Las que entran juntas (una fila del mosaico) se escalonan en orden del documento; tope para no hacer esperar.
      e.target.style.setProperty("--d", Math.min(orden++, 4) * 90 + "ms");
      e.target.classList.remove("pre"); io.unobserve(e.target);
      acciones.forEach(function (a) { if (a[0] === e.target) a[1](); });
    });
  }, { rootMargin: "0px 0px -80px 0px", threshold: .15 });
  bloques.forEach(function (b) { io.observe(b); });
} else { acciones.forEach(function (a) { a[1](); }); }

// ===== Pantallas que flotan: la animación corre solo mientras se ven (.en-vista) =====
if ("IntersectionObserver" in window && !quieto) {
  var ioF = observa(function (es) { es.forEach(function (e) { e.target.classList.toggle("en-vista", e.isIntersecting); }); });
  document.querySelectorAll(".flota").forEach(function (el) { ioF.observe(el); });
  // Al abrir «Ver todos los módulos» (celular, MosaicoPlegable) las tarjetas que estaban ocultas se vuelven a observar.
  escucha(window, "mz-abierto", function () { document.querySelectorAll("#modulos-adamia .flota").forEach(function (el) { ioF.unobserve(el); ioF.observe(el); }); });
}

  return () => {
    timers.forEach((id) => window.clearTimeout(id));
    intervalos.forEach((id) => window.clearInterval(id));
    observadores.forEach((o) => o.disconnect());
    escuchas.forEach(([el, tipo, fn, opciones]) => el.removeEventListener(tipo, fn, opciones));
  };
}
