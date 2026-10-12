// Заглушка приема заявок из калькулятора.
// Сейчас заявка только пишется в лог сервера. Позже сюда можно подключить
// Telegram-бота, email (Resend/SMTP) или CRM — формат данных уже готов.

export async function POST(request: Request) {
  const lead = await request.json().catch(() => null);
  if (!lead || typeof lead.phone !== "string" || lead.phone.trim().length < 6) {
    return Response.json({ ok: false, error: "phone_required" }, { status: 400 });
  }
  console.log("[lead]", JSON.stringify({ ...lead, receivedAt: new Date().toISOString() }));
  return Response.json({ ok: true });
}
