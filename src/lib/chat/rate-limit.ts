// /api/chat is limited per user by rpc_chat_check_rate_limit (default 20
// requests per 60s). The e2e suite runs serially as a handful of shared test
// users, so specs that each send a few requests starve one another; CI sets
// CHAT_RATE_LIMIT_PER_MINUTE to raise the ceiling for that job only. Unset (as
// on Vercel) the RPC's own default applies and nothing changes.
export const MAX_CONFIGURED_CHAT_RATE_LIMIT = 500;

export function chatRateLimitArgs(
  raw: string | undefined = process.env.CHAT_RATE_LIMIT_PER_MINUTE,
): { p_limit: number } | undefined {
  if (!raw) return undefined;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_CONFIGURED_CHAT_RATE_LIMIT) {
    return undefined;
  }
  return { p_limit: limit };
}
