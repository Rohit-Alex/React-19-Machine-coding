import { MultiSelect } from "./MultiSelect";
import "../../Hooks/hook-demo.css";

export const MultiSelectDemo = () => (
  <section>
    <h2>Multi-select dropdown</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/MultiSelect/MultiSelect.md</code>. Reuses the
      Typeahead's <code>useCombobox</code> hook, with the list kept open after each pick.
    </p>
    <div className="demo-card">
      <h4>Pick your stack</h4>
      <p>
        Type to filter, arrows to move, Enter to tick or untick (the list stays open), Backspace on
        an empty box removes the last chip, Escape closes.
      </p>
      <MultiSelect />
    </div>
  </section>
);
