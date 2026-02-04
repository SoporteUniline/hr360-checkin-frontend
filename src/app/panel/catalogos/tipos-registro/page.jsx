"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Filter, Plus, Search } from "lucide-react";
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
    <div className="space-y-6">
      {/* Header ADAMIA */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="bg-[#2563EB] p-2.5 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tipos de registro</h1>
              <p className="text-sm text-gray-600">Catálogo para asistencias/permisos (crear, editar y eliminar).</p>
            </div>
          </div>
          <Button
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
            onClick={() => {
              setEditPerm(null);
              setOpenForm(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-blue-100 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-blue-700 flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros de búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-xl">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              className="pl-9 bg-white"
              placeholder="Buscar tipo de registro..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

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
