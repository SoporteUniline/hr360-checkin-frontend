"use client";
import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { types } from "../dataMappings";
import InputEstados from "./InputsEntidades";
import { FunnelX } from "lucide-react";
import debounce from "lodash.debounce";
import useSWR from "swr";
import { fetcher, swr_config } from "@/lib/fetcher";
import { Skeleton } from "@/components/ui/skeleton";

export default function FilterJobs({
  filterValues,
  setFilterValues,
  initFilterValues,
}) {
  const [value, setValue] = React.useState("");

  const resetFilter = () => {
    setFilterValues(initFilterValues);
    setValue("");
  };

  const debouncedSearch = useMemo(
    () =>
      debounce((titulo) => {
        setFilterValues((st) => ({ ...st, titulo, page: 1 }));
      }, 500),
    []
  );

  const handleChange = (e) => {
    const value = e.target.value;
    setValue(value);
    debouncedSearch(value);
  };

  return (
    <section className="my-5">
      <div className="flex  gap-3">
        <Input
          placeholder="Buscar empleo"
          value={value}
          onChange={handleChange}
          className="bg-white"
        />
        <Button
          onClick={resetFilter}
          className="bg-slate-700"
          startIcon={<FunnelX />}
        >
          Limpiar filtros
        </Button>
      </div>
      <div className="grid  grid-cols-1 md:flex gap-3 mt-3">
        <div className="grid grid-cols-1 md:flex w-full items-center gap-3">
          <InputEstados
            setFilterValues={setFilterValues}
            filterValues={filterValues}
          />
        </div>
        <div className="flex items-center gap-1">
          {types.map(({ text, value }, index) => {
            const active =
              value === filterValues.tipo_contratacion
                ? "bg-slate-700"
                : "bg-gray-300 text-slate-700";
            return (
              <Button
                key={index}
                onClick={() =>
                  setFilterValues((st) => ({
                    ...st,
                    tipo_contratacion: value,
                    page: 1,
                  }))
                }
                className={`${active} hover:bg-slate-500 hover:text-white`}
              >
                {text}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex-inline items-center mt-4">
        <GirosSection
          filterValues={filterValues}
          setFilterValues={setFilterValues}
        />
      </div>
    </section>
  );
}

const GirosSection = ({ filterValues, setFilterValues }) => {
  const { data, error, isLoading } = useSWR(
    `/empresas/giros`,
    fetcher,
    swr_config
  );

  if (isLoading) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton className="h-10 w-40" key={i} />
        ))}
      </div>
    );
  }

  if (error) return null;

  return (
    <>
      {data?.giros.map((value, index) => {
        const active =
          value === filterValues.giro
            ? "bg-slate-700"
            : "bg-gray-300 text-slate-700";
        return (
          <Button
            key={index}
            onClick={() =>
              setFilterValues((st) => ({
                ...st,
                giro: st.giro ? "" : value,
                page: 1,
              }))
            }
            className={`${active} hover:bg-slate-500 hover:text-white m-1`}
          >
            {value}
          </Button>
        );
      })}
    </>
  );
};
