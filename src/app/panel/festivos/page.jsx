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
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { FiltrosGrid, CampoFiltro } from "@/components/filtros/CampoFiltro";

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
    <div className="space-y-5">
      <EncabezadoPagina
        icono={CalendarDays}
        titulo="Días festivos"
        subtitulo="Catálogo por empresa (crear, editar y eliminar)."
        acciones={
          <Button
            className="bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-semibold text-white gap-2"
            onClick={() => {
              setEditFestivo(null);
              setOpenFormModal(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        }
      />

      {/* Fila de filtros homologada */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <FiltrosGrid columnas={3}>
          <CampoFiltro etiqueta="Unidad de negocio">
            <div className="[&_button]:h-[38px] [&_button]:w-full [&_button]:rounded-md [&_button]:border-gray-200 [&_button]:text-[13px] [&_button]:font-medium">
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
          </CampoFiltro>
        </FiltrosGrid>
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
