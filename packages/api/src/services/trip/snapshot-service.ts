import { TripSnapshot } from "@acme/db/schema";

export async function createTripSnapshot(args: {
  db: any;
  tripId: string;
  version: number;
  createdBy: string;
  data: unknown;
  summary?: string | null;
}) {
  const [created] = await args.db
    .insert(TripSnapshot)
    .values({
      tripId: args.tripId,
      version: args.version,
      createdBy: args.createdBy,
      data: args.data,
      summary: args.summary ?? null,
    })
    .returning();
  return created;
}

