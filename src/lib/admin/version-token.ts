import "server-only";

import { getPrisma } from "@/lib/prisma/db";

export { isVersionToken } from "@/lib/admin/version-token-shape";

/**
 * The optimistic-concurrency token for a catalogue row.
 *
 * ## Why this is raw SQL and not a Prisma `Date`
 *
 * `updated_at` is `timestamptz`, so Postgres stores it with microsecond
 * precision, and `set_updated_at()` writes `now()`. Prisma maps the column to a
 * JavaScript `Date`, which only holds **milliseconds**: the microseconds are
 * truncated on the way in, and a predicate like `where: { updated_at: date }`
 * can therefore never match the stored value.
 *
 * That failure is silent and total — every save looks like "somebody else
 * changed this" — so the version is read as text, at full precision, and handed
 * to the client as an opaque string. The client never parses it; it echoes it
 * back and the database compares it. `to_char` is emitted in UTC (`Z`) to match
 * how the same instant is serialised everywhere else.
 *
 * (`(updated_at AT TIME ZONE 'UTC')` rather than `updated_at` keeps the output
 * independent of the session TimeZone, which the pooler may set per connection.)
 */
export function versionTokenExpression(column = "updated_at"): string {
  return `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
}

/** Reads the current version token for one product, or null when it is gone. */
export async function readProductVersion(productId: string): Promise<string | null> {
  const rows = await getPrisma().$queryRawUnsafe<{ version: string }[]>(
    `select ${versionTokenExpression()} as version from products where id = $1::uuid`,
    productId,
  );
  return rows[0]?.version ?? null;
}

/** Reads the current version token for one collection, or null when it is gone. */
export async function readCollectionVersion(collectionId: string): Promise<string | null> {
  const rows = await getPrisma().$queryRawUnsafe<{ version: string }[]>(
    `select ${versionTokenExpression()} as version from collections where id = $1::uuid`,
    collectionId,
  );
  return rows[0]?.version ?? null;
}


/* -------------------------------------------------------------------------- */
/* Guarded updates                                                             */
/* -------------------------------------------------------------------------- */

/** Columns a guarded update may write. Values are always bound parameters. */
export type GuardedValue = string | number | boolean | string[] | null;

export class VersionMismatchError extends Error {
  constructor() {
    super("version-mismatch");
    this.name = "VersionMismatchError";
  }
}

/**
 * Applies an UPDATE that only lands when the row still carries `expectedVersion`.
 *
 * Written as parameterised raw SQL because the version has to be compared as
 * text at full precision (see the note at the top of this module). Every value is
 * passed as a bound parameter; only the table and column *names* are interpolated,
 * and those come from the callers below rather than from any request.
 *
 * Throws {@link VersionMismatchError} when zero rows matched, which the caller
 * reports as a conflict.
 */
async function guardedUpdate(
  table: "products" | "collections",
  id: string,
  expectedVersion: string,
  values: Record<string, GuardedValue>,
): Promise<void> {
  const columns = Object.keys(values);
  if (columns.length === 0) throw new Error("guardedUpdate needs at least one column");

  const assignments = columns.map((column, index) => `${column} = $${index + 2}`).join(", ");
  const parameters = columns.map((column) => values[column]);

  const affected = await getPrisma().$executeRawUnsafe(
    `update ${table}
        set ${assignments}
      where id = $1::uuid
        and updated_at = $${columns.length + 2}::timestamptz`,
    id,
    ...parameters,
    expectedVersion,
  );

  if (affected === 0) throw new VersionMismatchError();
}

export async function guardedUpdateProduct(
  id: string,
  expectedVersion: string,
  values: Record<string, GuardedValue>,
): Promise<void> {
  return guardedUpdate("products", id, expectedVersion, values);
}

export async function guardedUpdateCollection(
  id: string,
  expectedVersion: string,
  values: Record<string, GuardedValue>,
): Promise<void> {
  return guardedUpdate("collections", id, expectedVersion, values);
}
