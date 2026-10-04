# Ticket booking system (seat selection, holds, checkout)

> **The prompt:** "Build the seat-booking flow for a cinema / concert (like
> BookMyShow or Ticketmaster): show a seat map, let users pick seats, and
> book them."
>
> The seat map is a grid of buttons. The real question is **two people
> wanting the same seat**. The screen you're looking at is already out of
> date, so what stops a double booking, and what does the user see when they
> lose the race?

Runnable demo: [`index.tsx`](./index.tsx) · flow:
[`TicketBooking.tsx`](./TicketBooking.tsx) · fake server rules:
[`bookingApi.ts`](./bookingApi.ts)

The full system design (queues for on-sale spikes, inventory service,
payments) belongs in the HLD pass. This is the frontend build and the
contract it needs from the backend.

---

## 1. Clarify before you design

| Question | Why it changes the design |
| --- | --- |
| Assigned seats, or general admission (just a count)? | Seat map vs a quantity picker. Holds work the same way. |
| Max seats per order? | A limit in the UI *and* on the server. |
| How long are seats held during payment? | The countdown and what happens at zero (section 4). |
| Price tiers? | Seat data carries tier and price; the total is derived. |
| A huge on-sale (thousands at once)? | A waiting room / queue before the seat map — HLD. |
| Must seats be next to each other? | "Best available" suggestion, or a warning about leaving single gaps. |

---

## 2. The seat map is a hint, not the truth

The map was correct when it loaded. By the time you click "Continue", others
may have taken seats you picked. So:

1. **Show** the map (refreshed every 5s while choosing, dropping seats from
   your pick if they've gone).
2. **Ask the server to hold** the seats. **The hold decides**, not the map.
3. If the hold fails, say which seats were taken, refresh, let them pick again.

Analogy: a restaurant's online table view. Seeing a table free doesn't make it
yours — the host's booking book does. You ask the host, and the host can say
"someone just took it".

### Server rules the UI depends on

From [`bookingApi.ts`](./bookingApi.ts), checked in Node:

| Rule | Why |
| --- | --- |
| **All-or-nothing holds** — 2 seats where 1 is taken → nothing held | A family of four doesn't want three seats. |
| **A seat is held by one person at a time** | That's the whole point: the second hold request fails. |
| **Holds expire** (2 min here); an expired hold reads as free | Abandoned checkouts can't lock seats forever. No cleanup job needed — expiry is checked on every read. |
| **Booking needs a live hold** → else `HOLD_EXPIRED` | Paying for seats someone else now holds must fail. |
| **Payment failure keeps the hold** | The user can retry within the time left. |
| **Booking is idempotent by hold id** — retrying returns the same booking | A lost response plus a retry mustn't charge twice. |

In a real database, "hold if free" must be **atomic**: `UPDATE seats SET
held_by = ?, expires = ? WHERE id IN (…) AND (held_by IS NULL OR expires <
now())`, then check that every row was updated (or a transaction with row
locks). Two separate steps — read "free", then write "held" — is the classic
race where both buyers win.

---

## 3. The flow as phases

```ts
type Phase =
  | { name: "select" }
  | { name: "holding" }
  | { name: "checkout"; holdId; expiresAt }
  | { name: "paying";   holdId; expiresAt }
  | { name: "done";     bookingId };
```

One discriminated union instead of `isHolding`, `isPaying`, `holdId`,
`bookingId` as separate state. You can't be "paying" without a hold id —
TypeScript won't allow it — and impossible mixes (done *and* paying) can't
exist. Same idea as the [Tic-tac-toe](../TicTacToe/TicTacToe.md) status union.

- **Double click on Pay** does nothing: Pay only runs in `checkout`, and the
  first click moves to `paying`.
- **"Change seats"** releases the hold straight away, so others can have them.

---

## 4. The hold countdown

- **Reuses `useCountdown`** from the [CountdownTimer](../CountdownTimer/CountdownTimer.md)
  build, counting to the server's `expiresAt`. It's a wall-clock time, so
  `Date.now()` is the right clock, and a background tab catches up on return.
- **The server's expiry wins.** The client timer is a display. If the user's
  clock is off, or the tab slept, the server still expires the hold — which
  is why `confirmBooking` can return `HOLD_EXPIRED` even with time showing.
- **At zero:** release the hold, go back to the seat map, and say why.
- **Warn near the end** (red under 30s). For screen readers, the timer isn't
  live (it would speak every second); a real app would announce once at
  1 minute left.
- **Leaving the page releases the hold** (cleanup on unmount). On tab close, a
  real app uses `navigator.sendBeacon` — but expiry covers it anyway.

---

## 5. Seat map accessibility

- **Seats are buttons with `aria-pressed`** for selected, and a full label —
  "C7, standard, ₹250" — not just "7".
- **Taken seats are `disabled`**, with "taken" in the label, and greyed out
  with a "not-allowed" cursor. Colour isn't the only signal: the legend
  explains it, and the label says it.
- **A live summary** — "3 seats: C5, C6, C7 — ₹750" — after each pick.
- **Errors in `role="alert"`**: "Sorry — D6 was just taken."
- For big venues, arrow-key movement around the map (a `role="grid"` with
  roving tabindex, as in the [Spreadsheet](../Spreadsheet/Spreadsheet.md)) beats
  tabbing through 2,000 buttons.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Live seat updates instead of polling." | WebSocket / SSE pushing seat changes for this show; apply them to the map. Still hold on the server — pushes can arrive late. |
| "50,000 seats (stadium)." | Draw on `<canvas>` or SVG by section; zoom into a section to pick seats. Load seat status per section. |
| "Huge on-sale spike." | A virtual waiting room hands out places in line before anyone sees the map; the seat service only takes as many shoppers as it can serve. HLD territory. |
| "Best available." | Server suggests the best contiguous block for N seats in a tier; the UI pre-selects it. |
| "Don't leave single empty seats." | On select, check whether a lone gap would be left in the row; warn or block. |
| "Pay with a third-party gateway (redirect)." | The hold must outlive the redirect; on return, call `confirmBooking` with the hold id — idempotent, so a refresh on the return page is safe. |

---

## 7. Scoring notes

- **Mid:** a clickable seat grid with a total, then "Book" — trusting the map;
  no answer for two buyers.
- **Senior:** treats the map as a hint and the server hold as the truth;
  all-or-nothing atomic holds with expiry; clear recovery when a hold or
  payment fails; idempotent booking; phases as a discriminated union; a
  countdown that defers to the server's expiry; holds released on leave; and
  labelled, keyboard-usable seats.
