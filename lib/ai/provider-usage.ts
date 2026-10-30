import { getDb } from "@/lib/db";

export const FREE_TEXT_PROVIDER_DAILY_LIMIT = 40;
export const FREE_TEXT_PROVIDER_MINUTE_LIMIT = 15;

export type ProviderReservation =
  | { ok: true }
  | { ok: false; reason: "minute_limit" | "daily_limit" };

export async function reserveTextProviderRequest(provider: string): Promise<ProviderReservation> {
  const sql = getDb();
  // Reserve the minute bucket first to keep below OpenRouter's 20 RPM cap.
  // If the daily reservation then fails, the minute slot is intentionally
  // consumed: conservative accounting is safer than overspending.
  const minuteRows = await sql`
    INSERT INTO ai_provider_minute_usage (window_start, provider, request_count)
    VALUES (date_trunc('minute', now()), ${provider}, 1)
    ON CONFLICT (window_start, provider)
    DO UPDATE
      SET request_count = ai_provider_minute_usage.request_count + 1,
          updated_at = now()
      WHERE ai_provider_minute_usage.request_count < ${FREE_TEXT_PROVIDER_MINUTE_LIMIT}
    RETURNING request_count
  `;
  if (!minuteRows.length) return { ok: false, reason: "minute_limit" };

  const dailyRows = await sql`
    INSERT INTO ai_provider_daily_usage (usage_date, provider, request_count)
    VALUES (CURRENT_DATE, ${provider}, 1)
    ON CONFLICT (usage_date, provider)
    DO UPDATE
      SET request_count = ai_provider_daily_usage.request_count + 1,
          updated_at = now()
      WHERE ai_provider_daily_usage.request_count < ${FREE_TEXT_PROVIDER_DAILY_LIMIT}
    RETURNING request_count
  `;
  if (!dailyRows.length) return { ok: false, reason: "daily_limit" };
  return { ok: true };
}

export async function getTextProviderUsage(provider: string) {
  const sql = getDb();
  const [dailyRows, minuteRows] = await Promise.all([
    sql`SELECT request_count AS "requestCount" FROM ai_provider_daily_usage WHERE usage_date = CURRENT_DATE AND provider = ${provider} LIMIT 1`,
    sql`SELECT request_count AS "requestCount" FROM ai_provider_minute_usage WHERE window_start = date_trunc('minute', now()) AND provider = ${provider} LIMIT 1`,
  ]);
  const used = Number(dailyRows[0]?.requestCount ?? 0);
  const minuteUsed = Number(minuteRows[0]?.requestCount ?? 0);
  return {
    used,
    limit: FREE_TEXT_PROVIDER_DAILY_LIMIT,
    remaining: Math.max(0, FREE_TEXT_PROVIDER_DAILY_LIMIT - used),
    minuteUsed,
    minuteLimit: FREE_TEXT_PROVIDER_MINUTE_LIMIT,
    minuteRemaining: Math.max(0, FREE_TEXT_PROVIDER_MINUTE_LIMIT - minuteUsed),
  };
}
