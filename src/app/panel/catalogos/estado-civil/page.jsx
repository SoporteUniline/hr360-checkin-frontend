"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EstadoCivilTable from "./EstadoCivilTable";
import EstadoCivilFormDialog from "./EstadoCivilFormDialog";
import EstadoCivilDeleteDialog from "./EstadoCivilDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function EstadoCivil() {
  const [estadoCivil, setEstadoCivil] = useState([]);
  const [editCiv, setEditCiv] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const { dataUser } = useAuth();

  const id_empresa = "all";
  const idEmpresaForm = null;
  const key = id_empresa
    ? `/checador/estados-civiles?id_empresa=${id_empresa}`
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => {
              setEditCiv(null);
              setOpenFormModal(true);
            }}
            className="w-full md:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-1" /> Nuevo estado civil
          </Button>
        </div>
      </div>

      <EstadoCivilTable
        id_empresa={id_empresa}
        swrKey={key}
        onEdit={(civ, lista) => {
          setEditCiv(civ);
          setEstadoCivil(lista);
          setOpenFormModal(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setOpenDeleteModal(true);
        }}
        onLoad={(lista) => {
          setEstadoCivil((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <EstadoCivilFormDialog
        open={openFormModal}
        setOpen={setOpenFormModal}
        editCiv={editCiv}
        id_empresa={idEmpresaForm}
        estadoCivil={estadoCivil}
        mutateKey={key}
        empresas={dataUser?.empresas_detalle || []}
      />

      <EstadoCivilDeleteDialog
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
