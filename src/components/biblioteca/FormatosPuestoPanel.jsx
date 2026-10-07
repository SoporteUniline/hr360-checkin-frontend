"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  BriefcaseBusiness,
  Eye,
  FileText,
  Pencil,
  Plus,
  Printer,
  Save,
  Trash2,
} from "lucide-react";

const STORAGE_PREFIX = "adamia:biblioteca-formatos-puesto:v2";

const VERBOS = {
  ejecutivo:
    "Administrar, aprobar, consolidar, decidir, delegar, establecer, formular, liderar, negociar, planear, representar, solucionar, verificar.",
  medio:
    "Analizar, asegurar, asignar, controlar, coordinar, diseñar, evaluar, facilitar, proponer, recomendar, revisar, supervisar.",
  operativo:
    "Archivar, clasificar, consultar, corregir, documentar, ejecutar, elaborar, entregar, informar, llenar, operar, registrar, utilizar.",
};

const FORMATOS = [
  {
    id: "perfil",
    codigo: "FR-RH-03",
    titulo: "Perfil de puesto",
    descripcion:
      "Requisitos, misión, objetivos, experiencia, habilidades y condiciones.",
    sections: [
      {
        titulo: "Datos generales",
        columns: 2,
        fields: [
          ["puesto", "Puesto"],
          ["plazas", "Plazas"],
          ["area", "Área"],
          ["supervisor", "Supervisor"],
        ],
      },
      {
        titulo: "Perfil requerido",
        columns: 3,
        fields: [
          ["sexo", "Sexo"],
          ["edad", "Edad"],
          ["estadoCivil", "Estado civil"],
        ],
      },
      {
        titulo: "Jornada",
        columns: 3,
        fields: [
          ["jornada", "Jornada laboral"],
          ["diasTrabajo", "Días de trabajo"],
          ["horario", "Horario"],
        ],
      },
      {
        titulo: "Contenido del puesto",
        fields: [
          ["mision", "Misión del puesto", "textarea"],
          ["objetivos", "Objetivos del puesto", "textarea"],
        ],
      },
      {
        titulo: "Competencias y condiciones",
        fields: [
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
    ],
  },
  {
    id: "descripcion",
    codigo: "FR-RH-04",
    titulo: "Descripción de puesto",
    descripcion:
      "Misión, funciones, relaciones, decisiones, reportes e indicadores.",
    sections: [
      {
        titulo: "Identificación",
        columns: 2,
        fields: [
          ["nombrePuesto", "Nombre del puesto"],
          ["jefeInmediato", "Jefe inmediato"],
          ["areasCargo", "Áreas a su cargo"],
          ["personasCargo", "No. de personas a su cargo"],
          ["puestosReportan", "Puestos que le reportan", "textarea"],
        ],
      },
      {
        titulo: "Propósito",
        fields: [["mision", "Misión", "textarea"]],
      },
      {
        titulo: "Funciones y relaciones",
        fields: [
          [
            "funciones",
            "Funciones del puesto",
            "rows",
            ["Función", "Resultado esperado"],
          ],
          [
            "relacionesInternas",
            "Relaciones internas",
            "rows",
            ["Área o puesto", "Propósito", "Frecuencia"],
          ],
          [
            "relacionesExternas",
            "Relaciones externas",
            "rows",
            ["Contacto", "Propósito", "Frecuencia"],
          ],
        ],
      },
      {
        titulo: "Autoridad y seguimiento",
        fields: [
          ["decisiones", "Decisiones que puede tomar", "textarea"],
          [
            "reportes",
            "Reportes que elabora",
            "rows",
            ["Nombre", "Periodicidad", "Destino"],
          ],
          [
            "procesos",
            "Procesos en que participa",
            "rows",
            ["Proceso", "Rol", "Responsabilidad"],
          ],
          [
            "indicadores",
            "Indicadores",
            "rows",
            ["Indicador", "Meta o resultado esperado"],
          ],
          ["formacionInicial", "Formación que debe recibir", "textarea"],
        ],
      },
    ],
  },
  {
    id: "actividades",
    codigo: "FR-RH-05",
    titulo: "Lista de actividades diarias",
    descripcion: "Actividades por momento del turno, responsable y evidencia.",
    sections: [
      {
        titulo: "Datos del turno",
        columns: 3,
        fields: [
          ["puesto", "Puesto"],
          ["horaInicio", "Hora de inicio"],
          ["horaTermino", "Hora de término"],
        ],
      },
      {
        titulo: "Actividades",
        fields: [
          [
            "inicioTurno",
            "Inicio del turno",
            "rows",
            ["Actividad", "Responsable", "Evidencia"],
          ],
          [
            "medioTurno",
            "Medio turno",
            "rows",
            ["Actividad", "Responsable", "Evidencia"],
          ],
          [
            "terminoTurno",
            "Término del turno",
            "rows",
            ["Actividad", "Responsable", "Evidencia"],
          ],
          ["observaciones", "Observaciones", "textarea"],
        ],
      },
    ],
  },
];

const allFields = (formato) =>
  formato.sections.flatMap((section) => section.fields);

const fieldTemplate = (formato) =>
  Object.fromEntries(
    allFields(formato).map(([key, , type, columns]) => [
      key,
      type === "rows"
        ? [Object.fromEntries((columns || []).map((column) => [column, ""]))]
        : "",
    ]),
  );

const initialData = Object.fromEntries(
  FORMATOS.map((formato) => [formato.id, fieldTemplate(formato)]),
);

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
  return String(
    puesto?.id_puesto ||
      puesto?.id ||
      puesto?.nombre_puesto ||
      puesto?.nombre ||
      "manual",
  );
}

function getPuestoNombre(puesto) {
  return puesto?.nombre_puesto || puesto?.nombre || "";
}

function makeRows(columns) {
  return [Object.fromEntries((columns || []).map((column) => [column, ""]))];
}

function rowsFor(value, columns) {
  return Array.isArray(value) && value.length ? value : makeRows(columns);
}

function valueIsFilled(value) {
  if (Array.isArray(value)) {
    return value.some((row) => Object.values(row || {}).some(Boolean));
  }
  return Boolean(String(value || "").trim());
}

function countCompletedFields(formato, data) {
  const fields = allFields(formato);
  const completed = fields.filter(([key]) => valueIsFilled(data?.[key])).length;
  return `${completed}/${fields.length}`;
}

function companyFromUser(dataUser, idEmpresa) {
  const empresa =
    dataUser?.empresas_detalle?.find(
      (item) => String(item.id_empresa) === String(idEmpresa),
    ) || dataUser?.empresa;

  return {
    nombre:
      empresa?.nombre_empresa ||
      empresa?.nombre ||
      dataUser?.nombre_empresa ||
      "Empresa",
    logo:
      empresa?.url_imagen ||
      dataUser?.empresa?.url_imagen ||
      "/assets/logo.png",
  };
}

function documentHtml({ formato, data, puestoNombre, empresa, print = false }) {
  const fecha = new Date().toLocaleDateString("es-MX");
  const sections = formato.sections
    .map((section) => {
      const rows = section.fields
        .map(([key, label, type, columns]) => {
          const value = data?.[key];

          if (type === "rows") {
            const body = rowsFor(value, columns)
              .map(
                (row) =>
                  `<tr>${columns
                    .map(
                      (column) =>
                        `<td>${escapeHtml(row?.[column] || "").replace(/\n/g, "<br/>")}&nbsp;</td>`,
                    )
                    .join("")}</tr>`,
              )
              .join("");

            return `<tr><td class="section-label" colspan="2">${escapeHtml(label)}</td></tr><tr><td colspan="2" class="nested"><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></td></tr>`;
          }

          return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || "").replace(/\n/g, "<br/>")}&nbsp;</td></tr>`;
        })
        .join("");

      return `<section><h2>${escapeHtml(section.titulo)}</h2><table>${rows}</table></section>`;
    })
    .join("");

  return `<!doctype html><html><head><title>${escapeHtml(formato.titulo)}</title><style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;background:${print ? "#fff" : "#f3f4f6"};}
    .sheet{width:216mm;min-height:279mm;margin:${print ? "0" : "24px auto"};background:white;padding:18mm 20mm;box-shadow:${print ? "none" : "0 20px 50px rgba(15,23,42,.12)"};}
    header{text-align:center;margin-bottom:18px}.logo{height:34px;max-width:150px;object-fit:contain;margin-bottom:8px}.code{font-size:11px}.company{font-size:24px;font-weight:800}.date{font-size:11px;margin-top:8px}.job{font-size:15px;font-weight:700;margin-top:10px}
    h1{font-size:18px;text-align:center;margin:18px 0 14px;text-transform:uppercase;letter-spacing:.04em} h2{font-size:13px;text-align:center;margin:20px 0 0;padding:7px 8px;border:1px solid #777;border-bottom:0;background:#f8fafc}
    table{width:100%;border-collapse:collapse;table-layout:fixed} th,td{border:1px solid #777;padding:7px 8px;vertical-align:top;font-size:12px;line-height:1.4} th{width:34%;text-align:left;font-weight:700;background:#fafafa}.section-label{text-align:center;font-weight:700;background:#fafafa}.nested{padding:0}.nested table th{width:auto;text-align:left;background:#f8fafc}
    .signatures{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:36px}.signature{text-align:center;font-size:12px}.line{border-top:1px solid #444;margin-bottom:8px;height:1px}.actions{position:sticky;top:0;padding:12px;text-align:right;background:#fff;border-bottom:1px solid #e5e7eb;z-index:2}
    .actions button{border:1px solid #111827;background:#111827;color:#fff;border-radius:6px;padding:8px 12px;font-size:13px;cursor:pointer}
    @media print{body{background:white}.sheet{margin:0;box-shadow:none;width:auto;min-height:auto}.actions{display:none}}
  </style></head><body>${print ? "" : '<div class="actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>'}<main class="sheet">
    <header>
      <img class="logo" src="${escapeHtml(empresa.logo)}" alt="Logo"/>
      <div class="code">${escapeHtml(formato.codigo)}</div>
      <div class="company">${escapeHtml(empresa.nombre)}</div>
      <div class="date">${escapeHtml(fecha)}</div>
      <div class="job">${escapeHtml(puestoNombre || "Puesto")}</div>
    </header>
    <h1>${escapeHtml(formato.titulo)}</h1>
    ${sections}
    <div class="signatures"><div class="signature"><div class="line"></div>Responsable autorizado de la empresa</div><div class="signature"><div class="line"></div>Persona que revisa o recibe</div></div>
  </main>${print ? "<script>window.print();</script>" : ""}</body></html>`;
}

function documentBodyHtml(props) {
  const html = documentHtml(props);
  const style = html.match(/<style>[\s\S]*?<\/style>/)?.[0] || "";
  const body = html
    .replace(/<!doctype html><html><head>[\s\S]*?<\/head><body>/, "")
    .replace(/<\/body><\/html>$/, "");
  return `${style}${body}`;
}

function GuiaPanel() {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex items-start gap-3">
        <BookOpen className="mt-1 h-5 w-5 text-blue-700" />
        <div>
          <h3 className="font-semibold text-slate-950">Guía de redacción</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Misión: verbo + objeto + marco general + resultado. Funciones:
            verbo + objeto + resultado.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        {Object.entries(VERBOS).map(([nivel, verbos]) => (
          <div key={nivel} className="rounded-md bg-white px-3 py-2 text-sm">
            <span className="font-semibold capitalize text-slate-800">
              {nivel}:{" "}
            </span>
            <span className="text-slate-600">{verbos}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FormatosPuestoPanel({ idEmpresa, dataUser }) {
  const [puestos, setPuestos] = useState([]);
  const [loadingPuestos, setLoadingPuestos] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [puestoManual, setPuestoManual] = useState("");
  const [activeFormato, setActiveFormato] = useState(FORMATOS[0].id);
  const [records, setRecords] = useState({});
  const [viewOpen, setViewOpen] = useState(false);

  const empresa = useMemo(
    () => companyFromUser(dataUser, idEmpresa),
    [dataUser, idEmpresa],
  );

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

  const manualKey = puestoManual.trim()
    ? `manual:${puestoManual.trim().toLocaleLowerCase("es-MX")}`
    : "";
  const key = selectedKey || manualKey;
  const puestoSeleccionado = puestos.find(
    (puesto) => getPuestoId(puesto) === key,
  );
  const puestoNombre =
    getPuestoNombre(puestoSeleccionado) ||
    records[key]?.puestoNombre ||
    puestoManual.trim();
  const current = records[key] || initialData;
  const formato =
    FORMATOS.find((item) => item.id === activeFormato) || FORMATOS[0];
  const formData = current[formato.id] || initialData[formato.id];

  const saveRecords = (next) => {
    setRecords(next);
    window.localStorage.setItem(storageKey(idEmpresa), JSON.stringify(next));
  };

  const updateField = (fieldKey, value) => {
    if (!key) return;
    saveRecords({
      ...records,
      [key]: {
        ...current,
        puestoNombre,
        [formato.id]: { ...formData, [fieldKey]: value },
      },
    });
  };

  const updateRow = (fieldKey, index, column, value) => {
    const field = allFields(formato).find(([itemKey]) => itemKey === fieldKey);
    const rows = Array.isArray(formData[fieldKey])
      ? [...formData[fieldKey]]
      : makeRows(field?.[3]);
    rows[index] = { ...rows[index], [column]: value };
    updateField(fieldKey, rows);
  };

  const addRow = (fieldKey, columns) =>
    updateField(fieldKey, [
      ...(Array.isArray(formData[fieldKey]) ? formData[fieldKey] : []),
      ...makeRows(columns),
    ]);

  const removeRow = (fieldKey, index, columns) => {
    const rows = rowsFor(formData[fieldKey], columns).filter(
      (_, i) => i !== index,
    );
    updateField(fieldKey, rows.length ? rows : makeRows(columns));
  };

  const openEditor = (nextKey, nextFormato) => {
    setSelectedKey(nextKey);
    setPuestoManual("");
    setActiveFormato(nextFormato);
  };

  const openView = (nextKey, nextFormato) => {
    setSelectedKey(nextKey);
    setPuestoManual("");
    setActiveFormato(nextFormato);
    setViewOpen(true);
  };

  const printFormato = () => {
    const popup = window.open("", "_blank", "width=900,height=1000");
    if (!popup) return;
    popup.document.write(
      documentHtml({ formato, data: formData, puestoNombre, empresa, print: true }),
    );
    popup.document.close();
  };

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Biblioteca documental
            </p>
            <h2 className="text-xl font-bold text-slate-950">
              Creador de documentos por puesto
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Elige un puesto del catálogo, captura la información por secciones
              y genera una hoja formal para imprimir o guardar en PDF.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={puestoManual}
              onChange={(event) => {
                setPuestoManual(event.target.value);
                setSelectedKey("");
              }}
              placeholder="Crear puesto manual"
              className="w-full sm:w-64"
            />
            <Button type="button" variant="outline" onClick={() => setActiveFormato(FORMATOS[0].id)}>
              <Plus className="h-4 w-4" /> Usar manual
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-slate-950">
                <BriefcaseBusiness className="h-4 w-4 text-blue-700" />
                Puestos del catálogo
              </div>
              <span className="text-xs text-slate-500">
                {loadingPuestos ? "Cargando..." : `${puestos.length} puestos`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Puesto</th>
                    {FORMATOS.map((item) => (
                      <th key={item.id} className="px-4 py-3 text-left">
                        {item.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {puestos.map((puesto) => {
                    const rowKey = getPuestoId(puesto);
                    const rowRecord = records[rowKey] || initialData;

                    return (
                      <tr key={rowKey} className="align-top">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {getPuestoNombre(puesto)}
                        </td>
                        {FORMATOS.map((item) => (
                          <td key={item.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                {countCompletedFields(item, rowRecord[item.id])}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openEditor(rowKey, item.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => openView(rowKey, item.id)}
                              >
                                <Eye className="h-3.5 w-3.5" /> Ver
                              </Button>
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {!puestos.length && !loadingPuestos && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        No hay puestos en el catálogo. Puedes crear uno manual arriba.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {key ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Editando para: {puestoNombre || "Puesto manual"}
                  </p>
                  <h3 className="text-lg font-bold text-slate-950">
                    {formato.titulo}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formato.descripcion}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FORMATOS.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      size="sm"
                      variant={item.id === activeFormato ? "default" : "outline"}
                      onClick={() => setActiveFormato(item.id)}
                    >
                      {item.titulo}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                {formato.sections.map((section) => (
                  <div key={section.titulo} className="rounded-lg border border-slate-100 p-4">
                    <h4 className="mb-3 font-semibold text-slate-900">
                      {section.titulo}
                    </h4>
                    <div
                      className={
                        section.columns === 3
                          ? "grid gap-3 md:grid-cols-3"
                          : section.columns === 2
                            ? "grid gap-3 md:grid-cols-2"
                            : "space-y-3"
                      }
                    >
                      {section.fields.map(([fieldKey, label, type, columns]) => (
                        <div key={fieldKey} className={type === "rows" ? "md:col-span-full" : ""}>
                          <label className="text-sm font-medium text-slate-700">
                            {label}
                          </label>
                          {type === "textarea" ? (
                            <Textarea
                              value={formData[fieldKey] || ""}
                              onChange={(event) =>
                                updateField(fieldKey, event.target.value)
                              }
                              className="mt-1 min-h-20"
                            />
                          ) : type === "rows" ? (
                            <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                              <table className="w-full min-w-[660px] text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                  <tr>
                                    {columns.map((column) => (
                                      <th key={column} className="px-3 py-2 text-left">
                                        {column}
                                      </th>
                                    ))}
                                    <th className="w-12 px-3 py-2" />
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {rowsFor(formData[fieldKey], columns).map((row, index) => (
                                    <tr key={index}>
                                      {columns.map((column) => (
                                        <td key={column} className="p-2">
                                          <Textarea
                                            value={row?.[column] || ""}
                                            onChange={(event) =>
                                              updateRow(
                                                fieldKey,
                                                index,
                                                column,
                                                event.target.value,
                                              )
                                            }
                                            className="min-h-14 border-0 bg-slate-50 shadow-none focus-visible:ring-1"
                                          />
                                        </td>
                                      ))}
                                      <td className="p-2 align-top">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeRow(fieldKey, index, columns)
                                          }
                                          className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <button
                                type="button"
                                onClick={() => addRow(fieldKey, columns)}
                                className="flex w-full items-center justify-center gap-2 border-t border-slate-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                              >
                                <Plus className="h-4 w-4" /> Agregar renglón
                              </button>
                            </div>
                          ) : (
                            <Input
                              value={formData[fieldKey] || ""}
                              onChange={(event) =>
                                updateField(fieldKey, event.target.value)
                              }
                              className="mt-1"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    saveRecords({ ...records, [key]: { ...current, puestoNombre } })
                  }
                >
                  <Save className="h-4 w-4" /> Guardar
                </Button>
                <Button type="button" variant="outline" onClick={() => setViewOpen(true)}>
                  <Eye className="h-4 w-4" /> Ver documento
                </Button>
                <Button type="button" onClick={printFormato}>
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Selecciona un puesto del catálogo o escribe uno manual.
              </p>
            </div>
          )}
        </div>

        <GuiaPanel />
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-700" />
              Vista formal del documento
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(92vh-76px)] overflow-auto">
            <div
              dangerouslySetInnerHTML={{
                __html: documentBodyHtml({
                  formato,
                  data: formData,
                  puestoNombre,
                  empresa,
                }),
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
