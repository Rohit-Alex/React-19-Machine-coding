import { ParkingLotView } from "./ParkingLotView";
import "../../Hooks/hook-demo.css";

export const ParkingLotDemo = () => (
  <section>
    <h2>Multi-floor parking lot (LLD)</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/ParkingLot/ParkingLot.md</code>. The model is a
      plain class with no React; the UI subscribes to it with <code>useSyncExternalStore</code>.
    </p>
    <div className="demo-card">
      <h4>Three floors, three spot sizes</h4>
      <p>
        Park a few vehicles — motorcycles take small spots first so large ones stay free for
        trucks. Use the demo clock to add hours, then exit to see the bill.
      </p>
      <ParkingLotView />
    </div>
  </section>
);
