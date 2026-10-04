import { GroupedAutocomplete } from "./GroupedAutocomplete";
import "../../Hooks/hook-demo.css";

export const GroupedAutocompleteDemo = () => (
  <section>
    <h2>Autocomplete with grouped options</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/GroupedAutocomplete/GroupedAutocomplete.md</code>.
      Groups are only for drawing; the keyboard walks one flat list.
    </p>
    <div className="demo-card">
      <h4>Grouped by category</h4>
      <p>
        Arrow keys move straight across group boundaries and skip the headers. Type "state" or
        "test" to match a whole group.
      </p>
      <GroupedAutocomplete />
    </div>
  </section>
);
