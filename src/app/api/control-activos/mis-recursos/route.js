import { handleRead, handleWrite } from "@/lib/activos/server/handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request) => handleRead(request, true);
export const POST = (request) => handleWrite(request, true);
