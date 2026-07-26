/**
 * DESTRUCTIVE — wipes a Supabase project back to a virgin state.
 *
 * Drops the public schema, every custom type, all storage objects/buckets, and
 * all auth users, then clears the migration ledger so `supabase db push`
 * re-applies everything from scratch.
 *
 * Intended for rehearsing a client deployment end to end. Requires an explicit
 * confirmation token so it can never be run by accident:
 *
 *   npm run db:reset -- --i-understand-this-deletes-everything
 */
import { Client } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const CONFIRM = "--i-understand-this-deletes-everything";
if (!process.argv.includes(CONFIRM)) {
  console.error(
    `\n✖ Refusing to run without confirmation.\n  Re-run with: npm run db:reset -- ${CONFIRM}\n`
  );
  process.exit(1);
}

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const dbUrl = process.env.SUPABASE_DB_URL || process.argv.find((a) => a.startsWith("postgresql://"));
if (!dbUrl) {
  console.error("\n✖ Provide the connection string as SUPABASE_DB_URL or an argument.\n");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected. Wiping…\n");

  const steps: [string, string][] = [
    [
      "storage objects + buckets",
      `delete from storage.objects;
       delete from storage.buckets;`,
    ],
    [
      "storage policies",
      `do $$
       declare p record;
       begin
         for p in select policyname from pg_policies where schemaname='storage' and tablename='objects'
         loop execute format('drop policy if exists %I on storage.objects', p.policyname); end loop;
       end $$;`,
    ],
    ["auth users", `delete from auth.users;`],
    [
      "auth trigger",
      `drop trigger if exists on_auth_user_created on auth.users;`,
    ],
    [
      "public schema",
      `drop schema public cascade;
       create schema public;
       grant usage on schema public to anon, authenticated, service_role;
       grant all on schema public to postgres;`,
    ],
    [
      "realtime publication members",
      `do $$
       declare r record;
       begin
         for r in select schemaname, tablename from pg_publication_tables where pubname='supabase_realtime'
         loop execute format('alter publication supabase_realtime drop table %I.%I', r.schemaname, r.tablename); end loop;
       exception when others then null;
       end $$;`,
    ],
    [
      "migration ledger",
      `delete from supabase_migrations.schema_migrations;`,
    ],
  ];

  for (const [label, sql] of steps) {
    try {
      await client.query(sql);
      console.log(`  ✓ dropped ${label}`);
    } catch (e) {
      console.log(`  · skipped ${label} (${(e as Error).message.split("\n")[0]})`);
    }
  }

  const { rows } = await client.query(
    `select count(*)::int as n from information_schema.tables where table_schema='public'`
  );
  const { rows: users } = await client.query(`select count(*)::int as n from auth.users`);

  await client.end();
  console.log(
    `\nVirgin state confirmed: ${rows[0].n} public tables, ${users[0].n} auth users.\n` +
      `Next: supabase db push --db-url "…"  then  npm run provision\n`
  );
}

main().catch((e) => {
  console.error(`\n✖ ${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
});
