"use client";

// Lumo fase B2 (25/11/2026): sección «Entrevista» de la ficha del candidato. Cada pregunta de la vacante (las que filtran
// y los datos que solo informan) con lo que contestó y de dónde salió (botón, escrito, el agente o el formulario).
// Los documentos del formulario se descargan con la sesión (nunca hay un enlace público). «Enlace del formulario» crea uno
// nuevo (el anterior deja de servir) y lo copia para pegarlo en el chat.
import { useState } from "react";
import { Copy, Download, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { etiquetaOrigenCampo, etiquetaSeveridad, valorCampo } from "@/lib/whatsapp/entrevista.mjs";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { rutaArchivoCampo, textoEstadoFormulario } from "@/lib/whatsapp/formularioEntrevista.mjs";
import { crearFormularioEntrevista, descargarAdjunto } from "./api";
const TARJETA_FICHA = "bg-white px-5 py-4"; // igual que PanelCandidato (sin importarlo: evita un ciclo)

const PUNTO = { verde: "bg-emerald-100 text-emerald-800", ambar: "bg-amber-100 text-amber-900", rojo: "bg-red-100 text-red-700", gris: "bg-gray-200 text-gray-600" };

async function bajar(archivo) {
  const ruta = rutaArchivoCampo(archivo?.url);
  if (!ruta) return;
  const blob = await descargarAdjunto(`${ruta}?descargar=1`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = archivo.nombre || "documento";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export default function CamposEntrevista({ campos = [], formulario = null, idConversacion, puedeFormulario = false, ahora }) {
  const [enlace, setEnlace] = useState(null);
  const [aviso, setAviso] = useState({ tono: "", texto: "" });
  const [creando, setCreando] = useState(false);
  const contestados = campos.filter((c) => c.valor != null && c.valor !== "").length;

  const generar = async () => {
    setCreando(true);
    setAviso({ tono: "", texto: "" });
    try {
      const r = await crearFormularioEntrevista(idConversacion);
      setEnlace(r.enlace);
      try {
        await navigator.clipboard.writeText(r.enlace);
        setAviso({ tono: "verde", texto: "Enlace copiado. Pégalo en el chat; vence en 7 días y el anterior ya no sirve." });
      } catch {
        setAviso({ tono: "verde", texto: "Enlace listo. Cópialo y pégalo en el chat; vence en 7 días." });
      }
    } catch (e) {
      setAviso({ tono: "rojo", texto: mensajeErrorApi(e, "No se pudo crear el enlace.") });
    } finally {
      setCreando(false);
    }
  };

  return (
    <section className={`grid min-w-0 gap-2 ${TARJETA_FICHA}`} data-campos-entrevista>
      <h3 className="text-[13px] font-medium text-[#54656F]">Entrevista · {contestados} de {campos.length}</h3>
      <ul className="grid min-w-0 gap-2.5" aria-label="Campos de la entrevista">
        {campos.map((c) => {
          const dato = c.uso === "dato";
          const s = dato ? { simbolo: "•", texto: "Solo informa", tono: c.valor ? "verde" : "gris" } : c.valor ? etiquetaSeveridad(c.severidad) : { simbolo: "?", texto: "Sin respuesta", tono: "gris" };
          const valor = valorCampo(c);
          return (
            <li key={c.id} className="flex gap-2 text-[13px]" data-campo={c.id} data-uso={c.uso}>
              <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-bold ${PUNTO[s.tono] ?? PUNTO.gris}`}>{s.simbolo}</span>
              <span className="grid min-w-0 gap-0.5">
                <span className="text-gray-600 [overflow-wrap:anywhere]">{c.texto}{dato && !c.obligatoria ? " (opcional)" : ""}</span>
                {c.archivo ? (
                  <button type="button" onClick={() => bajar(c.archivo).catch(() => setAviso({ tono: "rojo", texto: "No se pudo descargar el archivo." }))}
                    className="inline-flex min-h-11 items-center gap-1.5 text-left font-semibold text-emerald-800 underline underline-offset-2 lg:min-h-0">
                    <FileText className="size-4 shrink-0" aria-hidden="true" /><span className="[overflow-wrap:anywhere]">{c.archivo.nombre}</span><Download className="size-3.5 shrink-0" aria-hidden="true" />
                  </button>
                ) : (
                  <span className={`font-semibold [overflow-wrap:anywhere] ${valor ? "text-gray-900" : "text-gray-400"}`}>{valor || (c.tipo === "archivo" ? "Aún no lo sube" : "Pendiente")}</span>
                )}
                {c.origen ? <span className="text-gray-500">{etiquetaOrigenCampo(c.origen)}</span> : null}
                <span className="sr-only">{s.texto}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {puedeFormulario ? (
        <div className="grid min-w-0 gap-2 border-t border-gray-100 pt-2" data-formulario-enlace>
          {formulario ? <p className="text-[13px] text-gray-600">{textoEstadoFormulario(formulario, ahora)}</p> : null}
          <Button type="button" variant="outline" onClick={generar} loading={creando} startIcon={<Link2 className="size-4" />} className="min-h-11 w-full md:min-h-9">
            {formulario ? "Nuevo enlace del formulario" : "Enlace del formulario"}
          </Button>
          {enlace ? (
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-50 p-2">
              <span className="min-w-0 flex-1 truncate text-[13px] text-gray-800" data-enlace-formulario>{enlace}</span>
              <button type="button" onClick={() => navigator.clipboard?.writeText(enlace)} aria-label="Copiar enlace"
                className="grid size-11 shrink-0 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 lg:size-9"><Copy className="size-4" /></button>
            </div>
          ) : null}
          {aviso.texto ? <p role={aviso.tono === "rojo" ? "alert" : "status"} className={`text-[13px] ${aviso.tono === "rojo" ? "text-red-700" : "text-emerald-800"}`}>{aviso.texto}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
