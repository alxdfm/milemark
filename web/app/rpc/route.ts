const UPSTREAM =
  process.env.NEXT_PUBLIC_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";

/** Same-origin JSON-RPC proxy. Browser egress to public RPCs is unreliable here. */
export async function POST(request: Request) {
  const body = await request.text();
  if (!body) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32600, message: "Empty RPC body" } },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "RPC proxy failed";
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32000, message } },
      { status: 502 },
    );
  }
}
