export async function POST() {
  return Response.json(
    { ok: false, error: "endpoint_retired_use_authenticated_calculator" },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
