"use client";
// Feedback continuo (privado) y reconocimientos (públicos en la empresa). docs/evaluaciones/talento.md.
import { useState } from "react";
import { useEvaluationQuery } from "../EvaluationContext";
import { Heading, Panel, Badge, Empty, Modal, Button, QueryState, Textarea, Segments, Notice } from "../ui";
import { VISIBILIDAD, textoVisibilidad } from "@/lib/evaluaciones/talento.mjs";
import { useTalento, useCompaneros, fecha, SelectPersona, Elegir } from "./comun";

export function FeedbackView() {
  const { enviar, yo, esRh, capabilities } = useTalento();
  const companeros = useCompaneros();
  const competencias = useEvaluationQuery("/competencies").data || [];
  const esJefe = companeros.some((p) => Number(p.managerId) === yo);
  const pestanas = [
    { value: "muro", label: "Reconocimientos" },
    ...(yo ? [{ value: "received", label: "Para mí" }, { value: "requests", label: "Solicitudes" }] : []),
    { value: "given", label: "Lo que di" },
    ...(esJefe ? [{ value: "team", label: "De mi equipo" }] : []),
  ];
  const [tab, setTab] = useState("muro");
  const [reco, setReco] = useState(null);
  const [fb, setFb] = useState(null);
  const [pedir, setPedir] = useState(null);
  const [ocultar, setOcultar] = useState(null);
  return (
    <div className="tl">
      <Heading
        title="Feedback y reconocimientos"
        description="El feedback es privado: lo ve la persona, su jefe o ambos, según elijas. Los reconocimientos son públicos en la empresa y llegan por WhatsApp o correo."
        actions={
          <>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setReco({ toEmployeeId: null, message: "", competency: "" })}>Reconocer a alguien</Button>
            <Button variant="outline" onClick={() => setFb({ toEmployeeId: null, text: "", visibility: "colaborador", competency: "" })}>Dar feedback</Button>
            {yo && <Button variant="outline" onClick={() => setPedir({ fromEmployeeId: null, text: "" })}>Pedir feedback</Button>}
          </>
        }
      />
      <Segments items={pestanas} value={tab} onChange={setTab} label="Secciones de feedback" />
      {tab === "muro" ? <Muro esRh={esRh} onOcultar={setOcultar} /> : <Bandeja box={tab} onResponder={(s) => setFb({ requestId: s.id, about: s.from.name, text: "", visibility: "colaborador", competency: "" })} />}
      {capabilities.profile === "hr" && tab !== "muro" && <Notice>RH no lee el contenido del feedback: es privado entre las personas y su jefe.</Notice>}

      <Modal open={!!reco} onOpenChange={() => setReco(null)} title="Reconocer a alguien" description="Se publica en el muro y en su perfil, y le avisamos."
        footer={<><Button variant="outline" onClick={() => setReco(null)}>Cancelar</Button><Button onClick={async () => { if (await enviar("POST", "/recognitions", { ...reco, competency: reco.competency || null }, "¡Reconocimiento publicado!")) setReco(null); }}>Publicar</Button></>}>
        {reco && (
          <div className="tl-form">
            <div className="tl-full"><SelectPersona label="¿A quién?" value={reco.toEmployeeId} onChange={(v) => setReco({ ...reco, toEmployeeId: v })} people={companeros} excluir={yo} /></div>
            <label className="tl-full">Competencia (opcional)
              <select className="ev-input" value={reco.competency} onChange={(e) => setReco({ ...reco, competency: e.target.value })}>
                <option value="">Sin competencia</option>
                {competencias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="tl-full">¿Por qué?<Textarea label="Mensaje del reconocimiento" maxLength={500} rows={4} value={reco.message} onChange={(e) => setReco({ ...reco, message: e.target.value })} /></label>
          </div>
        )}
      </Modal>

      <Modal open={!!fb} onOpenChange={() => setFb(null)} title={fb?.requestId ? `Responder a ${fb.about}` : "Dar feedback"} description="Es privado. Tú decides quién lo ve."
        footer={<><Button variant="outline" onClick={() => setFb(null)}>Cancelar</Button><Button onClick={async () => { if (await enviar("POST", "/feedback", { ...fb, competency: fb.competency || null }, "Feedback enviado")) setFb(null); }}>Enviar</Button></>}>
        {fb && (
          <div className="tl-form">
            {!fb.requestId && <div className="tl-full"><SelectPersona label="¿Para quién?" value={fb.toEmployeeId} onChange={(v) => setFb({ ...fb, toEmployeeId: v })} people={companeros} excluir={yo} /></div>}
            <div className="tl-full"><Elegir label="¿Quién lo ve?" value={fb.visibility} onChange={(v) => setFb({ ...fb, visibility: v })} items={VISIBILIDAD} /></div>
            <label className="tl-full">Competencia (opcional)
              <select className="ev-input" value={fb.competency} onChange={(e) => setFb({ ...fb, competency: e.target.value })}>
                <option value="">Sin competencia</option>
                {competencias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="tl-full">Feedback<Textarea label="Feedback" maxLength={2000} rows={5} value={fb.text} onChange={(e) => setFb({ ...fb, text: e.target.value })} /></label>
          </div>
        )}
      </Modal>

      <Modal open={!!pedir} onOpenChange={() => setPedir(null)} title="Pedir feedback" description="Le llegará a la persona en su bandeja de solicitudes."
        footer={<><Button variant="outline" onClick={() => setPedir(null)}>Cancelar</Button><Button onClick={async () => { if (await enviar("POST", "/feedback/requests", pedir, "Solicitud enviada")) setPedir(null); }}>Pedir</Button></>}>
        {pedir && (
          <div className="tl-form">
            <div className="tl-full"><SelectPersona label="¿A quién?" value={pedir.fromEmployeeId} onChange={(v) => setPedir({ ...pedir, fromEmployeeId: v })} people={companeros} excluir={yo} /></div>
            <label className="tl-full">¿Sobre qué?<Textarea label="Sobre qué quieres feedback" maxLength={2000} rows={3} placeholder="¿Me das feedback sobre mi trabajo reciente?" value={pedir.text} onChange={(e) => setPedir({ ...pedir, text: e.target.value })} /></label>
          </div>
        )}
      </Modal>

      <Modal open={!!ocultar} onOpenChange={() => setOcultar(null)} title="Ocultar reconocimiento" description="Deja de verse en el muro y en el perfil. Queda registrado quién y por qué."
        footer={<><Button variant="outline" onClick={() => setOcultar(null)}>Cancelar</Button><Button onClick={async () => { if (await enviar("POST", `/recognitions/${ocultar.id}/hide`, { reason: ocultar.reason }, "Reconocimiento oculto")) setOcultar(null); }}>Ocultar</Button></>}>
        {ocultar && <label className="tl-label">Motivo<input className="ev-input" maxLength={300} value={ocultar.reason} onChange={(e) => setOcultar({ ...ocultar, reason: e.target.value })} /></label>}
      </Modal>
    </div>
  );
}

function Muro({ esRh, onOcultar }) {
  const q = useEvaluationQuery("/recognitions", { limit: 60 });
  return (
    <QueryState query={q}>
      {!(q.data || []).length ? <Empty title="Aún no hay reconocimientos" description="Sé la primera persona en reconocer el trabajo de alguien." /> : (
        <div className="tl-wall">
          {q.data.map((r) => (
            <article key={r.id} className="tl-card">
              <div className="tl-row"><strong>{r.to.name}</strong>{r.competency && <Badge tone="blue">{r.competency}</Badge>}</div>
              <p className="tl-quote">«{r.message}»</p>
              <div className="tl-row">
                <span className="tl-muted">De {r.from.name ?? "su equipo"} · {fecha(r.at)}</span>
                {esRh && <Button variant="ghost" onClick={() => onOcultar({ id: r.id, reason: "" })}>Ocultar</Button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </QueryState>
  );
}

function Bandeja({ box, onResponder }) {
  const { yo } = useTalento();
  const q = useEvaluationQuery("/feedback", { box });
  const vacios = { received: "Todavía no tienes feedback.", given: "Aún no has dado feedback.", team: "Sin feedback de tu equipo.", requests: "Sin solicitudes." };
  return (
    <QueryState query={q}>
      {!(q.data || []).length ? <Empty title={vacios[box]} description="" /> : (
        <Panel>
          <div className="ev-pad">
            <ul className="tl-list">
              {q.data.map((f) => (
                <li key={f.id}>
                  {f.kind === "solicitud" ? (
                    <div className="tl-row">
                      <span>{Number(f.from.employeeId) === yo ? `Pediste feedback a ${f.to.name}` : `${f.from.name} te pide feedback`}: «{f.text}»</span>
                      {f.answeredAt ? <Badge tone="green">Respondida</Badge> : Number(f.to.employeeId) === yo ? <Button onClick={() => onResponder(f)}>Responder</Button> : <Badge tone="amber">Pendiente</Badge>}
                    </div>
                  ) : (
                    <>
                      <div className="tl-row">
                        <strong>{box === "given" ? `Para ${f.about.name}` : box === "team" ? `Sobre ${f.about.name} · de ${f.from.name}` : `De ${f.from.name}`}</strong>
                        <span className="tl-muted">{fecha(f.at)}</span>
                      </div>
                      <p className="tl-quote">{f.text}</p>
                      <div className="tl-meta">
                        <span>Lo ve: {textoVisibilidad(f.visibility)}</span>
                        {f.competency && <span>Competencia: {f.competency}</span>}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}
    </QueryState>
  );
}
