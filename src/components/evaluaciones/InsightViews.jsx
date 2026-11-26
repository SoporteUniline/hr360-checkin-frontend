"use client";
// (26/11/2026, desemp1) Plantillas base, tablero de campaña, PDF, Adamia AI, evidencia objetiva, aviso de privacidad y
// estado de WhatsApp. Todos los números y permisos vienen del servidor; aquí solo se muestran. La IA nunca guarda ni
// envía: sus sugerencias llenan el formulario y la persona decide.
import { useEffect, useState } from "react";
import { FileDown, Sparkles } from "lucide-react";
import { useEvaluations, useEvaluationQuery } from "./EvaluationContext";
import { Panel, Badge, Button, Notice, QueryState, Field, Textarea, Progress, DataTable, ExportButton } from "./ui";
import {
  BRECHA,
  aplicarBorrador,
  filasCalor,
  frasesEvidencia,
  mensajeIa,
  num,
  pct,
  planDeSugerencia,
  tonoCalificacion,
} from "@/lib/evaluaciones/tablero.mjs";

function guardarArchivo({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DescargarPdf({ path, filename, children = "Descargar PDF" }) {
  const { api, perform, busy } = useEvaluations();
  return (
    <Button variant="outline" disabled={busy} onClick={() => perform(async () => guardarArchivo(await api.download(path, filename)))}>
      <FileDown size={16} aria-hidden="true" /> {children}
    </Button>
  );
}

// Llamada a la IA con su propio estado (no recarga toda la pantalla ni pierde lo escrito).
function useIa() {
  const { api } = useEvaluations();
  const [estado, setEstado] = useState({ cargando: false, error: "", datos: null });
  const pedir = async (path, body = {}) => {
    setEstado((e) => ({ ...e, cargando: true, error: "" }));
    try {
      const datos = await api.mutate("POST", path, body);
      setEstado({ cargando: false, error: "", datos });
      return datos;
    } catch (e) {
      setEstado({ cargando: false, error: mensajeIa(e), datos: null });
      return null;
    }
  };
  return [estado, pedir, setEstado];
}

// ───────── Plantillas base ─────────
export function PlantillasBase() {
  const { api, perform, busy, navigate, capabilities } = useEvaluations();
  const query = useEvaluationQuery("/template-library", {}, { enabled: !!capabilities.flags?.canManageTemplates });
  const [abierta, setAbierta] = useState(null);
  if (!capabilities.flags?.canManageTemplates) return null;
  async function usar(key) {
    const r = await perform(() => api.mutate("POST", `/template-library/${key}/copy`, {}), "Plantilla copiada: ya puedes editarla");
    if (r?.id) navigate(`plantillas/${r.id}`);
  }
  return (
    <Panel title="Plantillas base listas para usar" description="Competencias con conductas observables, escala de 5 niveles y pesos. Al usarla se crea una copia de tu empresa que puedes editar.">
      <QueryState query={query}>
        <div className="ev-pad ev-base-grid">
          {(query.data || []).map((p) => (
            <article key={p.key} className="ev-base-card">
              <h3>{p.name.replace("Desempeño · ", "")}</h3>
              <p>{p.description}</p>
              <ul className="ev-chip-list" aria-label="Competencias">
                {p.competencies.map((c) => (
                  <li key={c.key}>
                    {c.name} · {c.weight}%
                  </li>
                ))}
              </ul>
              {abierta === p.key && (
                <ul className="ev-behaviors">
                  {p.competencies.flatMap((c) => c.behaviors.map((b) => <li key={`${c.key}:${b}`}>{b}</li>))}
                </ul>
              )}
              <div className="ev-actions">
                <Button disabled={busy} onClick={() => usar(p.key)}>
                  Usar esta plantilla
                </Button>
                <Button variant="ghost" onClick={() => setAbierta(abierta === p.key ? null : p.key)} aria-expanded={abierta === p.key}>
                  {abierta === p.key ? "Ocultar conductas" : `Ver ${p.questions} preguntas`}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </QueryState>
    </Panel>
  );
}

// ───────── Tablero de campaña ─────────
function Kpi({ etiqueta, valor, tono }) {
  return (
    <div className="ev-kpi">
      <strong className={tono ? `ev-text-${tono}` : undefined}>{valor}</strong>
      <span>{etiqueta}</span>
    </div>
  );
}

function Barra({ etiqueta, valor, extra }) {
  const tono = tonoCalificacion(valor);
  return (
    <div className="ev-bar-row">
      <span className="ev-bar-label">{etiqueta}</span>
      <span className="ev-bar-track" aria-hidden="true">
        <i className={`ev-bar-fill ev-fill-${tono}`} style={{ width: `${valor == null ? 0 : (Number(valor) / 5) * 100}%` }} />
      </span>
      <strong>{num(valor)}</strong>
      {extra && <small>{extra}</small>}
    </div>
  );
}

export function TableroCampania({ campaignId }) {
  const { capabilities } = useEvaluations();
  const permitido = capabilities.scopes.includes("dashboard");
  const query = useEvaluationQuery(`/campaigns/${campaignId}/analytics`, {}, { enabled: permitido });
  const [faltantes, setFaltantes] = useState(false);
  if (!permitido) return null;
  const a = query.data;
  return (
    <Panel
      title="Tablero de la campaña"
      description="Calculado con las mismas reglas que cada resultado: lo confidencial no se muestra."
      actions={
        <div className="ev-actions">
          <ExportButton filters={{ campaignId: Number(campaignId) }} />
          <DescargarPdf path={`/campaigns/${campaignId}/report.pdf`} filename={`informe-campania-${campaignId}.pdf`}>
            PDF de campaña
          </DescargarPdf>
        </div>
      }
    >
      <QueryState query={query}>
        {a && (
          <div className="ev-pad ev-stack">
            <div className="ev-kpis">
              <Kpi etiqueta="Avance de respuestas" valor={pct(a.progress.percent)} />
              <Kpi etiqueta="Con resultado" valor={`${a.distribution.n} de ${a.progress.subjects}`} />
              <Kpi etiqueta="Promedio (1 a 5)" valor={num(a.distribution.average)} tono={tonoCalificacion(a.distribution.average)} />
              <Kpi etiqueta="Brecha auto − jefe" valor={num(a.gap.average)} />
            </div>
            {a.distribution.partial > 0 && <Notice tone="amber">{a.distribution.partial} resultado(s) parcial(es): la campaña se cerró sin todas las respuestas.</Notice>}

            <section aria-labelledby="ev-avance">
              <h3 id="ev-avance">Avance y quién falta</h3>
              {a.progress.byPerspective.map((p) => (
                <Progress key={p.key} value={p.total ? (p.done / p.total) * 100 : 0} label={`${p.label}: ${p.done} de ${p.total}`} />
              ))}
              {a.progress.missing.length > 0 && (
                <>
                  <Button variant="ghost" aria-expanded={faltantes} onClick={() => setFaltantes(!faltantes)}>
                    {faltantes ? "Ocultar" : `Ver quién falta (${a.progress.missing.length} evaluaciones de ${a.progress.evaluatorsMissing} personas)`}
                  </Button>
                  {faltantes && (
                    <DataTable
                      rows={a.progress.missing.map((m) => ({ ...m, id: m.assignmentId }))}
                      columns={[
                        { key: "evaluatorName", label: "Evaluador" },
                        { key: "subjectName", label: "Evalúa a" },
                        { key: "perspectiveLabel", label: "Perspectiva" },
                      ]}
                    />
                  )}
                </>
              )}
            </section>

            <div className="ev-grid">
              <section aria-labelledby="ev-areas">
                <h3 id="ev-areas">Distribución por área</h3>
                <DataTable
                  rows={a.byArea.map((r) => ({ ...r, id: String(r.id) }))}
                  columns={[
                    { key: "name", label: "Área" },
                    { key: "n", label: "Con resultado", render: (r) => `${r.n} de ${r.people}` },
                    { key: "average", label: "Promedio", render: (r) => <Badge tone={tonoCalificacion(r.average)}>{num(r.average)}</Badge> },
                    { key: "bands", label: "Semáforo", render: (r) => `${r.bands.below} · ${r.bands.mid} · ${r.bands.high}` },
                  ]}
                />
                <small>Semáforo: menos de 3 · de 3 a 3.99 · 4 o más.</small>
              </section>
              <section aria-labelledby="ev-comp">
                <h3 id="ev-comp">Por competencia (de menor a mayor)</h3>
                {a.competencies.length ? a.competencies.map((c) => <Barra key={c.key} etiqueta={c.name} valor={c.average} extra={`n=${c.n}`} />) : <p>Aún sin calificaciones.</p>}
              </section>
            </div>

            {a.heatmap.rows.length > 0 && (
              <section aria-labelledby="ev-calor">
                <h3 id="ev-calor">Mapa de calor: competencia × área</h3>
                <div className="ev-heat" role="table" aria-label="Promedio por competencia y área">
                  <div className="ev-heat-row ev-heat-head" role="row" style={{ "--cols": a.heatmap.areas.length }}>
                    <span role="columnheader">Competencia</span>
                    {a.heatmap.areas.map((x) => (
                      <span role="columnheader" key={String(x.id)}>
                        {x.name}
                      </span>
                    ))}
                  </div>
                  {filasCalor(a.heatmap).map((r) => (
                    <div className="ev-heat-row" role="row" key={r.key} style={{ "--cols": a.heatmap.areas.length }}>
                      <span role="rowheader">{r.name}</span>
                      {r.cells.map((c, i) => (
                        <span role="cell" key={String(c.areaId)} className={`ev-heat-cell ev-heat-${c.tono}`} title={`n=${c.n}`}>
                          <em className="ev-heat-area">{a.heatmap.areas[i].name}</em>
                          {c.texto}
                          {c.pocos && <small> (n={c.n})</small>}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="ev-brecha">
              <h3 id="ev-brecha">Brecha autoevaluación vs jefe</h3>
              {a.gap.n ? (
                <>
                  <p>
                    {a.gap.n} persona(s) con ambas evaluaciones · {a.gap.overrate} se califican más alto y {a.gap.underrate} más bajo que su jefe (±{a.gap.threshold}).
                  </p>
                  <DataTable
                    rows={a.gap.people.map((g) => ({ ...g, id: g.employeeId }))}
                    columns={[
                      { key: "name", label: "Persona" },
                      { key: "self", label: "Auto", render: (g) => num(g.self) },
                      { key: "manager", label: "Jefe", render: (g) => num(g.manager) },
                      { key: "gap", label: "Brecha", render: (g) => <Badge tone={BRECHA[g.signal].tono}>{`${g.gap > 0 ? "+" : ""}${num(g.gap)} · ${BRECHA[g.signal].texto}`}</Badge> },
                    ]}
                  />
                </>
              ) : (
                <p>Todavía no hay personas con autoevaluación y evaluación del jefe enviadas.</p>
              )}
            </section>

            {a.nom035 && (
              <Notice>
                NOM-035 · {a.nom035.factor}: {pct(a.nom035.retroalimentacionPct)} con retroalimentación publicada y {pct(a.nom035.acusePct)} con acuse. {a.nom035.nota}
              </Notice>
            )}
            <PreguntaResultados campaignId={campaignId} />
          </div>
        )}
      </QueryState>
    </Panel>
  );
}

// «Pregúntale a tus resultados»: solo datos agregados de la campaña, sin personas.
export function PreguntaResultados({ campaignId }) {
  const [pregunta, setPregunta] = useState("");
  const [ia, pedir] = useIa();
  return (
    <section className="ev-ai-box" aria-labelledby="ev-pregunta">
      <h3 id="ev-pregunta">
        <Sparkles size={16} aria-hidden="true" /> Pregúntale a tus resultados
      </h3>
      <p>Adamia AI responde con los datos agregados de esta campaña (sin nombres; las áreas chicas van juntas). Usa créditos.</p>
      <Field label="Tu pregunta">
        <Textarea value={pregunta} maxLength={500} placeholder="¿Qué competencia debemos reforzar primero y en qué área?" onChange={(e) => setPregunta(e.target.value)} />
      </Field>
      <div className="ev-actions">
        <Button disabled={ia.cargando || pregunta.trim().length < 5} onClick={() => pedir(`/campaigns/${campaignId}/ai-ask`, { pregunta })}>
          {ia.cargando ? "Pensando…" : "Preguntar"}
        </Button>
      </div>
      {ia.error && <Notice tone="red">{ia.error}</Notice>}
      {ia.datos && (
        <div className="ev-ai-answer" aria-live="polite">
          <p>{ia.datos.respuesta}</p>
          {ia.datos.cifras?.length > 0 && (
            <ul>
              {ia.datos.cifras.map((c, i) => (
                <li key={i}>
                  {c.dato}: <strong>{c.valor}</strong>
                </li>
              ))}
            </ul>
          )}
          {ia.datos.siguientePaso && <p>Siguiente paso: {ia.datos.siguientePaso}</p>}
          <small>Respuesta de Adamia AI con grupos de {ia.datos.minimoGrupo} personas o más. Revisa las cifras en el tablero.</small>
        </div>
      )}
    </section>
  );
}

// ───────── Resultado de una persona: resumen 360, plan sugerido y evolución ─────────
export function IaResultado({ campaignId, subjectId, onPlan }) {
  const { capabilities, actor } = useEvaluations();
  const staff = ["hr", "direction"].includes(capabilities.profile);
  const jefe = capabilities.profile === "manager" && String(subjectId) !== actor.id;
  const [resumen, pedirResumen, setResumen] = useIa();
  const [plan, pedirPlan] = useIa();
  const base = `/campaigns/${campaignId}/results/${subjectId}`;
  // Al abrir se consulta el resumen ya generado (no gasta IA).
  useEffect(() => {
    if (staff) pedirResumen(`${base}/ai-summary`, { soloGuardado: true }).then((d) => d?.vacio && setResumen((e) => ({ ...e, datos: null })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, staff]);
  if (!staff && !jefe) return null;
  return (
    <Panel title="Adamia AI" description="Sugerencias para revisar: la IA no califica ni publica nada.">
      <div className="ev-pad ev-stack">
        {staff && (
          <section className="ev-ai-box">
            <h3>Resumen 360°</h3>
            <div className="ev-actions">
              <Button variant="outline" disabled={resumen.cargando} onClick={() => pedirResumen(`${base}/ai-summary`, { regenerar: !!resumen.datos })}>
                <Sparkles size={16} aria-hidden="true" /> {resumen.cargando ? "Resumiendo…" : resumen.datos ? "Volver a generar" : "Resumir con IA"}
              </Button>
            </div>
            {resumen.error && <Notice tone="red">{resumen.error}</Notice>}
            {resumen.datos?.resumen && (
              <div className="ev-ai-answer">
                <p>{resumen.datos.resumen}</p>
                {resumen.datos.fortalezas?.length > 0 && (
                  <>
                    <strong>Fortalezas</strong>
                    <ul>{resumen.datos.fortalezas.map((f) => <li key={f}>{f}</li>)}</ul>
                  </>
                )}
                {resumen.datos.oportunidades?.length > 0 && (
                  <>
                    <strong>Oportunidades</strong>
                    <ul>{resumen.datos.oportunidades.map((f) => <li key={f}>{f}</li>)}</ul>
                  </>
                )}
                {resumen.datos.privadas?.length > 0 && <small>Sin datos de {resumen.datos.privadas.join(", ")}: no llegaron al mínimo de respuestas (confidencial).</small>}
              </div>
            )}
          </section>
        )}
        <section className="ev-ai-box">
          <h3>Plan de desarrollo sugerido</h3>
          <div className="ev-actions">
            <Button variant="outline" disabled={plan.cargando} onClick={() => pedirPlan(`${base}/ai-plan`)}>
              <Sparkles size={16} aria-hidden="true" /> {plan.cargando ? "Preparando…" : "Sugerir plan"}
            </Button>
          </div>
          {plan.error && <Notice tone="red">{plan.error}</Notice>}
          {plan.datos?.acciones?.map((a, i) => (
            <div key={i} className="ev-ai-answer">
              <strong>{a.titulo}</strong>
              <p>
                {a.medidaDeExito} · {a.dias} días{a.competencia ? ` · ${a.competencia}` : ""}
              </p>
              {onPlan && (
                <Button variant="ghost" onClick={() => onPlan(planDeSugerencia(a))}>
                  Crear plan con esta acción
                </Button>
              )}
            </div>
          ))}
        </section>
      </div>
    </Panel>
  );
}

export function Evolucion({ employeeId }) {
  const query = useEvaluationQuery(`/people/${employeeId}/evolution`);
  const items = query.data || [];
  if (!query.loading && items.length < 2) return null;
  const claves = [...new Map(items.flatMap((i) => i.categories).map((c) => [c.key, c.name])).entries()];
  return (
    <Panel title="Evolución" description="Resultados publicados de esta persona, del más antiguo al más reciente.">
      <QueryState query={query}>
        <div className="ev-pad ev-stack">
          {items.map((i) => (
            <Barra key={i.campaignId} etiqueta={i.campaignName} valor={i.score} extra={i.comparable === false ? "otra plantilla" : undefined} />
          ))}
          {claves.length > 0 && (
            <DataTable
              rows={claves.map(([key, name]) => ({ id: key, name, ...Object.fromEntries(items.map((i) => [`c${i.campaignId}`, i.categories.find((c) => c.key === key)?.score ?? null])) }))}
              columns={[{ key: "name", label: "Competencia" }, ...items.map((i) => ({ key: `c${i.campaignId}`, label: i.campaignName, render: (r) => num(r[`c${i.campaignId}`]) }))]}
            />
          )}
        </div>
      </QueryState>
    </Panel>
  );
}

// ───────── Al responder: evidencia objetiva y borrador del jefe ─────────
export function EvidenciaEvaluacion({ assignment }) {
  const permitido = ["descending", "hr", "self"].includes(assignment.perspective);
  const query = useEvaluationQuery(`/assignments/${assignment.id}/evidence`, {}, { enabled: permitido });
  if (!permitido) return null;
  const e = query.data;
  return (
    <Panel title="Evidencia del periodo" description="Contexto para evaluar: no califica sola.">
      <QueryState query={query}>
        {e && (
          <div className="ev-pad ev-stack ev-evidence">
            {frasesEvidencia(e).map((f) => (
              <p key={f}>{f}</p>
            ))}
            {e.tareas && (
              <p>
                Tareas: {e.tareas.hechas} de {e.tareas.asignadas} terminadas ({pct(e.tareas.cumplimientoPct)}), {e.tareas.aTiempo} a tiempo, {e.tareas.vencidas} vencidas.
              </p>
            )}
            {e.checklists?.asignados > 0 && (
              <p>
                Checklists: {e.checklists.enviados} de {e.checklists.asignados} enviados · promedio {num(e.checklists.promedio, 1)}.
              </p>
            )}
            {!e.asistencia && !e.tareas && <p>Sin datos de asistencia ni tareas en el periodo.</p>}
            <small>
              Periodo {e.periodo.inicio} a {e.periodo.fin}. Mismas reglas que nómina y el reporte de asistencias; incapacidad, maternidad, vacaciones y permisos no cuentan en contra.
            </small>
          </div>
        )}
      </QueryState>
    </Panel>
  );
}

export function BorradorIa({ assignment, answers, locked, onApply }) {
  const { capabilities } = useEvaluations();
  const [notas, setNotas] = useState("");
  const [ia, pedir] = useIa();
  const [aplicado, setAplicado] = useState("");
  const estado = useEvaluationQuery("/ai/status", {}, { enabled: !locked && ["descending", "hr"].includes(assignment.perspective) });
  if (locked || !["descending", "hr"].includes(assignment.perspective)) return null;
  const s = estado.data;
  const disponible = s && s.migracion && s.activo && (s.panel || (capabilities.profile === "manager" && s.jefes));
  if (!disponible) return null;
  function aplicar(reemplazar) {
    const r = aplicarBorrador(answers, ia.datos.respuestas, { reemplazar });
    onApply(r.respuestas, ia.datos.comentario);
    setAplicado(`${r.aplicadas} respuesta(s) llenadas. Revisa, cambia lo que haga falta y guarda: nada se envió.`);
  }
  return (
    <Panel title="Borrador con Adamia AI" description="Usa la evidencia del periodo y tus notas. Tú decides cada respuesta.">
      <div className="ev-pad ev-stack">
        <Field label="Tus notas (opcional)" hint="Ejemplos concretos del periodo. No escribas datos de salud ni personales.">
          <Textarea value={notas} maxLength={2000} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        <Button variant="outline" disabled={ia.cargando} onClick={() => pedir(`/assignments/${assignment.id}/ai-draft`, { notas })}>
          <Sparkles size={16} aria-hidden="true" /> {ia.cargando ? "Preparando borrador…" : "Preparar borrador"}
        </Button>
        {ia.error && <Notice tone="red">{ia.error}</Notice>}
        {ia.datos && (
          <div className="ev-ai-answer">
            <p>{ia.datos.aviso}</p>
            <ul>
              {ia.datos.respuestas.filter((r) => r.razon).slice(0, 8).map((r) => (
                <li key={r.id}>{r.razon}</li>
              ))}
            </ul>
            {ia.datos.advertencias?.map((a) => <Notice key={a} tone="amber">{a}</Notice>)}
            <div className="ev-actions">
              <Button onClick={() => aplicar(false)}>Llenar las vacías</Button>
              <Button variant="ghost" onClick={() => aplicar(true)}>Reemplazar todas</Button>
            </div>
          </div>
        )}
        {aplicado && <Notice tone="green">{aplicado}</Notice>}
      </div>
    </Panel>
  );
}

// ───────── Portal del empleado: aviso de privacidad ─────────
export function AvisoPrivacidad() {
  const { api, perform, busy, capabilities } = useEvaluations();
  const query = useEvaluationQuery("/privacy-notice");
  const [abierto, setAbierto] = useState(false);
  const d = query.data;
  if (!d || capabilities.employeeId == null) return null;
  if (d.aceptadoEn && !abierto)
    return (
      <p className="ev-privacy-line">
        Leíste el aviso de privacidad de la evaluación.{" "}
        <button type="button" className="ev-link" onClick={() => setAbierto(true)}>
          Volver a leer
        </button>
      </p>
    );
  return (
    <Panel title={d.aviso.titulo} description={`Versión ${d.aviso.version}${d.requerido ? " · tu empresa pide leerlo antes de enviar una evaluación" : ""}`}>
      <div className="ev-pad ev-stack ev-privacy">
        {(abierto || !d.aceptadoEn ? d.aviso.secciones : []).map((s) => (
          <div key={s.titulo}>
            <h3>{s.titulo}</h3>
            <p>{s.texto}</p>
          </div>
        ))}
        {!d.aceptadoEn && d.migracion && (
          <Button disabled={busy} onClick={() => perform(() => api.mutate("POST", "/privacy-notice/accept", { version: d.aviso.version }), "Listo: quedó registrado que leíste el aviso")}>
            Lo leí
          </Button>
        )}
        {d.aceptadoEn && (
          <Button variant="ghost" onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        )}
      </div>
    </Panel>
  );
}

// ───────── Configuración: WhatsApp ─────────
export function EstadoWhatsapp() {
  const query = useEvaluationQuery("/whatsapp/status");
  const d = query.data;
  return (
    <Panel title="Avisos por WhatsApp" description="Evaluación por responder, resultado publicado y acuse pendiente. El correo sigue saliendo como respaldo.">
      <QueryState query={query}>
        {d && (
          <div className="ev-pad ev-stack">
            {!d.configurado && <Notice tone="amber">{d.motivo}. Mientras tanto solo sale el correo.</Notice>}
            {!d.migracion && <Notice tone="amber">Falta preparar la base de datos de evaluaciones: no se mandará WhatsApp.</Notice>}
            {d.configurado && d.migracion && <Notice tone="green">Listo para enviar cuando enciendas «Avisos por WhatsApp» arriba.</Notice>}
            <details>
              <summary>Mensajes aprobados por WhatsApp (no se pueden cambiar)</summary>
              {(Array.isArray(d.plantillas) ? d.plantillas : []).map((p) => (
                <p key={p.nombre}>
                  <strong>{p.nombre}</strong>: {p.cuerpo}
                </p>
              ))}
            </details>
            {d.ultimos30Dias?.length > 0 && (
              <p>
                Últimos 30 días: {d.ultimos30Dias.map((u) => `${u.n} ${u.estado === "sent" ? "enviados" : u.estado === "failed" ? "rechazados" : "pendientes"}`).join(" · ")}
              </p>
            )}
          </div>
        )}
      </QueryState>
    </Panel>
  );
}
