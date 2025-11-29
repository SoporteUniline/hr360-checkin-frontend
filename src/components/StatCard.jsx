"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const StatCard = ({ title, value, borderColor }) => {
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardHeader>
        <CardTitle className="text-gray-500 text-xs">{title}</CardTitle>
        <div className="text-2xl font-bold">{value}</div>
      </CardHeader>
    </Card>
  );
};

export default StatCard;
