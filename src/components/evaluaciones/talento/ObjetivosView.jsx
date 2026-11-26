"use client";
// Objetivos simples: 3 a 5 por persona y periodo, con peso, métrica y avance mensual. La persona los propone y registra su
// avance (también desde el celular); su jefe o RH los aprueban. docs/evaluaciones/talento.md.
import { useState } from "react";
import { useEvaluationQuery } from "../EvaluationContext";
import { Heading, Panel, Badge, Progress, Empty, Notice, Modal, Button, QueryState, Textarea } from "../ui";
import { periodosDe, mesesParaAvance, nombreMes, estadoObjetivos } from "@/lib/evaluaciones/talento.mjs";
import { useTalento, useCompaneros, hoyMx, fecha } from "./comun";

const ESTADO = { borrador: ["Por aprobar", "amber"], aprobado: ["Aprobado", "green"], cancelado: ["Cancelado", "gray"] };
const vacio = { title: "", metric: "", weight: "", target: "", unit: "", description: "", areaObjectiveId: "" };

export function ObjetivosView() {
  const { enviar, yo, esRh, esStaff, capabilities } = useTalento();
  const anio = hoyMx().slice(0, 4);
  const [periodo, setPeriodo] = useState(anio);
  const companeros = useCompaneros();
  const equipo = companeros.filter((p) => Number(p.managerId) === yo);
  const [persona, setPersona] = useState(yo);
  const query = useEvaluationQuery("/objectives", { period: periodo });
  const areas = useEvaluationQuery("/area-objectives", { period: periodo });
  const [form, setForm] = useState(null); // { modo: "nuevo" | objetivo, datos }
  const [avance, setAvance] = useState(null);
  const [comentario, setComentario] = useState(null);
  const [cancelar, setCancelar] = useState(null);
  const [nuevaArea, setNuevaArea] = useState(null);

  const elegibles = esStaff ? companeros : [...companeros.filter((p) => Number(p.id) === yo), ...equipo];
  const actual = persona ?? elegibles[0]?.id ?? null;
  const fila = (query.data || []).find((p) => Number(p.employeeId) === Number(actual));
  const objetivos = fila?.objectives ?? [];
  const info = companeros.find((p) => Number(p.id) === Number(actual));
  const soyYo = Number(actual) === yo;
  const soyJefe = info && Number(info.managerId) === yo;
  const puedeDefinir = soyYo || soyJefe || esRh;
  const puedeAprobar = soyJefe || esRh;
  const estado = estadoObjetivos(objetivos);

  async function guardar() {
    const d = form.datos;
    const cuerpo = { ...d, weight: Number(d.weight), target: d.target === "" ? null : Number(d.target), areaObjectiveId: d.areaObjectiveId || null };
    const ok = form.modo === "nuevo"
      ? await enviar("POST", "/objectives", { ...cuerpo, employeeId: actual, period: periodo }, "Objetivo agregado")
      : await enviar("PATCH", `/objectives/${form.modo.id}`, { ...cuerpo, revision: form.modo.revision }, "Objetivo guardado");
    if (ok) setForm(null);
  }

  return (
    <div className="tl">
      <Heading
        title="Objetivos"
        description="De 3 a 5 objetivos por persona y periodo, con su peso y cómo se miden. El avance se registra cada mes y el jefe directo los aprueba."
      />
      <div className="tl-toolbar">
        <label className="tl-label">
          Periodo
          <select className="ev-input" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {[...periodosDe(Number(anio) - 1), ...periodosDe(anio), ...periodosDe(Number(anio) + 1)].map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        {elegibles.length > 1 && (
          <label className="tl-label">
            Persona
            <select className="ev-input" value={actual ?? ""} onChange={(e) => setPersona(Number(e.target.value))}>
              {elegibles.map((p) => <option key={p.id} value={p.id}>{Number(p.id) === yo ? `Yo · ${p.name}` : p.name}</option>)}
            </select>
          </label>
        )}
      </div>
      <QueryState query={query}>
        {actual == null ? (
          <Empty title="Elige a una persona" description="Escoge de quién quieres ver los objetivos." />
        ) : (
          <Panel
            title={soyYo ? "Mis objetivos" : `Objetivos de ${info?.name ?? fila?.name ?? "la persona"}`}
            description={estado.texto}
            actions={
              <div className="ev-actions">
                {puedeDefinir && estado.canAdd && <Button onClick={() => setForm({ modo: "nuevo", datos: { ...vacio } })}>Agregar objetivo</Button>}
                {puedeAprobar && estado.ready && objetivos.some((o) => o.status === "borrador") && (
                  <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => enviar("POST", "/objectives/approve", { employeeId: actual, period: periodo }, "Objetivos aprobados")}>
                    Aprobar objetivos
                  </Button>
                )}
              </div>
            }
          >
            <div className="ev-pad">
              {fila?.summary?.percent != null && <Progress label="Cumplimiento ponderado" value={fila.summary.percent} />}
              {!objetivos.length ? (
                <Empty title="Sin objetivos en este periodo" description={puedeDefinir ? "Agrega el primero: qué se va a lograr, cómo se mide y cuánto pesa." : "Aún no tiene objetivos."} />
              ) : (
                <div className="tl-cards" style={{ marginTop: 14 }}>
                  {objetivos.map((o) => {
                    const [txt, tono] = ESTADO[o.status] ?? [o.status, "gray"];
                    const meses = mesesParaAvance(o.periodStart, o.periodEnd, hoyMx());
                    return (
                      <article key={o.id} className="tl-card">
                        <div className="tl-row">
                          <Badge tone={tono}>{txt}</Badge>
                          <span className="tl-muted">Peso {o.weight} %</span>
                        </div>
                        <h3>{o.title}</h3>
                        <div className="tl-meta">
                          <span>Métrica: {o.metric}</span>
                          {o.target != null && <span>Meta: {o.target}{o.unit ? ` ${o.unit}` : ""}</span>}
                          {o.areaObjective && <span>Alineado a: {o.areaObjective}</span>}
                        </div>
                        <Progress label="Avance" value={o.progress} />
                        {o.updates.length > 0 && (
                          <ul className="tl-list" aria-label="Avances por mes">
                            {o.updates.slice(-3).reverse().map((u) => (
                              <li key={u.month}><strong>{nombreMes(u.month)}: {u.progress} %</strong>{u.value != null ? ` · ${u.value}` : ""}{u.comment ? ` — ${u.comment}` : ""}</li>
                            ))}
                          </ul>
                        )}
                        {o.comments.filter((c) => c.type === "comentario").slice(-2).map((c, i) => (
                          <p key={i}><strong>{c.by}:</strong> {c.text} <span className="tl-muted">· {fecha(c.at)}</span></p>
                        ))}
                        <div className="ev-actions">
                          {o.status === "aprobado" && (soyYo || puedeAprobar) && meses.length > 0 && (
                            <Button onClick={() => setAvance({ o, month: meses[0], progress: o.progress, value: "", comment: "", meses })}>Registrar avance</Button>
                          )}
                          {(soyYo || puedeAprobar) && <Button variant="outline" onClick={() => setComentario({ o, text: "" })}>Comentar</Button>}
                          {(o.status === "borrador" ? puedeDefinir : puedeAprobar) && (
                            <Button variant="outline" onClick={() => setForm({ modo: o, datos: { title: o.title, metric: o.metric, weight: String(o.weight), target: o.target ?? "", unit: o.unit ?? "", description: o.description ?? "", areaObjectiveId: o.areaObjectiveId ?? "" } })}>Editar</Button>
                          )}
                          {(puedeAprobar || (soyYo && o.status === "borrador")) && <Button variant="ghost" onClick={() => setCancelar({ o, reason: "" })}>Quitar</Button>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>
        )}
      </QueryState>

      {(esRh || (areas.data || []).length > 0) && (
        <Panel title="Objetivos de área" description="Opcional: cada objetivo personal se puede alinear a uno del área." actions={esRh && <Button variant="outline" onClick={() => setNuevaArea({ area: "", title: "" })}>Agregar objetivo de área</Button>}>
          <div className="ev-pad">
            {(areas.data || []).length ? (
              <ul className="tl-list">{areas.data.map((a) => <li key={a.id}><strong>{a.area}:</strong> {a.title}</li>)}</ul>
            ) : <p className="tl-muted">Sin objetivos de área en este periodo.</p>}
          </div>
        </Panel>
      )}

      <Modal open={!!form} onOpenChange={() => setForm(null)} title={form?.modo === "nuevo" ? "Nuevo objetivo" : "Editar objetivo"}
        description={form?.modo !== "nuevo" && form?.modo?.status === "aprobado" ? "Al guardar vuelve a aprobación del jefe." : "Escribe qué se va a lograr y cómo se mide."}
        footer={<><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button onClick={guardar}>Guardar</Button></>}>
        {form && (
          <div className="tl-form">
            <label className="tl-full">Objetivo<input className="ev-input" maxLength={200} value={form.datos.title} onChange={(e) => setForm({ ...form, datos: { ...form.datos, title: e.target.value } })} /></label>
            <label className="tl-full">Métrica (cómo se mide)<input className="ev-input" maxLength={200} value={form.datos.metric} onChange={(e) => setForm({ ...form, datos: { ...form.datos, metric: e.target.value } })} /></label>
            <label>Peso (%)<input className="ev-input" type="number" inputMode="numeric" min={1} max={100} value={form.datos.weight} onChange={(e) => setForm({ ...form, datos: { ...form.datos, weight: e.target.value } })} /></label>
            <label>Meta (opcional)<input className="ev-input" type="number" inputMode="decimal" value={form.datos.target} onChange={(e) => setForm({ ...form, datos: { ...form.datos, target: e.target.value } })} /></label>
            <label>Unidad<input className="ev-input" maxLength={30} placeholder="MXN, clientes, %" value={form.datos.unit} onChange={(e) => setForm({ ...form, datos: { ...form.datos, unit: e.target.value } })} /></label>
            <label>Objetivo de área
              <select className="ev-input" value={form.datos.areaObjectiveId} onChange={(e) => setForm({ ...form, datos: { ...form.datos, areaObjectiveId: e.target.value } })}>
                <option value="">Ninguno</option>
                {(areas.data || []).map((a) => <option key={a.id} value={a.id}>{a.area}: {a.title}</option>)}
              </select>
            </label>
            <label className="tl-full">Descripción<Textarea label="Descripción" maxLength={1000} value={form.datos.description} onChange={(e) => setForm({ ...form, datos: { ...form.datos, description: e.target.value } })} /></label>
          </div>
        )}
      </Modal>

      <Modal open={!!avance} onOpenChange={() => setAvance(null)} title="Registrar avance" description={avance?.o.title}
        footer={<><Button variant="outline" onClick={() => setAvance(null)}>Cancelar</Button>
          <Button onClick={async () => { if (await enviar("POST", `/objectives/${avance.o.id}/progress`, { month: avance.month, progress: Number(avance.progress), value: avance.value === "" ? null : Number(avance.value), comment: avance.comment }, "Avance guardado")) setAvance(null); }}>Guardar avance</Button></>}>
        {avance && (
          <div className="tl-form">
            <label>Mes<select className="ev-input" value={avance.month} onChange={(e) => setAvance({ ...avance, month: e.target.value })}>{avance.meses.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}</select></label>
            <label>Avance (%)<input className="ev-input" type="number" inputMode="numeric" min={0} max={100} value={avance.progress} onChange={(e) => setAvance({ ...avance, progress: e.target.value })} /></label>
            <label className="tl-full">Avance<input type="range" min={0} max={100} step={5} value={avance.progress} aria-label="Avance en porcentaje" onChange={(e) => setAvance({ ...avance, progress: e.target.value })} /></label>
            <label>Valor logrado (opcional)<input className="ev-input" type="number" inputMode="decimal" value={avance.value} onChange={(e) => setAvance({ ...avance, value: e.target.value })} /></label>
            <label className="tl-full">Comentario<Textarea label="Comentario" maxLength={1000} value={avance.comment} onChange={(e) => setAvance({ ...avance, comment: e.target.value })} /></label>
            <p className="tl-full tl-muted">Si ya registraste este mes, se corrige (no se duplica).</p>
          </div>
        )}
      </Modal>

      <Modal open={!!comentario} onOpenChange={() => setComentario(null)} title="Comentar objetivo" description={comentario?.o.title}
        footer={<><Button variant="outline" onClick={() => setComentario(null)}>Cancelar</Button><Button onClick={async () => { if (await enviar("POST", `/objectives/${comentario.o.id}/comments`, { text: comentario.text }, "Comentario agregado")) setComentario(null); }}>Comentar</Button></>}>
        {comentario && <Textarea label="Comentario" value={comentario.text} maxLength={1000} onChange={(e) => setComentario({ ...comentario, text: e.target.value })} />}
      </Modal>

      <Modal open={!!cancelar} onOpenChange={() => setCancelar(null)} title="Quitar objetivo" description="Los demás vuelven a aprobación porque cambian los pesos."
        footer={<><Button variant="outline" onClick={() => setCancelar(null)}>No</Button><Button onClick={async () => { if (await enviar("POST", `/objectives/${cancelar.o.id}/cancel`, { reason: cancelar.reason, revision: cancelar.o.revision }, "Objetivo quitado")) setCancelar(null); }}>Quitar</Button></>}>
        {cancelar && <label className="tl-label">Motivo<input className="ev-input" maxLength={300} value={cancelar.reason} onChange={(e) => setCancelar({ ...cancelar, reason: e.target.value })} /></label>}
      </Modal>

      <Modal open={!!nuevaArea} onOpenChange={() => setNuevaArea(null)} title="Objetivo de área" description={`Periodo ${periodo}`}
        footer={<><Button variant="outline" onClick={() => setNuevaArea(null)}>Cancelar</Button><Button onClick={async () => { if (await enviar("POST", "/area-objectives", { ...nuevaArea, period: periodo }, "Objetivo de área agregado")) setNuevaArea(null); }}>Guardar</Button></>}>
        {nuevaArea && (
          <div className="tl-form">
            <label>Área
              <select className="ev-input" value={nuevaArea.area} onChange={(e) => setNuevaArea({ ...nuevaArea, area: e.target.value })}>
                <option value="">Elige el área</option>
                {[...new Set(companeros.map((p) => p.area).filter(Boolean))].sort().map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="tl-full">Objetivo<input className="ev-input" maxLength={200} value={nuevaArea.title} onChange={(e) => setNuevaArea({ ...nuevaArea, title: e.target.value })} /></label>
          </div>
        )}
      </Modal>
      {capabilities.profile === "direction" && <Notice>Dirección consulta los objetivos; los define la persona con su jefe.</Notice>}
    </div>
  );
}

// Sección «Objetivos» dentro del resultado de una evaluación (informativa: no cambia la calificación).
export function ObjetivosSeccion({ campaignId, subjectId }) {
  const q = useEvaluationQuery(`/campaigns/${campaignId}/objectives/${subjectId}`);
  const objetivos = q.data?.objectives ?? [];
  if (q.error || !objetivos.length) return null;
  return (
    <div className="tl">
      <Panel title="Objetivos del periodo" description="Objetivos aprobados que se cruzan con el periodo de la campaña. Es informativo: no cambia la calificación.">
        <div className="ev-pad">
          <Progress label={`Cumplimiento ponderado (equivale a ${q.data.summary.score ?? "—"} / 5)`} value={q.data.summary.percent ?? 0} />
          <ul className="tl-list" style={{ marginTop: 12 }}>
            {objetivos.map((o) => <li key={o.id}><strong>{o.title}</strong> · peso {o.weight} % · avance {o.progress} %</li>)}
          </ul>
        </div>
      </Panel>
    </div>
  );
}
