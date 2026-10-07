"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, Plus, Printer, Save, Trash2 } from "lucide-react";

const STORAGE_PREFIX = "adamia:biblioteca-formatos-puesto:v1";

const VERBOS = {
  ejecutivo: "Administrar, anticipar, aprobar, consolidar, decidir, delegar, establecer, formular, impulsar, integrar, liderar, negociar, orientar, planear, representar, seleccionar, solucionar, verificar.",
  medio: "Analizar, asegurar, asesorar, asignar, autorizar, calcular, controlar, coordinar, diseñar, emitir, evaluar, facilitar, guiar, investigar, proponer, recomendar, revisar, supervisar.",
  operativo: "Archivar, clasificar, colocar, consultar, corregir, desarrollar, distribuir, documentar, ejecutar, elaborar, entregar, identificar, informar, llenar, operar, preparar, realizar, registrar, utilizar.",
};

const FORMATOS = [
  {
    id: "perfil",
    titulo: "Perfil de puesto",
    descripcion: "Define requisitos, misión, objetivos, experiencia, habilidades y condiciones del puesto.",
    fields: [
      ["puesto", "Puesto"],
      ["plazas", "Plazas"],
      ["area", "Área"],
      ["supervisor", "Supervisor"],
      ["sexo", "Sexo"],
      ["edad", "Edad"],
      ["estadoCivil", "Estado civil"],
      ["jornada", "Jornada laboral"],
      ["diasTrabajo", "Días de trabajo"],
      ["horario", "Horario"],
      ["mision", "Misión del puesto", "textarea"],
      ["objetivos", "Objetivos del puesto", "textarea"],
      ["formacion", "Formación académica", "textarea"],
      ["programas", "Programas especializados requeridos", "textarea"],
      ["ofimatica", "Conocimientos sobre ofimática", "textarea"],
      ["idiomas", "Idiomas", "textarea"],
      ["experiencia", "Experiencia", "textarea"],
      ["habilidades", "Habilidades", "textarea"],
      ["esfuerzos", "Esfuerzos", "textarea"],
      ["condiciones", "Condiciones", "textarea"],
    ],
  },
  {
    id: "descripcion",
    titulo: "Descripción de puesto",
    descripcion: "Documenta misión, funciones, relaciones, decisiones, reportes, procesos e indicadores.",
    fields: [
      ["nombrePuesto", "Nombre del puesto"],
      ["jefeInmediato", "Jefe inmediato"],
      ["areasCargo", "Áreas a su cargo"],
      ["personasCargo", "No. de personas a su cargo"],
      ["puestosReportan", "Puestos que le reportan", "textarea"],
      ["mision", "Misión", "textarea"],
      ["funciones", "Funciones del puesto", "rows", ["Función", "Resultado esperado"]],
      ["relacionesInternas", "Relaciones internas", "rows", ["Área o puesto", "Propósito", "Frecuencia"]],
      ["relacionesExternas", "Relaciones externas", "rows", ["Contacto", "Propósito", "Frecuencia"]],
      ["decisiones", "Decisiones que puede tomar", "textarea"],
      ["reportes", "Reportes que elabora", "rows", ["Nombre", "Periodicidad", "Destino"]],
      ["procesos", "Procesos en que participa", "rows", ["Proceso", "Rol", "Responsabilidad"]],
      ["indicadores", "Indicadores", "rows", ["Indicador", "Meta o resultado esperado"]],
      ["formacionInicial", "Formación que debe recibir", "textarea"],
    ],
  },
  {
    id: "actividades",
    titulo: "Lista de actividades diarias",
    descripcion: "Checklist operativo para inicio, medio turno y término de turno.",
    fields: [
      ["puesto", "Puesto"],
      ["horaInicio", "Hora de inicio"],
      ["horaTermino", "Hora de término"],
      ["inicioTurno", "Inicio del turno", "rows", ["Actividad", "Responsable", "Evidencia"]],
      ["medioTurno", "Medio turno", "rows", ["Actividad", "Responsable", "Evidencia"]],
      ["terminoTurno", "Término del turno", "rows", ["Actividad", "Responsable", "Evidencia"]],
      ["observaciones", "Observaciones", "textarea"],
    ],
  },
];

const fieldTemplate = (fields) =>
  Object.fromEntries(fields.map(([key, , type, columns]) => [key, type === "rows" ? [Object.fromEntries((columns || []).map((c) => [c, ""]))] : ""]));

const initialData = Object.fromEntries(FORMATOS.map((formato) => [formato.id, fieldTemplate(formato.fields)]));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function storageKey(idEmpresa) {
  return `${STORAGE_PREFIX}:${idEmpresa || "sin-empresa"}`;
}

function getPuestoId(puesto) {
  return String(puesto?.id_puesto || puesto?.id || puesto?.nombre_puesto || puesto?.nombre || "manual");
}

function getPuestoNombre(puesto) {
  return puesto?.nombre_puesto || puesto?.nombre || "";
}

function makeRows(columns) {
  return [Object.fromEntries((columns || []).map((c) => [c, ""]))];
}

function renderValue(value) {
  if (Array.isArray(value)) {
    return value
      .filter((row) => Object.values(row || {}).some(Boolean))
      .map((row) => `<tr>${Object.values(row).map((cell) => `<td>${escapeHtml(cell).replace(/\n/g, "<br/>")}</td>`).join("")}</tr>`)
      .join("");
  }
  return escapeHtml(value).replace(/\n/g, "<br/>");
}

function PrintableDocument({ formato, data, puestoNombre }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 border-b border-slate-200 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">ADAMIA</p>
        <h3 className="text-xl font-bold text-slate-950">{formato.titulo}</h3>
        <p className="mt-1 text-sm text-slate-500">{puestoNombre || "Puesto sin seleccionar"}</p>
      </div>

      <div className="space-y-4">
        {formato.fields.map(([key, label, type, columns]) => {
          const value = data[key];
          const hasRows = type === "rows";
          return (
            <section key={key}>
              <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
              {hasRows ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr>{columns.map((col) => <th key={col} className="border border-slate-200 bg-slate-50 px-3 py-2 text-left">{col}</th>)}</tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(value) && value.length ? value : makeRows(columns)).map((row, index) => (
                        <tr key={index}>{columns.map((col) => <td key={col} className="min-w-40 border border-slate-200 px-3 py-2 align-top text-slate-700">{row?.[col] || " "}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-1 min-h-6 whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">{value || " "}</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function GuiaPanel() {
  return (
    <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex items-start gap-3">
        <BookOpen className="mt-1 h-5 w-5 text-blue-700" />
        <div>
          <h3 className="font-semibold text-slate-950">Guía rápida para redactar puestos</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">La misión se redacta con verbo, objeto, marco general de actuación y resultado. Las funciones usan verbo, objeto y resultado.</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Nivel ejecutivo</p>
          <p className="mt-2 text-sm text-slate-700">{VERBOS.ejecutivo}</p>
        </div>
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Nivel medio</p>
          <p className="mt-2 text-sm text-slate-700">{VERBOS.medio}</p>
        </div>
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Nivel operativo</p>
          <p className="mt-2 text-sm text-slate-700">{VERBOS.operativo}</p>
        </div>
      </div>
    </div>
  );
}

export default function FormatosPuestoPanel({ idEmpresa }) {
  const [puestos, setPuestos] = useState([]);
  const [loadingPuestos, setLoadingPuestos] = useState(false);
  const [puestoId, setPuestoId] = useState("");
  const [puestoManual, setPuestoManual] = useState("");
  const [activeFormato, setActiveFormato] = useState("perfil");
  const [records, setRecords] = useState({});

  useEffect(() => {
    if (!idEmpresa) return;
    const saved = window.localStorage.getItem(storageKey(idEmpresa));
    try {
      setRecords(saved ? JSON.parse(saved) : {});
    } catch {
      setRecords({});
    }
  }, [idEmpresa]);

  useEffect(() => {
    if (!idEmpresa) return;
    let cancelled = false;
    setLoadingPuestos(true);
    axios
      .get(`/checador/puestos?id_empresa=${idEmpresa}`)
      .then((res) => {
        if (cancelled) return;
        setPuestos(Array.isArray(res.data?.puestos) ? res.data.puestos : []);
      })
      .catch(() => setPuestos([]))
      .finally(() => !cancelled && setLoadingPuestos(false));
    return () => {
      cancelled = true;
    };
  }, [idEmpresa]);

  const puestoSeleccionado = useMemo(() => puestos.find((p) => getPuestoId(p) === puestoId), [puestos, puestoId]);
  const puestoNombre = getPuestoNombre(puestoSeleccionado) || puestoManual.trim();
  const selectedKey = puestoId || (puestoManual.trim() ? `manual:${puestoManual.trim().toLocaleLowerCase("es-MX")}` : "");
  const current = records[selectedKey] || initialData;
  const formato = FORMATOS.find((item) => item.id === activeFormato) || FORMATOS[0];
  const formData = current[formato.id] || initialData[formato.id];

  const saveRecords = (next) => {
    setRecords(next);
    window.localStorage.setItem(storageKey(idEmpresa), JSON.stringify(next));
  };

  const updateField = (key, value) => {
    if (!selectedKey) return;
    saveRecords({
      ...records,
      [selectedKey]: {
        ...current,
        puestoNombre,
        [formato.id]: { ...formData, [key]: value },
      },
    });
  };

  const updateRow = (key, index, column, value) => {
    const rows = Array.isArray(formData[key]) ? [...formData[key]] : makeRows(formato.fields.find((f) => f[0] === key)?.[3]);
    rows[index] = { ...rows[index], [column]: value };
    updateField(key, rows);
  };

  const addRow = (key, columns) => updateField(key, [...(Array.isArray(formData[key]) ? formData[key] : []), ...makeRows(columns)]);
  const removeRow = (key, index, columns) => {
    const rows = (Array.isArray(formData[key]) ? formData[key] : makeRows(columns)).filter((_, i) => i !== index);
    updateField(key, rows.length ? rows : makeRows(columns));
  };

  const printFormato = () => {
    const rowsHtml = formato.fields.map(([key, label, type, columns]) => {
      const value = formData[key];
      if (type === "rows") {
        const body = renderValue(value) || `<tr>${columns.map(() => "<td>&nbsp;</td>").join("")}</tr>`;
        return `<section><h2>${escapeHtml(label)}</h2><table><thead><tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></section>`;
      }
      return `<section><h2>${escapeHtml(label)}</h2><p>${renderValue(value) || "&nbsp;"}</p></section>`;
    }).join("");
    const popup = window.open("", "_blank", "width=900,height=1000");
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(formato.titulo)}</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:36px;}h1{font-size:24px;margin:0;}h2{font-size:13px;margin:18px 0 6px;}p{border:1px solid #e5e7eb;background:#f8fafc;min-height:24px;padding:8px;white-space:pre-wrap;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #d9d9d9;padding:8px;text-align:left;vertical-align:top;}th{background:#eff6ff;}header{border-bottom:1px solid #d9d9d9;padding-bottom:12px;margin-bottom:18px;}button{display:none}@media print{body{margin:18mm;}}</style></head><body><header><strong>ADAMIA</strong><h1>${escapeHtml(formato.titulo)}</h1><p style="border:0;background:white;padding:0;">Puesto: ${escapeHtml(puestoNombre || "Sin puesto")}</p></header>${rowsHtml}<script>window.print();</script></body></html>`);
    popup.document.close();
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Formatos por puesto</h2>
            <p className="mt-1 text-sm text-slate-500">Perfiles, descripciones y actividades editables por puesto. Tus documentos cargados siguen separados en su pestaña.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px]">
            <label className="text-sm font-medium text-slate-700">
              Puesto existente
              <select className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm" value={puestoId} onChange={(e) => { setPuestoId(e.target.value); setPuestoManual(""); }}>
                <option value="">{loadingPuestos ? "Cargando puestos..." : "Selecciona un puesto"}</option>
                {puestos.map((puesto) => <option key={getPuestoId(puesto)} value={getPuestoId(puesto)}>{getPuestoNombre(puesto)}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              O escribir puesto
              <Input value={puestoManual} onChange={(e) => { setPuestoManual(e.target.value); setPuestoId(""); }} placeholder="Ej. Cajero, Mesero, Supervisor" className="mt-1" />
            </label>
          </div>
        </div>
      </div>

      <GuiaPanel />

      {!selectedKey ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Selecciona o escribe un puesto para empezar a editar sus formatos.</div>
      ) : (
        <Tabs value={activeFormato} onValueChange={setActiveFormato} className="gap-4">
          <TabsList className="h-auto flex-wrap justify-start">
            {FORMATOS.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.titulo}</TabsTrigger>)}
          </TabsList>

          {FORMATOS.map((item) => (
            <TabsContent key={item.id} value={item.id} className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-950">{item.titulo}</h3>
                      <p className="mt-1 text-sm text-slate-500">{item.descripcion}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => saveRecords({ ...records, [selectedKey]: { ...current, puestoNombre } })}>
                        <Save className="h-4 w-4" /> Guardar
                      </Button>
                      <Button type="button" size="sm" onClick={printFormato}>
                        <Printer className="h-4 w-4" /> Imprimir
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {item.fields.map(([key, label, type, columns]) => (
                      <div key={key}>
                        <label className="text-sm font-medium text-slate-700">{label}</label>
                        {type === "textarea" ? (
                          <Textarea value={formData[key] || ""} onChange={(e) => updateField(key, e.target.value)} className="mt-1 min-h-24" />
                        ) : type === "rows" ? (
                          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                            <table className="min-w-[680px] w-full text-sm">
                              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>{columns.map((col) => <th key={col} className="px-3 py-2 text-left">{col}</th>)}<th className="w-12 px-3 py-2" /></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(Array.isArray(formData[key]) ? formData[key] : makeRows(columns)).map((row, index) => (
                                  <tr key={index}>
                                    {columns.map((col) => <td key={col} className="p-2"><Textarea value={row?.[col] || ""} onChange={(e) => updateRow(key, index, col, e.target.value)} className="min-h-16 border-0 bg-slate-50 shadow-none focus-visible:ring-1" /></td>)}
                                    <td className="p-2 align-top"><button type="button" onClick={() => removeRow(key, index, columns)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button type="button" onClick={() => addRow(key, columns)} className="flex w-full items-center justify-center gap-2 border-t border-slate-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
                              <Plus className="h-4 w-4" /> Agregar renglón
                            </button>
                          </div>
                        ) : (
                          <Input value={formData[key] || ""} onChange={(e) => updateField(key, e.target.value)} className="mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="sticky top-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FileText className="h-4 w-4" /> Vista previa</div>
                    <PrintableDocument formato={item} data={formData} puestoNombre={puestoNombre} />
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  );
}
