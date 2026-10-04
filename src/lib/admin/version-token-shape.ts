/**
 * The shape of a concurrency token, kept free of `server-only` so it can be
 * unit-tested and reused by callers on either side of the boundary.
 *
 * A token is the row's `updated_at` rendered by `to_char` at microsecond
 * precision (see `version-token.ts`). Anything that is not one is rejected
 * before a query runs, so malformed input never reaches the database as a
 * timestamp cast that would fail with a database error instead of a clean
 * "reload and try again".
 */
const TOKEN_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{1,6})Z$/;

export function isVersionToken(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const match = TOKEN_PATTERN.exec(value);
  if (!match) return false;

  const [, year, month, day, hour, minute, second] = match;
  // Shape alone is not enough: "2026-13-04T…" would be a runtime cast failure.
  const asDate = new Date(value);
  return (
    !Number.isNaN(asDate.getTime()) &&
    asDate.getUTCFullYear() === Number(year) &&
    asDate.getUTCMonth() + 1 === Number(month) &&
    asDate.getUTCDate() === Number(day) &&
    asDate.getUTCHours() === Number(hour) &&
    asDate.getUTCMinutes() === Number(minute) &&
    asDate.getUTCSeconds() === Number(second)
  );
}
