export const UUIDS = {
  // Use UUIDs that match zod's uuid validator (version 1-8 + correct variant).
  tripA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  tripB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  dayA0: "11111111-1111-4111-8111-111111111111",
  dayA1: "22222222-2222-4222-8222-222222222222",
  itemA: "33333333-3333-4333-8333-333333333333",
  itemB: "44444444-4444-4444-8444-444444444444",
  snapA1: "55555555-5555-4555-8555-555555555555",
  jarA: "66666666-6666-4666-8666-666666666666",
  jarTripA: "77777777-7777-4777-8777-777777777777",
} as const;

function safeEmailFromUserId(userId: string) {
  const local = userId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40) || "user";
  return `${local}@test.local`;
}

export async function seedUser(args: {
  client: { exec: (sql: string) => Promise<unknown> };
  id: string;
  name?: string;
  email?: string;
}) {
  const name = args.name ?? `User ${args.id}`;
  const email = args.email ?? safeEmailFromUserId(args.id);
  await args.client.exec(`
    INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at)
    VALUES (
      '${args.id.replaceAll("'", "''")}',
      '${name.replaceAll("'", "''")}',
      '${email.replaceAll("'", "''")}',
      true,
      NULL,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  `);
}

export async function seedTrip(args: {
  client: { exec: (sql: string) => Promise<unknown> };
  id: string;
  userId: string;
  title?: string;
  status?: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  version?: number;
  deletedAt?: string | null;
}) {
  await seedUser({ client: args.client, id: args.userId });

  const title = args.title ?? `Trip ${args.id.slice(0, 4)}`;
  const status = args.status ?? "planning";
  const destination = args.destination ?? null;
  const startDate = args.startDate ?? null;
  const endDate = args.endDate ?? null;
  const version = args.version ?? 1;
  const deletedAt = args.deletedAt ?? null;

  await args.client.exec(`
    INSERT INTO trip (id, user_id, title, destination, status, start_date, end_date, version, deleted_at, created_at, updated_at)
    VALUES (
      '${args.id}',
      '${args.userId}',
      '${title.replaceAll("'", "''")}',
      ${destination === null ? "NULL" : `'${destination.replaceAll("'", "''")}'`},
      '${status}',
      ${startDate === null ? "NULL" : `'${startDate}'`},
      ${endDate === null ? "NULL" : `'${endDate}'`},
      ${version},
      ${deletedAt === null ? "NULL" : `'${deletedAt}'`},
      now(),
      now()
    );
  `);
}

export async function seedTripCollaborator(args: {
  client: { exec: (sql: string) => Promise<unknown> };
  tripId: string;
  userId: string;
  role?: "viewer" | "editor";
}) {
  await seedUser({ client: args.client, id: args.userId });
  const role = args.role ?? "editor";
  await args.client.exec(`
    INSERT INTO trip_collaborator (trip_id, user_id, role, created_at)
    VALUES ('${args.tripId}', '${args.userId}', '${role}', now());
  `);
}

export async function seedTripDay(args: {
  client: { exec: (sql: string) => Promise<unknown> };
  id: string;
  tripId: string;
  dayIndex: number;
  date?: string | null;
}) {
  const date = args.date ?? null;
  await args.client.exec(`
    INSERT INTO trip_day (id, trip_id, date, day_index, created_at, updated_at)
    VALUES (
      '${args.id}',
      '${args.tripId}',
      ${date === null ? "NULL" : `'${date}'`},
      ${args.dayIndex},
      now(),
      now()
    );
  `);
}

export async function seedTripItem(args: {
  client: { exec: (sql: string) => Promise<unknown> };
  id: string;
  tripId: string;
  dayId?: string | null;
  type: string;
  order: number;
  title?: string;
  startsMinute?: number | null;
  endsMinute?: number | null;
  lat?: number | null;
  lng?: number | null;
  jarId?: string | null;
}) {
  const title = args.title ?? `Item ${args.id.slice(0, 4)}`;
  const dayId = args.dayId ?? null;
  const s = args.startsMinute ?? null;
  const e = args.endsMinute ?? null;
  const lat = args.lat ?? null;
  const lng = args.lng ?? null;
  const jarId = args.jarId ?? null;

  await args.client.exec(`
    INSERT INTO trip_item (
      id, trip_id, day_id, type, "order", title, starts_minute, ends_minute, lat, lng, jar_id, created_at, updated_at
    ) VALUES (
      '${args.id}',
      '${args.tripId}',
      ${dayId === null ? "NULL" : `'${dayId}'`},
      '${args.type}',
      ${args.order},
      '${title.replaceAll("'", "''")}',
      ${s === null ? "NULL" : s},
      ${e === null ? "NULL" : e},
      ${lat === null ? "NULL" : lat},
      ${lng === null ? "NULL" : lng},
      ${jarId === null ? "NULL" : `'${jarId}'`},
      now(),
      now()
    );
  `);
}

export async function seedTripLock(args: {
  client: { exec: (sql: string) => Promise<unknown> };
  tripId: string;
  userId: string;
  expiresInSeconds?: number;
}) {
  await seedUser({ client: args.client, id: args.userId });
  const expiresInSeconds = args.expiresInSeconds ?? 60;
  await args.client.exec(`
    INSERT INTO trip_edit_lock (trip_id, user_id, locked_at, expires_at)
    VALUES ('${args.tripId}', '${args.userId}', now(), now() + INTERVAL '${expiresInSeconds} seconds')
    ON CONFLICT (trip_id) DO UPDATE
      SET user_id = EXCLUDED.user_id, locked_at = EXCLUDED.locked_at, expires_at = EXCLUDED.expires_at
    ;
  `);
}

export async function seedTripSnapshot(args: {
  client: { exec: (sql: string) => Promise<unknown> };
  id: string;
  tripId: string;
  version: number;
  createdBy?: string | null;
  dataJson: unknown;
  summary?: string | null;
}) {
  const createdBy = args.createdBy ?? null;
  const summary = args.summary ?? null;
  if (createdBy) await seedUser({ client: args.client, id: createdBy });
  await args.client.exec(`
    INSERT INTO trip_snapshot (id, trip_id, version, created_by, created_at, data, summary)
    VALUES (
      '${args.id}',
      '${args.tripId}',
      ${args.version},
      ${createdBy === null ? "NULL" : `'${createdBy}'`},
      now(),
      '${JSON.stringify(args.dataJson).replaceAll("'", "''")}'::jsonb,
      ${summary === null ? "NULL" : `'${summary.replaceAll("'", "''")}'`}
    );
  `);
}

export async function seedWishlistJar(args: {
  client: { exec: (sql: string) => Promise<unknown> };
  id: string;
  userId: string;
  status?: "inactive" | "in_trip" | "archived";
  name?: string;
  country?: string;
  province?: string;
  city?: string;
  lat?: number;
  lng?: number;
}) {
  await seedUser({ client: args.client, id: args.userId });
  const status = args.status ?? "inactive";
  const name = args.name ?? `Jar ${args.id.slice(0, 4)}`;
  const country = args.country ?? "CN";
  const province = args.province ?? "ZJ";
  const city = args.city ?? "Hangzhou";
  const lat = args.lat ?? 30.0;
  const lng = args.lng ?? 120.0;

  await args.client.exec(`
    INSERT INTO wishlist_jar (id, user_id, status, name, country, province, city, lat, lng, created_at, updated_at)
    VALUES (
      '${args.id}',
      '${args.userId}',
      '${status}',
      '${name.replaceAll("'", "''")}',
      '${country.replaceAll("'", "''")}',
      '${province.replaceAll("'", "''")}',
      '${city.replaceAll("'", "''")}',
      ${lat},
      ${lng},
      now(),
      now()
    );
  `);
}

export async function seedWishlistJarTrip(args: {
  client: { exec: (sql: string) => Promise<unknown> };
  id: string;
  jarId: string;
  tripId: string;
}) {
  await args.client.exec(`
    INSERT INTO wishlist_jar_trip (id, jar_id, trip_id, created_at)
    VALUES ('${args.id}', '${args.jarId}', '${args.tripId}', now());
  `);
}

