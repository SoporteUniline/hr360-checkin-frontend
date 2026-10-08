"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { plantillasApi } from "@/lib/gestionDocumentalApi";
import { empresasDocumentales } from "@/lib/plantillasAdamia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Printer,
  Save,
  Search,
} from "lucide-react";
import {
  FORMATOS_PUESTO,
  codigoDocumentoPuesto,
  crearDocumentoPuesto,
  guardarDocumentoPuesto,
  idPuesto,
  limpiarDocumentoPuesto,
  nombrePuesto,
  normalizarPuesto,
  perteneceDocumentoPuesto,
  textoSeguro,
} from "@/lib/documentos/puestos";
import DocumentoPuestoEditor from "./DocumentoPuestoEditor";
import { PUESTO_DOCUMENT_CSS } from "./puestoDocumentStyles";

const apiError = (error, fallback) =>
  error?.response?.data?.error || error?.message || fallback;
const draftKey = (empresa, codigo) =>
  `adamia:puesto-editor:v3:${empresa}:${codigo}`;
function leerLocal(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export default function FormatosPuestoPanel({ idEmpresa, dataUser }) {
  const companies = empresasDocumentales(dataUser);
  const companyId = String(idEmpresa || companies[0]?.id || "");
  if (!companies.some((company) => company.id === companyId))
    return (
      <p className="rounded-lg border p-6 text-sm text-slate-500">
        Selecciona una empresa para consultar sus formatos por puesto.
      </p>
    );
  return (
    <PanelEmpresa key={companyId} idEmpresa={companyId} dataUser={dataUser} />
  );
}

function PanelEmpresa({ idEmpresa, dataUser }) {
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("todos");
  const [tab, setTab] = useState("base");
  const [guide, setGuide] = useState(false);
  const [view, setView] = useState("list");
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [legacy, setLegacy] = useState({});
  const alive = useRef(true);
  const saveLock = useRef(false);
  const backupWarning = useRef(false);
  const bodyTop = useRef(null);
  const puestosKey = `/checador/puestos?id_empresa=${idEmpresa}`;
  const templatesKey = `/checador/gestion-documental/plantillas?${new URLSearchParams(
    { empresa: idEmpresa, search: `AD-PUESTO-${idEmpresa}-` }
  )}`;
  const {
    data: puestosData,
    error: puestosError,
    isLoading: puestosLoading,
    mutate: reloadPuestos,
  } = useSWR(puestosKey, fetcherWithToken);
  const {
    data: templatesData,
    error: templatesError,
    isLoading: templatesLoading,
    mutate: reloadTemplates,
  } = useSWR(templatesKey, fetcherWithToken);
  const { data: empresaData } = useSWR(
    `/empresas/${idEmpresa}`,
    (url) => axios.get(url).then((r) => r.data),
    { revalidateOnFocus: false }
  );
  const detail = dataUser?.empresas_detalle?.find(
    (item) => String(item.id_empresa) === idEmpresa
  );
  const empresa = {
    nombre:
      empresaData?.nombre_empresa ||
      detail?.nombre_empresa ||
      detail?.nombre ||
      dataUser?.empresa?.nombre_empresa ||
      `Empresa ${idEmpresa}`,
    logo: empresaData?.url_imagen || detail?.url_imagen || "",
  };
  useEffect(() => {
    alive.current = true;
    const old = leerLocal(`adamia:biblioteca-formatos-puesto:v2:${idEmpresa}`);
    setLegacy(old && typeof old === "object" && !Array.isArray(old) ? old : {});
    return () => {
      alive.current = false;
    };
  }, [idEmpresa]);
  useEffect(() => {
    if (!dirty || !draft) return;
    try {
      window.localStorage.setItem(
        draftKey(idEmpresa, draft.codigo),
        JSON.stringify({
          empresa: idEmpresa,
          codigo: draft.codigo,
          nombre: draft.nombre,
          html: draft.html,
          anterior: draft.anterior,
        })
      );
    } catch {
      if (!backupWarning.current) {
        enqueueSnackbar(
          "No fue posible respaldar este borrador en el navegador. Guarda tu versión antes de salir.",
          { variant: "warning" }
        );
        backupWarning.current = true;
      }
    }
  }, [draft, dirty, idEmpresa, enqueueSnackbar]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const puestos = useMemo(
    () =>
      (Array.isArray(puestosData?.puestos) ? puestosData.puestos : []).filter(
        (p) =>
          /^[1-9]\d*$/.test(idPuesto(p)) &&
          (p.id_empresa == null || String(p.id_empresa) === idEmpresa)
      ),
    [puestosData, idEmpresa]
  );
  const saved = useMemo(
    () =>
      (Array.isArray(templatesData?.data) ? templatesData.data : []).filter(
        (d) =>
          d.codigo?.startsWith(`AD-PUESTO-${idEmpresa}-`) &&
          (d.id_empresa == null || String(d.id_empresa) === idEmpresa)
      ),
    [templatesData, idEmpresa]
  );
  const rows = useMemo(
    () =>
      puestos.flatMap((puesto) =>
        FORMATOS_PUESTO.map((formato) => {
          const codigo = codigoDocumentoPuesto(
            idEmpresa,
            idPuesto(puesto),
            formato.id
          );
          return {
            puesto,
            formato,
            codigo,
            saved: saved.find((d) => d.codigo === codigo),
            legacy: legacy[idPuesto(puesto)]?.[formato.id],
          };
        })
      ),
    [puestos, idEmpresa, saved, legacy]
  );
  const filtered = rows.filter(
    (row) =>
      (tab === "base" || row.saved) &&
      (type === "todos" || row.formato.id === type) &&
      normalizarPuesto(
        `${row.formato.nombre} ${nombrePuesto(row.puesto)} ${
          row.saved?.nombre || ""
        }`
      ).includes(normalizarPuesto(search))
  );
  const scrollTop = () =>
    bodyTop.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  const openDocument = async (row, mode) => {
    if (opening || saving) return;
    setOpening(row.codigo);
    try {
      let anterior = null;
      if (row.saved) {
        anterior = await plantillasApi.getById(row.saved.id_plantilla);
        if (!perteneceDocumentoPuesto(anterior, idEmpresa, row.codigo))
          throw new Error("No se pudo verificar la empresa del documento.");
        anterior = { ...anterior, id_plantilla: row.saved.id_plantilla };
      }
      if (!alive.current) return;
      const backup = leerLocal(draftKey(idEmpresa, row.codigo));
      const recover =
        mode === "edit" &&
        backup?.empresa === idEmpresa &&
        backup?.codigo === row.codigo &&
        typeof backup.html === "string";
      const oldData =
        row.legacy && typeof row.legacy === "object" ? row.legacy : {};
      const html = recover
        ? backup.html
        : anterior?.contenido_html ||
          crearDocumentoPuesto(row.formato.id, row.puesto, empresa, oldData);
      setDraft({
        ...row,
        anterior: recover ? backup.anterior : anterior,
        nombre: recover
          ? String(
              backup.nombre ||
                `${row.formato.nombre} · ${nombrePuesto(row.puesto)}`
            )
          : anterior?.nombre ||
            `${row.formato.nombre} · ${nombrePuesto(row.puesto)}`,
        html: limpiarDocumentoPuesto(html),
        editorKey: `${row.codigo}:${Date.now()}`,
      });
      setDirty(Boolean(recover));
      setView(mode);
      scrollTop();
      if (recover)
        enqueueSnackbar(
          "Recuperamos los cambios que tenías pendientes de guardar.",
          { variant: "info" }
        );
    } catch (error) {
      if (alive.current)
        enqueueSnackbar(apiError(error, "No fue posible abrir el documento."), {
          variant: "error",
        });
    } finally {
      if (alive.current) setOpening("");
    }
  };
  const edit = (changes) => {
    setDraft((current) => ({ ...current, ...changes }));
    setDirty(true);
  };
  const goBack = () => {
    setView("list");
    setDraft(null);
    setDirty(false);
    setLeaveOpen(false);
    scrollTop();
  };
  const save = async () => {
    if (saveLock.current || !draft) return;
    const html = limpiarDocumentoPuesto(draft.html);
    const parsed = new DOMParser().parseFromString(html, "text/html");
    if (!draft.nombre.trim() || !parsed.body.textContent.trim())
      return enqueueSnackbar(
        "Escribe el nombre y el contenido del documento.",
        { variant: "warning" }
      );
    if (html.length > 250000)
      return enqueueSnackbar(
        "El documento es demasiado extenso. Reduce su contenido antes de guardar.",
        { variant: "warning" }
      );
    saveLock.current = true;
    setSaving(true);
    try {
      const result = await guardarDocumentoPuesto(
        plantillasApi,
        idEmpresa,
        {
          codigo: draft.codigo,
          nombre: draft.nombre.trim(),
          descripcion: `${
            draft.formato.nombre
          } asociado al puesto ${nombrePuesto(draft.puesto)}.`,
          categoria: "RRHH",
          variables: "",
          contenido_html: html,
        },
        draft.anterior
      );
      try {
        window.localStorage.removeItem(draftKey(idEmpresa, draft.codigo));
      } catch {
        /* The remote save is already confirmed. */
      }
      if (!alive.current) return;
      setDraft((current) => ({
        ...current,
        html,
        anterior: result,
        saved: result,
      }));
      setDirty(false);
      await reloadTemplates().catch(() => {});
      enqueueSnackbar("Documento guardado para tu empresa.", {
        variant: "success",
      });
    } catch (error) {
      if (alive.current)
        enqueueSnackbar(
          apiError(error, "No fue posible guardar el documento."),
          { variant: "error" }
        );
    } finally {
      saveLock.current = false;
      if (alive.current) setSaving(false);
    }
  };
  const print = async () => {
    const popup = window.open("", "_blank", "width=1000,height=850");
    if (!popup)
      return enqueueSnackbar(
        "Permite abrir ventanas para imprimir el documento.",
        { variant: "info" }
      );
    popup.opener = null;
    popup.document.write(
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${textoSeguro(
        window.location.origin
      )}/"><title>${textoSeguro(
        draft.nombre
      )}</title><style>${PUESTO_DOCUMENT_CSS}body{margin:0;background:#fff}.puesto-document{padding:0;max-width:none}.puesto-document tr{break-inside:avoid}.puesto-document h3{break-after:avoid}.puesto-document thead{display:table-header-group}@page{size:letter;margin:16mm}</style></head><body><main class="puesto-document">${limpiarDocumentoPuesto(
        draft.html
      )}</main></body></html>`
    );
    popup.document.close();
    try {
      await Promise.race([
        Promise.all(
          Array.from(popup.document.images).map((img) =>
            img.decode().catch(() => {})
          )
        ),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      if (!popup.closed) {
        popup.focus();
        popup.print();
      }
    } catch {
      enqueueSnackbar(
        "La vista para imprimir está abierta. Usa Imprimir en esa ventana.",
        { variant: "info" }
      );
    }
  };
  const loading = puestosLoading || templatesLoading;
  const error = puestosError || templatesError;
  const legacyManual = Object.keys(legacy).filter((key) =>
    key.startsWith("manual:")
  );
  return (
    <section ref={bodyTop} className="scroll-mt-6 space-y-5">
      <style>{PUESTO_DOCUMENT_CSS}</style>
      {view === "list" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Formatos por puesto
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Perfiles, descripciones y actividades listos para adaptar a{" "}
                {empresa.nombre}.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setGuide(!guide)}
              aria-expanded={guide}
            >
              <BookOpen size={16} />
              Guía
            </Button>
          </div>
          {guide && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p>
                <strong>Perfil:</strong> revisa formación, experiencia,
                competencias y condiciones.
              </p>
              <p>
                <strong>Descripción:</strong> confirma funciones, autoridad,
                relaciones y reportes.
              </p>
              <p>
                <strong>Actividades:</strong> ajusta la rutina al turno.
                Selecciona una celda para agregar o quitar filas; puedes crear
                secciones y tablas adicionales.
              </p>
              <p>
                Los formatos son propuestas por tipo de puesto. La empresa
                define su estructura, horarios y responsabilidades antes de
                utilizarlos.
              </p>
            </div>
          )}
          <div
            className="flex gap-6 border-b border-slate-200"
            role="group"
            aria-label="Origen de documentos"
          >
            {[
              ["base", "Plantillas ADAMIA", rows.length],
              ["propios", "Mis documentos", rows.filter((r) => r.saved).length],
            ].map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={`border-b-2 pb-3 text-sm ${
                  tab === id
                    ? "border-blue-600 font-semibold text-blue-700"
                    : "border-transparent text-slate-500"
                }`}
              >
                {label}
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  {count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-3 text-slate-400"
              />
              <Input
                aria-label="Buscar formato o puesto"
                placeholder="Buscar por formato o puesto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              aria-label="Tipo de formato"
              className="h-10 max-w-full rounded-md border bg-white px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="todos">Todos los formatos</option>
              {FORMATOS_PUESTO.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 sm:ml-auto">
              {filtered.length} documentos
            </span>
          </div>
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 p-5 text-sm"
            >
              <p>
                No fue posible cargar los puestos o documentos de esta empresa.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  reloadPuestos();
                  reloadTemplates();
                }}
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="w-[34%] px-4 py-3 font-semibold">
                        Documento
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Puesto asociado
                      </th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-10 text-center text-slate-500"
                        >
                          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                          Cargando formatos…
                        </td>
                      </tr>
                    ) : (
                      filtered.map((row) => (
                        <tr key={row.codigo} className="hover:bg-blue-50/40">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="rounded-md bg-blue-50 p-2 text-blue-600">
                                <FileText size={18} />
                              </span>
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {tab === "propios"
                                    ? row.saved.nombre
                                    : row.formato.nombre}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {row.formato.codigo} ·{" "}
                                  {row.formato.descripcion}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            {nombrePuesto(row.puesto)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`whitespace-nowrap rounded px-2 py-1 text-xs ${
                                row.saved
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {row.saved
                                ? "Adaptado"
                                : row.legacy
                                ? "Borrador anterior"
                                : "Base ADAMIA"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={Boolean(opening)}
                                onClick={() => openDocument(row, "view")}
                              >
                                <Eye size={14} />
                                Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={Boolean(opening)}
                                className="text-blue-700"
                                onClick={() => openDocument(row, "edit")}
                              >
                                {opening === row.codigo ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Pencil size={14} />
                                )}
                                Editar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                    {!loading && !filtered.length && (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-10 text-center text-slate-500"
                        >
                          {!puestos.length ? (
                            <>
                              No hay puestos disponibles.{" "}
                              <Link
                                className="text-blue-700 underline"
                                href="/panel/catalogos/puestos"
                              >
                                Abrir catálogo de puestos
                              </Link>
                            </>
                          ) : tab === "propios" ? (
                            "Todavía no hay documentos guardados que coincidan. Edita una base y guarda tu versión."
                          ) : (
                            "No hay formatos que coincidan con la búsqueda."
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {legacyManual.length > 0 && (
            <details className="rounded-lg border border-slate-200 p-4 text-sm">
              <summary className="cursor-pointer text-slate-600">
                Recuperar borradores manuales anteriores ({legacyManual.length})
              </summary>
              <p className="my-3 text-xs text-slate-500">
                Asocia el borrador a un puesto existente para editarlo y
                guardarlo.
              </p>
              {legacyManual.map((key) => (
                <div
                  key={key}
                  className="my-3 flex flex-wrap items-center gap-2"
                >
                  <span>{legacy[key]?.puestoNombre || key.slice(7)}</span>
                  <select
                    aria-label={`Asociar ${
                      legacy[key]?.puestoNombre || key
                    } a un puesto`}
                    defaultValue=""
                    className="h-9 max-w-full rounded border px-2"
                    onChange={(e) => {
                      const job = e.target.value;
                      if (job)
                        setLegacy((old) => ({ ...old, [job]: old[key] }));
                    }}
                  >
                    <option value="">Elegir puesto del catálogo</option>
                    {puestos.map((p) => (
                      <option key={idPuesto(p)} value={idPuesto(p)}>
                        {nombrePuesto(p)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </details>
          )}
        </>
      ) : (
        draft && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Volver al catálogo"
                  disabled={saving}
                  onClick={() => (dirty ? setLeaveOpen(true) : goBack())}
                >
                  <ArrowLeft size={20} />
                </Button>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {draft.formato.nombre}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {nombrePuesto(draft.puesto)} · {empresa.nombre}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs text-slate-500" role="status">
                  {dirty
                    ? "Cambios sin guardar"
                    : draft.saved
                    ? "Guardado"
                    : "Base para adaptar"}
                </span>
                {view === "edit" ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => setView("view")}
                    >
                      <Eye size={16} />
                      Ver
                    </Button>
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      disabled={saving}
                      onClick={save}
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Guardar versión
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setView("edit")}>
                      <Pencil size={16} />
                      Editar
                    </Button>
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={print}
                    >
                      <Printer size={16} />
                      Imprimir / PDF
                    </Button>
                  </>
                )}
              </div>
            </div>
            {view === "edit" ? (
              <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold">Datos del documento</h3>
                  <label className="block space-y-1 text-xs text-slate-500">
                    Nombre
                    <Input
                      value={draft.nombre}
                      maxLength={180}
                      disabled={saving}
                      onChange={(e) => edit({ nombre: e.target.value })}
                      className="text-sm text-slate-900"
                    />
                  </label>
                  <div>
                    <p className="text-xs text-slate-500">
                      Puesto del catálogo
                    </p>
                    <p className="mt-1 text-sm">{nombrePuesto(draft.puesto)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Empresa</p>
                    <p className="mt-1 text-sm">{empresa.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Código</p>
                    <p className="mt-1 text-sm">{draft.formato.codigo}</p>
                  </div>
                  <p className="border-t pt-3 text-xs leading-5 text-slate-500">
                    Edita el texto directamente. Selecciona una celda para
                    agregar o quitar filas; usa Agregar sección para ampliar el
                    formato.
                  </p>
                </aside>
                <DocumentoPuestoEditor
                  key={draft.editorKey}
                  value={draft.html}
                  disabled={saving}
                  onChange={(html) => edit({ html })}
                />
              </div>
            ) : (
              <div className="rounded-lg bg-slate-100 p-2 sm:p-6">
                <article
                  className="puesto-document mx-auto max-w-[830px] shadow-sm"
                  dangerouslySetInnerHTML={{
                    __html: limpiarDocumentoPuesto(draft.html),
                  }}
                />
              </div>
            )}
          </>
        )
      )}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambios sin guardar</DialogTitle>
            <DialogDescription>
              Puedes guardar la versión para la empresa o volver al catálogo.
              Conservaremos el borrador en este navegador cuando el
              almacenamiento esté disponible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={goBack}>
              Volver al catálogo
            </Button>
            <Button onClick={() => setLeaveOpen(false)}>Seguir editando</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
