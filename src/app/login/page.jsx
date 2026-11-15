import LoginClient from "./LoginClient";
import { getInitialIsNative } from "@/lib/native-app-server";

export default async function LoginPage({ searchParams }) {
  const initialIsNative = await getInitialIsNative(searchParams);

  return <LoginClient initialIsNative={initialIsNative} />;
}
