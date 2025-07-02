import dynamic from "next/dynamic";

const AutocompleteInput = dynamic(() => import("./Autocomplete"), {
  ssr: false,
});

export default AutocompleteInput;
