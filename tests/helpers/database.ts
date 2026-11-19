import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import postgres from "postgres";
import { readFile, readdir } from "node:fs/promises";

export interface DB {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export async function createDatabase(): Promise<DB> {
  let db: DB;
  const testUrl = process.env.DATABASE_TEST_URL;
  if (testUrl) {
    const url = new URL(testUrl);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !/^\/nexus_test[a-z0-9_]*$/.test(url.pathname) ||
      process.env.ALLOW_DATABASE_TEST_RESET !== "1"
    ) {
      throw new Error(
        "DATABASE_TEST_URL must target a disposable localhost nexus_test* database; explicitly set ALLOW_DATABASE_TEST_RESET=1.",
      );
    }
    const sql = postgres(testUrl, { max: 8 });
    const wrap = (connection: typeof sql): DB => ({
      query: async <T extends Record<string, unknown>>(
        s: string,
        params: unknown[] = [],
      ) => ({
        rows: Array.from(
          await connection.unsafe(s, params as never[]),
        ) as unknown as T[],
      }),
      exec: (s) => connection.unsafe(s),
      transaction: async (fn) =>
        sql.begin((transaction) =>
          fn(wrap(transaction as unknown as typeof sql)),
        ) as Promise<Awaited<ReturnType<typeof fn>>>,
      close: () => sql.end(),
    });
    db = wrap(sql);
    // Guarded above: never run this reset against a hosted or live database.
    await db.exec(
      "drop schema if exists app_private cascade; drop schema if exists public cascade; drop schema if exists auth cascade; drop schema if exists extensions cascade; create schema public;",
    );
  } else {
    const pg = new PGlite({ extensions: { btree_gist } });
    const wrap = (
      connection: Pick<PGlite, "query" | "exec" | "transaction">,
    ): DB => ({
      query: (s, params = []) => connection.query(s, params),
      exec: (s) => connection.exec(s),
      transaction: (fn) =>
        connection.transaction((transaction) =>
          fn(wrap(transaction as unknown as typeof connection)),
        ),
      close: () => pg.close(),
    });
    db = wrap(pg);
  }
  await db.exec(`
    do $$ begin create role anon; exception when duplicate_object then null; end $$;
    do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const migrationDirectory = new URL(
    "../../supabase/migrations/",
    import.meta.url,
  );
  const migrations = (await readdir(migrationDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    await db.exec(await readFile(new URL(file, migrationDirectory), "utf8"));
  }
  return db;
}

export const people = {
  mentor: "10000000-0000-4000-8000-000000000001",
  learner: "20000000-0000-4000-8000-000000000002",
  secondMentor: "30000000-0000-4000-8000-000000000003",
  outsider: "40000000-0000-4000-8000-000000000004",
};
export async function resetFixtures(db: DB) {
  await db.exec("truncate auth.users cascade;");
  for (const [name, id] of Object.entries(people)) {
    await db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3::jsonb)",
      [id, `${name}@nexus.test`, JSON.stringify({ full_name: name })],
    );
  }
  await db.query(
    "insert into public.mentor_profiles(user_id,headline) values ($1,'Backend mentor'),($2,'Career mentor')",
    [people.mentor, people.secondMentor],
  );
}

export function asUser<T>(
  db: DB,
  user: string | null,
  fn: (actor: DB) => Promise<T>,
  role = "authenticated",
) {
  if (!["authenticated", "anon"].includes(role))
    throw new Error("Invalid test role");
  return db.transaction(async (transaction) => {
    await transaction.exec(`set local role ${role}`);
    await transaction.query(
      "select set_config('request.jwt.claim.sub', $1, true)",
      [user || ""],
    );
    return fn(transaction);
  });
}

export async function makeSlot(
  db: DB,
  mentor = people.mentor,
  offsetMinutes = 0,
) {
  const result = await asUser(db, mentor, (actor) =>
    actor.query<{ id: string; starts_at: string; ends_at: string }>(
      "select * from public.create_availability(now() + interval '2 days' + $1 * interval '1 minute', now() + interval '2 days 30 minutes' + $1 * interval '1 minute')",
      [offsetMinutes],
    ),
  );
  return result.rows[0];
}
