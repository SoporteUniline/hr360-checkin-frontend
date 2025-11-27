"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { twMerge } from "tailwind-merge";

export const CardCompact = ({
  title,
  children,
  className,
  headerClassName,
  contentClassName,
}) => {
  return (
    <Card
      className={twMerge(
        "border-r-0 border-t-0 border-b-0 border-l-4 border-l-gray-700 bg-gray-100 shadow-none",
        "py-1 gap-0",
        className
      )}
    >
      {title && (
        <CardHeader className={twMerge("px-6 pt-2 pb-1", headerClassName)}>
          <h2 className="font-semibold">{title}</h2>
        </CardHeader>
      )}

      <CardContent className={twMerge("px-6 pt-1 pb-1", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
};
