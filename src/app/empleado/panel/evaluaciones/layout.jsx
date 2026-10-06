import { EvaluationProvider } from "@/components/evaluaciones/EvaluationContext";
import { EvaluationShell } from "@/components/evaluaciones/EvaluationModule";
export const metadata = { title: "Mis evaluaciones | ADAMIA" };
export default function Layout({ children }) {
  return (
    <EvaluationProvider employee>
      <EvaluationShell>{children}</EvaluationShell>
    </EvaluationProvider>
  );
}
