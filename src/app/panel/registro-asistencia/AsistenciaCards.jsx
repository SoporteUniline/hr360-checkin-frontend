import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UsersRound, UserCheck, UserX, AlarmClock, Clock } from "lucide-react";

const AsistenciaCards = ({ totals }) => {
  const {
    total_empleados = 0,
    total_presentes = 0,
    total_tardanzas = 0,
    total_ausencias = 0,
    total_con_horas_extra = 0,
  } = totals || {};

  const cards = [
    {
      title: "Total empleados",
      count: total_empleados,
      icon: UsersRound,
      iconBgClass: "bg-blue-50",
      iconColorClass: "text-[#2563EB]",
    },
    {
      title: "Presentes",
      count: total_presentes,
      icon: UserCheck,
      iconBgClass: "bg-green-50",
      iconColorClass: "text-green-600",
    },
    {
      title: "Tardanzas",
      count: total_tardanzas,
      icon: AlarmClock,
      iconBgClass: "bg-yellow-50",
      iconColorClass: "text-yellow-600",
    },
    {
      title: "Ausencias",
      count: total_ausencias,
      icon: UserX,
      iconBgClass: "bg-red-50",
      iconColorClass: "text-red-600",
    },
    {
      title: "Horas extra",
      count: total_con_horas_extra,
      icon: Clock,
      iconBgClass: "bg-purple-50",
      iconColorClass: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={`asis-card-${index}`}
            className={`bg-white rounded-xl shadow-sm border border-gray-100 ${index === 4 ? "sm:col-span-2 lg:col-span-1" : ""}`}
          >
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase text-gray-500">
                  {card.title}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {card.count || 0}
                </div>
              </div>
              {Icon ? (
                <div className={`p-2.5 rounded-lg ${card.iconBgClass}`}>
                  <Icon className={`w-5 h-5 ${card.iconColorClass}`} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AsistenciaCards;
