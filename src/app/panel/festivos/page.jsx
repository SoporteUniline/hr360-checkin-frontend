"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
    <div className="space-y-4">
      {/* Encabezado (colores del sistema) - Relación: guía `Colores.txt` */}
      <div>
        <h1 className="text-2xl font-bold text-[#2c3e50]">Días festivos</h1>
        <p className="text-sm text-[#6b7280]">
          Catálogo de días festivos por empresa (crear, editar y eliminar)
        </p>
      </div>

      <div className="mb-2 flex flex-col md:flex-row gap-3 items-center">
        <Input
          className="flex-1"
          placeholder="Buscar por descripción..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button
          // Botón principal según `Colores.txt`
          className="w-full md:w-auto bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
          onClick={() => {
            setEditFestivo(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

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
