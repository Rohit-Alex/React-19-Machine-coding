/*
 * Fake booking server. The rules that matter live here, not in the UI:
 * a seat can be held by one person at a time, holds expire, and booking
 * only succeeds for seats you still hold.
 */
export type SeatStatus = "available" | "held" | "booked";

export interface Seat {
  id: string; // "C7"
  row: string;
  number: number;
  tier: "premium" | "standard";
  price: number;
}

interface SeatRecord {
  status: SeatStatus;
  holdId?: string;
  holdExpiresAt?: number;
}

export const HOLD_MS = 2 * 60 * 1000;
const ROWS = "ABCDEFGH".split("");
const PER_ROW = 12;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const SEATS: Seat[] = ROWS.flatMap((row, r) =>
  Array.from({ length: PER_ROW }, (_, i) => ({
    id: `${row}${i + 1}`,
    row,
    number: i + 1,
    tier: r >= 6 ? ("premium" as const) : ("standard" as const),
    price: r >= 6 ? 450 : 250,
  })),
);

const records = new Map<string, SeatRecord>(SEATS.map((s) => [s.id, { status: "available" }]));
// Some seats already sold, so the map isn't empty.
["D5", "D6", "D7", "E6", "G3", "G4", "H10"].forEach((id) => records.set(id, { status: "booked" }));

function statusOf(id: string, now = Date.now()): SeatStatus {
  const record = records.get(id)!;
  // Expired holds are treated as free whenever they're read — no cleanup job needed.
  if (record.status === "held" && record.holdExpiresAt! <= now) {
    records.set(id, { status: "available" });
    return "available";
  }
  return record.status;
}

export async function fetchSeatMap(): Promise<Record<string, SeatStatus>> {
  await wait(200);
  return Object.fromEntries(SEATS.map((s) => [s.id, statusOf(s.id)]));
}

export type HoldResult =
  | { ok: true; holdId: string; expiresAt: number }
  | { ok: false; unavailable: string[] };

/**
 * All or nothing: hold every seat, or none. Holding 3 of 4 seats for a
 * family is useless — they want to sit together.
 */
export async function holdSeats(ids: string[], previousHoldId?: string): Promise<HoldResult> {
  await wait(400);
  if (previousHoldId) releaseHold(previousHoldId);
  const unavailable = ids.filter((id) => statusOf(id) !== "available");
  if (unavailable.length) return { ok: false, unavailable };
  const holdId = crypto.randomUUID();
  const expiresAt = Date.now() + HOLD_MS;
  ids.forEach((id) => records.set(id, { status: "held", holdId, holdExpiresAt: expiresAt }));
  return { ok: true, holdId, expiresAt };
}

export function releaseHold(holdId: string) {
  records.forEach((record, id) => {
    if (record.holdId === holdId) records.set(id, { status: "available" });
  });
}

export type BookResult = { ok: true; bookingId: string } | { ok: false; reason: "HOLD_EXPIRED" | "PAYMENT_FAILED" };

/**
 * Idempotent by holdId: if the response is lost and the client retries, the
 * second call returns the same booking instead of charging twice.
 */
const bookings = new Map<string, string>();
export async function confirmBooking(holdId: string, failPayment = false): Promise<BookResult> {
  await wait(900);
  const existing = bookings.get(holdId);
  if (existing) return { ok: true, bookingId: existing };
  const held = [...records].filter(([id, r]) => r.holdId === holdId && statusOf(id) === "held");
  if (held.length === 0) return { ok: false, reason: "HOLD_EXPIRED" };
  if (failPayment) return { ok: false, reason: "PAYMENT_FAILED" }; // Hold kept: they can retry.
  held.forEach(([id]) => records.set(id, { status: "booked" }));
  const bookingId = `BK-${Math.floor(Math.random() * 1e6)}`;
  bookings.set(holdId, bookingId);
  return { ok: true, bookingId };
}

/** Demo control: someone else grabs a seat. */
export function simulateOtherBuyer(id: string) {
  if (statusOf(id) === "available") records.set(id, { status: "booked" });
}
