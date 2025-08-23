"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SucursalesTable from "./SucursalesTable";
import SucursalFormDialog from "./SucursalFormDialog";
import SucursalDeleteDialog from "./SucursalDeleteDialog";

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
    <div>
      <div className="mb-4 flex gap-3 items-center">
        <Input
          className="flex-1"
          placeholder="Buscar sucursal..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button
          onClick={() => {
            setEditSuc(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
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
    </div>
  );
}
