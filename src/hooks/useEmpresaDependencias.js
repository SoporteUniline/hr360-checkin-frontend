import axios from "@/lib/axios";
import { useEffect, useState } from "react";

export const useEmpresaDependencias = (form, idEmpresa, idSucursal) => {
  const [sucursales, setSucursales] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);

  // 🔹 Sucursales
  useEffect(() => {
    if (!idEmpresa) {
      setSucursales([]);
      return;
    }

    const fetchSucursales = async () => {
      try {
        setLoadingSucursales(true);

        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/sucursales`,
          { params: { id_empresa: idEmpresa } }
        );

        const options =
          data?.sucursales?.map((s) => ({
            value: String(s.id_sucursal),
            label: s.nombre,
          })) || [];

        setSucursales(options);
      } catch (error) {
        console.error("❌ Error cargando sucursales:", error);
        setSucursales([]);
      } finally {
        setLoadingSucursales(false);
      }
    };

    fetchSucursales();
  }, [idEmpresa]);

  // 🔹 Departamentos
  useEffect(() => {
    if (!idEmpresa || !idSucursal) {
      setDepartamentos([]);
      return;
    }

    const fetchDepartamentos = async () => {
      try {
        setLoadingDepartamentos(true);

        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos`,
          {
            params: {
              id_empresa: idEmpresa,
              id_sucursal: idSucursal,
            },
          }
        );

        const options =
          data?.departamentos?.map((d) => ({
            value: d.id_departamento, // NUMBER
            label: d.nombre,
          })) || [];

        setDepartamentos(options);
      } catch (error) {
        console.error("❌ Error cargando departamentos:", error);
        setDepartamentos([]);
      } finally {
        setLoadingDepartamentos(false);
      }
    };

    fetchDepartamentos();
  }, [idEmpresa, idSucursal]);

  return {
    sucursales,
    departamentos,
    loadingSucursales,
    loadingDepartamentos,
  };
};
