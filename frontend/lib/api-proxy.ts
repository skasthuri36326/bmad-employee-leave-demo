import { NextRequest } from "next/server";

const backendOrigin = process.env.API_BASE_URL ?? "http://backend:8080";
export async function proxyApi(request: NextRequest, path = request.nextUrl.pathname): Promise<Response> {
  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "x-csrf-token"]) {
    const value = request.headers.get(name); if (value) headers.set(name, value);
  }
  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  let upstream: Response;
  try {
    upstream = await fetch(`${backendOrigin}${path}${request.nextUrl.search}`, { method, headers, body, cache: "no-store", redirect: "manual" });
  } catch {
    return Response.json({ type: "about:blank", title: "Service Unavailable", status: 503 }, { status: 503, headers: { "content-type": "application/problem+json", "cache-control": "no-store" } });
  }
  const responseHeaders = new Headers();
  for (const name of ["content-type", "cache-control", "location"]) { const value = upstream.headers.get(name); if (value) responseHeaders.set(name, value); }
  const cookies = upstream.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = cookies.getSetCookie?.() ?? (upstream.headers.get("set-cookie") ? [upstream.headers.get("set-cookie")!] : []);
  for (const cookie of setCookies) responseHeaders.append("set-cookie", cookie);
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
