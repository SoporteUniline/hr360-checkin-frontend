import RecuperacionClient from "./RecuperacionClient";
import { getInitialIsNative } from "@/lib/native-app-server";

export default async function RecuperacionPage({ searchParams }) {
  const initialIsNative = await getInitialIsNative(searchParams);

  return <RecuperacionClient initialIsNative={initialIsNative} />;
}
