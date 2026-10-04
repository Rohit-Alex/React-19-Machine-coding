# Multi-floor parking lot (LLD)

> **The prompt:** "Design a parking lot with several floors and spots of
> different sizes. Vehicles get a ticket on entry, pay on exit. Show free
> spots per floor."
>
> A classic object-design question. In a frontend round, the twist is
> keeping the **domain model free of React**, and then wiring a UI to it.
> The marks are for the entities, the spot-picking rule, the edge cases, and
> where you'd let the design change later.

Runnable demo: [`index.tsx`](./index.tsx) · model (no React):
[`parkingLot.ts`](./parkingLot.ts) · UI: [`ParkingLotView.tsx`](./ParkingLotView.tsx)

---

## 1. Clarify before you design

| Question | Why it changes the design |
| --- | --- |
| Which vehicle types and spot sizes? | The "fits" table (section 3). |
| Can a small vehicle use a bigger spot? | Usually yes — then you need a rule for which spot to pick. |
| How is parking priced? Per started hour? Minimum charge? Different per type? | A separate pricing function (section 4). |
| Several entry and exit gates at once? | Two gates can grab the same spot — concurrency (section 6). |
| Electric-vehicle spots, disabled spots, reservations? | Extra spot types or attributes; good follow-ups, out of scope at first. |
| Is this the frontend for a real backend? | Then the model lives on the server and the UI only shows it (section 6). |

Agreed scope: 3 floors; small / medium / large spots; motorcycle, car, truck;
ticket on entry; pay per started hour on exit; free-spot counts per floor.

---

## 2. Entities

| Entity | Holds | Why it's separate |
| --- | --- | --- |
| `Spot` | id (`F2-M03`), floor, size, `ticketId \| null` | A spot only knows whether it's taken. |
| `Ticket` | id, plate, vehicle type, spot id, entry time | The record of one stay. The plate is the customer's key; the ticket id is the system's. |
| `Receipt` | ticket, exit time, hours, amount | Produced once, on exit. |
| `ParkingLot` | spots, live tickets, plate → ticket index | The one object that changes things. Every rule lives here. |

**No `Floor` or `Vehicle` class.** A floor is just a number on each spot; a
vehicle is a plate and a type on the ticket. Classes for them would hold no
behaviour. Add them when they get some (a floor with its own gate, a vehicle
with a membership). Saying this out loud is a senior signal: you can defend
what you *didn't* model.

**Indexes for the common lookups.** `tickets` by id (exit), `plateToTicket`
(is this car already inside?). Both updated together in `park` and `unpark`
— the only two methods that change anything.

---

## 3. Picking a spot: best fit, then nearest floor

```ts
const FITS = {
  motorcycle: ["small", "medium", "large"],   // smallest first
  car:        ["medium", "large"],
  truck:      ["large"],
};
```

For each size in order, take the first free spot (spots are stored floor by
floor, so "first" = lowest floor). Result: a motorcycle takes a small spot on
floor 2 before a large spot on floor 1.

Why best fit first: large spots are the scarce ones, and only trucks *need*
them. Fill them with motorcycles and the lot turns trucks away while it's
half empty.

Analogy: a restaurant seating a couple at a table for two, not at the
ten-seat table, even if the big table is nearer the door.

Checked in Node: bikes → `F1-S01`, then `F2-S01`; car → `F1-M01`; with
mediums gone, the next car takes a large spot; then `LOT_FULL`.

The scan is linear, marked with a `ponytail:` comment. For thousands of spots,
keep a priority queue (min-heap by floor) of free spots per size: O(log n)
park and unpark.

---

## 4. Pricing, kept apart

```ts
hours  = max(1, ceil((exit - entry) / 1 hour))
amount = hours × HOURLY_RATE[type]
```

- **Every started hour is charged**, with a minimum of one: 1h and 1ms is 2
  hours; 5 minutes is 1 hour (both checked).
- **`priceFor` is a separate function**, not a method buried in `unpark`.
  Pricing is the part that changes most — weekend rates, first 15 minutes
  free, monthly passes. Swapping one function (a "strategy") changes pricing
  without touching parking.
- **Time is passed in** (`now = Date.now()` as a default argument). The model
  never reads the clock on its own, so tests — and the demo's "+1 hour"
  button — can control time. Same idea as the stopwatch's pure reducer.

---

## 5. Edge cases the model refuses

| Case | Result |
| --- | --- |
| Same plate enters twice | `ALREADY_PARKED` — plates are trimmed and upper-cased first, so `ka01 ab 1` = `KA01 AB 1`. |
| No spot that fits | `LOT_FULL` (the UI says which type), even if smaller spots are free. |
| Paying a ticket twice / an unknown ticket | `null` — the ticket is deleted on exit. |
| Clock jumps back (exit "before" entry) | `max(1, …)` still charges the minimum. |

Results are **returned**, not thrown: a full lot is a normal outcome, not a
crash. `ParkResult` is a discriminated union, so the UI must check `ok`
before it can read `ticket`.

---

## 6. Wiring React to it — and where it really lives

The model is a plain class with `subscribe` and a version number. The UI uses
`useSyncExternalStore(lot.subscribe, lot.getVersion)`, so any change in the
lot re-renders the view — the same pattern as the
[FormLibrary](../FormLibrary/FormLibrary.md) store. Nothing in `parkingLot.ts`
imports React, so it was checked in Node directly.

In a real system, **this model lives on the server**, and the frontend shows
it:

- **Two gates, one spot.** Two cars entering at the same moment must not get
  the same spot. On one server process, the code above is safe (JavaScript
  runs one thing at a time). With a database, make "take a free spot"
  atomic: `UPDATE spots SET ticket_id = ? WHERE id = (SELECT … FOR UPDATE SKIP
  LOCKED)`, or a unique constraint on taken spots.
- **The display boards** get availability pushed (WebSocket / SSE) instead of
  every board polling.
- **The UI never decides a spot** — it asks, and shows what the server
  answered. Optimistic UI is wrong here: telling a driver "F1-M01" and then
  taking it back is worse than a half-second wait.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Add EV spots with chargers." | A `features: Set<"ev">` on spots; an EV request filters for it first, then falls back to normal spots if allowed. |
| "Reservations." | A spot state `reserved` with an expiry; `park` with a reservation id takes that spot. Expire with a timer or on read. |
| "Nearest spot to the entrance, not lowest floor." | Give spots a distance; the per-size heap orders by distance instead of floor. |
| "Different pricing on weekends." | Another `priceFor` — that's why it's separate. Split the stay into chunks if a stay crosses a rate change. |
| "Lost ticket." | Look up by plate (`plateToTicket` already exists), charge the stay plus a fee. |
| "Show a live display board per floor." | `availability()` per floor, pushed to boards on every change. |

---

## 8. Scoring notes

- **Mid:** a class per noun (Lot, Floor, Spot, Vehicle, Car, Truck…) with
  inheritance, first-free spot, price computed inline; few edge cases.
- **Senior:** a small set of entities with reasons for what isn't modelled,
  best-fit spot choice with the "why", pricing as a swappable function with
  time passed in, duplicate / full / double-pay cases returned as typed
  results, a React-free model the UI subscribes to, and a clear story for
  concurrency when it moves to a server.
