"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EstadoCivilTable from "./EstadoCivilTable";
import EstadoCivilFormDialog from "./EstadoCivilFormDialog";
import EstadoCivilDeleteDialog from "./EstadoCivilDeleteDialog";

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
    <div>
      <div className="mb-4 flex gap-3 items-center">
        <Input
          className="flex-1"
          placeholder="Buscar estado civil..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button
          onClick={() => {
            setEditCiv(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
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
    </div>
  );
}
