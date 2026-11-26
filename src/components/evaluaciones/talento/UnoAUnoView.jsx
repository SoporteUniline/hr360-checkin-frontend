"use client";
// Reuniones 1:1 jefe ↔ colaborador: agenda recurrente, temas, notas compartidas y privadas, acuerdos que se vuelven Tareas
// e historial. docs/evaluaciones/talento.md.
import { useState, useEffect } from "react";
import { useEvaluationQuery } from "../EvaluationContext";
import { Heading, Panel, Badge, Empty, Modal, Button, QueryState, Textarea, Notice } from "../ui";
import { FRECUENCIAS } from "@/lib/evaluaciones/talento.mjs";
import { useTalento, useCompaneros, hoyMx, fecha, SelectPersona } from "./comun";

const ESTADO = { programada: ["Programada", "blue"], realizada: ["Realizada", "green"], cancelada: ["Cancelada", "gray"] };
const TAREA = { por_hacer: "Por hacer", en_proceso: "En proceso", revision: "En revisión", hecho: "Hecha" };

export function UnoAUnoView() {
  const { enviar, yo } = useTalento();
  const series = useEvaluationQuery("/one-on-ones");
  const companeros = useCompaneros();
  const equipo = companeros.filter((p) => Number(p.managerId) === yo);
  const [serie, setSerie] = useState(null);
  const [nueva, setNueva] = useState(null);
  const lista = series.data || [];
  const actual = lista.find((s) => s.id === serie) ?? lista[0] ?? null;
  return (
    <div className="tl">
      <Heading
        title="Reuniones 1:1"
        description="Conversaciones periódicas entre jefe y colaborador: temas, notas, acuerdos y su seguimiento en Tareas."
        actions={equipo.length > 0 && <Button onClick={() => setNueva({ employeeId: null, frequency: "quincenal", firstOn: hoyMx(), time: "10:00" })}>Agendar 1:1</Button>}
      />
      <QueryState query={series}>
        {!lista.length ? (
          <Empty title="Sin reuniones 1:1" description={equipo.length ? "Agenda la primera con alguien de tu equipo." : "Cuando tu jefe agende un 1:1 contigo aparecerá aquí."} />
        ) : (
          <>
            {lista.length > 1 && (
              <label className="tl-label" style={{ maxWidth: 420 }}>
                Con quién
                <select className="ev-input" value={actual?.id ?? ""} onChange={(e) => setSerie(Number(e.target.value))}>
                  {lista.map((s) => <option key={s.id} value={s.id}>{Number(s.managerId) === yo ? s.employee : `Mi jefe · ${s.manager}`} · {FRECUENCIAS.find((f) => f.value === s.frequency)?.label}</option>)}
                </select>
              </label>
            )}
            {actual && <Serie key={actual.id} serie={actual} />}
          </>
        )}
      </QueryState>
      <Modal open={!!nueva} onOpenChange={() => setNueva(null)} title="Agendar 1:1" description="Se repite con la frecuencia elegida. Siempre queda la siguiente reunión programada."
        footer={<><Button variant="outline" onClick={() => setNueva(null)}>Cancelar</Button><Button onClick={async () => { if (await enviar("POST", "/one-on-ones", nueva, "1:1 agendado")) setNueva(null); }}>Agendar</Button></>}>
        {nueva && (
          <div className="tl-form">
            <div className="tl-full"><SelectPersona label="Colaborador" value={nueva.employeeId} onChange={(v) => setNueva({ ...nueva, employeeId: v })} people={equipo} /></div>
            <label>Frecuencia<select className="ev-input" value={nueva.frequency} onChange={(e) => setNueva({ ...nueva, frequency: e.target.value })}>{FRECUENCIAS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></label>
            <label>Primera reunión<input className="ev-input" type="date" value={nueva.firstOn} onChange={(e) => setNueva({ ...nueva, firstOn: e.target.value })} /></label>
            <label>Hora<input className="ev-input" type="time" value={nueva.time} onChange={(e) => setNueva({ ...nueva, time: e.target.value })} /></label>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Serie({ serie }) {
  const hist = useEvaluationQuery(`/one-on-ones/${serie.id}/meetings`);
  const reuniones = hist.data?.meetings ?? [];
  const [elegida, setElegida] = useState(null);
  const id = elegida ?? serie.next?.id ?? reuniones[0]?.id ?? null;
  return (
    <div className="tl-split">
      <div>{id ? <Reunion key={id} id={id} /> : <Empty title="Sin reuniones" />}</div>
      <Panel title="Historial" description={`Con ${hist.data?.role === "jefe" ? serie.employee : serie.manager}`}>
        <div className="ev-pad">
          <ul className="tl-list">
            {reuniones.map((m) => {
              const [txt, tono] = ESTADO[m.status] ?? [m.status, "gray"];
              return (
                <li key={m.id}>
                  <button type="button" className="tl-chip" aria-pressed={m.id === id} onClick={() => setElegida(m.id)}>
                    <span>{fecha(m.on)}</span>
                    <Badge tone={tono}>{txt}</Badge>
                  </button>
                  {m.agreements > 0 && <small>{m.agreements} acuerdo(s)</small>}
                </li>
              );
            })}
          </ul>
        </div>
      </Panel>
    </div>
  );
}

function Reunion({ id }) {
  const { enviar, yo } = useTalento();
  const q = useEvaluationQuery(`/one-on-one-meetings/${id}`);
  const m = q.data;
  const [notas, setNotas] = useState(null);
  const [tema, setTema] = useState("");
  const [acuerdo, setAcuerdo] = useState(null);
  useEffect(() => { if (m) setNotas({ shared: m.sharedNotes, private: m.privateNotes }); }, [m?.revision]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <QueryState query={q}>{null}</QueryState>;
  const jefe = m.role === "jefe";
  const [txt, tono] = ESTADO[m.status] ?? [m.status, "gray"];
  const otro = jefe ? m.employee : m.manager;
  return (
    <Panel title={`1:1 del ${fecha(m.on)} · ${m.time}`} description={`Con ${otro.name}`} actions={<Badge tone={tono}>{txt}</Badge>}>
      <div className="ev-pad tl">
        <section>
          <h3>Temas</h3>
          <ul className="tl-list">
            {m.topics.map((t) => (
              <li key={t.id}>
                <label style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44 }}>
                  <input type="checkbox" style={{ width: 22, height: 22 }} checked={t.done} onChange={() => enviar("PATCH", `/one-on-one-topics/${t.id}`, { done: !t.done })} />
                  <span style={{ textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                  <small>· {t.by === "jefe" ? "jefe" : "colaborador"}</small>
                </label>
              </li>
            ))}
          </ul>
          <div className="tl-toolbar" style={{ marginTop: 8 }}>
            <input className="ev-input" style={{ flex: 1 }} maxLength={300} placeholder="Agregar un tema" aria-label="Nuevo tema" value={tema} onChange={(e) => setTema(e.target.value)} />
            <Button variant="outline" disabled={!tema.trim()} onClick={async () => { if (await enviar("POST", `/one-on-one-meetings/${id}/topics`, { text: tema })) setTema(""); }}>Agregar</Button>
          </div>
        </section>
        {notas && (
          <section className="tl-notes">
            <label className="tl-label">Notas compartidas (las ven los dos)<Textarea label="Notas compartidas" maxLength={10000} rows={6} value={notas.shared} onChange={(e) => setNotas({ ...notas, shared: e.target.value })} /></label>
            <label className="tl-label">Mis notas privadas (solo tú)<Textarea label="Notas privadas" maxLength={10000} rows={6} value={notas.private} onChange={(e) => setNotas({ ...notas, private: e.target.value })} /></label>
            <div className="ev-actions tl-full" style={{ gridColumn: "1 / -1" }}>
              <Button onClick={() => enviar("PATCH", `/one-on-one-meetings/${id}`, { sharedNotes: notas.shared, privateNotes: notas.private, revision: m.revision }, "Notas guardadas")}>Guardar notas</Button>
              {jefe && m.status === "programada" && (
                <>
                  <Button variant="outline" onClick={() => enviar("PATCH", `/one-on-one-meetings/${id}`, { sharedNotes: notas.shared, privateNotes: notas.private, status: "realizada", revision: m.revision }, "Reunión registrada; se agendó la siguiente")}>Marcar como realizada</Button>
                  <Button variant="ghost" onClick={() => enviar("PATCH", `/one-on-one-meetings/${id}`, { status: "cancelada", revision: m.revision }, "Reunión cancelada; se agendó la siguiente")}>Cancelar reunión</Button>
                </>
              )}
            </div>
          </section>
        )}
        <section>
          <div className="tl-row"><h3>Acuerdos</h3><Button variant="outline" onClick={() => setAcuerdo({ text: "", ownerId: m.employee.id, dueOn: "" })}>Agregar acuerdo</Button></div>
          {!m.agreements.length ? <p className="tl-muted">Sin acuerdos. Cada acuerdo se vuelve una tarea para su responsable.</p> : (
            <ul className="tl-list">
              {m.agreements.map((a) => (
                <li key={a.id}>
                  <div className="tl-row">
                    <strong>{a.text}</strong>
                    {a.taskId ? <Badge tone={a.taskStatus === "hecho" ? "green" : "blue"}>Tarea: {TAREA[a.taskStatus] ?? "creada"}</Badge> : <Badge tone="amber">Sin tarea</Badge>}
                  </div>
                  <div className="tl-meta"><span>Responsable: {a.owner}</span>{a.dueOn && <span>Para el {fecha(a.dueOn)}</span>}</div>
                  {!a.taskId && (
                    <div className="tl-row">
                      <small>{a.taskError || "No se creó la tarea."}</small>
                      <Button variant="outline" onClick={() => enviar("POST", `/one-on-one-agreements/${a.id}/task`, undefined, "Tarea creada")}>Crear tarea</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <Modal open={!!acuerdo} onOpenChange={() => setAcuerdo(null)} title="Nuevo acuerdo" description="Se crea una tarea en Tareas para el responsable."
        footer={<><Button variant="outline" onClick={() => setAcuerdo(null)}>Cancelar</Button><Button onClick={async () => { if (await enviar("POST", `/one-on-one-meetings/${id}/agreements`, { ...acuerdo, dueOn: acuerdo.dueOn || null }, "Acuerdo agregado")) setAcuerdo(null); }}>Guardar</Button></>}>
        {acuerdo && (
          <div className="tl-form">
            <label className="tl-full">Acuerdo<input className="ev-input" maxLength={200} value={acuerdo.text} onChange={(e) => setAcuerdo({ ...acuerdo, text: e.target.value })} /></label>
            <label>Responsable
              <select className="ev-input" value={acuerdo.ownerId} onChange={(e) => setAcuerdo({ ...acuerdo, ownerId: Number(e.target.value) })}>
                <option value={m.employee.id}>{m.employee.name}{Number(m.employee.id) === yo ? " (yo)" : ""}</option>
                <option value={m.manager.id}>{m.manager.name}{Number(m.manager.id) === yo ? " (yo)" : ""}</option>
              </select>
            </label>
            <label>Fecha límite<input className="ev-input" type="date" value={acuerdo.dueOn} onChange={(e) => setAcuerdo({ ...acuerdo, dueOn: e.target.value })} /></label>
          </div>
        )}
      </Modal>
      {m.status !== "programada" && <Notice>Esta reunión ya pasó; puedes seguir editando sus notas y acuerdos.</Notice>}
    </Panel>
  );
}
