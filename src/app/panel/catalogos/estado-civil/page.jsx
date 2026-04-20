"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import EstadoCivilTable from "./EstadoCivilTable";
import EstadoCivilFormDialog from "./EstadoCivilFormDialog";
import EstadoCivilDeleteDialog from "./EstadoCivilDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";

export default function EstadoCivil() {
  const searchParams = useSearchParams();
  const [estadoCivil, setEstadoCivil] = useState([]);
  const [editCiv, setEditCiv] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const { dataUser } = useAuth();

  useEffect(() => {
    const id = searchParams.get("id");
    const nombre = searchParams.get("nombre");
    if (id && nombre) {
      setEditCiv({ id_estado_civil: Number(id), nombre });
      setOpenFormModal(true);
    }
  }, [searchParams]);

  const id_empresa = "all";
  const idEmpresaForm = null;
  const key = id_empresa
    ? `/checador/estados-civiles?id_empresa=${id_empresa}`
    : null;

  return (
    <div className="space-y-6">
      <EstadoCivilTable
        id_empresa={id_empresa}
        swrKey={key}
        onCreate={() => {
          setEditCiv(null);
          setOpenFormModal(true);
        }}
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
