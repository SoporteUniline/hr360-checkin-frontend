"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export default function DetalleEmpleado({ item, setSelected }) {
  const nombreCompleto = `${item.nombre} ${item.apellido_paterno} ${
    item.apellido_materno || ""
  }`;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">{nombreCompleto}</h2>
        <Button variant="ghost" onClick={() => setSelected(null)}>
          Cerrar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <p>
          <strong>CURP:</strong> {item.curp}
        </p>
        <p>
          <strong>RFC:</strong> {item.rfc}
        </p>
        <p>
          <strong>NSS:</strong> {item.nss}
        </p>
        <p>
          <strong>Fecha de nacimiento:</strong> {item.fecha_nacimiento}
        </p>
        <p>
          <strong>Sexo:</strong> {item.sexo}
        </p>
        <p>
          <strong>Estado civil:</strong> {item.estado_civil}
        </p>
        <p>
          <strong>Correo:</strong> {item.correo}
        </p>
        <p>
          <strong>Teléfono:</strong> {item.telefono || "N/A"}
        </p>
        <p>
          <strong>Departamento:</strong> {item.departamento}
        </p>
        <p>
          <strong>Puesto:</strong> {item.puesto}
        </p>
        <p>
          <strong>Sucursal:</strong> {item.sucursal}
        </p>
        <p>
          <strong>Fecha ingreso:</strong> {item.fecha_ingreso}
        </p>
        <p>
          <strong>Estado:</strong> {item.estado}
        </p>
        {item.fecha_baja && (
          <p>
            <strong>Fecha baja:</strong> {item.fecha_baja}
          </p>
        )}
        {item.motivo_baja && (
          <p>
            <strong>Motivo de baja:</strong> {item.motivo_baja}
          </p>
        )}
      </div>
    </div>
  );
}
