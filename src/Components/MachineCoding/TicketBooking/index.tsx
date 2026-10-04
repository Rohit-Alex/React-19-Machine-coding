import { TicketBooking } from "./TicketBooking";
import "../../Hooks/hook-demo.css";

export const TicketBookingDemo = () => (
  <section>
    <h2>Ticket booking system</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/TicketBooking/TicketBooking.md</code>. Pick seats,
      hold them for 2 minutes, pay. The server decides who gets a seat, not the seat map.
    </p>
    <div className="demo-card">
      <h4>Book seats</h4>
      <p>
        Try: pick seats, press "someone else buys", then continue — the hold fails and you're asked
        to pick again. At checkout, make the payment fail once and retry.
      </p>
      <TicketBooking />
    </div>
  </section>
);
