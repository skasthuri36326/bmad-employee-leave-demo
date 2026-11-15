import { proxyApi } from "@/lib/api-proxy";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = (request: NextRequest) => proxyApi(request);
export const POST = (request: NextRequest) => proxyApi(request);
