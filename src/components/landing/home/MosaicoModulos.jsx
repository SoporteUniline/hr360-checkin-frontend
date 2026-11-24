// Mosaico de módulos. Inspirado en la sección de módulos de Crehana:
// tarjeta principal grande con degradado de marca y las demás en gris suave; cada una con nombre, submarca
// «adamia ___.», una línea de beneficio y una mini pantalla del producto dibujada con código (datos de ejemplo).
// Estilos en ./landing-home.css (bloque «Mosaico de módulos», todo bajo .lh .mz).
import Link from "next/link";
import { BarraLlena, Contador, EscrituraIA, RelojJornada } from "./DatosVivos";

// Fuera del componente: una referencia estable evita que la escritura se reinicie en cada render.
const RESPUESTA_IA = [
  { texto: "Le tocan " },
  { texto: "16 días", b: true },
  { texto: " de vacaciones pagadas: 12 el primer año y 2 más por cada año." },
];
const JORNADA_INICIO = 7 * 3600 + 42 * 60 + 15;

function Flecha({ href, nombre }) {
  return (
    <Link className="mz-flecha" href={href} aria-label={`Conocer ${nombre}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
    </Link>
  );
}

function Cabecera({ nombre, sub, children, etiqueta }) {
  return (
    <div className="mz-cab">
      <h3>{nombre}{etiqueta ? <span className="mz-etq">{etiqueta}</span> : null}</h3>
      <div className="mz-sub"><b>adamia</b> {sub}.</div>
      <p>{children}</p>
    </div>
  );
}

export default function MosaicoModulos() {
  return (
    <section className="mz" id="modulos-adamia" aria-labelledby="mz-titulo">
      <div className="wrap">
        <div className="txt reveal mz-encabezado">
          <span className="eyebrow">Módulos</span>
          <h2 id="mz-titulo">Todo el día de tu equipo, en una sola plataforma.</h2>
          <p>Del checador a la nómina, con IA que conoce la Ley Federal del Trabajo. Activa solo lo que tu empresa necesita.</p>
        </div>
        <div className="mz-grid">
          <article className="mz-m mz-g4 mz-principal reveal">
            <Cabecera nombre="Nómina" sub="nómina" etiqueta="Recibos firmados">
              Calcula con las checadas reales, aplica bonos, descuentos y préstamos, y cada quien firma su recibo desde su celular.
            </Cabecera>
            <Flecha href="/contacto" nombre="Nómina" />
            <div className="mz-mini flota" style={{ "--ft": "6.4s", "--fd": "-1.2s" }} aria-hidden="true">
              <div className="mz-fila"><span>Total a pagar</span><b className="mz-grande">$284,350.00</b></div>
              <div className="mz-fila"><span>Periodo</span><b>Quincena 1–15 nov</b></div>
              <div className="mz-fila"><span>Recibos firmados</span>
                <span className="mz-avatares"><i style={{ background: "#2c56e8" }}>AT</i><i style={{ background: "#5a3cf4" }}>BR</i><i style={{ background: "#0ea5e9" }}>CR</i><i style={{ background: "#16a34a" }}>+38</i></span>
              </div>
              <div className="mz-fila"><span>Firmados</span><b><Contador hasta={41} /> de 45</b></div>
              <BarraLlena valor={41 / 45} />
              <div className="mz-boton">Autorizar nómina</div>
            </div>
          </article>

          <article className="mz-m mz-g2 reveal" style={{ "--d": ".05s" }}>
            <Cabecera nombre="Asistencia" sub="time">Entradas, comidas y salidas en vivo. Horas extra y retardos sin hojas de cálculo.</Cabecera>
            <Flecha href="/funcionalidades/dashboard-empleados" nombre="Asistencia" />
            <div className="mz-mini flota" style={{ "--ft": "5.6s", "--fd": "-3.1s" }} aria-hidden="true">
              <b className="mz-tit">Jornada registrada</b>
              <div className="mz-tramo"><span>Trabajo</span><b>08:02 → 14:02</b></div>
              <div className="mz-tramo mz-gris"><span>Comida</span><b>14:02 → 14:58</b></div>
              <div className="mz-nota">56 min de comida · a tiempo</div>
              <div className="mz-tramo"><span>Trabajo</span><b>14:58 → 17:04</b></div>
            </div>
          </article>

          <article className="mz-m mz-g2 reveal">
            <Cabecera nombre="Checador" sub="check">Rostro y GPS desde el celular o una tableta en la sucursal. Funciona sin internet.</Cabecera>
            <Flecha href="/funcionalidades/reloj-checador" nombre="el Checador" />
            <div className="mz-mini flota" style={{ "--ft": "7.1s", "--fd": "-0.4s" }} aria-hidden="true">
              <div className="mz-verif"><span className="mz-cara" /><div><b>Ana Torres</b><div className="mz-ok">✓ Rostro verificado</div></div></div>
              <div className="mz-fila"><span>Ubicación</span><b>Sucursal Centro · 18 m</b></div>
              <div className="mz-fila"><span>Entrada</span><b>08:02</b></div>
              <div className="mz-fila mz-jornada"><span><i className="mz-punto" />En jornada</span><RelojJornada inicio={JORNADA_INICIO} /></div>
            </div>
          </article>

          <article className="mz-m mz-g2 reveal" style={{ "--d": ".05s" }}>
            <Cabecera nombre="Tareas y checklists" sub="tasks">Checklists que se califican solos, con foto y firma. Cumplimiento listo para bonos.</Cabecera>
            <Flecha href="/contacto" nombre="Tareas y checklists" />
            <div className="mz-mini flota" style={{ "--ft": "6s", "--fd": "-4.2s" }} aria-hidden="true">
              <div className="mz-fila"><b>Apertura de sucursal</b><span className="mz-chip">Hoy</span></div>
              <div className="mz-chips"><span className="mz-chip">8 preguntas</span><span className="mz-chip">Foto</span><span className="mz-chip">Firma</span></div>
              <div className="mz-fila"><span>Cumplimiento del equipo</span><Contador hasta={92} sufijo="%" /></div>
              <BarraLlena valor={0.92} />
            </div>
          </article>

          <article className="mz-m mz-g2 reveal" style={{ "--d": ".1s" }}>
            <Cabecera nombre="Documentos y firma" sub="sign">Contratos, actas y finiquitos firmados desde el celular, con foto de quien firmó.</Cabecera>
            <Flecha href="/funcionalidades/contratos" nombre="Documentos y firma" />
            <div className="mz-mini flota" style={{ "--ft": "6.8s", "--fd": "-2.5s" }} aria-hidden="true">
              <div className="mz-fila"><b>Contrato · Beto Ríos</b><span className="mz-ok">Firmado</span></div>
              <div className="mz-firma"><svg viewBox="0 0 150 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 30c10-22 18-24 22-10s8 12 16-6 14-8 18 4 12 8 22-12 16 4 24 10 18-4 22-6" /></svg></div>
              <div className="mz-fila"><span>23 nov · 10:42 · iPhone</span><span className="mz-ok">✓ Foto</span></div>
            </div>
          </article>

          <article className="mz-m mz-g6 mz-ia reveal">
            <Cabecera nombre="Adamia AI" sub="ai">Pregúntale lo que necesites de la Ley Federal del Trabajo. Responde con el texto oficial y te dice el artículo.</Cabecera>
            <Flecha href="/contacto" nombre="Adamia AI" />
            <div className="mz-chat flota" style={{ "--ft": "7.6s", "--fd": "-1.8s" }}>
              <div className="mz-burbuja mz-yo">¿Cuántos días de vacaciones le tocan a alguien con 3 años?</div>
              <div className="mz-burbuja mz-ai"><EscrituraIA partes={RESPUESTA_IA}><span className="mz-cita">Art. 76 LFT</span></EscrituraIA></div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
