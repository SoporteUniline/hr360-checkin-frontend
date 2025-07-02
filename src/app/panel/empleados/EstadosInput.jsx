"use client";

import ControlledAutocomplete from "@/components/Inputs/FormAutocomplete/ControlledAutocomplete";
import { FormLabel } from "@/components/ui/form";
import { loadOptionsEntities } from "@/lib/utils";

export default function EstadosInput({ form, label, name, onChange, pais }) {
  const load = async (inputValue) => {
    if (!pais?.value) return [];
    return await loadOptionsEntities(inputValue, pais?.value);
  };

  return (
    <>
      <FormLabel>{label}:</FormLabel>
      <ControlledAutocomplete
        name={name}
        form={form}
        loadOptions={load}
        onChange={onChange}
        id="estado_autocomplete"
      />
    </>
  );
}
