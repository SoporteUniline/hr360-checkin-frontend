"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Search } from "lucide-react";
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
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      {/* Header del módulo - Estilo ADAMIA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-50 p-3 rounded-lg">
            <Briefcase className="w-7 h-7 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Puestos</h1>
            <p className="text-sm text-gray-600">Gestiona los puestos de trabajo</p>
          </div>
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          onClick={() => {
            setEditPosition(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo puesto
        </Button>
      </div>

      {/* Filtro de búsqueda - Estilo ADAMIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            className="flex-1 border-gray-200"
            placeholder="Buscar puesto..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
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
