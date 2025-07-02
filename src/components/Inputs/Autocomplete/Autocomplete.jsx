"use client";
import React from "react";
import AsyncSelect from "react-select/async";

export default function AutocompleteInput({
  id = "automplete_id",
  handleChange,
  loadOptions = [],
  placeholder = "Buscar ...",
  disabled = false,
}) {
  return (
    <div className="w-100">
      <AsyncSelect
        id={id}
        instanceId={id}
        loadOptions={loadOptions}
        onChange={handleChange}
        placeholder={placeholder}
        noOptionsMessage={() => "No hay resultados"}
        isDisabled={disabled}
      />
    </div>
  );
}
