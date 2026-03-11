"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import PositionFormDialog from "./PositionFormDialog";
import PositionDeleteDialog from "./PositionDeleteDialog";
import PositionsTable from "./PositionsTable";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function Positions() {
  const [positions, setPositions] = useState([]);
  const [editPosition, setEditPosition] = useState(null);
  const [deletePosition, setDeletePosition] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);
  const { dataUser } = useAuth();
  const id_empresa = "all";
  const idEmpresaForm = null;

  const key = id_empresa ? `/checador/puestos?id_empresa=${id_empresa}` : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
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
