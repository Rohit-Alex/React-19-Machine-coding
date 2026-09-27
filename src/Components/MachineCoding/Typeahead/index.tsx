import { Typeahead } from "./Typeahead";
import "../../Hooks/hook-demo.css";

export const TypeaheadDemo = () => {
  return (
    <section>
      <h2>Autocomplete / typeahead</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/Typeahead/Typeahead.md</code>
        . The data layer is the debounced search from the previous question,
        reused as-is — everything new here is the keyboard and ARIA shell
        around it.
      </p>
      <Typeahead />
    </section>
  );
};
