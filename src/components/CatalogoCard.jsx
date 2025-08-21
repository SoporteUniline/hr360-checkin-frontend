import { Card } from "@/components/ui/card";

export default function CatalogoCard({ Icon, title }) {
  return (
    <Card className="flex flex-col justify-center items-center gap-3 bg-slate-700 text-white hover:cursor-pointer hover:bg-slate-600 p-6 rounded-2xl shadow-lg transition-all">
      <Icon className="h-16 w-16" />
      <h2 className="text-xl font-bold text-center">{title}</h2>
    </Card>
  );
}
