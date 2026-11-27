import axios from "@/lib/axios";
import Cookies from "js-cookie";

/**
 * Cliente API para Contratos.
 * - Relación: usado en `src/app/panel/contratos/ContratoDialog.jsx` y hooks.
 * - Endpoints esperados (ajusta si tu backend difiere):
 *   GET    /contratos?empresa=ID&page=1&limit=10&search=&tipo=&estatus=&desde=&hasta=
 *   POST   /contratos
 *   PUT    /contratos/:id
 *   DELETE /contratos/:id
 */
function authHeaders() {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const contratosApi = {
  async listar(params) {
    const res = await axios.get("/checador/contratos", {
      params,
      headers: authHeaders(),
    });
    return res.data;
  },
  async crear(payload) {
    const res = await axios.post("/checador/contratos", payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async actualizar(id, payload) {
    const res = await axios.put(`/checador/contratos/${id}`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async eliminar(id) {
    const res = await axios.delete(`/checador/contratos/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async actualizarEstatus(id, estatus, motivo_terminacion) {
    const res = await axios.patch(
      `/checador/contratos/${id}/estatus`,
      { estatus, motivo_terminacion },
      { headers: authHeaders() }
    );
    return res.data;
  },
  async actualizarUrl(id, url) {
    const res = await axios.patch(
      `/checador/contratos/${id}/url`,
      { url },
      { headers: authHeaders() }
    );
    return res.data;
  },
  async getById(id) {
    const res = await axios.get(`/checador/contratos/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  // ——— (27/11/2026) Vista de detalle, sueldo del contrato, plantillas y firma. Backend: docs/contratos.md ———
  // Todo lo de la vista de detalle: contrato, sueldo, firmas, historial y convenios.
  async detalle(id) {
    return (await axios.get(`/checador/contratos/${id}/detalle`, { headers: authHeaders() })).data;
  },
  // Texto del contrato: el congelado si ya se mandó a firmar; si no, el que sale hoy de su plantilla (con faltantes).
  async documento(id) {
    return (await axios.get(`/checador/contratos/${id}/documento`, { headers: authHeaders() })).data;
  },
  // URL temporal del PDF guardado (S3 privado): el firmado si ya hay, si no el que se mandó a firmar. { url, firmado }
  async urlPdf(id) {
    return (await axios.get(`/checador/contratos/${id}/pdf`, { headers: authHeaders() })).data;
  },
  // Editor de plantillas: el texto que se está editando, llenado con los datos de este contrato. { html, faltantes }
  async vistaPrevia(id, contenidoHtml) {
    return (await axios.post(`/checador/contratos/${id}/vista-previa`, { contenido_html: contenidoHtml }, { headers: authHeaders() })).data;
  },
  async elegirPlantilla(id, idPlantilla) {
    return (await axios.post(`/checador/contratos/${id}/plantilla`, { id_plantilla: idPlantilla }, { headers: authHeaders() })).data;
  },
  // Congela el texto (ya no cambia) y lo devuelve para convertirlo en PDF antes de mandarlo a firmar.
  async prepararFirma(id) {
    return (await axios.post(`/checador/contratos/${id}/preparar-firma`, {}, { headers: authHeaders() })).data;
  },
  async firmarEmpresa(id) {
    return (await axios.post(`/checador/contratos/${id}/firmar-empresa`, {}, { headers: authHeaders() })).data;
  },
  // Convenio de modificación del sueldo: { salario_nuevo, periodicidad_nueva?, fecha_efectiva, motivo? }.
  async convenio(id, datos) {
    return (await axios.post(`/checador/contratos/${id}/convenio`, datos, { headers: authHeaders() })).data;
  },
  // Renovar: contrato nuevo encadenado que cierra el actual. { fecha_inicio, fecha_fin?, tipo_contrato?, salario_base? }
  async renovar(id, datos) {
    return (await axios.post(`/checador/contratos/${id}/renovar`, datos, { headers: authHeaders() })).data;
  },
  async terminar(id, { motivo, fecha, estatus = "terminado" }) {
    return (await axios.post(`/checador/contratos/${id}/terminar`, { motivo, fecha, estatus }, { headers: authHeaders() })).data;
  },
  // «Revisar sueldos»: diferencias ficha ≠ contrato vigente y personas con más de un contrato vigente.
  async revisarSueldos(idEmpresa) {
    return (await axios.get("/checador/contratos/revisar-sueldos", { params: { empresa: idEmpresa }, headers: authHeaders() })).data;
  },
  // decision: "usar_contrato" | "convenio_ficha".
  async resolverSueldo({ idEmpresa, idEmpleado, decision }) {
    return (await axios.post("/checador/contratos/revisar-sueldos/resolver", { id_empresa: idEmpresa, id_empleado: idEmpleado, decision }, { headers: authHeaders() })).data;
  },
  async resolverDuplicado({ idEmpresa, idEmpleado, conservar }) {
    return (await axios.post("/checador/contratos/duplicados/resolver", { id_empresa: idEmpresa, id_empleado: idEmpleado, conservar }, { headers: authHeaders() })).data;
  },
  // Plantillas base de ADAMIA (una por tipo) y el catálogo de variables.
  async plantillasBase() {
    return (await axios.get("/checador/contratos/plantillas-base", { headers: authHeaders() })).data;
  },
  async copiarPlantillaBase(clave, idEmpresa) {
    return (await axios.post(`/checador/contratos/plantillas-base/${clave}/copiar`, { id_empresa: idEmpresa }, { headers: authHeaders() })).data;
  },
  // Sueldo vigente de una persona: la misma fuente que nómina, finiquitos, aguinaldos y documentos.
  async salario(idEmpleado) {
    return (await axios.get(`/checador/contratos/salario/${idEmpleado}`, { headers: authHeaders() })).data;
  },
};


