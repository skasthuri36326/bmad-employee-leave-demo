/** @jest-environment node */

import { NextRequest } from "next/server";
import { POST } from "../../../app/api/leave-requests/[requestId]/decision/route";

describe("Manager decision proxy", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("forwards the session cookie and CSRF token and preserves upstream status, body, and cookies", async () => {
    const body = JSON.stringify({ decision: "REJECTED" });
    const upstreamBody = JSON.stringify({ type: "about:blank", title: "Conflict", status: 409, detail: "Already decided" });
    const fetchMock = jest.fn().mockResolvedValue(new Response(upstreamBody, {
      status: 409,
      headers: {
        "content-type": "application/problem+json",
        "set-cookie": "LEAVESESSION=refreshed; Path=/; HttpOnly; SameSite=Lax",
      },
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const request = new NextRequest("http://localhost/api/leave-requests/9f920000-0000-4000-8000-000000000001/decision", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "LEAVESESSION=session-value",
        "x-csrf-token": "csrf-value",
      },
      body,
    });

    const response = await POST(request);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe("http://backend:8080/api/leave-requests/9f920000-0000-4000-8000-000000000001/decision");
    expect(headers.get("cookie")).toBe("LEAVESESSION=session-value");
    expect(headers.get("x-csrf-token")).toBe("csrf-value");
    expect(init.method).toBe("POST");
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe(body);
    expect(response.status).toBe(409);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(response.headers.get("set-cookie")).toContain("LEAVESESSION=refreshed");
    expect(await response.json()).toEqual(JSON.parse(upstreamBody));
  });

  it("returns a generic Problem Details 503 when the backend is unreachable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("internal backend address")) as unknown as typeof fetch;
    const request = new NextRequest("http://localhost/api/leave-requests/9f920000-0000-4000-8000-000000000001/decision", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "APPROVED" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(await response.json()).toEqual({ type: "about:blank", title: "Service Unavailable", status: 503 });
  });

  it("preserves the status, content type, and body of a malformed upstream response", async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response("not-json upstream payload", {
      status: 502, headers: { "content-type": "text/plain" },
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const request = new NextRequest("http://localhost/api/leave-requests/9f920000-0000-4000-8000-000000000001/decision", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "APPROVED" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(await response.text()).toBe("not-json upstream payload");
  });
});
