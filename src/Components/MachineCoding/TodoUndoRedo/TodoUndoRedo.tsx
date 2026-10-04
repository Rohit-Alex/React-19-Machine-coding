import { useReducer, useRef, useState, type KeyboardEvent } from "react";
import { historyReducer, type Command, type Todo } from "./commands";

const INITIAL: Todo[] = [
  { id: "1", text: "Buy milk", done: false },
  { id: "2", text: "Book flights", done: true },
  { id: "3", text: "Call the bank", done: false },
];

export const TodoUndoRedo = () => {
  const [{ todos, past, future }, dispatch] = useReducer(historyReducer, { todos: INITIAL, past: [], future: [] });
  const [newText, setNewText] = useState("");

  const run = (label: string, command: Command) => dispatch({ type: "run", label, command });
  const completed = todos.filter((t) => t.done);

  // Scoped to this component, not window: Ctrl+Z elsewhere on the page isn't ours.
  // Inside a text field, leave it alone — the browser's own text undo is
  // what the user wants there.
  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "text") return;
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) dispatch({ type: "undo" });
    else if ((key === "z" && event.shiftKey) || key === "y") dispatch({ type: "redo" });
    else return;
    event.preventDefault();
  };

  return (
    <div onKeyDown={onKeyDown}>
      <form
        className="demo-actions"
        onSubmit={(event) => {
          event.preventDefault();
          const text = newText.trim();
          if (!text) return;
          // The id is made here, not in the reducer: reducers must be pure,
          // and redo must re-insert the *same* todo, not a new id.
          run(`Add “${text}”`, { type: "insert", todo: { id: crypto.randomUUID(), text, done: false }, index: todos.length });
          setNewText("");
        }}
      >
        <input aria-label="New todo" value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="What needs doing?" />
        <button type="submit">Add</button>
      </form>

      <div className="demo-actions">
        <button onClick={() => dispatch({ type: "undo" })} disabled={!past.length} title={past.at(-1)?.label}>
          ↶ Undo{past.length ? `: ${past.at(-1)!.label}` : ""}
        </button>
        <button onClick={() => dispatch({ type: "redo" })} disabled={!future.length} title={future.at(-1)?.label}>
          ↷ Redo{future.length ? `: ${future.at(-1)!.label}` : ""}
        </button>
        <button
          disabled={!completed.length}
          onClick={() =>
            // One batch = one undo step, however many it removes.
            run(`Clear ${completed.length} completed`, {
              type: "batch",
              commands: completed.map((t) => ({ type: "remove", id: t.id })),
            })
          }
        >
          Clear completed
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map((todo) => (
          <TodoRow key={todo.id} todo={todo} run={run} />
        ))}
      </ul>
      {todos.length === 0 && <p>Nothing left. Try Undo.</p>}
      <p aria-live="polite" className="visually-hidden">
        {past.at(-1)?.label}
      </p>
    </div>
  );
};

const TodoRow = ({ todo, run }: { todo: Todo; run: (label: string, command: Command) => void }) => {
  // The draft is local while editing. Only the finished rename becomes a
  // command, so undo reverts the whole edit — not one letter at a time.
  const [draft, setDraft] = useState<string | null>(null);
  // Removing a focused input can fire blur in some browsers. All commits go
  // through blur, and Escape sets this so its blur doesn't save.
  const cancelled = useRef(false);

  const startEdit = () => {
    cancelled.current = false;
    setDraft(todo.text);
  };

  const commit = () => {
    const text = draft?.trim();
    setDraft(null);
    if (cancelled.current) return;
    if (text && text !== todo.text) run(`Rename to “${text}”`, { type: "rename", id: todo.id, text });
  };

  return (
    <li style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => run(`${todo.done ? "Untick" : "Tick"} “${todo.text}”`, { type: "toggle", id: todo.id })}
        aria-label={`Done: ${todo.text}`}
      />
      {draft === null ? (
        <span onDoubleClick={startEdit} style={{ flex: 1, textDecoration: todo.done ? "line-through" : undefined }}>
          {todo.text}
        </span>
      ) : (
        <input
          autoFocus
          aria-label={`Rename ${todo.text}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur(); // Saves via onBlur.
            if (e.key === "Escape") {
              cancelled.current = true;
              setDraft(null);
            }
          }}
          style={{ flex: 1 }}
        />
      )}
      <button onClick={startEdit} aria-label={`Edit ${todo.text}`} hidden={draft !== null}>
        Edit
      </button>
      <button onClick={() => run(`Delete “${todo.text}”`, { type: "remove", id: todo.id })} aria-label={`Delete ${todo.text}`}>
        Delete
      </button>
    </li>
  );
};
