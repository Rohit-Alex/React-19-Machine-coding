import { TodoUndoRedo } from "./TodoUndoRedo";
import "../../Hooks/hook-demo.css";

export const TodoUndoRedoDemo = () => (
  <section>
    <h2>Todo with undo / redo</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/TodoUndoRedo/TodoUndoRedo.md</code>. Every change
      is a command with an exact opposite; undo runs the opposite.
    </p>
    <div className="demo-card">
      <h4>Todos</h4>
      <p>
        Add, tick, rename (double-click or Edit), delete, clear completed — then undo it all.
        Ctrl/⌘+Z and Shift+Ctrl/⌘+Z work when focus is in this box but not in a text field.
      </p>
      <TodoUndoRedo />
    </div>
  </section>
);
