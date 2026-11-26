"use client";
// Calibración por campaña con 9-box (desempeño × potencial), motivo obligatorio y bitácora; y el bono de desempeño que
// pasa a nómina en borrador con aprobación. docs/evaluaciones/talento.md.
import { useState } from "react";
import { useEvaluationQuery } from "../EvaluationContext";
import { Heading, Panel, Badge, Empty, Modal, Button, QueryState, Textarea, Segments, Notice, DataTable } from "../ui";
import { cajas, DESEMPENO, rangoFila, scoreSugerido, pesos, ESTADO_BONO, problemasReglas } from "@/lib/evaluaciones/talento.mjs";
import { useTalento, useCompaneros, fecha, Elegir } from "./comun";

const TONO = { "3-3": "green", "3-2": "green", "2-3": "blue", "2-2": "blue", "3-1": "blue", "1-3": "amber", "2-1": "amber", "1-2": "amber", "1-1": "red" };

export function CalibracionView() {
  const { esRh, capabilities } = useTalento();
  const sesiones = useEvaluationQuery("/calibrations");
  const campanas = useEvaluationQuery("/campaigns", { page: 1, pageSize: 100 }, { enabled: !!capabilities.flags?.canViewCampaigns });
  const opciones = [
    ...(campanas.data || []).filter((c) => c.status !== "draft").map((c) => ({ id: Number(c.id), name: c.name })),
    ...(sesiones.data || []).map((s) => ({ id: Number(s.campaignId), name: s.campaign })),
  ].filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i);
  const [campana, setCampana] = useState(null);
  const [tab, setTab] = useState("ninebox");
  const actual = campana ?? opciones[0]?.id ?? null;
  return (
    <div className="tl">
      <Heading title="Calibración y bono" description="Revisa en grupo el desempeño de la campaña contra el potencial (9-box). Lo calibrado es lo que se publica; el bono se calcula de lo publicado y pasa a la nómina en borrador." />
      <div className="tl-toolbar">
        <label className="tl-label" style={{ minWidth: 260 }}>
          Campaña
          <select className="ev-input" value={actual ?? ""} onChange={(e) => setCampana(Number(e.target.value))}>
            {!opciones.length && <option value="">Sin campañas lanzadas</option>}
            {opciones.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      {esRh && <Segments items={[{ value: "ninebox", label: "Calibración 9-box" }, { value: "bono", label: "Bono a nómina" }]} value={tab} onChange={setTab} label="Calibración o bono" />}
      {!actual ? <Empty title="No hay campañas para calibrar" description="Lanza una campaña de evaluación primero." /> : tab === "bono" && esRh ? <Bono key={`b${actual}`} campaignId={actual} /> : <NineBox key={actual} campaignId={actual} />}
    </div>
  );
}

function NineBox({ campaignId }) {
  const { enviar, esRh } = useTalento();
  const q = useEvaluationQuery(`/campaigns/${campaignId}/calibration`);
  const companeros = useCompaneros();
  const [mover, setMover] = useState(null);
  const [abrir, setAbrir] = useState(null);
  const [miembros, setMiembros] = useState(null);
  const [reabrir, setReabrir] = useState(null);
  const s = q.data;
  if (q.loading && !s) return <QueryState query={q}>{null}</QueryState>;
  if (!s) {
    return (
      <>
        <Empty title="Esta campaña no se ha calibrado" description={esRh ? "Al abrir la calibración entran las personas con su evaluación completa y aún sin publicar. Mientras esté abierta no se publica a nadie de la campaña." : "RH aún no abre la calibración."}
          action={esRh && <Button onClick={() => setAbrir({ labels: ["Bajo", "Medio", "Alto"] })}>Abrir calibración</Button>} />
        <Modal open={!!abrir} onOpenChange={() => setAbrir(null)} title="Abrir calibración" description="Nombre de los 3 niveles de potencial (de menor a mayor)."
          footer={<><Button variant="outline" onClick={() => setAbrir(null)}>Cancelar</Button><Button onClick={async () => { if (await enviar("POST", `/campaigns/${campaignId}/calibration`, { potentialLabels: abrir.labels }, "Calibración abierta")) setAbrir(null); }}>Abrir</Button></>}>
          {abrir && <div className="tl-form">{abrir.labels.map((l, i) => <label key={i}>Potencial {i + 1}<input className="ev-input" maxLength={40} value={l} onChange={(e) => setAbrir({ labels: abrir.labels.map((x, j) => (j === i ? e.target.value : x)) })} /></label>)}</div>}
        </Modal>
      </>
    );
  }
  const { boxes, unplaced } = cajas(s.entries);
  const puede = s.can.move;
  const abrirMover = (e) => setMover({ e, performanceLevel: e.performanceLevel, potentialLevel: e.potentialLevel ?? 2, score: e.score, reason: "" });
  const chip = (e) => (
    <button key={e.employeeId} type="button" className="tl-chip" data-changed={e.changed} disabled={!puede} onClick={() => abrirMover(e)} aria-label={`${e.name}, calificación ${e.score}${puede ? ". Mover" : ""}`}>
      <span>{e.name}</span><b>{e.score.toFixed(2)}</b>
    </button>
  );
  return (
    <>
      <div className="tl-kpis">
        <div className="tl-kpi"><strong>{s.entries.length}</strong><span>personas</span></div>
        <div className="tl-kpi"><strong>{s.entries.filter((e) => e.changed).length}</strong><span>ajustadas</span></div>
        <div className="tl-kpi"><strong>{unplaced.length}</strong><span>sin potencial</span></div>
        <div className="tl-kpi"><strong><Badge tone={s.status === "abierta" ? "amber" : "green"}>{s.status === "abierta" ? "Abierta" : "Cerrada"}</Badge></strong><span>{s.closedAt ? `Cerrada el ${fecha(s.closedAt)}` : "No se publica hasta cerrarla"}</span></div>
      </div>
      {esRh && (
        <div className="ev-actions">
          {s.status === "abierta" ? (
            <>
              <Button variant="outline" onClick={() => enviar("POST", `/calibrations/${s.id}/refresh`, undefined, "Calibración actualizada")}>Agregar a quien ya terminó</Button>
              <Button variant="outline" onClick={() => setMiembros(s.members.filter((m) => m.employeeId).map((m) => Number(m.employeeId)))}>Quién más calibra</Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={unplaced.length > 0} onClick={() => enviar("POST", `/calibrations/${s.id}/close`, { revision: s.revision }, "Calibración cerrada: ya puedes publicar")}>Cerrar calibración</Button>
            </>
          ) : <Button variant="outline" onClick={() => setReabrir({ reason: "" })}>Reabrir</Button>}
        </div>
      )}
      <Panel title="9-box" description={`Desempeño (calificación calibrada; cortes ${s.cuts.low} y ${s.cuts.high}) contra potencial. ${puede ? "Toca a una persona para moverla." : ""}`}>
        <div className="ev-pad">
          <div className="tl-ninebox">
            {[3, 2, 1].map((d) => (
              <FilaCaja key={d} d={d} boxes={boxes} chip={chip} labels={s.potentialLabels} />
            ))}
            <div />
            <div className="tl-axis-x">{s.potentialLabels.map((l) => <span key={l}>Potencial {l.toLowerCase()}</span>)}</div>
          </div>
          {unplaced.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <h3>Sin potencial asignado</h3>
              <div className="tl-cards">{unplaced.map(chip)}</div>
            </div>
          )}
        </div>
      </Panel>
      <Panel title="Bitácora" description="Cada cambio con quién, cuándo, de dónde a dónde y por qué.">
        <DataTable
          rows={s.log.map((l) => ({ ...l, id: l.id }))}
          empty="Sin cambios todavía."
          columns={[
            { key: "at", label: "Cuándo", render: (l) => fecha(l.at) },
            { key: "by", label: "Quién" },
            { key: "name", label: "Persona", render: (l) => l.name ?? "—" },
            { key: "cambio", label: "Cambio", render: (l) => (l.action === "mover"
              ? `${DESEMPENO[l.from.performance - 1]}/${l.from.potential ? s.potentialLabels[l.from.potential - 1] : "—"} (${l.from.score}) → ${DESEMPENO[l.to.performance - 1]}/${l.to.potential ? s.potentialLabels[l.to.potential - 1] : "—"} (${l.to.score})`
              : { abrir: "Abrió", cerrar: "Cerró", reabrir: "Reabrió", actualizar: "Agregó personas" }[l.action]) },
            { key: "reason", label: "Motivo", render: (l) => l.reason ?? "—" },
          ]}
        />
      </Panel>

      <Modal open={!!mover} onOpenChange={() => setMover(null)} title={`Mover a ${mover?.e.name ?? ""}`} description={mover ? `Calificación original ${mover.e.originalScore.toFixed(2)} · actual ${mover.e.score.toFixed(2)}` : ""}
        footer={<><Button variant="outline" onClick={() => setMover(null)}>Cancelar</Button>
          <Button onClick={async () => { if (await enviar("POST", `/calibrations/${s.id}/entries/${mover.e.employeeId}/move`, { performanceLevel: mover.performanceLevel, potentialLevel: mover.potentialLevel, score: Number(mover.score), reason: mover.reason, revision: mover.e.revision }, "Movimiento guardado")) setMover(null); }}>Guardar movimiento</Button></>}>
        {mover && (
          <div className="tl-form">
            <div className="tl-full"><Elegir label="Desempeño" value={mover.performanceLevel} items={DESEMPENO.map((d, i) => ({ value: i + 1, label: d, hint: `${rangoFila(i + 1, s.cuts).min} a ${rangoFila(i + 1, s.cuts).max}` }))}
              onChange={(v) => setMover({ ...mover, performanceLevel: v, score: scoreSugerido(mover.score, v, s.cuts) })} /></div>
            <div className="tl-full"><Elegir label="Potencial" value={mover.potentialLevel} items={s.potentialLabels.map((l, i) => ({ value: i + 1, label: l }))} onChange={(v) => setMover({ ...mover, potentialLevel: v })} /></div>
            <label>Calificación calibrada<input className="ev-input" type="number" inputMode="decimal" step="0.01" min={rangoFila(mover.performanceLevel, s.cuts).min} max={rangoFila(mover.performanceLevel, s.cuts).max} value={mover.score} onChange={(e) => setMover({ ...mover, score: e.target.value })} /></label>
            <label className="tl-full">Motivo (obligatorio)<Textarea label="Motivo del cambio" maxLength={500} rows={3} value={mover.reason} onChange={(e) => setMover({ ...mover, reason: e.target.value })} /></label>
          </div>
        )}
      </Modal>
      <MiembrosModal sesion={s} valor={miembros} onCerrar={() => setMiembros(null)} companeros={companeros} />
      <Modal open={!!reabrir} onOpenChange={() => setReabrir(null)} title="Reabrir calibración" description="No se puede si ya se publicó a alguien calibrado."
        footer={<><Button variant="outline" onClick={() => setReabrir(null)}>Cancelar</Button><Button onClick={async () => { if (await enviar("POST", `/calibrations/${s.id}/reopen`, { reason: reabrir.reason, revision: s.revision }, "Calibración reabierta")) setReabrir(null); }}>Reabrir</Button></>}>
        {reabrir && <label className="tl-label">Motivo<input className="ev-input" maxLength={500} value={reabrir.reason} onChange={(e) => setReabrir({ reason: e.target.value })} /></label>}
      </Modal>
    </>
  );
}

function FilaCaja({ d, boxes, chip, labels }) {
  return (
    <>
      <div className="tl-axis">Desempeño {DESEMPENO[d - 1].toLowerCase()}</div>
      {boxes.filter((b) => b.performance === d).map((b) => (
        <section key={b.key} className="tl-box" data-tone={TONO[b.key]} aria-label={`${b.name}: desempeño ${DESEMPENO[d - 1]}, potencial ${labels[b.potential - 1]}`}>
          <header><span>{b.name}</span><small>{b.people.length}</small></header>
          {b.people.map(chip)}
        </section>
      ))}
    </>
  );
}

function MiembrosModal({ sesion, valor, onCerrar, companeros }) {
  const { enviar } = useTalento();
  const [sel, setSel] = useState(null);
  const lista = sel ?? valor ?? [];
  return (
    <Modal open={valor !== null} onOpenChange={() => { setSel(null); onCerrar(); }} title="Quién más calibra" description="RH siempre calibra. Elige a los jefes o personas que también pueden mover tarjetas en esta campaña."
      footer={<><Button variant="outline" onClick={() => { setSel(null); onCerrar(); }}>Cancelar</Button><Button onClick={async () => { if (await enviar("PUT", `/calibrations/${sesion.id}/members`, { employeeIds: lista }, "Designados guardados")) { setSel(null); onCerrar(); } }}>Guardar</Button></>}>
      <div className="tl-list" style={{ maxHeight: 320, overflowY: "auto" }}>
        {companeros.map((p) => (
          <label key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44 }}>
            <input type="checkbox" style={{ width: 22, height: 22 }} checked={lista.includes(Number(p.id))} onChange={(e) => setSel(e.target.checked ? [...lista, Number(p.id)] : lista.filter((x) => x !== Number(p.id)))} />
            {p.name}{p.area ? ` · ${p.area}` : ""}
          </label>
        ))}
      </div>
    </Modal>
  );
}

function Bono({ campaignId }) {
  const { enviar } = useTalento();
  const reglas = useEvaluationQuery("/bonus-rules");
  const periodos = useEvaluationQuery("/bonus-payroll-periods");
  const bonos = useEvaluationQuery(`/campaigns/${campaignId}/bonuses`);
  const [editar, setEditar] = useState(null);
  const [periodo, setPeriodo] = useState("");
  const [sel, setSel] = useState([]);
  const [cancelar, setCancelar] = useState(null);
  const [resumen, setResumen] = useState(null);
  const lista = bonos.data || [];
  const borradores = lista.filter((b) => b.status === "borrador");
  const errores = editar ? problemasReglas(editar) : [];
  const etiquetaPeriodo = (p) => (p?.start ? `${p.frequency ?? ""} ${fecha(p.start)} – ${fecha(p.end)}`.trim() : `#${p?.id}`);
  return (
    <>
      <Panel title="Reglas por banda de calificación" description="Sobre la calificación publicada (ya calibrada). Monto fijo o porcentaje del sueldo mensual (diario × 30 de su ficha de nómina)."
        actions={<Button variant="outline" onClick={() => setEditar((reglas.data || []).map((r) => ({ ...r })))}>Editar reglas</Button>}>
        <div className="ev-pad">
          {(reglas.data || []).length ? (
            <ul className="tl-list">{reglas.data.map((r) => <li key={r.id}><strong>{r.name}</strong> · de {r.min} a {r.max} → {r.type === "fijo" ? pesos(r.value) : `${r.value} % del sueldo mensual`}</li>)}</ul>
          ) : <p className="tl-muted">Sin reglas: define al menos una banda para calcular el bono.</p>}
        </div>
      </Panel>
      <Panel title="Generar bonos" description="Crea un bono en BORRADOR por persona publicada para la nómina elegida (en borrador). Repetir no duplica.">
        <div className="ev-pad tl-toolbar">
          <label className="tl-label" style={{ minWidth: 280 }}>
            Nómina destino
            <select className="ev-input" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              <option value="">Elige una nómina en borrador</option>
              {(periodos.data || []).map((p) => <option key={p.id} value={p.id}>{p.frequency} · {fecha(p.start)} – {fecha(p.end)}</option>)}
            </select>
          </label>
          <Button disabled={!periodo} onClick={async () => { const r = await enviar("POST", `/campaigns/${campaignId}/bonuses/generate`, { periodId: Number(periodo) }, "Bonos calculados"); if (r) setResumen(r.summary); }}>Calcular bonos</Button>
        </div>
        {resumen && (
          <div className="ev-pad">
            <Notice>Nuevos {resumen.created} · recalculados {resumen.updated} · reabiertos {resumen.reopened} · sin cambio {resumen.unchanged}{resumen.skipped.length ? ` · omitidos ${resumen.skipped.length}` : ""}.</Notice>
            {resumen.skipped.length > 0 && <ul className="tl-list">{resumen.skipped.map((s) => <li key={s.employeeId}>{lista.find((b) => b.employeeId === s.employeeId)?.name ?? `Persona ${s.employeeId}`}: {s.reason}</li>)}</ul>}
          </div>
        )}
      </Panel>
      <Panel title="Bonos de la campaña" description={bonos.totals ? `Total vigente ${pesos(bonos.totals.amount)} en ${bonos.totals.count} persona(s).` : ""}
        actions={borradores.length > 0 && (
          <div className="ev-actions">
            <Button variant="outline" onClick={() => setSel(sel.length === borradores.length ? [] : borradores.map((b) => b.id))}>{sel.length === borradores.length ? "Quitar selección" : "Seleccionar borradores"}</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={!sel.length} onClick={async () => { if (await enviar("POST", "/bonuses/approve", { ids: sel }, "Bonos aprobados")) setSel([]); }}>Aprobar ({sel.length})</Button>
          </div>
        )}>
        <QueryState query={bonos}>
          <DataTable
            rows={lista}
            empty="Sin bonos: publica resultados y calcula."
            columns={[
              { key: "name", label: "Persona", render: (b) => (
                <label style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44 }}>
                  {b.status === "borrador" && <input type="checkbox" style={{ width: 22, height: 22 }} aria-label={`Seleccionar a ${b.name}`} checked={sel.includes(b.id)} onChange={(e) => setSel(e.target.checked ? [...sel, b.id] : sel.filter((x) => x !== b.id))} />}
                  <strong>{b.name}</strong>
                </label>
              ) },
              { key: "score", label: "Calificación", render: (b) => b.score.toFixed(2) },
              { key: "rule", label: "Regla", render: (b) => `${b.rule.name} · ${b.rule.type === "fijo" ? pesos(b.rule.value) : `${b.rule.value} %`}` },
              { key: "amount", label: "Bono", render: (b) => <span className="tl-money">{pesos(b.amount)}</span> },
              { key: "period", label: "Nómina", render: (b) => etiquetaPeriodo(b.payrollPeriod) },
              { key: "status", label: "Estado", render: (b) => {
                const [t, tono] = ESTADO_BONO[b.status] ?? [b.status, "gray"];
                return <span className="ev-actions"><Badge tone={tono}>{t}</Badge>{b.status === "aprobado" && (b.inPayroll ? <Badge tone="blue">En el recibo</Badge> : <small>Calcula la nómina</small>)}</span>;
              } },
              { key: "acc", label: "", render: (b) => b.status !== "cancelado" && b.payrollPeriod?.status !== "autorizado" && b.payrollPeriod?.status !== "por_autorizar" && (
                <Button variant="ghost" onClick={() => setCancelar({ b, reason: "" })}>Cancelar</Button>
              ) },
            ]}
          />
        </QueryState>
      </Panel>
      <Modal open={!!editar} onOpenChange={() => setEditar(null)} title="Reglas del bono" description="Bandas de calificación de 1 a 5 que no se encimen. Cambiar reglas no modifica bonos ya aprobados."
        footer={<><Button variant="outline" onClick={() => setEditar(null)}>Cancelar</Button><Button disabled={errores.length > 0} onClick={async () => { if (await enviar("PUT", "/bonus-rules", { rules: editar.map((r) => ({ ...r, min: Number(r.min), max: Number(r.max), value: Number(r.value) })) }, "Reglas guardadas")) setEditar(null); }}>Guardar reglas</Button></>}>
        {editar && (
          <div className="tl">
            {editar.map((r, i) => (
              <div key={i} className="tl-form tl-card">
                <label className="tl-full">Nombre<input className="ev-input" maxLength={80} value={r.name} onChange={(e) => setEditar(editar.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></label>
                <label>Desde<input className="ev-input" type="number" step="0.01" min={1} max={5} inputMode="decimal" value={r.min} onChange={(e) => setEditar(editar.map((x, j) => (j === i ? { ...x, min: e.target.value } : x)))} /></label>
                <label>Hasta<input className="ev-input" type="number" step="0.01" min={1} max={5} inputMode="decimal" value={r.max} onChange={(e) => setEditar(editar.map((x, j) => (j === i ? { ...x, max: e.target.value } : x)))} /></label>
                <label>Tipo<select className="ev-input" value={r.type} onChange={(e) => setEditar(editar.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}><option value="fijo">Monto fijo</option><option value="porcentaje">% del sueldo mensual</option></select></label>
                <label>{r.type === "fijo" ? "Monto (MXN)" : "Porcentaje"}<input className="ev-input" type="number" step="0.01" min={0} inputMode="decimal" value={r.value} onChange={(e) => setEditar(editar.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} /></label>
                <div className="tl-full"><Button variant="ghost" onClick={() => setEditar(editar.filter((_, j) => j !== i))}>Quitar regla</Button></div>
              </div>
            ))}
            {editar.length < 10 && <Button variant="outline" onClick={() => setEditar([...editar, { name: "", min: "", max: "", type: "fijo", value: "" }])}>Agregar banda</Button>}
            {errores.length > 0 && <Notice tone="red"><ul>{errores.map((e) => <li key={e}>{e}</li>)}</ul></Notice>}
          </div>
        )}
      </Modal>
      <Modal open={!!cancelar} onOpenChange={() => setCancelar(null)} title="Cancelar bono" description="Sale del borrador de nómina al recalcularla. Si la nómina ya se envió o autorizó no se puede."
        footer={<><Button variant="outline" onClick={() => setCancelar(null)}>No</Button><Button onClick={async () => { if (await enviar("POST", `/bonuses/${cancelar.b.id}/cancel`, { reason: cancelar.reason, revision: cancelar.b.revision }, "Bono cancelado")) setCancelar(null); }}>Cancelar bono</Button></>}>
        {cancelar && <label className="tl-label">Motivo<input className="ev-input" maxLength={300} value={cancelar.reason} onChange={(e) => setCancelar({ ...cancelar, reason: e.target.value })} /></label>}
      </Modal>
    </>
  );
}
