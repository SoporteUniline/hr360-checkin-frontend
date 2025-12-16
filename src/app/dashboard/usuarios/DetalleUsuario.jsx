import LoadingTable from "@/components/LoadingTable";
import { Button } from "@/components/ui/button";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { formatearFecha } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import React from "react";
import useSWR from "swr";

export default function DetalleUsuario({ userId, setSelected }) {
  const { data, error, isLoading } = useSWR(
    userId ? `/users/user/${userId}` : null,
    fetcherWithToken,
    swr_config
  );

  if (isLoading) return <LoadingTable />;
  if (error) return <ErrorPage message={error?.message} />;
  if (!data) return <LoadingTable />;

  const item = data;

  return (
    <section className="p-4">
      <div className="flex gap-3 items-center mb-6">
        <Button
          variant="ghost"
          startIcon={<ArrowLeft />}
          onClick={() => setSelected(null)}
        />
        <div className="flex gap-4 items-center">
          <div className="relative w-20 h-20">
            <Image
              alt="imagen de usuario"
              src={item.url_imagen || "/assets/no-image.png"}
              fill
              className="object-cover rounded-md"
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-700">
              {item.nombre}
            </h1>
            <p className="text-sm text-gray-600">
              Creado el {formatearFecha(item.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Información general */}
      <article>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">
          Información general
        </h2>
        <p>
          <strong>Correo:</strong> {item.correo}
        </p>
        <p>
          <strong>Estado:</strong> {item.estado}
        </p>
      </article>

      <div className="my-5 border-b border-gray-300" />

      {/* Datos personales */}
      <article>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">
          Datos personales
        </h2>
        <p>
          <strong>Teléfono:</strong>{" "}
          {item.datos_personales?.telefono || "No especificado"}
        </p>
        <p>
          <strong>Fecha de nacimiento:</strong>{" "}
          {item.datos_personales?.fecha_nacimiento || "No especificado"}
        </p>
        <p>
          <strong>Sexo:</strong>{" "}
          {item.datos_personales?.sexo || "No especificado"}
        </p>
        <p>
          <strong>Estado civil:</strong>{" "}
          {item.datos_personales?.estado_civil || "No especificado"}
        </p>
        <p>
          <strong>CURP:</strong>{" "}
          {item.datos_personales?.curp || "No especificado"}
        </p>
      </article>

      <div className="my-5 border-b border-gray-300" />

      {/* Estudios académicos */}
      <article>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">
          Estudios académicos
        </h2>
        {item.estudios_academicos?.length > 0 ? (
          item.estudios_academicos.map((e, idx) => (
            <div key={idx} className="mb-2">
              <p>
                <strong>Nivel educativo:</strong>{" "}
                {e.nivel_educativo || "No especificado"}
              </p>
              <p>
                <strong>Institución:</strong>{" "}
                {e.institucion || "No especificado"}
              </p>
              <p>
                <strong>Carrera:</strong> {e.carrera || "No especificado"}
              </p>
              <p>
                <strong>Año de finalización:</strong>{" "}
                {e.anio_finalizacion || "No especificado"}
              </p>
            </div>
          ))
        ) : (
          <p>No hay estudios académicos registrados.</p>
        )}
      </article>

      <div className="my-5 border-b border-gray-300" />

      {/* Experiencia laboral */}
      <article>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">
          Experiencia laboral
        </h2>
        {item.experiencia_laboral?.length > 0 ? (
          item.experiencia_laboral.map((exp, idx) => (
            <div key={idx} className="mb-2">
              <p>
                <strong>Puesto:</strong> {exp.puesto || "No especificado"}
              </p>
              <p>
                <strong>Empresa:</strong> {exp.empresa || "No especificado"}
              </p>
              <p>
                <strong>Duración:</strong> {exp.duracion || "No especificado"}
              </p>
              <p>
                <strong>Actividades:</strong>{" "}
                {exp.actividades || "No especificado"}
              </p>
              <p>
                <strong>Motivo de salida:</strong>{" "}
                {exp.motivo_salida || "No especificado"}
              </p>
              <p>
                <strong>Fecha inicio:</strong>{" "}
                {exp.fecha_inicio || "No especificado"}
              </p>
              <p>
                <strong>Fecha fin:</strong> {exp.fecha_fin || "No especificado"}
              </p>
            </div>
          ))
        ) : (
          <p>No hay experiencia laboral registrada.</p>
        )}
      </article>
    </section>
  );
}
