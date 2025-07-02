"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "./ui/skeleton";

export default function LoadingTable({ cols = 4, rows = 4 }) {
  const arrCols = Array.from({ length: cols }, (_, i) => i);
  const arrRows = Array.from({ length: rows }, (_, i) => i);

  return (
    <div>
      <Table>
        <TableCaption>Cargando reultados</TableCaption>
        <TableHeader>
          <TableRow>
            {arrCols.map((item) => (
              <TableHead key={item}>
                <Skeleton className="w-[100px] h-[30px] rounded-full" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {arrRows.map((row) => (
            <TableRow key={row}>
              {arrCols.map((col) => (
                <TableCell key={col}>
                  <Skeleton className="w-[100px] h-[20px] rounded-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
