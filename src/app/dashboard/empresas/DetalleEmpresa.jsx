import { Button } from "@/components/ui/button";
import { formatearFecha } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";
import FacturasEmpresaTab from "./FacturasEmpresaTab";
import SuscripcionEmpresaTab from "./SuscripcionEmpresaTab";
import PagosEmpresaTab from "./PagosEmpresaTab";
import PagoAdelantadoEmpresaTab from "./PagoAdelantadoEmpresaTab";

export default function DetalleEmpresa({ item, setSelected }) {
  const [tab, setTab] = useState("datos");

  return (
    <section>
      <div className="flex gap-3">
        <Button
          variant="ghost"
          startIcon={<ArrowLeft />}
          onClick={() => setSelected(null)}
        />
        <div className="flex gap-3">
          <div className="relative w-20 h-15">
            <Image
              alt={item.url_imagen || "empresaImage"}
              src={item.url_imagen || "/assets/no-image.png"}
              fill
              className="object-cover rounded-md"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-700">
              {item.nombre_empresa}
            </h1>
            <p className="text-sm text-gray-600">
              Creada el {formatearFecha(item.createdAt)}
            </p>
          </div>
        </div>
      </div>
      <article className="px-13">
        <div className="my-5 border-b-1 border-gray-200" />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={tab === "datos" ? "default" : "outline"}
            onClick={() => setTab("datos")}
          >
            Datos
          </Button>

          <Button
            type="button"
            variant={tab === "facturas" ? "default" : "outline"}
            onClick={() => setTab("facturas")}
          >
            Facturas
          </Button>
          <Button
            type="button"
            variant={tab === "suscripcion" ? "default" : "outline"}
            onClick={() => setTab("suscripcion")}
          >
            Suscripción
          </Button>
          <Button
            type="button"
            variant={tab === "pagos" ? "default" : "outline"}
            onClick={() => setTab("pagos")}
          >
            Pagos
          </Button>
          <Button
            type="button"
            variant={tab === "pagoAdelantado" ? "default" : "outline"}
            onClick={() => setTab("pagoAdelantado")}
          >
            Pago adelantado
          </Button>
        </div>

        {tab === "datos" && (
          <div className="mt-5">
            <p className="my-2">
              <span className="font-semibold text-slate-700">Dueño: </span>
              {item.nombre_duenio}
            </p>
            <p className="my-2">
              <span className="font-semibold text-slate-700">Direccion: </span>
              {item.direccion}
            </p>
            <p className="my-2">
              <span className="font-semibold text-slate-700">Giro: </span>
              {item.giro}
            </p>
            <p className="my-2">
              <span className="font-semibold text-slate-700">Correo: </span>
              {item.correo_empresa}
            </p>
            <p className="my-2">
              <span className="font-semibold text-slate-700">Teléfono: </span>
              {item.celular}
            </p>
            <p className="my-2">
              <span className="font-semibold text-slate-700">Estatus: </span>
              {item.estado}
            </p>

            <div className="my-5 border-b-1 border-gray-200" />
            <p className="text-sm text-gray-600">Redes Sociales</p>
            <p className="my-2">
              <span className="font-semibold text-slate-700">Facebook: </span>
              {item.facebook}
            </p>
            <p className="my-2">
              <span className="font-semibold text-slate-700">Instragram: </span>
              {item.instagran}
            </p>
            <p className="my-2">
              <span className="font-semibold text-slate-700">Página web: </span>
              {item.pagina_web}
            </p>
          </div>
        )}

        {tab === "facturas" && <FacturasEmpresaTab empresa={item} />}
        {tab === "suscripcion" && <SuscripcionEmpresaTab empresa={item} />}
        {tab === "pagos" && <PagosEmpresaTab empresa={item} />}
        {tab === "pagoAdelantado" && (
          <PagoAdelantadoEmpresaTab empresa={item} />
        )}
      </article>
    </section>
  );
}
