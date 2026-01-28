"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DepartamentosTable from "./DepartamentosTable";
import DepartamentoFormDialog from "./DepartamentoFormDialog";
import DepartamentoDeleteDialog from "./DepartamentoDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function Departamentos() {
  const [filter, setFilter] = useState("");
  const [departamentos, setDepartamentos] = useState([]);
  const [editDep, setEditDep] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const { dataUser } = useAuth();
  const id_empresa = dataUser?.id_empresa;
  const key = `/checador/departamentos?id_empresa=${id_empresa}`;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      {/* Header del módulo - Estilo ADAMIA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-3 rounded-lg">
            <Building2 className="w-7 h-7 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Departamentos</h1>
            <p className="text-sm text-gray-600">Gestiona los departamentos de tu empresa</p>
          </div>
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          onClick={() => {
            setEditDep(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo departamento
        </Button>
      </div>

      {/* Filtro de búsqueda - Estilo ADAMIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            className="flex-1 border-gray-200"
            placeholder="Buscar departamento..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <DepartamentosTable
        id_empresa={id_empresa}
        filter={filter}
        swrKey={key}
        onEdit={(dep, lista) => {
          setEditDep(dep);
          setDepartamentos(lista);
          setOpenFormModal(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setOpenDeleteModal(true);
        }}
        onLoad={(lista) => {
          setDepartamentos((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <DepartamentoFormDialog
        open={openFormModal}
        setOpen={setOpenFormModal}
        editDep={editDep}
        id_empresa={id_empresa}
        departamentos={departamentos}
        mutateKey={key}
      />

      <DepartamentoDeleteDialog
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
