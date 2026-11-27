"use client";

// Página de inicio (adamia.com.mx). Estilos en ./landing-home.css (bajo .lh para no tocar el resto de la app);
// movimiento en ./animaciones.js (se limpia al salir). Pantallas con datos de ejemplo; fotos ilustrativas en /public/landing.
/* eslint-disable @next/next/no-img-element -- fotos ya optimizadas (webp) dentro de contenedores animados */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { iniciarAnimaciones } from "./animaciones";
import HeroCarrusel from "./HeroCarrusel";
import SeccionLey from "./SeccionLey";
import MosaicoModulos from "./MosaicoModulos";
import SitioEncabezado from "./SitioEncabezado";
import SitioPie from "./SitioPie";
import "./landing-home.css";

export default function LandingHome() {
  const raiz = useRef(null);
  useEffect(() => iniciarAnimaciones(raiz.current), []);
  return (
    <div className="lh" ref={raiz}>
      <div>
        <SitioEncabezado />
        <main id="inicio">
          <section className="hero">
            <HeroCarrusel />
            <div className="wrap">
              <p className="sync-tit">Así se ve en vivo: <b>tu gente checa y RH lo recibe al instante.</b></p>
              <div className="sync" aria-label="Ejemplo: una persona checa en su celular y la entrada aparece al instante en el panel de RH">
                <div className="phone flota" style={{"--ft": '6.2s', "--fd": '-2.4s'}}>
                  <div className="scr" id="h-scr">
                    <div className="sbar"><span id="h-sbar">08:57</span><span>●●● 100%</span></div>
                    <div className="app-in">
                      <div className="app-logo"><img src="/landing/adamia-a.png" alt="" />ADAMIA</div>
                      <h4>Registrar asistencia</h4>
                      <div className="checar" id="h-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M9 10v1M15 10v1M10 15c1 .8 3 .8 4 0" /></svg>
                        Checar entrada
                      </div>
                      <div className="loc"><svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg><span>Planta Empaque<br /><b className="gps">● Dentro de la geocerca</b></span><em>›</em></div>
                      <div className="recent"><small>Tus últimas checadas</small><div><span>Ayer · salida</span><b>17:02</b></div><div><span>Ayer · entrada</span><b>08:54</b></div></div>
                    </div>
                    <div className="scan">
                      <p className="scan-txt" id="h-scan-txt">Buscando rostro…</p>
                      <div className="cam">
                        <svg className="face-base" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx={32} cy={23} r={11} /><path d="M13 58c2-11 9.5-17 19-17s17 6 19 17" /></svg>
                        <svg className="mesh" viewBox="0 0 64 64" aria-hidden="true"><g className="ml"><line x1={26} y1={20} x2={32} y2={17} /><line x1={32} y1={17} x2={38} y2={20} /><line x1={26} y1={20} x2={28} y2={24} /><line x1={38} y1={20} x2={36} y2={24} /><line x1={28} y1={24} x2={32} y2={27} /><line x1={36} y1={24} x2={32} y2={27} /><line x1={32} y1={27} x2={32} y2={33} /><line x1={29} y1={31} x2={32} y2={33} /><line x1={35} y1={31} x2={32} y2={33} /><line x1={28} y1={24} x2={29} y2={31} /><line x1={36} y1={24} x2={35} y2={31} /><line x1={23} y1={22} x2={26} y2={20} /><line x1={41} y1={22} x2={38} y2={20} /><line x1={23} y1={22} x2={25} y2={28} /><line x1={41} y1={22} x2={39} y2={28} /><line x1={25} y1={28} x2={29} y2={31} /><line x1={39} y1={28} x2={35} y2={31} /><line x1={32} y1={13} x2={27} y2={15} /><line x1={32} y1={13} x2={37} y2={15} /><line x1={27} y1={15} x2={26} y2={20} /><line x1={37} y1={15} x2={38} y2={20} /></g><g className="md"><circle cx={26} cy={20} r=".9" style={{"--k": 0}} /><circle cx={38} cy={20} r=".9" style={{"--k": 1}} /><circle cx={32} cy={17} r=".9" style={{"--k": 2}} /><circle cx={28} cy={24} r=".9" style={{"--k": 3}} /><circle cx={36} cy={24} r=".9" style={{"--k": 4}} /><circle cx={32} cy={27} r=".9" style={{"--k": 5}} /><circle cx={29} cy={31} r=".9" style={{"--k": 6}} /><circle cx={35} cy={31} r=".9" style={{"--k": 7}} /><circle cx={32} cy={33} r=".9" style={{"--k": 8}} /><circle cx={23} cy={22} r=".9" style={{"--k": 9}} /><circle cx={41} cy={22} r=".9" style={{"--k": 10}} /><circle cx={25} cy={28} r=".9" style={{"--k": 11}} /><circle cx={39} cy={28} r=".9" style={{"--k": 12}} /><circle cx={32} cy={13} r=".9" style={{"--k": 13}} /><circle cx={27} cy={15} r=".9" style={{"--k": 14}} /><circle cx={37} cy={15} r=".9" style={{"--k": 15}} /></g></svg>
                        <span className="frame" /><span className="line" />
                      </div>
                      <div className="gpsv" aria-hidden="true">
                        <span className="st1" /><span className="st2" /><span className="bld b1" /><span className="bld b2" /><span className="bld b3" />
                        <span className="fence" /><span className="ring" />
                        <span className="pin2"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg></span>
                        <div className="gps-read"><span>Distancia al centro</span><b><span id="h-dist">0</span> m <em>de 100 m</em></b><span>Precisión ±12 m</span></div>
                      </div>
                      <ol className="steps3"><li data-s="cara">Rostro</li><li data-s="gps">Ubicación</li><li data-s="ok">Registro</li></ol>
                      <div className="okcard">
                        <div className="t1"><i><svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></i><span id="h-ok-who">Entrada registrada</span></div>
                        <span className="hora" id="h-ok-h">08:58</span>
                        <div className="chk"><span>Rostro verificado</span><b>✓</b></div>
                        <div className="chk"><span>Dentro de la geocerca · 38 m de 100 m</span><b>✓</b></div>
                      </div>
                    </div>
                  </div>
                </div>
                <span className="sync-pill" id="h-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>Sincronizando</span>
                <div className="dash flota" style={{"--ft": '7.4s', "--fy": '5px'}}>
                  <div className="dbar"><i /><i /><i /><span>adamia.com.mx/panel</span><b className="live">EN VIVO</b></div>
                  <div className="dbody">
                    <div className="dhead"><b>Resumen del día</b><small>Viernes 20 de noviembre</small></div>
                    <div className="kp">
                      <div id="k-pres"><span>Presentes hoy</span><b id="k-pres-n">21</b><small>de 28 empleados</small></div>
                      <div><span>Tardanzas</span><b style={{color: 'var(--amber)'}}>3</b><small>después de las 9:00</small></div>
                      <div><span>Ausencias</span><b style={{color: 'var(--red)'}}>2</b><small>sin justificar</small></div>
                      <div><span>Por llegar</span><b id="k-falta">3</b><small>con turno hoy</small></div>
                    </div>
                    <div className="tbl">
                      <header>Asistencias de hoy · detalle<em>● Sincronizado desde el celular</em></header>
                      <div className="trow th"><span>Empleado</span><span className="s">Sucursal</span><span>Entrada</span><span className="sal">Salida</span><span>Estatus</span></div>
                      <div id="h-rows">
                        <div className="trow"><b>Roberto Vega</b><span className="s">Planta Empaque</span><span>08:55</span><span className="sal">—</span><span className="st">Presente</span></div>
                        <div className="trow"><b>Mariana López</b><span className="s">Sucursal Norte</span><span>09:02</span><span className="sal">—</span><span className="st late">Retardo</span></div>
                        <div className="trow"><b>Daniel Herrera</b><span className="s">Sucursal Sur</span><span>08:41</span><span className="sal">—</span><span className="st">Presente</span></div>
                        <div className="trow"><b>Jorge Ruiz</b><span className="s">Sucursal Centro</span><span>—</span><span className="sal">—</span><span className="st out">Sin checar</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="marq" aria-hidden="true"><div className="marq-in" id="marq"><span>Reconocimiento facial</span><span>Validación GPS</span><span>Checada con QR o código</span><span>Horas extra según la LFT</span><span>Vacaciones y permisos</span><span>Aprobación por WhatsApp</span><span>Contratos y actas</span><span>Activos y uniformes</span><span>Aguinaldos y finiquitos</span><span>Evaluaciones 360°</span><span>Varias sucursales</span><span aria-hidden="true">Reconocimiento facial</span><span aria-hidden="true">Validación GPS</span><span aria-hidden="true">Checada con QR o código</span><span aria-hidden="true">Horas extra según la LFT</span><span aria-hidden="true">Vacaciones y permisos</span><span aria-hidden="true">Aprobación por WhatsApp</span><span aria-hidden="true">Contratos y actas</span><span aria-hidden="true">Activos y uniformes</span><span aria-hidden="true">Aguinaldos y finiquitos</span><span aria-hidden="true">Evaluaciones 360°</span><span aria-hidden="true">Varias sucursales</span></div></div>
          </section>
          <MosaicoModulos />
          <section className="fullband gris" id="producto">
            <div className="wrap row2">
              <div className="txt reveal">
                <h2>Checa donde trabaja tu equipo.</h2>
                <p>Registra la asistencia desde el celular de forma segura, rápida y en tiempo real.</p>
                <ul className="tags" id="m-tags"><li className="on">Rostro</li><li>QR</li><li>Código</li><li>GPS</li></ul>
              </div>
              <div className="stage reveal with-photo" style={{"--d": '.1s'}}>
                <div className="photo"><img src="/landing/campo.webp" alt="Técnico en obra registrando su llegada desde el celular" width={1400} height={1050} loading="lazy" /></div>
                <div className="phone"><div className="scr">
                    <div className="sbar"><span>08:58</span><span>●●● 100%</span></div>
                    <div className="app-in"><div className="app-logo"><img src="/landing/adamia-a.png" alt="" />ADAMIA</div><h4>Registrar asistencia</h4></div>
                    <div className="modes on"><p className="mode-tit">Reconocimiento facial</p><div className="cam" style={{background: '#e6eaf7'}}><svg viewBox="0 0 64 64" fill="none" stroke="#8b95c4" strokeWidth="2.4" strokeLinecap="round"><circle cx={32} cy={23} r={11} /><path d="M13 58c2-11 9.5-17 19-17s17 6 19 17" /></svg><span className="frame" style={{borderColor: '#2c56e8'}} /><span className="line" /></div></div>
                    <div className="modes"><p className="mode-tit">Escanea el código QR</p><div className="qr" id="qr" /></div>
                    <div className="modes"><p className="mode-tit">Tu código de empleado</p><div className="pin"><div className="dots"><i className="f" /><i className="f" /><i className="f" /><i /></div><div className="keys"><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b><b>6</b><b>7</b><b>8</b><b>9</b></div></div></div>
                    <div className="modes"><p className="mode-tit">Validando ubicación</p><div className="mapv"><span className="st1" /><span className="st2" /><span className="fence" /><span className="me" /><div className="lbl"><span>Planta Empaque · 38 m de 100 m</span><b>✓ Dentro</b></div></div></div>
                  </div></div>
              </div>
            </div>
          </section>
          <section className="blk" id="empresa">
            <div className="wrap row2 rev">
              <div className="txt reveal">
                <h2>Un permiso. Una decisión desde WhatsApp.</h2>
                <p>Solicita en el portal. Aprueba desde WhatsApp.</p>
                <div className="result" id="wa-res"><i><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></i><div><b>Permiso aprobado</b><span>Registrado en ADAMIA</span></div></div>
              </div>
              <div className="stage reveal with-photo" style={{"--d": '.1s'}} id="wa-stage">
                <div className="photo"><img src="/landing/supervisor.webp" alt="Supervisor de almacén aprobando un permiso desde su celular" width={1120} height={1400} loading="lazy" /></div>
                <div className="phone"><div className="scr lock">
                    <div className="sbar"><span /><span>●●● 100%</span></div>
                    <p className="big">08:31</p><p className="fecha">viernes, 20 de noviembre</p>
                    <div className="notif vis" id="wa-n">
                      <div className="app"><i><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" /></svg></i>WhatsApp · ahora</div>
                      <b>ADAMIA</b>
                      <p>Fernanda Ríos solicita un permiso por día personal el lunes 23. ¿Deseas aprobarlo?</p>
                      <div className="bt"><span>Rechazar</span><span className="ap" id="wa-ap">Aprobar</span></div>
                    </div>
                  </div></div>
              </div>
            </div>
          </section>
          <section className="fullband azul">
            <div className="wrap">
              <div className="solid blue reveal" id="hx-block">
                <div className="grid2">
                  <div style={{display: 'grid', gap: 18}}>
                    <span className="eyeb">Horas extra</span>
                    <h2>Paga lo justo. Ni un minuto más.</h2>
                    <p>Dobles y triples calculadas por semana, solo las que tu jefe autoriza.</p>
                    <div className="stats">
                      <div><b data-to="13.5" data-fmt="h">0</b><span>autorizadas esta semana</span></div>
                      <div><b data-to={9} data-fmt="h">0</b><span>al doble</span></div>
                      <div><b data-to="4.5" data-fmt="h">0</b><span>al triple</span></div>
                      <div><b data-to={2}>0</b><span>alertas de ley</span></div>
                    </div>
                  </div>
                  <div className="chartcard">
                    <h4>Horas extra por día</h4><small>Semana 16 – 22 nov · Planta Empaque</small>
                    <div className="bars">
                      <div className="b"><i className="d" style={{"--d": '40%', "--k": 0}} /><i className="t" style={{"--t": '0%', "--k": 0}} /></div>
                      <div className="b"><i className="d" style={{"--d": '40%', "--k": 1}} /><i className="t" style={{"--t": '0%', "--k": 1}} /></div>
                      <div className="b"><i className="d" style={{"--d": '45%', "--k": 2}} /><i className="t" style={{"--t": '10%', "--k": 2}} /></div>
                      <div className="b"><i className="d" style={{"--d": '30%', "--k": 3}} /><i className="t" style={{"--t": '15%', "--k": 3}} /></div>
                      <div className="b"><i className="d" style={{"--d": '25%', "--k": 4}} /><i className="t" style={{"--t": '20%', "--k": 4}} /></div>
                      <div className="b"><i className="d" style={{"--d": '12%', "--k": 5}} /><i className="t" style={{"--t": '0%', "--k": 5}} /></div>
                      <div className="b"><i className="d" style={{"--d": '0%', "--k": 6}} /><i className="t" style={{"--t": '0%', "--k": 6}} /></div>
                    </div>
                    <div className="blabels"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div>
                    <div className="legend2"><span style={{"--c": 'var(--blue)'}}>Al doble (hasta 9 h)</span><span style={{"--c": 'var(--violet)'}}>Al triple</span></div>
                    <div className="alert-line">▲ Gabriel Ortega: más de 4 h extra el miércoles</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="blk" id="semana">
            <div className="wrap">
              <div className="txt reveal" style={{textAlign: 'center', justifyItems: 'center', marginBottom: 44}}>
                <span className="eyebrow">Control semanal de horas</span>
                <h2>Cada semana, sus horas contra la ley.</h2>
                <p style={{maxWidth: '56ch'}}>El reporte semanal te dice quién va a pasar del límite antes de que pase. Y las reglas de aviso te mandan por correo los retardos y las faltas.</p>
              </div>
              <div className="wk-grid reveal" id="wk">
                <div className="wk-card">
                  <div className="wk-head"><div><b>Reporte semanal de horas</b><small>16 – 22 nov · Planta Empaque · límite LFT 46 h</small></div><span className="wk-day" id="wk-day">Lunes</span></div>
                  <div className="wk-days" id="wk-days"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span></div>
                  <div className="wk-rows" id="wk-rows" />
                  <div className="wk-foot"><span className="r-btnx">Exportar Excel</span><span className="r-btnx blue">Guardar PDF para firma</span></div>
                </div>
                <div className="feed2">
                  <p className="feed-tit">Notificaciones de la semana</p>
                  <div id="wk-feed" />
                </div>
              </div>
            </div>
          </section>
          <SeccionLey />
          <section className="fullband violeta">
            <div className="wrap">
              <div className="stage solid violet reveal" style={{minHeight: 0}} id="docs-stage">
                <div className="row2" style={{width: '100%'}}>
                  <div className="txt" style={{paddingLeft: 'clamp(0px,3vw,36px)'}}>
                    <h2>Contratos y registros en orden.</h2>
                    <p>Herramientas para respaldar el cumplimiento de la Ley Federal del Trabajo.</p>
                  </div>
                  <div style={{display: 'grid', placeItems: 'center', padding: '20px 0 40px'}}>
                    <div className="laptop">
                      <div className="lscr"><div className="lin">
                          <div className="lside"><div className="app-logo"><img src="/landing/adamia-a.png" alt="" />ADAMIA</div><span><i />Personas</span><span className="on"><i />Contratos</span><span><i />Documentos</span><span><i />Registros</span></div>
                          <div className="lmain" id="docs"><h5>Contratos</h5></div>
                        </div></div>
                      <div className="lbase" />
                      <div className="paper" id="paper"><h6>Contrato individual de trabajo</h6><i /><i style={{width: '90%'}} /><i /><i style={{width: '70%'}} /><i style={{width: '84%'}} /><svg viewBox="0 0 110 34" aria-hidden="true"><path d="M4 26c8-16 14-20 17-14s-5 16 2 15 10-21 16-19-3 18 5 16 8-10 13-12 5 9 12 6 10-7 17-9" /></svg><small>Firma del trabajador</small><span className="sello">FIRMADO</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="blk">
            <div className="wrap row2">
              <div className="txt reveal">
                <h2>Uniformes y equipo, con nombre y firma.</h2>
                <p>Entrega el paquete del puesto en un paso y recibe devoluciones sin papeles.</p>
                <ul className="tags"><li>Tallas</li><li>Resguardos</li><li>Devoluciones</li></ul>
              </div>
              <div className="stage reveal" style={{"--d": '.1s', minHeight: 0}}>
                <div className="photo" id="uni-photo" style={{aspectRatio: '4/3', width: '100%'}}>
                  <img src="/landing/uniformes.webp" alt="Entrega de uniforme y botas en el almacén de una empresa" width={1400} height={1050} loading="lazy" />
                  <div className="float-card" data-t={0} style={{left: '4%', top: '7%'}}><i style={{background: 'var(--violet)'}}><svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8 3 4 6v4l3 1v10h10V11l3-1V6l-4-3c0 2-2 3-4 3s-4-1-4-3z" /></svg></i><div>Entrega E-512<small>3 camisas M · botas 27 · chaleco M</small></div></div>
                  <div className="float-card" data-t={1} style={{right: '4%', bottom: '8%'}}><i><svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></i><div>Resguardo firmado<small>Luis Pérez · hoy 09:12</small></div></div>
                </div>
              </div>
            </div>
          </section>
          <section className="fullband gris">
            <div className="wrap row2">
              <div className="txt reveal">
                <h2>Cada colaborador tiene su espacio.</h2>
                <p>Consulta sus asistencias, solicitudes y vacaciones en un solo lugar.</p>
                <ul className="tags"><li>Asistencias</li><li>Solicitudes</li><li>Vacaciones</li></ul>
              </div>
              <div className="stage reveal" style={{"--d": '.1s'}} id="me-stage">
                <div className="phone"><div className="scr">
                    <div className="sbar"><span>9:41</span><span>●●● 100%</span></div>
                    <div className="app-in">
                      <div className="me-head"><h4>Mi espacio</h4><span className="me-av"><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={8} r={4} /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg></span></div>
                      <div className="week" aria-label="Esta semana"><span>L<i>✓</i></span><span>M<i>✓</i></span><span>M<i className="l">8:06</i></span><span>J<i>✓</i></span><span>V<i>✓</i></span><span>S<i className="n">—</i></span></div>
                      <div className="me-it"><i><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x={3} y={5} width={18} height={16} rx={2} /><path d="M3 10h18M8 3v4M16 3v4" /></svg></i><div><b>Historial de asistencias</b><small>Esta semana: 39 h 40 min</small></div></div>
                      <div className="me-it"><i><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M2 12h20M12 2v20" /><circle cx={12} cy={12} r={9} /></svg></i><div><b>Vacaciones</b><small><span id="vac-n">12</span> días disponibles</small></div></div>
                      <div className="me-it"><i><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M14 3H6v18h12V9z" /><path d="M14 3v6h6M9 14h6M9 18h4" /></svg></i><div><b>Solicitudes</b><small>Permiso del lunes · aprobado</small></div></div>
                    </div>
                  </div></div>
              </div>
            </div>
          </section>
          <section className="fullband marino">
            <div className="wrap">
              <div className="solid navy reveal" id="num-block">
                <div className="ind-grid">
                <div className="ind-txt">
                  <span className="eyeb">Indicadores</span>
                  <h2>Tu operación, en números. En tiempo real.</h2>
                  <p>Asistencia, retardos y horas extra de todas tus sucursales, al momento.</p>
                  <span className="tag-ej">Datos de ejemplo</span>
                <div className="nums">
                  <div><b data-to={97} data-fmt="%">0</b><span>asistencia del mes</span></div>
                  <div><b data-to={128}>0</b><span>presentes hoy</span></div>
                  <div><b data-to={4}>0</b><span>retardos hoy</span></div>
                  <div><b data-to={11} data-fmt="h">0</b><span>horas extra hoy</span></div>
                </div>
                </div>
                <div className="charts2">
                  <div className="chartcard">
                    <h4>Tendencia semanal de asistencia</h4><small>Presentes por día · últimas 2 semanas</small>
                    <svg className="line-svg" viewBox="0 0 520 190" preserveAspectRatio="none" aria-label="Asistencia entre 112 y 131 presentes por día">
                      <g className="gr"><line x1={0} y1={30} x2={520} y2={30} /><line x1={0} y1={90} x2={520} y2={90} /><line x1={0} y1={150} x2={520} y2={150} /></g>
                      <path className="ar" d="M10 120 L46 96 L82 84 L118 90 L154 78 L190 132 L226 150 L262 104 L298 88 L334 70 L370 76 L406 60 L442 120 L478 144 L510 98 L510 170 L10 170 Z" />
                      <path className="ln" d="M10 120 L46 96 L82 84 L118 90 L154 78 L190 132 L226 150 L262 104 L298 88 L334 70 L370 76 L406 60 L442 120 L478 144 L510 98" />
                      <text x={4} y={186}>9 nov</text><text x={470} y={186}>22 nov</text>
                    </svg>
                  </div>
                  <div className="chartcard">
                    <h4>Distribución de hoy</h4><small>132 empleados con turno</small>
                    <div className="donut">
                      <svg viewBox="0 0 140 140" aria-hidden="true"><circle cx={70} cy={70} r={52} stroke="#eef0f5" />
                        <circle className="seg" cx={70} cy={70} r={52} stroke="#16a34a" data-p="0.94" data-o={0} />
                        <circle className="seg" cx={70} cy={70} r={52} stroke="#d97706" data-p="0.03" data-o="0.94" />
                        <circle className="seg" cx={70} cy={70} r={52} stroke="#dc2626" data-p="0.03" data-o="0.97" /></svg>
                      <ul><li><span style={{"--c": '#16a34a'}}>Asistencia</span><b>124</b></li><li><span style={{"--c": '#d97706'}}>Retardo</span><b>4</b></li><li><span style={{"--c": '#dc2626'}}>Ausencia</span><b>4</b></li></ul>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </section>
          <section className="blk">
            <div className="wrap">
              <div className="photo reveal" id="eq-photo" style={{aspectRatio: '16/7'}}>
                <img src="/landing/equipo.webp" alt="Equipo de trabajo de una planta con uniforme azul" width={1400} height={788} loading="lazy" />
                <div className="float-card" data-t={0} style={{left: '4%', bottom: '10%', display: 'block'}}><span style={{fontSize: '.78rem', color: 'var(--muted)'}}>Evaluación anual 2026</span><div style={{display: 'flex', alignItems: 'baseline', gap: 8}}><span className="num" style={{color: 'var(--violet)'}}>93%</span><span>respondido</span></div><div className="prog"><i /></div></div>
                <div className="float-card bob" data-t={1} style={{right: '4%', top: '10%'}}><i style={{background: '#f59e0b'}}>★</i><div>Ana Torres · 4.6 de 5<small>Destaca en trabajo en equipo</small></div></div>
              </div>
              <div className="txt reveal" style={{textAlign: 'center', justifyItems: 'center', marginTop: 44}}>
                <h2>Haz crecer a tu gente.</h2>
                <p style={{maxWidth: '52ch'}}>Evaluaciones de autoevaluación a 360°, resultados y planes de acción para cada persona.</p>
              </div>
            </div>
          </section>
          <section className="more" id="modulos">
            <div className="wrap">
              <div className="txt reveal" style={{textAlign: 'center', justifyItems: 'center', marginBottom: 40}}>
                <span className="eyebrow">Todos los módulos</span>
                <h2><span className="cnt" data-to={36}>36</span> herramientas. Una sola cuenta.</h2>
              </div>
              <div className="allm reveal" id="allm">
                <article className="cat" style={{"--c": '#2c56e8'}}><header><span>10</span><b>Control de tiempo</b><small>Cada minuto, contado</small></header><ul><li style={{"--k": 0}}><i />Reloj checador facial</li><li style={{"--k": 1}}><i />Validación GPS y geocercas</li><li style={{"--k": 2}}><i />Checada con rostro, QR o código</li><li style={{"--k": 3}}><i />Asistencias</li><li style={{"--k": 4}}><i />Entradas y salidas</li><li style={{"--k": 5}}><i />Horas extra</li><li style={{"--k": 6}}><i />Turnos y turnos extra</li><li style={{"--k": 7}}><i />Centro de incidencias</li><li style={{"--k": 8}}><i />Reporte de horas</li><li style={{"--k": 9}}><i />Reportes personalizados</li></ul></article>
                <article className="cat" style={{"--c": '#5a3cf4'}}><header><span>8</span><b>Personal</b><small>El expediente completo</small></header><ul><li style={{"--k": 0}}><i />Empleados</li><li style={{"--k": 1}}><i />Expediente 360°</li><li style={{"--k": 2}}><i />Departamentos y puestos</li><li style={{"--k": 3}}><i />Contratos</li><li style={{"--k": 4}}><i />Actas administrativas</li><li style={{"--k": 5}}><i />Finiquitos y liquidaciones</li><li style={{"--k": 6}}><i />Aguinaldos</li><li style={{"--k": 7}}><i />Mapa de rutas</li></ul></article>
                <article className="cat" style={{"--c": '#16a34a'}}><header><span>6</span><b>Ausencias</b><small>Sin papeles ni Excel</small></header><ul><li style={{"--k": 0}}><i />Vacaciones según la ley</li><li style={{"--k": 1}}><i />Planeación de vacaciones</li><li style={{"--k": 2}}><i />Permisos por día u hora</li><li style={{"--k": 3}}><i />Aprobación por WhatsApp</li><li style={{"--k": 4}}><i />Días festivos</li><li style={{"--k": 5}}><i />Solicitudes de mi equipo</li></ul></article>
                <article className="cat" style={{"--c": '#d97706'}}><header><span>6</span><b>Documentos y gente</b><small>Orden y crecimiento</small></header><ul><li style={{"--k": 0}}><i />Biblioteca documental</li><li style={{"--k": 1}}><i />Generar documentos</li><li style={{"--k": 2}}><i />Firma en línea</li><li style={{"--k": 3}}><i />Activos y uniformes</li><li style={{"--k": 4}}><i />Evaluación de desempeño</li><li style={{"--k": 5}}><i />Reclutamiento y vacantes</li></ul></article>
                <article className="cat" style={{"--c": '#0b1033'}}><header><span>6</span><b>Tu empresa</b><small>Control total</small></header><ul><li style={{"--k": 0}}><i />Portal y app del empleado</li><li style={{"--k": 1}}><i />Varias empresas y sucursales</li><li style={{"--k": 2}}><i />Usuarios y permisos</li><li style={{"--k": 3}}><i />Reglas de aviso</li><li style={{"--k": 4}}><i />Campos personalizados</li><li style={{"--k": 5}}><i />Calculadora de aguinaldos</li></ul></article>
              </div>
            </div>
          </section>
          <section className="final" id="demo">
            <div className="wrap reveal" style={{display: 'grid', gap: 26, justifyItems: 'center'}}>
              <h2>Ve ADAMIA en acción.</h2>
              <Link className="btn btn-primary" href="/contacto">Solicitar una demostración <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
            </div>
          </section>
        </main>
        <SitioPie />
      </div>
    </div>
  );
}
