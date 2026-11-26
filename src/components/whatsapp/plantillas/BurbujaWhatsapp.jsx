"use client";

// Vista previa tipo WhatsApp: encabezado, cuerpo con los ejemplos en lugar de {{n}}, pie y botones debajo de la burbuja.
import { ExternalLink, Phone, Reply } from "lucide-react";
import { llenar } from "@/lib/whatsapp/plantillasMeta.mjs";

const ICONO = { URL: ExternalLink, PHONE_NUMBER: Phone, QUICK_REPLY: Reply };

// Resalta las variables que aún no tienen ejemplo.
function ConVariables({ texto }) {
  return String(texto).split(/(\{\{\d+\}\})/g).map((parte, i) => (/^\{\{\d+\}\}$/.test(parte)
    ? <mark key={i} className="rounded bg-amber-100 px-0.5 text-amber-900">{parte}</mark>
    : <span key={i}>{parte}</span>));
}

export default function BurbujaWhatsapp({ plantilla, titulo = "Vista previa" }) {
  const p = plantilla ?? {};
  const enc = p.encabezado?.formato ? `[${String(p.encabezado.formato).toLowerCase()}]` : llenar(p.encabezado?.texto ?? "", [p.encabezado?.ejemplo]);
  const cuerpo = llenar(p.cuerpo ?? "", p.ejemplos ?? []);
  const botones = (p.botones ?? []).filter((b) => String(b.texto ?? "").trim());
  return (
    <figure data-burbuja className="min-w-0 rounded-2xl bg-[#efeae2] p-3">
      <figcaption className="mb-2 text-[13px] font-semibold text-slate-600">{titulo}</figcaption>
      <div className="max-w-[340px]">
        <div className="relative rounded-xl rounded-tl-none bg-white px-3 py-2 shadow-sm">
          {enc ? <p className="mb-1 break-words text-[15px] font-bold text-slate-900"><ConVariables texto={enc} /></p> : null}
          <p className="whitespace-pre-wrap break-words text-[14px] leading-snug text-slate-900">
            {cuerpo ? <ConVariables texto={cuerpo} /> : <span className="text-slate-400">El cuerpo del mensaje aparece aquí.</span>}
          </p>
          {p.pie ? <p className="mt-1 break-words text-[13px] text-slate-500">{p.pie}</p> : null}
          <p className="mt-0.5 text-right text-[13px] text-slate-400" aria-hidden="true">10:24</p>
        </div>
        {botones.length ? (
          <ul className="mt-1 grid gap-1">
            {botones.map((b, i) => {
              const Icono = ICONO[b.tipo] ?? Reply;
              return (
                <li key={i} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-[14px] font-semibold text-[#0b7bd6] shadow-sm">
                  <Icono className="size-4 shrink-0" aria-hidden="true" /> <span className="truncate">{b.texto}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </figure>
  );
}
