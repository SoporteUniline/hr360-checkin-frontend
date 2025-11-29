import { FormLabel } from "@/components/ui/form";

export function FormLabelWithAsterisk({
  children,
  required = false,
  className,
}) {
  return (
    <FormLabel className={`flex items-center gap-1 ${className}`}>
      {children}
      {required && <span className="text-red-500">*</span>}
    </FormLabel>
  );
}
