"use client";

// Editor de plantillas · categoría «Contrato» (27/11/2026, maqueta «Plantilla»): «Datos que se llenan solos» con
// botones por grupo (Contrato, Persona, Empresa) y la vista previa con los datos de un contrato real de la empresa.
// Los valores los llena el servidor (modules/attendance/services/contratoTexto.js); aquí solo se insertan {{…}}.
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { contratosApi } from "@/lib/contratosApi";
import { VARIABLES_CONTRATO, RAPIDAS, ETIQUETA_VARIABLE } from "@/lib/contratos/variablesContrato.mjs";
import { limpiarHtmlContrato } from "@/lib/contratos/htmlContrato.mjs";

const BOTON = "inline-flex min-h-12 items-center rounded-[12px] border border-[#C7D2FE] bg-[#EEF2FF] px-3 text-[16px] font-semibold text-[#1E40C4] hover:bg-[#E0E7FF]";

export function PanelContrato({ onInsert }) {
  const [todos, setTodos] = useState(false);
  return (
    <aside aria-label="Datos que puedes insertar" className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm" data-panel-contrato>
      <h2 className="m-0 text-[18px] font-bold text-gray-900">Datos que se llenan solos</h2>
      <p className="m-0 text-[16px] text-[#4B5563]">Toca uno para ponerlo donde está el cursor. En el contrato aparece el dato de cada persona.</p>
      {VARIABLES_CONTRATO.filter((g) => todos || RAPIDAS[g.grupo]).map((g) => (
        <div key={g.grupo} className="flex flex-col gap-2">
          <b className="text-[16px] text-gray-900">{g.grupo}</b>
          <div className="flex flex-wrap gap-2">
            {g.claves.filter(([c]) => todos || RAPIDAS[g.grupo]?.includes(c)).map(([clave, etiqueta]) => (
              <button key={clave} type="button" className={BOTON} onClick={() => onInsert(clave)} title={`Insertar {{${clave}}}`} data-variable={clave}>
                {etiqueta}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="inline-flex min-h-12 items-center self-start text-[16px] font-semibold text-[#1E40C4] underline" onClick={() => setTodos((v) => !v)}>
        {todos ? "Ver solo los principales" : "Ver todos los datos"}
      </button>
      <p className="m-0 rounded-xl bg-[#F3F5FA] px-3 py-2.5 text-[16px] text-[#374151]">
        ADAMIA trae una plantilla base por tipo de contrato. <Link href="/panel/gestion-documental/plantillas?pestana=contratos" className="font-semibold text-[#1E40C4]">Cópiala</Link> y ajústala a tu empresa; los contratos ya firmados no cambian.
      </p>
    </aside>
  );
}

export function VistaPreviaContrato({ obtenerHtml, empresa }) {
  const { data } = useSWR(empresa ? ["contratos-vista-previa", empresa] : null, () => contratosApi.listar({ empresa, page: 1, limit: 50 }), { revalidateOnFocus: false });
  const contratos = data?.data ?? [];
  const [idContrato, setIdContrato] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const elegido = idContrato || contratos[0]?.id || "";

  const ver = async () => {
    setCargando(true);
    setError("");
    try {
      setResultado(await contratosApi.vistaPrevia(elegido, obtenerHtml()));
    } catch (e) {
      setError(e?.response?.data?.error || "No se pudo armar la vista previa.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 p-4 sm:p-5" data-vista-previa-contrato>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-[16px] font-semibold text-gray-900">
          Vista previa con el contrato de
          <select className="min-h-12 rounded-[12px] border border-[#CBD3E3] bg-white px-3 font-normal" value={elegido} onChange={(e) => setIdContrato(e.target.value)} disabled={!contratos.length}>
            {contratos.length ? contratos.map((c) => <option key={c.id} value={c.id}>{c.nombre_empleado} · {c.folio}</option>) : <option value="">Aún no hay contratos</option>}
          </select>
        </label>
        <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#2C56E8] bg-white px-5 text-[16px] font-semibold text-[#1E40C4] hover:bg-[#EEF2FF] disabled:opacity-60"
          onClick={ver} disabled={!elegido || cargando} data-accion="vista-previa-empleado">
          {cargando ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          Vista previa con un empleado
        </button>
      </div>
      {error ? <p role="alert" className="m-0 rounded-xl bg-[#FEF2F2] px-3 py-2.5 text-[16px] text-[#991B1B]">{error}</p> : null}
      {resultado?.faltantes?.length ? (
        <p className="m-0 rounded-xl bg-[#FFF7ED] px-3 py-2.5 text-[16px] text-[#9A3412]" data-faltantes>
          Con este contrato faltarían: {resultado.faltantes.map((f) => ETIQUETA_VARIABLE.get(f.clave) ?? f.clave).join(", ")}.
        </p>
      ) : null}
      {resultado?.html ? (
        <div className="max-h-[480px] overflow-y-auto overflow-x-hidden break-words rounded-2xl border border-[#E5E7EB] px-5 py-4 text-[16px] leading-relaxed text-[#1F2937] [&_table]:w-full [&_table]:table-fixed"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} data-resultado-vista-previa dangerouslySetInnerHTML={{ __html: limpiarHtmlContrato(resultado.html) }} />
      ) : null}
    </div>
  );
}
