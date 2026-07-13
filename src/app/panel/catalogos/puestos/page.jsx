"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import PositionFormDialog from "./PositionFormDialog";
import PositionDeleteDialog from "./PositionDeleteDialog";
import PositionsTable from "./PositionsTable";
import AccesosRapidos from "@/components/AccesosRapidos";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { Briefcase } from "lucide-react";

export default function Positions() {
  const [positions, setPositions] = useState([]);
  const [editPosition, setEditPosition] = useState(null);
  const [deletePosition, setDeletePosition] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);
  const searchParams = useSearchParams();
  const { dataUser } = useAuth();

  useEffect(() => {
    const id = searchParams.get("id");
    const nombre = searchParams.get("nombre");
    if (!id) return;
    setEditPosition({ id_puesto: Number(id), nombre_puesto: nombre || "" });
    setOpenFormModal(true);
  }, [searchParams]);
  const id_empresa = "all";
  const idEmpresaForm = null;

  const key = id_empresa ? `/checador/puestos?id_empresa=${id_empresa}` : null;

  return (
    <div className="min-h-screen space-y-5 bg-[#F9FAFB] p-6">
      <EncabezadoPagina
        icono={Briefcase}
        titulo="Puestos"
        subtitulo="Catálogo de puestos por unidad de negocio"
      />

      <PositionsTable
        id_empresa={id_empresa}
        swrKey={key}
        onCreate={() => {
          setEditPosition(null);
          setOpenFormModal(true);
        }}
        onEdit={(position, lista) => {
          setEditPosition(position);
          setPositions(lista);
          setOpenFormModal(true);
        }}
        onDelete={(id) => {
          setDeletePosition(id);
          setOpenDeleteModal(true);
        }}
        onLoad={(lista) => {
          setPositions((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <PositionFormDialog
        open={openFormModal}
        setOpen={setOpenFormModal}
        editPosition={editPosition}
        id_empresa={idEmpresaForm}
        positions={positions}
        mutateKey={key}
        empresas={dataUser?.empresas_detalle || []}
      />

      <PositionDeleteDialog
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        deletePosition={deletePosition}
        mutateKey={key}
      />

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
