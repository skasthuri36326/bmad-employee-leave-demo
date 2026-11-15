import { proxyApi } from "@/lib/api-proxy";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const proxy = (request: NextRequest) => proxyApi(request);
export const GET = proxy;
export const POST = proxy;
