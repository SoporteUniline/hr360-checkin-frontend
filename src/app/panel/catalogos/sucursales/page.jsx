"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SucursalesTable from "./SucursalesTable";
import SucursalFormDialog from "./SucursalFormDialog";
import SucursalDeleteDialog from "./SucursalDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function Sucursales() {
  const [filter, setFilter] = useState("");
  const [sucursales, setSucursales] = useState([]);
  const [editSuc, setEditSuc] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const { dataUser } = useAuth();
  const id_empresa = dataUser?.id_empresa;
  const key = `/checador/sucursales?id_empresa=${id_empresa}`;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      {/* Header del módulo - Estilo ADAMIA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 p-3 rounded-lg">
            <MapPin className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Sucursales</h1>
            <p className="text-sm text-gray-600">Gestiona las sucursales de tu empresa</p>
          </div>
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          onClick={() => {
            setEditSuc(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva sucursal
        </Button>
      </div>

      {/* Filtro de búsqueda - Estilo ADAMIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            className="flex-1 border-gray-200"
            placeholder="Buscar sucursal..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <SucursalesTable
        id_empresa={id_empresa}
        filter={filter}
        swrKey={key}
        onEdit={(suc, lista) => {
          setEditSuc(suc);
          setSucursales(lista);
          setOpenFormModal(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setOpenDeleteModal(true);
        }}
        onLoad={(lista) => {
          setSucursales((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <SucursalFormDialog
        open={openFormModal}
        setOpen={setOpenFormModal}
        editSuc={editSuc}
        id_empresa={id_empresa}
        sucursales={sucursales}
        mutateKey={key}
      />

      <SucursalDeleteDialog
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
