"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PositionFormDialog from "./PositionFormDialog";
import PositionDeleteDialog from "./PositionDeleteDialog";
import PositionsTable from "./PositionsTable";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function Positions() {
  const [filter, setFilter] = useState("");
  const [positions, setPositions] = useState([]);
  const [editPosition, setEditPosition] = useState(null);
  const [deletePosition, setDeletePosition] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);
  const { dataUser } = useAuth();
  const id_empresa = dataUser?.id_empresa;
  const key = `/checador/puestos?id_empresa=${id_empresa}`;

  return (
    <div>
      <div className="mb-4 flex gap-3 items-center">
        <Input
          className="flex-1"
          placeholder="Buscar puesto..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button
          onClick={() => {
            setEditPosition(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      <PositionsTable
        id_empresa={id_empresa}
        filter={filter}
        swrKey={key}
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
        id_empresa={id_empresa}
        positions={positions}
        mutateKey={key}
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
