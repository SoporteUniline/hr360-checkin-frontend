"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DepartamentosTable from "./DepartamentosTable";
import DepartamentoFormDialog from "./DepartamentoFormDialog";
import DepartamentoDeleteDialog from "./DepartamentoDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState([]);
  const [editDep, setEditDep] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const { dataUser } = useAuth();

  const id_empresa = "all";
  const idEmpresaForm = null;

  const key = id_empresa
    ? `/checador/departamentos?id_empresa=${id_empresa}`
    : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      {/* Filtro principal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex justify-end">
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

      <DepartamentosTable
        id_empresa={id_empresa}
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
        id_empresa={idEmpresaForm}
        departamentos={departamentos}
        mutateKey={key}
        empresas={dataUser?.empresas_detalle || []}
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
