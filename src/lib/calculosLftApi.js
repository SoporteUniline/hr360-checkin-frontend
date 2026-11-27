import axios from "@/lib/axios";

// Calculadora pública de aguinaldo y tablas de la LFT (sin sesión). El cálculo lo hace el servidor con el mismo motor
// que el panel de Aguinaldos y el finiquito (backend: services/calculosLft.js).
export const calculosLftApi = {
  async aguinaldoPublico(cuerpo, { signal } = {}) {
    const res = await axios.post("/checador/calculos-lft/publico/aguinaldo", cuerpo, { signal });
    return res.data;
  },
  async vacacionesLey({ fechaIngreso, fecha }) {
    const res = await axios.get("/checador/calculos-lft/publico/vacaciones-ley", { params: { fecha_ingreso: fechaIngreso, fecha } });
    return res.data;
  },
};
