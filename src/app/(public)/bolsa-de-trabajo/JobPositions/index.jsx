"use client";
import React from "react";
import RecruitingCompanies from "../RecruitingCompanies";
import { fetcher, swr_config } from "@/lib/fetcher";
import useSWR from "swr";
import FilterJobs from "./FilterJobs";
import CardsJobs from "./Cards";
import TablePagination from "@/components/TablePagination";

const initFilterValues = {
  giro: "",
  ciudad: "",
  entidad: "",
  pais: "",
  titulo: "",
  tipo_contratacion: "",
  id_empresa: "",
  page: 1,
};

export default function JobPositions() {
  const limit = 10;
  const [filterValues, setFilterValues] = React.useState(initFilterValues);
  const {
    giro,
    ciudad,
    entidad,
    pais,
    titulo,
    id_empresa,
    tipo_contratacion,
    page,
  } = filterValues;
  const query = `giro=${giro}&ciudad=${ciudad}&entidad=${entidad}&pais=${pais}&titulo=${titulo}&id_empresa=${id_empresa}&tipo_contratacion=${tipo_contratacion}&page=${page}&limit=${limit}`;

  const { data, error, isLoading } = useSWR(
    `/vacantes/filter?${query}`,
    fetcher,
    swr_config
  );

  const onPageChange = async (value) => {
    setFilterValues({ ...filterValues, page: value });
  };

  return (
    <main className="w-full bg-gray-100">
      <RecruitingCompanies setFilterValues={setFilterValues} />
      <section className="p-5 pb-10 md:px-10 lg:px-30 xl:px-40">
        <FilterJobs
          filterValues={filterValues}
          setFilterValues={setFilterValues}
          initFilterValues={initFilterValues}
        />
        <CardsJobs data={data} error={error} isLoading={isLoading} />
        <TablePagination
          page={page}
          limit={limit}
          total={data?.total || 0}
          onPageChange={onPageChange}
        />
      </section>
    </main>
  );
}
