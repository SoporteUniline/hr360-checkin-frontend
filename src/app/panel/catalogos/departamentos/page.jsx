"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DepartamentosTable from "./DepartamentosTable";
import DepartamentoFormDialog from "./DepartamentoFormDialog";
import DepartamentoDeleteDialog from "./DepartamentoDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { Building2 } from "lucide-react";

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState([]);
  const [editDep, setEditDep] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const searchParams = useSearchParams();
  const { dataUser } = useAuth();

  useEffect(() => {
    const id = searchParams.get("id");
    const nombre = searchParams.get("nombre");
    if (!id) return;
    setEditDep({ id_departamento: Number(id), nombre: nombre || "" });
    setOpenFormModal(true);
  }, [searchParams]);

  const id_empresa = "all";
  const idEmpresaForm = null;

  const key = id_empresa
    ? `/checador/departamentos?id_empresa=${id_empresa}`
    : null;

  return (
    <div className="min-h-screen space-y-5 bg-[#F9FAFB] p-6">
      <EncabezadoPagina
        icono={Building2}
        titulo="Departamentos"
        subtitulo="Catálogo de departamentos por unidad de negocio"
      />

      <DepartamentosTable
        id_empresa={id_empresa}
        swrKey={key}
        onCreate={() => {
          setEditDep(null);
          setOpenFormModal(true);
        }}
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
