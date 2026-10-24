"use client";
import useSWR from 'swr';
import useEmpleadoSesion from './useEmpleadoSesion';
import { fetcherWithToken } from '@/lib/fetcher';
import { fetchAllRequests } from '@/lib/empleado/presentation.mjs';

export default function useEmployeeRequests() {
  const session = useEmpleadoSesion();
  const query = useSWR(session.id ? ['employee-requests-all', session.id, session.empresa] : null,
    ([, id]) => fetchAllRequests(fetcherWithToken, id), { shouldRetryOnError: false, revalidateOnFocus: true, dedupingInterval: 30000 });
  return { ...query, data: query.data || [], error: session.error || query.error, isLoading: session.isLoading || query.isLoading };
}
