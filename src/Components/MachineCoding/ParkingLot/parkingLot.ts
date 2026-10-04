export type VehicleType = "motorcycle" | "car" | "truck";
export type SpotSize = "small" | "medium" | "large";

/** Which spot sizes each vehicle fits, smallest first (best fit). */
const FITS: Record<VehicleType, SpotSize[]> = {
  motorcycle: ["small", "medium", "large"],
  car: ["medium", "large"],
  truck: ["large"],
};

/** ₹ per started hour. */
export const HOURLY_RATE: Record<VehicleType, number> = { motorcycle: 20, car: 50, truck: 100 };
const HOUR = 60 * 60 * 1000;

export interface Spot {
  id: string; // "F1-M03"
  floor: number;
  size: SpotSize;
  ticketId: string | null;
}

export interface Ticket {
  id: string;
  plate: string;
  vehicleType: VehicleType;
  spotId: string;
  entryAt: number;
}

export interface Receipt {
  ticket: Ticket;
  exitAt: number;
  hours: number;
  amount: number;
}

export type ParkResult = { ok: true; ticket: Ticket } | { ok: false; reason: "LOT_FULL" | "ALREADY_PARKED" };

export interface FloorLayout {
  small: number;
  medium: number;
  large: number;
}

/** Price rule on its own, so it can change (weekend rates, first hour free) without touching the lot. */
export function priceFor(ticket: Ticket, exitAt: number) {
  // Every started hour is charged, with at least one hour.
  const hours = Math.max(1, Math.ceil((exitAt - ticket.entryAt) / HOUR));
  return { hours, amount: hours * HOURLY_RATE[ticket.vehicleType] };
}

/*
 * The domain model: no React, no DOM. The UI subscribes to it the same way
 * it would subscribe to any external store (useSyncExternalStore).
 */
export class ParkingLot {
  private readonly spots: Spot[];
  private readonly tickets = new Map<string, Ticket>();
  private readonly plateToTicket = new Map<string, string>();
  private readonly listeners = new Set<() => void>();
  private nextTicket = 1;
  private version = 0;

  constructor(floors: FloorLayout[]) {
    const letter: Record<SpotSize, string> = { small: "S", medium: "M", large: "L" };
    this.spots = floors.flatMap((layout, i) =>
      (["small", "medium", "large"] as const).flatMap((size) =>
        Array.from({ length: layout[size] }, (_, n) => ({
          id: `F${i + 1}-${letter[size]}${String(n + 1).padStart(2, "0")}`,
          floor: i + 1,
          size,
          ticketId: null,
        })),
      ),
    );
  }

  /**
   * Best fit, then nearest floor: a motorcycle takes a small spot on any
   * floor before a large one on floor 1, so large spots stay free for trucks.
   */
  private findSpot(type: VehicleType): Spot | undefined {
    // ponytail: linear scan, fine for hundreds of spots. For thousands, keep a
    // min-heap of free spots per size, ordered by floor.
    for (const size of FITS[type]) {
      const spot = this.spots.find((s) => s.size === size && s.ticketId === null);
      if (spot) return spot;
    }
    return undefined;
  }

  park(plate: string, vehicleType: VehicleType, now = Date.now()): ParkResult {
    const key = plate.trim().toUpperCase(); // "ka01 ab 1234" and "KA01 AB 1234" are the same car.
    if (this.plateToTicket.has(key)) return { ok: false, reason: "ALREADY_PARKED" };
    const spot = this.findSpot(vehicleType);
    if (!spot) return { ok: false, reason: "LOT_FULL" };

    const ticket: Ticket = { id: `T${this.nextTicket++}`, plate: key, vehicleType, spotId: spot.id, entryAt: now };
    spot.ticketId = ticket.id;
    this.tickets.set(ticket.id, ticket);
    this.plateToTicket.set(key, ticket.id);
    this.emit();
    return { ok: true, ticket };
  }

  unpark(ticketId: string, now = Date.now()): Receipt | null {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return null; // Unknown or already used: a ticket can't be paid twice.
    this.spots.find((s) => s.id === ticket.spotId)!.ticketId = null;
    this.tickets.delete(ticketId);
    this.plateToTicket.delete(ticket.plate);
    this.emit();
    return { ticket, exitAt: now, ...priceFor(ticket, now) };
  }

  /** Free spots per floor and size — what the entrance display board shows. */
  availability() {
    const floors = new Map<number, Record<SpotSize, number>>();
    for (const spot of this.spots) {
      const counts = floors.get(spot.floor) ?? { small: 0, medium: 0, large: 0 };
      if (spot.ticketId === null) counts[spot.size]++;
      floors.set(spot.floor, counts);
    }
    return floors;
  }

  /** How many more of this vehicle type can park right now. */
  freeFor(type: VehicleType) {
    return this.spots.filter((s) => s.ticketId === null && FITS[type].includes(s.size)).length;
  }

  getSpots(): readonly Spot[] {
    return this.spots;
  }

  getTickets(): Ticket[] {
    return [...this.tickets.values()];
  }

  // --- external-store plumbing for React ---
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = () => this.version;

  private emit() {
    this.version++;
    this.listeners.forEach((listener) => listener());
  }
}
