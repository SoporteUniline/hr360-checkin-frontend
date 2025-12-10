"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
    <div>
      <div className="mb-4 flex gap-3 items-center">
        <Input
          className="flex-1"
          placeholder="Buscar departamento..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button
          onClick={() => {
            setEditDep(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
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
