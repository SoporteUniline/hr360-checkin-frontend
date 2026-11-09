"use client";
import { Table, TableBody } from '@/components/ui/table';
import LocalClockRows from './LocalClockRows';

export default function LocalClockCaptures({ events = [], timezone }) {
  if (!events.length) return null;
  return <div className="overflow-hidden rounded-xl border border-blue-100 bg-white"><Table><TableBody><LocalClockRows events={events} columns={1} timezone={timezone} /></TableBody></Table></div>;
}
