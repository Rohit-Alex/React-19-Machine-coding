import { useState } from "react";
import type { Todo, TodoAction } from "./todoServer";

export const TodoList = ({
  todos,
  pendingIds,
  onAction,
}: {
  todos: Todo[];
  pendingIds: string[];
  onAction: (action: TodoAction) => void;
}) => {
  const [text, setText] = useState("");
  return (
    <>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map((todo) => {
          const isPending = pendingIds.includes(todo.id);
          return (
            // Dimmed while saving: optimistic doesn't mean pretending it's certain.
            <li key={todo.id} style={{ display: "flex", gap: 8, alignItems: "center", opacity: isPending ? 0.6 : 1 }}>
              <label style={{ flex: 1 }}>
                <input type="checkbox" checked={todo.done} onChange={() => onAction({ type: "setDone", id: todo.id, done: !todo.done })} />{" "}
                {todo.text}
                {isPending && <small> · saving…</small>}
              </label>
              <button onClick={() => onAction({ type: "remove", id: todo.id })} aria-label={`Delete ${todo.text}`}>
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      <form
        className="demo-actions"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          onAction({ type: "add", todo: { id: crypto.randomUUID(), text: text.trim(), done: false } });
          setText("");
        }}
      >
        <input aria-label="New task" value={text} onChange={(e) => setText(e.target.value)} placeholder='Add a task ("fail" fails)' />
        <button type="submit">Add</button>
      </form>
    </>
  );
};
