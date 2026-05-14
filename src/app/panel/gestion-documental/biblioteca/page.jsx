"use client";

import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { enqueueSnackbar } from "notistack";
import { useAuth } from "@/context/AuthContext";
import DocumentHeader from "@/components/biblioteca/DocumentHeader";
import DocumentFilters from "@/components/biblioteca/DocumentFilters";
import DocumentsList from "@/components/biblioteca/DocumentsList";
import DeleteDocumentModal from "@/components/biblioteca/DeleteDocumentModal";
import EditDocumentModal from "@/components/biblioteca/EditDocumentModal";
import UploadDocumentModal from "@/components/biblioteca/UploadDocumentModal";
import NewVersionModal from "@/components/biblioteca/NewVersionModal";
import VersionsHistoryModal from "@/components/biblioteca/VersionsHistoryModal";
import CategoryModal from "@/components/biblioteca/CategoryModal";

const initialUploadForm = {
  id_categoria: "",
  titulo: "",
  descripcion: "",
  file: null,
};

const categoryColors = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#eab308",
  "#ec4899",
];

export default function BibliotecaDocumentalPage() {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;
  const [categorias, setCategorias] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUpload, setOpenUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState(initialUploadForm);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [openVersionModal, setOpenVersionModal] = useState(false);
  const [versionDocument, setVersionDocument] = useState(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  const [versionForm, setVersionForm] = useState({
    comentario: "",
    file: null,
  });

  const [openVersionsHistory, setOpenVersionsHistory] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versions, setVersions] = useState([]);

  const [editForm, setEditForm] = useState({
    id_categoria: "",
    titulo: "",
    descripcion: "",
  });

  const [filters, setFilters] = useState({
    search: "",
    categorias: [],
    tipos_archivo: [],
  });

  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    nombre: "",
  });

  useEffect(() => {
    if (!idEmpresa) return;

    const timer = setTimeout(() => {
      obtenerDatos(filters);
    }, 600);

    return () => clearTimeout(timer);
  }, [filters, idEmpresa]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();

    if (!categoryForm.nombre.trim()) {
      return enqueueSnackbar("Escribe el nombre de la categoría", {
        variant: "warning",
      });
    }

    try {
      setSavingCategory(true);

      const randomColor =
        categoryColors[Math.floor(Math.random() * categoryColors.length)];

      await axios.post("/checador/gestion-documental/categorias", {
        id_empresa: idEmpresa,
        nombre: categoryForm.nombre.trim(),
        color: randomColor,
      });

      enqueueSnackbar("Categoría creada correctamente", {
        variant: "success",
      });

      setOpenCategoryModal(false);

      setCategoryForm({
        nombre: "",
      });

      await obtenerDatos();
    } catch (error) {
      // console.error("Error creando categoría:", error);

      enqueueSnackbar(
        error.response?.data?.error || "Error al crear categoría",
        {
          variant: "error",
        },
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const obtenerDatos = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("id_empresa", idEmpresa);

      if (customFilters.search) {
        params.append("search", customFilters.search);
      }

      const categoriasRes = await axios.get(
        `/checador/gestion-documental/categorias?id_empresa=${idEmpresa}`,
      );

      const documentosRes = await axios.get(
        `/checador/gestion-documental?${params.toString()}`,
      );

      let docs = documentosRes.data.data || [];

      if (customFilters.categorias.length > 0) {
        docs = docs.filter((doc) =>
          customFilters.categorias.includes(String(doc.id_categoria)),
        );
      }

      if (customFilters.tipos_archivo.length > 0) {
        docs = docs.filter((doc) =>
          customFilters.tipos_archivo.some((tipo) =>
            doc.tipo_archivo?.toLowerCase().includes(tipo),
          ),
        );
      }

      setCategorias(categoriasRes.data.data || []);
      setDocumentos(docs);
    } catch (error) {
      console.error("Error obteniendo gestión documental:", error);
      enqueueSnackbar(
        error.response?.data?.error || "Error al cargar documentos",
        { variant: "error" },
      );
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFilters({
      search: "",
      categorias: [],
      tipos_archivo: [],
    });
  };

  const cerrarUploadModal = () => {
    if (uploading) return;
    setOpenUpload(false);
    setUploadForm(initialUploadForm);
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    setUploadForm((prev) => ({
      ...prev,
      [name]: type === "file" ? files?.[0] || null : value,
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadForm.id_categoria)
      return enqueueSnackbar("Selecciona una categoría", {
        variant: "warning",
      });
    if (!uploadForm.titulo.trim())
      return enqueueSnackbar("Escribe un título", {
        variant: "warning",
      });
    if (!uploadForm.file)
      return enqueueSnackbar("Selecciona un archivo", {
        variant: "warning",
      });

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append("id_empresa", idEmpresa);
      formData.append("id_categoria", uploadForm.id_categoria);
      formData.append("titulo", uploadForm.titulo.trim());
      formData.append("descripcion", uploadForm.descripcion.trim());
      formData.append("file", uploadForm.file);

      await axios.post("/checador/gestion-documental", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      cerrarUploadModal();
      await obtenerDatos();
    } catch (error) {
      console.error("Error subiendo documento:", error);
      enqueueSnackbar(
        error.response?.data?.error || "Error al subir documento",
        {
          variant: "error",
        },
      );
    } finally {
      setUploading(false);
    }
  };

  const openEditDocument = (doc) => {
    setEditingDocument(doc);

    setEditForm({
      id_categoria: doc.id_categoria || "",
      titulo: doc.titulo || "",
      descripcion: doc.descripcion || "",
    });

    setOpenEditModal(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      setDeletingId(documentToDelete.id_documento_gd);

      await axios.delete(
        `/checador/gestion-documental/${documentToDelete.id_documento_gd}`,
      );

      setDocumentos((prev) =>
        prev.filter(
          (item) => item.id_documento_gd !== documentToDelete.id_documento_gd,
        ),
      );

      setShowDeleteModal(false);
      setDocumentToDelete(null);
      setOpenMenuId(null);
    } catch (error) {
      console.error("Error eliminando documento:", error);

      enqueueSnackbar(
        error.response?.data?.error || "Error al eliminar documento",
        {
          variant: "error",
        },
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editingDocument) return;

    try {
      setSavingEdit(true);

      await axios.put(
        `/checador/gestion-documental/${editingDocument.id_documento_gd}`,
        {
          id_categoria: editForm.id_categoria,
          titulo: editForm.titulo,
          descripcion: editForm.descripcion,
        },
      );

      setDocumentos((prev) =>
        prev.map((doc) =>
          doc.id_documento_gd === editingDocument.id_documento_gd
            ? {
                ...doc,
                ...editForm,
                categoria:
                  categorias.find(
                    (c) => c.id_categoria === Number(editForm.id_categoria),
                  )?.nombre || doc.categoria,
              }
            : doc,
        ),
      );

      setOpenEditModal(false);
      setEditingDocument(null);
    } catch (error) {
      console.error("Error editando documento:", error);

      enqueueSnackbar(
        error.response?.data?.error || "Error al editar documento",
        {
          variant: "error",
        },
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const openNewVersionModal = (doc) => {
    setVersionDocument(doc);
    setVersionForm({
      comentario: "",
      file: null,
    });
    setOpenVersionModal(true);
  };

  const handleVersionChange = (e) => {
    const { name, value, type, files } = e.target;

    setVersionForm((prev) => ({
      ...prev,
      [name]: type === "file" ? files?.[0] || null : value,
    }));
  };

  const handleUploadNewVersion = async (e) => {
    e.preventDefault();

    if (!versionDocument) return;
    if (!versionForm.file)
      return enqueueSnackbar("Selecciona un archivo", {
        variant: "warning",
      });

    try {
      setUploadingVersion(true);

      const formData = new FormData();
      formData.append("comentario", versionForm.comentario.trim());
      formData.append("file", versionForm.file);

      await axios.post(
        `/checador/gestion-documental/${versionDocument.id_documento_gd}/versiones`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setOpenVersionModal(false);
      setVersionDocument(null);
      setVersionForm({
        comentario: "",
        file: null,
      });

      await obtenerDatos();
    } catch (error) {
      console.error("Error subiendo nueva versión:", error);
      enqueueSnackbar(
        error.response?.data?.error || "Error al subir nueva versión",
        {
          variant: "error",
        },
      );
    } finally {
      setUploadingVersion(false);
    }
  };

  const openVersionsHistoryModal = async (doc) => {
    try {
      setVersionDocument(doc);
      setOpenVersionsHistory(true);
      setVersionsLoading(true);

      const res = await axios.get(
        `/checador/gestion-documental/${doc.id_documento_gd}/versiones`,
      );

      setVersions(res.data.data || []);
    } catch (error) {
      console.error("Error obteniendo versiones:", error);
      enqueueSnackbar(
        error.response?.data?.error || "Error al obtener versiones",
        {
          variant: "error",
        },
      );
    } finally {
      setVersionsLoading(false);
    }
  };

  const getDocumentoUrl = (doc) => {
    if (doc.url) return doc.url;
    if (doc.archivo_url) return doc.archivo_url;
    if (doc.file_url) return doc.file_url;
    if (doc.location) return doc.location;

    if (doc.s3_key && process.env.NEXT_PUBLIC_AWS_URL) {
      return `${process.env.NEXT_PUBLIC_AWS_URL.replace(/\/$/, "")}/${
        doc.s3_key
      }`;
    }

    return null;
  };

  const totalDocumentos = documentos.length;

  return (
    <div className="p-6">
      <DocumentHeader
        onOpenCategory={() => setOpenCategoryModal(true)}
        onOpenUpload={() => setOpenUpload(true)}
      />

      <DocumentFilters
        filters={filters}
        setFilters={setFilters}
        categorias={categorias}
        totalDocumentos={totalDocumentos}
        limpiarFiltros={limpiarFiltros}
      />

      <DocumentsList
        loading={loading}
        documentos={documentos}
        totalDocumentos={totalDocumentos}
        openMenuId={openMenuId}
        setOpenMenuId={setOpenMenuId}
        deletingId={deletingId}
        getDocumentoUrl={getDocumentoUrl}
        openEditDocument={openEditDocument}
        openNewVersionModal={openNewVersionModal}
        openVersionsHistoryModal={openVersionsHistoryModal}
        onDeleteClick={(doc) => {
          setDocumentToDelete(doc);
          setShowDeleteModal(true);
          setOpenMenuId(null);
        }}
      />

      <UploadDocumentModal
        open={openUpload}
        uploading={uploading}
        uploadForm={uploadForm}
        setUploadForm={setUploadForm}
        categorias={categorias}
        idEmpresa={idEmpresa}
        categoryColors={categoryColors}
        enqueueSnackbar={enqueueSnackbar}
        axios={axios}
        onClose={cerrarUploadModal}
        onSubmit={handleUpload}
        handleChange={handleChange}
        setCategorias={setCategorias}
      />

      <DeleteDocumentModal
        open={showDeleteModal}
        documentToDelete={documentToDelete}
        deletingId={deletingId}
        onClose={() => {
          setShowDeleteModal(false);
          setDocumentToDelete(null);
        }}
        onConfirm={handleDelete}
      />

      <EditDocumentModal
        open={openEditModal}
        categorias={categorias}
        editForm={editForm}
        setEditForm={setEditForm}
        savingEdit={savingEdit}
        onClose={() => setOpenEditModal(false)}
        onSubmit={handleEditSubmit}
      />

      <NewVersionModal
        open={openVersionModal}
        versionDocument={versionDocument}
        versionForm={versionForm}
        uploadingVersion={uploadingVersion}
        onClose={() => setOpenVersionModal(false)}
        onSubmit={handleUploadNewVersion}
        onChange={handleVersionChange}
      />

      <VersionsHistoryModal
        open={openVersionsHistory}
        versionDocument={versionDocument}
        versionsLoading={versionsLoading}
        versions={versions}
        getDocumentoUrl={getDocumentoUrl}
        onClose={() => setOpenVersionsHistory(false)}
      />

      <CategoryModal
        open={openCategoryModal}
        savingCategory={savingCategory}
        categoryForm={categoryForm}
        setCategoryForm={setCategoryForm}
        onClose={() => setOpenCategoryModal(false)}
        onSubmit={handleCreateCategory}
      />
    </div>
  );
}
