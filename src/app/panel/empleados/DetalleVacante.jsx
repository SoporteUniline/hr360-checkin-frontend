import { Button } from "@/components/ui/button";
import { formatearFecha } from "@/lib/utils";
// HTML de la vacante saneado antes de insertarlo (INC-REC-003).
import { sanearHtml } from "@/lib/htmlSeguro.mjs";
import { ArrowLeft } from "lucide-react";
import React from "react";
import EnlaceWhatsappVacante from "@/components/whatsapp/EnlaceWhatsappVacante";

export default function DetalleVacante({ item, setSelected }) {
  return (
    <section>
      <div className="flex flex-wrap gap-3 items-center">
        <Button
          variant="ghost"
          startIcon={<ArrowLeft />}
          onClick={() => setSelected(null)}
        />
        <h1 className="min-w-0 flex-1 text-lg font-semibold text-slate-700">{item.titulo}</h1>
        {/* WhatsApp R1: enlace para que el candidato abra el chat de esta vacante. */}
        <EnlaceWhatsappVacante idVacante={item.id_vacante} titulo={item.titulo} />
      </div>
      <article className="px-13">
        <p className="text-sm text-gray-600">
          Publicado el {formatearFecha(item.fecha_publicacion)}
        </p>
        <div className="my-5 border-b-1 border-gray-200" />

        <div
          className="my-2 text-sm [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
          dangerouslySetInnerHTML={{ __html: sanearHtml(item.descripcion) }}
        />

        <div className="my-5 border-b border-gray-200" />

        <div className="my-2">
          <span className="font-semibold text-slate-700">
            Responsabilidades:{" "}
          </span>
          <div
            className="my-2 text-sm [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
            dangerouslySetInnerHTML={{ __html: sanearHtml(item.responsabilidades) }}
          />
        </div>
        <p className="my-2">
          <span className="font-semibold text-slate-700">Lugar: </span>
          {item.direccion}
        </p>
        <p className="my-2">
          <span className="font-semibold text-slate-700">Modalidad: </span>
          {item.modalidad}
        </p>
        <p className="my-2">
          <span className="font-semibold text-slate-700">
            Tipo de contratación:{" "}
          </span>
          {item.tipo_contrato}
        </p>
        <div className="my-2">
          <span className="font-semibold text-slate-700">Escolaridad: </span>
          <div
            className="my-2 text-sm [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
            dangerouslySetInnerHTML={{ __html: sanearHtml(item.escolaridad) }}
          />
        </div>
        <div className="my-2">
          <span className="font-semibold text-slate-700">Experiencia: </span>
          <div
            className="my-2 text-sm [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
            dangerouslySetInnerHTML={{ __html: sanearHtml(item.experiencia) }}
          />
        </div>
        <p className="my-2">
          <span className="font-semibold text-slate-700">Idiomas: </span>
          {item.idiomas}
        </p>
        <div className="my-2">
          <span className="font-semibold text-slate-700">Habilidades: </span>
          <div
            className="my-2 text-sm [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
            dangerouslySetInnerHTML={{ __html: sanearHtml(item.habilidades) }}
          />
        </div>
        <p className="my-2">
          <span className="font-semibold text-slate-700">Horario: </span>
          {item.horario}
        </p>
        <p className="my-2">
          <span className="font-semibold text-slate-700">Salario: </span>
          {item.salario}
        </p>
      </article>
    </section>
  );
}
