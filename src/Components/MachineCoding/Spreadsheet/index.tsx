import { Spreadsheet } from "./Spreadsheet";
import "../../Hooks/hook-demo.css";

export const SpreadsheetDemo = () => (
  <section>
    <h2>Spreadsheet-style editable grid</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/Spreadsheet/Spreadsheet.md</code>. Roving
      tabindex, a navigate mode and an edit mode, and copy/paste that works with Excel.
    </p>
    <div className="demo-card">
      <h4>Edit the grid</h4>
      <p>
        Click a cell or Tab in, then: arrows / Home / End / Ctrl+Home to move; type to replace;
        Enter or F2 to edit; Enter saves and moves down, Tab saves and moves right, Escape
        cancels; Delete clears. Copy a block from a spreadsheet and paste it here.
      </p>
      <Spreadsheet />
    </div>
  </section>
);
