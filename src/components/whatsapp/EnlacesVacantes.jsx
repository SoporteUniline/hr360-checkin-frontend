"use client";

// «Enlaces de vacantes» (R1): vacantes abiertas de la empresa con su enlace de WhatsApp para compartir.
// En teléfono el diálogo se pega abajo como hoja; en escritorio es un diálogo centrado.
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Link2, ListChecks, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { contarPreguntas, textoConteoPreguntas } from "@/lib/whatsapp/entrevista.mjs";
import { obtener, rutaPreguntas, rutaVacantes } from "./api";
import { EnlaceVacanteEnLinea } from "./EnlaceWhatsappVacante";
import EditorEntrevista from "./EditorEntrevista";

const normalizar = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function BotonEnlacesVacantes({ onClick, className = "" }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className={`min-h-11 md:min-h-9 ${className}`} startIcon={<Link2 className="size-4 text-emerald-600" />}>
      Enlaces de vacantes
    </Button>
  );
}

// Conteo de preguntas de la vacante: se pide solo cuando la fila entra en pantalla (perezoso).
function ConteoPreguntas({ idVacante }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return undefined;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return undefined; }
    const obs = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) setVisible(true); });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);
  const { data, error } = useSWR(visible ? rutaPreguntas(idVacante) : null, obtener, { revalidateOnFocus: false });
  const n = contarPreguntas(data);
  return (
    <p ref={ref} data-conteo-preguntas={idVacante} className={`mt-0.5 text-[12px] ${data && n ? "font-medium text-emerald-700" : "text-gray-500"}`}>
      {error ? "No se pudo consultar la entrevista" : data ? textoConteoPreguntas(n) : "\u00a0"}
    </p>
  );
}

export default function EnlacesVacantes({ abierto, onCambiar, idEmpresa }) {
  const [editando, setEditando] = useState(null);
  const { data, error, isLoading } = useSWR(abierto ? rutaVacantes(idEmpresa) : null, obtener, { revalidateOnFocus: false });
  const [busqueda, setBusqueda] = useState("");
  const vacantes = useMemo(() => data?.vacantes ?? [], [data]);
  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return q ? vacantes.filter((v) => normalizar(v.titulo).includes(q)) : vacantes;
  }, [vacantes, busqueda]);

  return (
    <Dialog open={abierto} onOpenChange={onCambiar}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-3 max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:p-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Enlaces de vacantes</DialogTitle>
          <DialogDescription>Comparte el enlace de una vacante: al abrirlo, el candidato te escribe por WhatsApp y el chat llega a esta bandeja.</DialogDescription>
        </DialogHeader>
        <label className="relative block">
          <span className="sr-only">Buscar vacante</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar vacante"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:h-10 md:text-sm"
          />
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={isLoading}>
          {error ? (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{mensajeErrorApi(error, "No se pudieron cargar las vacantes.")}</p>
          ) : isLoading ? (
            <p className="flex items-center gap-2 p-2 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Cargando vacantes…</p>
          ) : !vacantes.length ? (
            <p className="p-4 text-center text-sm text-gray-600">No hay vacantes abiertas.</p>
          ) : !filtradas.length ? (
            <p className="p-4 text-center text-sm text-gray-600">Ninguna vacante coincide con «{busqueda.trim()}».</p>
          ) : (
            <ul aria-label="Vacantes abiertas" className="divide-y divide-gray-100">
              {filtradas.map((v) => (
                <li key={v.id_vacante} className="py-3">
                  <EnlaceVacanteEnLinea idVacante={v.id_vacante} titulo={v.titulo}
                    subtitulo={<ConteoPreguntas idVacante={v.id_vacante} />}
                    acciones={(
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditando(v)} aria-label={`Entrevista de ${v.titulo}`}
                        className="min-h-11 md:min-h-9" startIcon={<ListChecks className="size-4 text-violet-600" />}>
                        Entrevista
                      </Button>
                    )} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
      <EditorEntrevista abierto={!!editando} onCambiar={(v) => { if (!v) setEditando(null); }} idVacante={editando?.id_vacante} titulo={editando?.titulo} />
    </Dialog>
  );
}
