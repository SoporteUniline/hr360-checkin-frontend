"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Filter, Plus, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FestivosTable from "./FestivosTable";
import FestivoFormDialog from "./FestivoFormDialog";
import FestivoDeleteDialog from "./FestivoDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function Festivos() {
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState(""); // filtro con debounce
  const [festivos, setFestivos] = useState([]);
  const [editFestivo, setEditFestivo] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const { dataUser } = useAuth();
  const id_empresa = dataUser?.id_empresa;

  const key = `/checador/holidays/${id_empresa}`;

  // Hook para aplicar debounce de 500ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilter(filter);
    }, 500); // <-- aquí decides el tiempo de espera

    return () => {
      clearTimeout(handler);
    };
  }, [filter]);

  return (
    <div className="space-y-6">
      {/* Header ADAMIA */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="bg-[#2563EB] p-2.5 rounded-lg">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Días festivos</h1>
              <p className="text-sm text-gray-600">Catálogo por empresa (crear, editar y eliminar).</p>
            </div>
          </div>
          <Button
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
            onClick={() => {
              setEditFestivo(null);
              setOpenFormModal(true);
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
              placeholder="Buscar por descripción..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <FestivosTable
        id_empresa={id_empresa}
        filter={debouncedFilter} // 👈 solo pasa el filtro ya "debounceado"
        swrKey={key}
        onEdit={(festivo, lista) => {
          setEditFestivo(festivo);
          setFestivos(lista);
          setOpenFormModal(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setOpenDeleteModal(true);
        }}
        onLoad={(lista) => {
          setFestivos((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <FestivoFormDialog
        open={openFormModal}
        setOpen={setOpenFormModal}
        editFestivo={editFestivo}
        id_empresa={id_empresa}
        festivos={festivos}
        mutateKey={key}
      />

      <FestivoDeleteDialog
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
