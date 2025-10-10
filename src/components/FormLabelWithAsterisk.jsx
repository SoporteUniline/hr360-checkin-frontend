import { FormLabel } from "./ui/form";

export function FormLabelWithAsterisk({ children, required = false }) {
  return (
    <FormLabel className="flex items-center gap-1">
      {children}
      {required && <span className="text-red-500">*</span>}
    </FormLabel>
  );
}
