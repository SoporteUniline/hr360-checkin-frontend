"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TiposRegistroTable from "./TiposRegistroTable";
import TipoRegistroFormDialog from "./TipoRegistroFormDialog";
import TipoRegistroDeleteDialog from "./TipoRegistroDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function TiposRegistro() {
  const [filter, setFilter] = useState("");
  const [registros, setRegistros] = useState([]);
  const [editPerm, setEditPerm] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // controlar abrir/cerrar los dialogs
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const key = `/checador/tiposPermiso?clave=${filter}`;

  return (
    <div className="space-y-4">
      {/* Encabezado (colores del sistema) */}
      <div>
        <h1 className="text-2xl font-bold text-[#2c3e50]">Tipos de registro</h1>
        <p className="text-sm text-[#6b7280]">
          Catálogo para asistencias/permisos (crear, editar y eliminar)
        </p>
      </div>

      <div className="mb-2 flex flex-col md:flex-row gap-3 items-center">
        <Input
          className="flex-1"
          placeholder="Buscar tipo de registro..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button
          className="w-full md:w-auto bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
          onClick={() => {
            setEditPerm(null);
            setOpenForm(true); // abrir modal para "nuevo"
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      <TiposRegistroTable
        filter={filter}
        swrKey={key}
        onEdit={(perm, lista) => {
          setEditPerm(perm);
          setRegistros(lista);
          setOpenForm(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setOpenDelete(true);
        }}
        onLoad={(lista) => {
          setRegistros((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <TipoRegistroFormDialog
        open={openForm}
        setOpen={setOpenForm}
        editRegistro={editPerm}
        registros={registros}
        mutateKey={key}
      />

      <TipoRegistroDeleteDialog
        open={openDelete}
        setOpen={setOpenDelete}
        deleteId={deleteId}
        mutateKey={key}
      />
      
      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
