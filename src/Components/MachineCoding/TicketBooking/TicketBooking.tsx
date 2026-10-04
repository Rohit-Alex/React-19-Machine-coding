import { useCallback, useEffect, useRef, useState } from "react";
import { useCountdown } from "../CountdownTimer/useCountdown";
import {
  SEATS,
  confirmBooking,
  fetchSeatMap,
  holdSeats,
  releaseHold,
  simulateOtherBuyer,
  type Seat,
  type SeatStatus,
} from "./bookingApi";

const MAX_SEATS = 6;
const ROWS = [...new Set(SEATS.map((s) => s.row))];

type Phase =
  | { name: "select" }
  | { name: "holding" }
  | { name: "checkout"; holdId: string; expiresAt: number }
  | { name: "paying"; holdId: string; expiresAt: number }
  | { name: "done"; bookingId: string };

export const TicketBooking = () => {
  const [seatMap, setSeatMap] = useState<Record<string, SeatStatus> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: "select" });
  const [message, setMessage] = useState("");
  const [failPayment, setFailPayment] = useState(false);

  const holdId = "holdId" in phase ? phase.holdId : null;
  const expiresAt = "expiresAt" in phase ? phase.expiresAt : null;
  // Reused from the CountdownTimer build: counts down to a wall-clock time.
  const { mins, secs, isDone } = useCountdown(expiresAt);

  const refresh = useCallback(async () => {
    const map = await fetchSeatMap();
    setSeatMap(map);
    // Seats someone else took while we were looking drop out of our pick.
    setSelected((prev) => prev.filter((id) => map[id] === "available"));
  }, []);

  // While choosing, re-check the map every 5s. The map you loaded is already
  // out of date on a busy show; the hold is what really decides.
  useEffect(() => {
    if (phase.name !== "select") return;
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [phase.name, refresh]);

  // Hold ran out on the checkout page: the seats are gone back to everyone.
  useEffect(() => {
    if (!isDone || !holdId) return;
    releaseHold(holdId);
    setMessage("Your hold expired, so the seats were released. Please pick again.");
    setPhase({ name: "select" });
  }, [isDone, holdId]);

  // Leaving the page mid-checkout: give the seats back now instead of making
  // others wait for the timeout. (A real app would also use sendBeacon on unload.)
  const holdRef = useRef(holdId);
  useEffect(() => {
    holdRef.current = holdId;
  }, [holdId]);
  useEffect(() => () => void (holdRef.current && releaseHold(holdRef.current)), []);

  const toggleSeat = (id: string) => {
    // Decide outside the state updater: updaters must be pure, so no
    // setMessage inside one.
    if (selected.includes(id)) {
      setMessage("");
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length >= MAX_SEATS) {
      setMessage(`You can book up to ${MAX_SEATS} seats.`);
    } else {
      setMessage("");
      setSelected([...selected, id]);
    }
  };

  const onHold = async () => {
    setPhase({ name: "holding" });
    const result = await holdSeats(selected);
    if (!result.ok) {
      setMessage(`Sorry — ${result.unavailable.join(", ")} ${result.unavailable.length === 1 ? "was" : "were"} just taken. Pick again.`);
      setPhase({ name: "select" }); // Refreshes the map, which drops the taken seats.
      return;
    }
    setPhase({ name: "checkout", holdId: result.holdId, expiresAt: result.expiresAt });
  };

  const onPay = async () => {
    if (phase.name !== "checkout") return; // Double click on Pay does nothing.
    setPhase({ ...phase, name: "paying" });
    const result = await confirmBooking(phase.holdId, failPayment);
    if (result.ok) {
      setPhase({ name: "done", bookingId: result.bookingId });
    } else if (result.reason === "PAYMENT_FAILED") {
      setMessage("Payment failed. Your seats are still held — try again.");
      setPhase({ ...phase, name: "checkout" });
    } else {
      setMessage("Your hold expired before payment finished. Please pick again.");
      setPhase({ name: "select" });
    }
  };

  const seats = selected.map((id) => SEATS.find((s) => s.id === id)!);
  const total = seats.reduce((sum, s) => sum + s.price, 0);

  if (phase.name === "done") {
    return (
      <div role="status">
        <p>
          🎟️ Booked <strong>{selected.join(", ")}</strong> — booking <code>{phase.bookingId}</code>, ₹{total}.
        </p>
        <button
          onClick={() => {
            setSelected([]);
            setMessage("");
            setPhase({ name: "select" });
          }}
        >
          Book more
        </button>
      </div>
    );
  }

  if (phase.name === "checkout" || phase.name === "paying") {
    return (
      <div>
        <p role="timer" aria-live="off" style={{ fontVariantNumeric: "tabular-nums", fontSize: 20 }}>
          Seats held for{" "}
          <strong style={{ color: mins === 0 && secs <= 30 ? "#c4321c" : undefined }}>
            {mins}:{String(secs).padStart(2, "0")}
          </strong>
        </p>
        <p>
          {seats.map((s) => `${s.id} (₹${s.price})`).join(", ")} — <strong>₹{total}</strong>
        </p>
        <label style={{ display: "block", marginBottom: 8 }}>
          <input type="checkbox" checked={failPayment} onChange={(e) => setFailPayment(e.target.checked)} /> Make the
          payment fail (demo)
        </label>
        <div className="demo-actions">
          <button onClick={onPay} disabled={phase.name === "paying"}>
            {phase.name === "paying" ? "Paying…" : `Pay ₹${total}`}
          </button>
          <button
            onClick={() => {
              releaseHold(phase.holdId);
              setPhase({ name: "select" });
            }}
            disabled={phase.name === "paying"}
          >
            Change seats
          </button>
        </div>
        <p role="alert">{message}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 12, letterSpacing: 4, border: "1px solid var(--border)", borderRadius: 4, marginBottom: 12, maxWidth: 520 }}>
        SCREEN
      </div>
      {!seatMap ? (
        <p>Loading seats…</p>
      ) : (
        <div role="group" aria-label="Seat map" style={{ display: "grid", gap: 4 }}>
          {ROWS.map((row) => (
            <div key={row} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span aria-hidden="true" style={{ width: 16, fontSize: 12 }}>
                {row}
              </span>
              {SEATS.filter((s) => s.row === row).map((seat) => (
                <SeatButton
                  key={seat.id}
                  seat={seat}
                  status={seatMap[seat.id]}
                  isSelected={selected.includes(seat.id)}
                  onToggle={toggleSeat}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12 }}>
        <Swatch color="transparent" /> Available (₹250, rows G–H ₹450) <Swatch color="#3b6fd4" /> Selected{" "}
        <Swatch color="#999" /> Taken
      </p>
      <p role="alert">{message}</p>
      <p aria-live="polite">
        {selected.length ? `${selected.length} seat${selected.length > 1 ? "s" : ""}: ${selected.join(", ")} — ₹${total}` : "No seats selected"}
      </p>
      <div className="demo-actions">
        <button onClick={onHold} disabled={!selected.length || phase.name === "holding"}>
          {phase.name === "holding" ? "Holding…" : "Continue to pay"}
        </button>
        <button onClick={() => selected[0] && simulateOtherBuyer(selected[0])} disabled={!selected.length}>
          Demo: someone else buys {selected[0] ?? "a seat"}
        </button>
      </div>
    </div>
  );
};

const SeatButton = ({
  seat,
  status,
  isSelected,
  onToggle,
}: {
  seat: Seat;
  status: SeatStatus;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) => {
  const isTaken = status !== "available";
  return (
    <button
      type="button"
      onClick={() => onToggle(seat.id)}
      disabled={isTaken}
      aria-pressed={isSelected}
      aria-label={`${seat.id}, ${seat.tier}, ₹${seat.price}${isTaken ? ", taken" : ""}`}
      style={{
        width: 30,
        height: 26,
        padding: 0,
        fontSize: 10,
        borderRadius: "6px 6px 2px 2px",
        border: `1px solid ${seat.tier === "premium" ? "#e8a317" : "var(--border)"}`,
        background: isSelected ? "#3b6fd4" : isTaken ? "#999" : "transparent",
        color: isSelected ? "#fff" : "inherit",
        cursor: isTaken ? "not-allowed" : "pointer",
        // A gap down the middle, like an aisle.
        marginLeft: seat.number === 7 ? 16 : 0,
      }}
    >
      {seat.number}
    </button>
  );
};

const Swatch = ({ color }: { color: string }) => (
  <span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, border: "1px solid var(--border)", background: color, marginLeft: 8 }} />
);
