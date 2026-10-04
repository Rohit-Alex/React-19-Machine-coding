import { useState, useSyncExternalStore, type FormEvent } from "react";
import { HOURLY_RATE, ParkingLot, type Receipt, type VehicleType } from "./parkingLot";

const ICON: Record<VehicleType, string> = { motorcycle: "🏍️", car: "🚗", truck: "🚚" };
const HOUR = 60 * 60 * 1000;

export const ParkingLotView = () => {
  // One lot per mounted demo. Lazy init so it's built once, not every render.
  const [lot] = useState(
    () =>
      new ParkingLot([
        { small: 4, medium: 6, large: 2 },
        { small: 2, medium: 6, large: 2 },
        { small: 0, medium: 4, large: 1 },
      ]),
  );
  // The model isn't React state, so subscribe to it. Re-renders on every change.
  useSyncExternalStore(lot.subscribe, lot.getVersion);

  const [plate, setPlate] = useState("");
  const [type, setType] = useState<VehicleType>("car");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  // Demo clock: lets you "wait" hours without waiting.
  const [offset, setOffset] = useState(0);
  const now = () => Date.now() + offset;

  const onPark = (event: FormEvent) => {
    event.preventDefault();
    if (!plate.trim()) return setMessage("Enter a number plate.");
    const result = lot.park(plate, type, now());
    if (!result.ok) {
      setMessage(result.reason === "LOT_FULL" ? `No free spot for a ${type}.` : `${plate.toUpperCase()} is already parked.`);
      return;
    }
    setMessage(`Ticket ${result.ticket.id}: ${result.ticket.plate} → spot ${result.ticket.spotId}`);
    setPlate("");
  };

  const tickets = lot.getTickets();
  const ticketBySpot = new Map(tickets.map((t) => [t.spotId, t]));
  const floors = [...new Set(lot.getSpots().map((s) => s.floor))];

  return (
    <div>
      <form onSubmit={onPark} className="demo-actions">
        <input aria-label="Number plate" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="KA01 AB 1234" />
        <select aria-label="Vehicle type" value={type} onChange={(e) => setType(e.target.value as VehicleType)}>
          {(Object.keys(HOURLY_RATE) as VehicleType[]).map((t) => (
            <option key={t} value={t}>
              {ICON[t]} {t} — ₹{HOURLY_RATE[t]}/h ({lot.freeFor(t)} free)
            </option>
          ))}
        </select>
        <button type="submit">Park</button>
        <button type="button" onClick={() => setOffset((o) => o + HOUR)}>
          ⏩ +1 hour (demo clock)
        </button>
      </form>
      <p role="status">{message}</p>

      {floors.map((floor) => {
        const spots = lot.getSpots().filter((s) => s.floor === floor);
        const free = lot.availability().get(floor)!;
        return (
          <div key={floor} style={{ marginBottom: 12 }}>
            <strong>Floor {floor}</strong>{" "}
            <small>
              free — S {free.small} · M {free.medium} · L {free.large}
            </small>
            <ul style={{ display: "flex", flexWrap: "wrap", gap: 4, listStyle: "none", padding: 0, margin: "4px 0" }}>
              {spots.map((spot) => {
                const ticket = ticketBySpot.get(spot.id);
                return (
                  <li
                    key={spot.id}
                    title={ticket ? `${ticket.plate} (${ticket.id})` : "Free"}
                    style={{
                      width: spot.size === "small" ? 44 : spot.size === "medium" ? 60 : 84,
                      padding: "4px 2px",
                      textAlign: "center",
                      fontSize: 11,
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      background: ticket ? "rgb(196 50 28 / 0.15)" : "rgb(47 125 31 / 0.12)",
                    }}
                  >
                    {spot.id.split("-")[1]}
                    <div aria-label={ticket ? `taken by ${ticket.plate}` : "free"}>{ticket ? ICON[ticket.vehicleType] : "·"}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <h5 style={{ margin: "8px 0 4px" }}>Parked ({tickets.length})</h5>
      {tickets.length === 0 && <p>Nobody is parked.</p>}
      <ul style={{ paddingLeft: 18 }}>
        {tickets.map((t) => (
          <li key={t.id}>
            {t.id} · {t.plate} · {t.spotId} · {Math.max(1, Math.ceil((now() - t.entryAt) / HOUR))}h so far{" "}
            <button onClick={() => setReceipt(lot.unpark(t.id, now()))}>Exit &amp; pay</button>
          </li>
        ))}
      </ul>

      {receipt && (
        <p role="status" style={{ padding: 8, border: "1px dashed var(--border)" }}>
          🧾 {receipt.ticket.plate} left spot {receipt.ticket.spotId}. {receipt.hours}h × ₹
          {HOURLY_RATE[receipt.ticket.vehicleType]} = <strong>₹{receipt.amount}</strong>
        </p>
      )}
    </div>
  );
};
