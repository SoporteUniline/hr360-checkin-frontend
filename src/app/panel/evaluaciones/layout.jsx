import { EvaluationProvider } from "@/components/evaluaciones/EvaluationContext";
import { EvaluationShell } from "@/components/evaluaciones/EvaluationModule";
export const metadata = { title: "Evaluación de desempeño | ADAMIA" };
export default function Layout({ children }) {
  return (
    <EvaluationProvider>
      <EvaluationShell>{children}</EvaluationShell>
    </EvaluationProvider>
  );
}
