"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HeartHandshake, Plus, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EstadoCivilTable from "./EstadoCivilTable";
import EstadoCivilFormDialog from "./EstadoCivilFormDialog";
import EstadoCivilDeleteDialog from "./EstadoCivilDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function EstadoCivil() {
  const [filter, setFilter] = useState("");
  const [estadoCivil, setEstadoCivil] = useState([]);
  const [editCiv, setEditCiv] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const { dataUser } = useAuth();
  const id_empresa = dataUser?.id_empresa;
  const key = `/checador/estados-civiles?id_empresa=${id_empresa}`;

  return (
    <div className="space-y-6">
      {/* Header - Diseño ADAMIA */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-[#2563EB] p-2.5 rounded-lg">
            <HeartHandshake className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Estado civil</h1>
            <p className="text-sm text-gray-600">
              Gestiona el catálogo de estados civiles.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 w-full"
              placeholder="Buscar estado civil..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
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
        filter={filter}
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
        id_empresa={id_empresa}
        estadoCivil={estadoCivil}
        mutateKey={key}
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
