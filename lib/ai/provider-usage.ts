import { getDb } from "@/lib/db";

export const FREE_TEXT_PROVIDER_DAILY_LIMIT = 40;

export async function reserveTextProviderRequest(provider: string): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO ai_provider_daily_usage (usage_date, provider, request_count)
    VALUES (CURRENT_DATE, ${provider}, 1)
    ON CONFLICT (usage_date, provider)
    DO UPDATE
      SET request_count = ai_provider_daily_usage.request_count + 1,
          updated_at = now()
      WHERE ai_provider_daily_usage.request_count < ${FREE_TEXT_PROVIDER_DAILY_LIMIT}
    RETURNING request_count
  `;
  return rows.length > 0;
}

export async function getTextProviderUsage(provider: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT request_count AS "requestCount"
    FROM ai_provider_daily_usage
    WHERE usage_date = CURRENT_DATE AND provider = ${provider}
    LIMIT 1
  `;
  const used = Number(rows[0]?.requestCount ?? 0);
  return { used, limit: FREE_TEXT_PROVIDER_DAILY_LIMIT, remaining: Math.max(0, FREE_TEXT_PROVIDER_DAILY_LIMIT - used) };
}
