"use client";

import React from "react";
import { Skeleton } from "./ui/skeleton";

export default function LoadingCards({ cols = 4, cards = 4 }) {
  const arrCards = Array.from({ length: cards }, (_, i) => i);

  return (
    <section className={`grid grid-cols-1 md:grid-cols-${cols} gap-3`}>
      {arrCards.map((row) => (
        <div key={row}>
          <div key={row} className="flex flex-col gap-2">
            <Skeleton className="w-full h-[100px] rounded-md" />
            <Skeleton className="w-full h-[30px] rounded-md" />
          </div>
        </div>
      ))}
    </section>
  );
}
