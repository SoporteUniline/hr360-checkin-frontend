"use client";

// Plantillas base de contrato de ADAMIA (27/11/2026): una por tipo (indeterminado, determinado, por obra, periodo de
// prueba, capacitación inicial) con cláusulas estándar de la LFT. «Base sugerida, revísala con tu abogado». La empresa
// la copia a sus plantillas (categoría Contrato) y la edita; los contratos ya firmados conservan su texto.
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Loader2 } from "lucide-react";
import { contratosApi } from "@/lib/contratosApi";
import { TIPOS } from "@/lib/contratos/detalleContrato.mjs";
import { resaltarVariables } from "@/lib/contratos/htmlContrato.mjs";

export default function PlantillasContratoBase({ empresa }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data, error, isLoading } = useSWR("contratos-plantillas-base", () => contratosApi.plantillasBase(), { revalidateOnFocus: false });
  const [abierta, setAbierta] = useState(null);
  const [copiando, setCopiando] = useState(null);

  const copiar = async (clave) => {
    setCopiando(clave);
    try {
      const r = await contratosApi.copiarPlantillaBase(clave, Number(empresa));
      enqueueSnackbar("Plantilla copiada a tu empresa. Revísala y ajústala.", { variant: "success" });
      router.push(`/panel/gestion-documental/plantillas/editor?id=${r.id_plantilla}`);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudo copiar la plantilla.", { variant: "error" });
      setCopiando(null);
    }
  };

  if (isLoading) return <p className="flex items-center gap-2 text-[16px] text-[#374151]"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Cargando plantillas base…</p>;
  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-3 text-[16px] text-red-800">No se pudieron cargar las plantillas base de contrato.</p>;
  return (
    <section aria-labelledby="h-bases" className="flex flex-col gap-3 text-[16px]" data-plantillas-contrato>
      <div>
        <h2 id="h-bases" className="m-0 text-[20px] font-bold text-gray-900">Plantillas base de contrato</h2>
        <p className="m-0 mt-1 max-w-3xl text-[#374151]">
          Una por tipo de contrato, con cláusulas estándar de la Ley Federal del Trabajo. Son una base sugerida: revísala con tu abogado, cópiala y ajústala a tu empresa. Los contratos ya firmados nunca cambian.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(data?.bases ?? []).map((b) => (
          <article key={b.clave} className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-5" data-base={b.clave}>
            <p className="m-0 text-[15px] font-semibold uppercase tracking-wide text-[#1E40C4]">{TIPOS[b.tipo_contrato] ?? b.tipo_contrato}</p>
            <h3 className="m-0 text-[18px] font-bold text-gray-900">{b.nombre}</h3>
            <p className="m-0 text-[#4B5563]">{b.descripcion}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <button type="button" className="inline-flex min-h-12 items-center rounded-[14px] bg-[#2C56E8] px-5 font-bold text-white hover:bg-[#1E40C4] disabled:opacity-60"
                onClick={() => copiar(b.clave)} disabled={!empresa || Boolean(copiando)} data-accion="copiar-base">
                {copiando === b.clave ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : null}
                Copiar y editar
              </button>
              <button type="button" className="inline-flex min-h-12 items-center rounded-[14px] border border-[#CBD3E3] bg-white px-5 font-semibold text-gray-900 hover:bg-gray-50"
                onClick={() => setAbierta(abierta === b.clave ? null : b.clave)} aria-expanded={abierta === b.clave}>
                {abierta === b.clave ? "Ocultar texto" : "Ver texto"}
              </button>
            </div>
            {abierta === b.clave ? (
              <div className="mt-2 max-h-[420px] overflow-y-auto overflow-x-hidden break-words rounded-xl border border-gray-200 p-4 text-[16px] leading-relaxed [&_table]:w-full [&_table]:table-fixed"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} dangerouslySetInnerHTML={{ __html: resaltarVariables(b.contenido_html) }} />
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
