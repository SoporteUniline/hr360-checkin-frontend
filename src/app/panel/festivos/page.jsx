"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/Combobox";
import { CalendarDays, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import FestivosTable from "./FestivosTable";
import FestivoFormDialog from "./FestivoFormDialog";
import FestivoDeleteDialog from "./FestivoDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function Festivos() {
  const [festivos, setFestivos] = useState([]);
  const [editFestivo, setEditFestivo] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const { dataUser } = useAuth();
  const [unidadActiva, setUnidadActiva] = useState("all");
  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();
  const id_empresa =
    unidadActiva === "all"
      ? "all"
      : String(unidadById[unidadActiva]?.id_empresa || "all");

  useEffect(() => {
    if (dataUser?.empresas?.length > 0 && !unidadActiva) {
      setUnidadActiva("all");
    }
  }, [dataUser, unidadActiva]);

  const key = id_empresa ? `/checador/holidays/${id_empresa}` : null;

  return (
    <div className="space-y-6">
      {/* Header ADAMIA */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="bg-[#2563EB] p-2.5 rounded-lg">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Días festivos</h1>
              <p className="text-sm text-gray-600">
                Catálogo por empresa (crear, editar y eliminar).
              </p>
            </div>
          </div>
          <Button
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
            onClick={() => {
              setEditFestivo(null);
              setOpenFormModal(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <p className="text-sm font-medium text-gray-700 mb-1">
            Unidad de negocio
          </p>
          <Combobox
            options={[
              { value: "all", label: "Todas las unidades de negocio" },
              ...unidadOptions,
            ]}
            value={unidadActiva}
            onChange={(value) => setUnidadActiva(value || "all")}
            placeholder="Seleccionar unidad de negocio"
            emptyText="No hay unidades disponibles."
          />
        </div>
      </div>

      <FestivosTable
        id_empresa={id_empresa}
        swrKey={key}
        onEdit={(festivo, lista) => {
          setEditFestivo(festivo);
          setFestivos(lista);
          setOpenFormModal(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setOpenDeleteModal(true);
        }}
        onLoad={(lista) => {
          setFestivos((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <FestivoFormDialog
        open={openFormModal}
        setOpen={setOpenFormModal}
        editFestivo={editFestivo}
        id_empresa={id_empresa}
        festivos={festivos}
        mutateKey={key}
        empresas={dataUser?.empresas_detalle || []}
      />

      <FestivoDeleteDialog
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        deleteId={deleteId}
        mutateKey={key}
      />

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
