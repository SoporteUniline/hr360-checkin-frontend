// Mini pantallas del mosaico de módulos (una por tarjeta de mosaico.mjs, por su id). Dibujadas con HTML/CSS, sin
// imágenes; datos de ejemplo ficticios y verosímiles, con los nombres, estados y botones reales de cada pantalla (ver
// `fuente` de cada tarjeta). Son decorativas: MosaicoModulos las envuelve con aria-hidden y el texto de la tarjeta dice
// lo mismo. Componente de servidor: solo Contador, BarraLlena, Ciclo, RelojJornada y EscrituraIA hidratan.
import { BarraLlena, Ciclo, Contador, EscrituraIA, RelojJornada } from "./DatosVivos";

// Fuera de los componentes: referencias estables (la escritura de la IA no se reinicia en cada render).
const RESPUESTA_IA = [
  { texto: "Le tocan " },
  { texto: "16 días", b: true },
  { texto: " de vacaciones pagadas: 12 el primer año y 2 más por cada año." },
];
const JORNADA_INICIO = 7 * 3600 + 42 * 60 + 15;

const Fila = ({ a, b, children }) => <div className="mz-fila"><span>{a}</span>{children ?? <b>{b}</b>}</div>;

// ——— Las 9 de antes (sin cambios de contenido) ———
function Nomina() {
  return (
    <>
      <div className="mz-fila"><span>Total a pagar</span><b className="mz-grande">$284,350.00</b></div>
      <Fila a="Periodo" b="Quincena 1–15 nov" />
      <div className="mz-fila"><span>Recibos firmados</span>
        <span className="mz-avatares"><i style={{ background: "#2c56e8" }}>AT</i><i style={{ background: "#5a3cf4" }}>BR</i><i style={{ background: "#0ea5e9" }}>CR</i><i style={{ background: "#16a34a" }}>+38</i></span>
      </div>
      <div className="mz-fila"><span>Firmados</span><b><Contador hasta={41} /> de 45</b></div>
      <BarraLlena valor={41 / 45} />
      <div className="mz-boton">Autorizar nómina</div>
    </>
  );
}
function Asistencia() {
  return (
    <>
      <b className="mz-tit">Jornada registrada</b>
      <div className="mz-tramo"><span>Trabajo</span><b>08:02 → 14:02</b></div>
      <div className="mz-tramo mz-gris"><span>Comida</span><b>14:02 → 14:58</b></div>
      <div className="mz-nota">56 min de comida · a tiempo</div>
      <div className="mz-tramo"><span>Trabajo</span><b>14:58 → 17:04</b></div>
    </>
  );
}
function Reclutador() {
  return (
    <>
      <div className="mz-wa-b">¿Tienes disponibilidad para trabajar fines de semana?</div>
      <div className="mz-wa-bts"><span>Sí</span><span>No</span></div>
      <div className="mz-fila"><span>Daniela Ortiz</span><span className="mz-chip mz-verde">Califica</span></div>
      <Fila a="Entrevista" b="jue 3 dic · 9:00 a. m." />
    </>
  );
}
function Clima() {
  return (
    <>
      <div className="mz-fila"><span>Participación</span><Contador hasta={86} sufijo="%" /></div>
      <BarraLlena valor={0.86} />
      <Fila a="NOM-035" b="Riesgo medio" />
      <div className="mz-nota">✦ Adamia AI sugiere 3 acciones</div>
    </>
  );
}
function Muro() {
  return (
    <>
      <div className="mz-fila"><b>Reglamento interior</b><span className="mz-chip">Confirmar</span></div>
      <div className="mz-fila"><span>Confirmaron</span><b><Contador hasta={31} /> de 42</b></div>
      <BarraLlena valor={31 / 42} />
      <div className="mz-fila"><span>♥ 48 · 6 comentarios</span><span>Toda la empresa</span></div>
    </>
  );
}
function Checador() {
  return (
    <>
      <div className="mz-verif"><span className="mz-cara" /><div><b>Ana Torres</b><div className="mz-ok">✓ Rostro verificado</div></div></div>
      <Fila a="Ubicación" b="Sucursal Centro · 18 m" />
      <Fila a="Entrada" b="08:02" />
      <div className="mz-fila mz-jornada"><span><i className="mz-punto" />En jornada</span><RelojJornada inicio={JORNADA_INICIO} /></div>
    </>
  );
}
function Tareas() {
  return (
    <>
      <div className="mz-fila"><b>Apertura de sucursal</b><span className="mz-chip">Hoy</span></div>
      <div className="mz-chips"><span className="mz-chip">8 preguntas</span><span className="mz-chip">Foto</span><span className="mz-chip">Firma</span></div>
      <div className="mz-fila"><span>Cumplimiento del equipo</span><Contador hasta={92} sufijo="%" /></div>
      <BarraLlena valor={0.92} />
    </>
  );
}
function Documentos() {
  return (
    <>
      <div className="mz-fila"><b>Contrato · Beto Ríos</b><span className="mz-ok">Firmado</span></div>
      <div className="mz-firma"><svg viewBox="0 0 150 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 30c10-22 18-24 22-10s8 12 16-6 14-8 18 4 12 8 22-12 16 4 24 10 18-4 22-6" /></svg></div>
      <div className="mz-fila"><span>23 nov · 10:42 · iPhone</span><span className="mz-ok">✓ Foto</span></div>
    </>
  );
}

// ——— Nuevas (27/11/2026) ———
// Préstamos (nomina/prestamos.md: folio P-3, Prestado, Abono por nómina, Saldo, Avance) y bonos condicionados a la
// asistencia (nomina/bonos-y-descuentos.md: «sin faltas ni retardos»).
function Prestamos() {
  return (
    <>
      <div className="mz-fila"><b className="mz-tit">Préstamo P-3 · Beto Ríos</b><span className="mz-chip mz-verde">Vigente</span></div>
      <Fila a="Prestado" b="$6,000.00" />
      <Fila a="Abono por nómina" b="$500.00" />
      <div className="mz-fila"><span>Avance</span><Contador hasta={58} sufijo="%" /></div>
      <BarraLlena valor={0.58} />
      <Ciclo bloque estados={[
        <div key="a" className="mz-nota">Bono de puntualidad · sin retardos</div>,
        <div key="b" className="mz-nota mz-nota-verde">✓ Bono de puntualidad · se paga</div>,
      ]} />
    </>
  );
}
// Finiquito por renuncia (finiquitos-y-liquidaciones.md) y aguinaldo (aguinaldos.md, art. 87): importes brutos con la
// fórmula de cada concepto. Salario diario $420; baja el 30 nov 2026 (334 días del año): 15 × 334 ÷ 365 × $420.
function Calculos() {
  const tabs = (activo) => (
    <div className="mz-tabs" key="t"><span className={activo === 0 ? "on" : undefined}>Finiquito</span><span className={activo === 1 ? "on" : undefined}>Aguinaldo</span></div>
  );
  return (
    <Ciclo bloque ms={4200} estados={[
      <div key="ag" className="mz-pila">
        {tabs(1)}
        <div className="mz-fila"><b className="mz-tit">Aguinaldo 2026 · corte 31 dic</b><span className="mz-chip">45 personas</span></div>
        <Fila a="Completos" b="38" />
        <Fila a="Proporcionales" b="7" />
        <div className="mz-formula">15 días × días trabajados ÷ 365 × salario diario</div>
        <div className="mz-fila"><span>Total bruto</span><b className="mz-grande">$271,830.40</b></div>
      </div>,
      <div key="fi" className="mz-pila">
        {tabs(0)}
        <div className="mz-fila"><b className="mz-tit">Finiquito · Renuncia voluntaria</b><span className="mz-chip">Baja 30 nov</span></div>
        <div className="mz-concepto"><span>Salario pendiente</span><small>5 días × $420.00</small><b>$2,100.00</b></div>
        <div className="mz-concepto"><span>Aguinaldo proporcional</span><small>15 × 334 ÷ 365 × $420.00</small><b>$5,764.93</b></div>
        <div className="mz-concepto"><span>Vacaciones</span><small>6 días × $420.00</small><b>$2,520.00</b></div>
        <div className="mz-concepto"><span>Prima vacacional</span><small>25 % × $2,520.00</small><b>$630.00</b></div>
        <div className="mz-fila mz-total"><span>Total a pagar (bruto)</span><b className="mz-grande">$11,014.93</b></div>
      </div>,
    ]} />
  );
}
// Monitor (monitor/usar-el-monitor.md): contadores Trabajando, En comida, No han llegado (rojo si alguien requiere
// atención) y Llegaron tarde; se actualiza solo. Con cada vuelta llega alguien más.
function Monitor() {
  const kpis = (trabajando, faltan) => (
    <div className="mz-kpis">
      <div className="mz-kpi"><span>Trabajando</span><b>{trabajando}</b></div>
      <div className="mz-kpi"><span>En comida</span><b>9</b></div>
      <div className={`mz-kpi${faltan ? " mz-kpi-rojo" : ""}`}><span>No han llegado</span><b>{faltan}</b></div>
      <div className="mz-kpi"><span>Llegaron tarde</span><b>4</b></div>
    </div>
  );
  return (
    <>
      <div className="mz-fila"><b className="mz-tit">Hoy · 11:12 a. m.</b><span className="mz-en-vivo"><i className="mz-vivo" />se actualiza solo</span></div>
      <Ciclo bloque ms={2400} estados={[<div key="a">{kpis(126, 5)}</div>, <div key="b">{kpis(127, 4)}</div>, <div key="c">{kpis(128, 3)}</div>]} />
      <div className="mz-fila"><span>Beto Ríos</span><span className="mz-chip mz-rojo">En comida 67 de 60 min</span></div>
    </>
  );
}
// Solicitudes de mi equipo (solicitudes-equipo/aprobar-solicitudes-de-mi-equipo.md): saldo Disponibles / Restarían,
// regreso previsto, Aprobar o Rechazar; al aprobar los días quedan en Asistencias (permisos/aprobar-o-rechazar…).
// 3 años de antigüedad = 16 días (art. 76 LFT, vacaciones/vacaciones-por-ley.md). 14–18 dic 2026: lunes a viernes.
function Vacaciones() {
  return (
    <>
      <div className="mz-fila"><b className="mz-tit">Solicitudes de mi equipo</b><span className="mz-chip">Por autorizar</span></div>
      <div className="mz-fila"><b>Beto Ríos · Vacaciones</b><span>3 años</span></div>
      <div className="mz-tramo mz-gris"><span>lun 14 → vie 18 dic</span><b>5 días</b></div>
      <div className="mz-dos">
        <div className="mz-kpi"><span>Disponibles</span><b><Contador hasta={16} /></b></div>
        <div className="mz-kpi"><span>Restarían</span><b>11</b></div>
      </div>
      <Fila a="Regreso previsto" b="lun 21 dic" />
      <Ciclo bloque ms={3200} estados={[
        <div key="a" className="mz-dos"><span className="mz-boton mz-boton-claro">Rechazar</span><span className="mz-boton">Aprobar</span></div>,
        <div key="b" className="mz-nota mz-nota-verde mz-alto">✓ Aprobada · los días ya están en Asistencias</div>,
      ]} />
    </>
  );
}
// Turnos extra (turnos-extra/programar-un-turno-extra.md): día, Entra/Sale, personas y la columna «Avisos de ley»;
// las horas quedan autorizadas como extra al programarlo. Sábado 5 dic 2026.
function HorasExtra() {
  return (
    <>
      <div className="mz-fila"><b className="mz-tit">Doble turno · Producción</b><span className="mz-chip">sáb 5 dic</span></div>
      <div className="mz-tramo mz-gris"><span>Entra → Sale</span><b>16:00 → 20:00</b></div>
      <div className="mz-fila"><span>Personas</span><b><Contador hasta={12} /></b></div>
      <Ciclo bloque ms={2600} estados={[
        <div key="a" className="mz-fila"><span>Ana Torres</span><span className="mz-chip mz-verde">Sin avisos</span></div>,
        <div key="b" className="mz-fila"><span>Raúl Pérez</span><span className="mz-chip mz-ambar">Extra en 4 días de la semana</span></div>,
        <div key="c" className="mz-fila"><span>Karla Romero</span><span className="mz-chip mz-ambar">Triples · 1 h</span></div>,
      ]} />
      <div className="mz-nota">✓ Horas autorizadas como extra</div>
    </>
  );
}
// Centro de incidencias (incidencias/centro-de-incidencias.md): Faltas, Retardos, Sin salida, H. extra, «Listos para
// prenómina» y el motivo de la corrección («Olvidó checar»); reporte de horas en PDF con espacio para firmas.
function Incidencias() {
  return (
    <>
      <div className="mz-fila"><b className="mz-tit">1ª quincena · noviembre</b><span className="mz-chip">Prenómina</span></div>
      <div className="mz-kpis mz-kpis-4">
        <div className="mz-kpi"><span>Faltas</span><b>3</b></div>
        <div className="mz-kpi"><span>Retardos</span><b>7</b></div>
        <div className="mz-kpi"><span>Sin salida</span><b>2</b></div>
        <div className="mz-kpi"><span>H. extra</span><b>5</b></div>
      </div>
      <div className="mz-fila"><span>Listos para prenómina</span><b><Contador hasta={38} /> de 45</b></div>
      <BarraLlena valor={38 / 45} />
      <Ciclo bloque ms={3000} estados={[
        <div key="a" className="mz-fila"><span>Beto Ríos · jue 12</span><span className="mz-chip mz-ambar">Sin salida</span></div>,
        <div key="b" className="mz-fila"><span>Beto Ríos · jue 12</span><span className="mz-chip mz-verde">✓ Corregida · Olvidó checar</span></div>,
      ]} />
      <div className="mz-fila"><span>Reporte de horas</span><span className="mz-chip">PDF para firma</span></div>
    </>
  );
}
// Mapa de rutas (mapa-de-rutas/ver-recorridos.md): puntos de las checadas con GPS, reproducir el recorrido con
// velocidad 1x/2x/4x y el tiempo en cada lugar. Calles y recorrido dibujados con SVG en línea.
function Rutas() {
  return (
    <>
      <div className="mz-mapa">
        <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid slice" fill="none">
          <g stroke="#dfe3ee" strokeWidth="7" strokeLinecap="round"><path d="M-10 92H310M-10 34H310M62-10v140M178-10v140M250-10v140" /><path d="M-10 128 120 -10" /></g>
          <path className="mz-ruta" pathLength="1" d="M28 92H62V34h116v58h72V34" stroke="#2c56e8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <g className="mz-pines"><circle cx="28" cy="92" r="6.5" fill="#16a34a" /><circle cx="178" cy="34" r="6.5" fill="#2c56e8" /><circle cx="250" cy="92" r="6.5" fill="#2c56e8" /><circle cx="250" cy="34" r="6.5" fill="#dc2626" /></g>
        </svg>
      </div>
      <div className="mz-fila"><span className="mz-chip">▶ Reproducir · 2x</span><b>Punto <Ciclo estados={["2", "3", "4"]} /> de 4</b></div>
      <Fila a="Cliente Norte · permanencia" b="48 min" />
      <Fila a="Traslado" b="22 min" />
    </>
  );
}
// Ficha (empleados/ficha-del-empleado.md: pestañas Personal, Trabajo, Checador y acceso, Pago y Documentos) y
// expediente digital (empleados/expediente-digital.md: Completitud, Vigente, Por vencer en 30 días).
function Empleados() {
  return (
    <>
      <div className="mz-verif"><span className="mz-cara mz-cara-v" /><div><b>Carla Ruiz</b><div className="mz-sutil">Auxiliar de almacén · 3 años</div></div></div>
      <div className="mz-tabs"><span>Personal</span><span>Trabajo</span><span>Checador</span><span>Pago</span><span className="on">Documentos</span></div>
      <div className="mz-fila"><span>Completitud del expediente</span><Contador hasta={92} sufijo="%" /></div>
      <BarraLlena valor={0.92} />
      <div className="mz-fila"><span>INE</span><span className="mz-ok">Vigente</span></div>
      <Ciclo bloque ms={3000} estados={[
        <div key="a" className="mz-fila"><span>Contrato</span><span className="mz-ok">Vigente</span></div>,
        <div key="b" className="mz-fila"><span>Certificado médico</span><span className="mz-ok">Vigente</span></div>,
        <div key="c" className="mz-fila"><span>Constancia fiscal</span><span className="mz-chip mz-ambar">Por vencer · 14 ene</span></div>,
      ]} />
    </>
  );
}
// Entregas (activos/entregar-y-recibir.md): modalidad Asignación, artículos con cantidad, resguardo que la persona
// confirma desde su app («Acuses por confirmar») y existencias Disponibles (activos/index.md).
function Activos() {
  return (
    <>
      <div className="mz-fila"><b className="mz-tit">Entrega · Daniela Ortiz</b><span className="mz-chip">Asignación</span></div>
      <div className="mz-tramo mz-gris"><span>Laptop</span><b>× 1</b></div>
      <div className="mz-tramo"><span>Playera talla M</span><b>× 2</b></div>
      <Ciclo bloque ms={3000} estados={[
        <div key="a" className="mz-nota mz-nota-ambar">Acuse por confirmar</div>,
        <div key="b" className="mz-nota mz-nota-verde">✓ Resguardo confirmado en su app</div>,
      ]} />
      <div className="mz-fila"><span>Disponibles en inventario</span><b><Contador hasta={148} /></b></div>
    </>
  );
}
// App del empleado (mi-espacio/conoce-tu-espacio.md): checar, pedir permisos, recibos, encuestas y la barra de abajo
// (Inicio, Muro, Asistencia). Saldo de vacaciones del ejemplo: 12 días.
function MiEspacio() {
  return (
    <>
      <div className="mz-fila"><b className="mz-tit">Hola, Ana</b><span>Inicio</span></div>
      <Ciclo bloque ms={3000} estados={[
        <div key="a" className="mz-boton">Checar entrada</div>,
        <div key="b" className="mz-boton mz-boton-verde">✓ Entrada 08:02</div>,
      ]} />
      <div className="mz-apps"><span>Mis recibos</span><span>Pedir permiso</span><span>Vacaciones · 12 días</span><span>Encuestas</span></div>
      <div className="mz-barra-app"><span className="on">Inicio</span><span>Muro</span><span>Asistencia</span></div>
    </>
  );
}
// Vacante pública (reclutamiento/publicar-y-compartir-vacante.md): sucursal, modalidad, jornada y sueldo; aparece en la
// bolsa de trabajo de ADAMIA y tiene enlace de WhatsApp. Cambia de vacante como en la bolsa.
function Bolsa() {
  const vacante = (k, puesto, lugar, sueldo, jornada) => (
    <div key={k} className="mz-pila">
      <b className="mz-tit">{puesto}</b>
      <div className="mz-fila"><span>{lugar}</span><b>{sueldo}</b></div>
      <div className="mz-chips"><span className="mz-chip">{jornada}</span><span className="mz-chip">Presencial</span></div>
    </div>
  );
  return (
    <>
      <Ciclo bloque ms={3000} estados={[
        vacante("a", "Cajera o cajero", "Sucursal Centro", "$8,900 al mes", "Medio tiempo"),
        vacante("b", "Chofer repartidor", "Sucursal Sur", "$11,000 al mes", "Tiempo completo"),
        vacante("c", "Auxiliar de almacén", "Sucursal Norte", "$9,500 al mes", "Tiempo completo"),
      ]} />
      <div className="mz-fila"><span>Postulaciones esta semana</span><b><Contador hasta={23} /></b></div>
      <div className="mz-dos"><span className="mz-boton mz-boton-claro">Por WhatsApp</span><span className="mz-boton">Postularme</span></div>
    </>
  );
}
// Campaña (evaluaciones/como-funciona-la-evaluacion.md): pasos Preparar, Responder, Revisar, Publicar y Planes;
// avance de respuestas y calibración 9-box con los nombres de sus casillas (evaluaciones/calibracion-9-box-y-bono.md:
// filas = desempeño de alto a bajo, columnas = potencial de bajo a alto; 2 = Estrella, 4 = Pilar, 5 = Alto potencial).
function Evaluacion() {
  const caja = (k, celda, texto) => (
    <div key={k} className="mz-caja9">
      <div className="mz-9box">{Array.from({ length: 9 }, (_, i) => <i key={i} className={i === celda ? "on" : undefined} />)}</div>
      <span>{texto}</span>
    </div>
  );
  return (
    <>
      <div className="mz-fila"><b className="mz-tit">Campaña anual 2026</b><span className="mz-chip">360°</span></div>
      <div className="mz-pasos"><span className="ok">Preparar</span><span className="act">Responder</span><span>Revisar</span><span>Publicar</span><span>Planes</span></div>
      <div className="mz-fila"><span>Respondidas</span><b><Contador hasta={34} /> de 40</b></div>
      <BarraLlena valor={34 / 40} />
      <div className="mz-fila mz-arriba"><span>Calibración · Ana Torres</span>
        <Ciclo bloque ms={2600} estados={[caja("a", 4, "Pilar"), caja("b", 5, "Alto potencial"), caja("c", 2, "Estrella")]} />
      </div>
    </>
  );
}
// Reglas de aviso (avisos/reglas-de-aviso.md): correos de inasistencias y retardos, contratos por vencer y cumpleaños,
// encendidos con su interruptor; salen alrededor de las 9:05 a. m.
function Avisos() {
  return (
    <>
      <b className="mz-tit">Reglas de aviso</b>
      <div className="mz-fila"><span>Inasistencias y retardos</span><i className="mz-sw" /></div>
      <div className="mz-fila"><span>Contratos por vencer</span><i className="mz-sw" /></div>
      <div className="mz-fila"><span>Cumpleaños del mes</span><i className="mz-sw" /></div>
      <Ciclo bloque ms={2800} estados={[
        <div key="a" className="mz-nota">✉ 3 contratos vencen este mes</div>,
        <div key="b" className="mz-nota">✉ Hoy cumple años Karla Romero</div>,
        <div key="c" className="mz-nota">✉ 2 llegaron tarde hoy · 9:05 a. m.</div>,
      ]} />
    </>
  );
}
// Centro de ayuda (/ayuda): buscador y guías reales (títulos de src/content/ayuda).
function Ayuda() {
  const busca = (k, q, titulo, modulo) => (
    <div key={k} className="mz-pila">
      <div className="mz-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>{q}</div>
      <div className="mz-guia"><b>{titulo}</b><span>{modulo} · paso a paso</span></div>
    </div>
  );
  return (
    <>
      <Ciclo bloque ms={3200} estados={[
        busca("a", "finiquito", "Cómo calcular un finiquito o una liquidación", "Nómina"),
        busca("b", "checar con el celular", "Cómo checar desde tu celular", "Reloj checador"),
        busca("c", "aprobar vacaciones", "Cómo aprobar las solicitudes de mi equipo", "Solicitudes de mi equipo"),
      ]} />
      <div className="mz-chips"><span className="mz-chip">Para RH</span><span className="mz-chip">Para jefes</span><span className="mz-chip">Para empleados</span></div>
    </>
  );
}
// API de ADAMIA v1 (integraciones/llaves-de-api.md y /desarrolladores): GET/POST /empleados, GET /asistencias, permisos
// por llave y 60 peticiones por minuto.
function Api() {
  const llamada = (k, metodo, ruta, respuesta) => (
    <div key={k} className="mz-pila"><div><span className="mz-verbo">{metodo}</span> {ruta}</div><div className="mz-resp">{respuesta}</div></div>
  );
  return (
    <>
      <div className="mz-codigo">
        <Ciclo bloque ms={2800} estados={[
          llamada("a", "GET", "/v1/empleados", "200 · 45 empleados"),
          llamada("b", "POST", "/v1/empleados", "201 · empleado creado"),
          llamada("c", "GET", "/v1/asistencias", "200 · 1–15 nov"),
        ]} />
      </div>
      <div className="mz-chips"><span className="mz-chip">empleados:leer</span><span className="mz-chip">asistencias:leer</span></div>
      <Fila a="Llave · Nómina externa" b="60 por minuto" />
    </>
  );
}

export const MINIS = {
  nomina: Nomina, prestamos: Prestamos, calculos: Calculos,
  asistencia: Asistencia, checador: Checador, monitor: Monitor, vacaciones: Vacaciones, "horas-extra": HorasExtra,
  incidencias: Incidencias, rutas: Rutas,
  empleados: Empleados, documentos: Documentos, activos: Activos, tareas: Tareas, "mi-espacio": MiEspacio,
  reclutador: Reclutador, bolsa: Bolsa, clima: Clima, evaluacion: Evaluacion, muro: Muro,
  avisos: Avisos, ayuda: Ayuda, api: Api,
};

// Adamia AI va aparte: su «pantalla» es un chat (.mz-chat), no una tarjeta blanca.
export function ChatIA() {
  return (
    <>
      <div className="mz-burbuja mz-yo">¿Cuántos días de vacaciones le tocan a alguien con 3 años?</div>
      <div className="mz-burbuja mz-ai"><EscrituraIA partes={RESPUESTA_IA}><span className="mz-cita">Art. 76 LFT</span></EscrituraIA></div>
    </>
  );
}
