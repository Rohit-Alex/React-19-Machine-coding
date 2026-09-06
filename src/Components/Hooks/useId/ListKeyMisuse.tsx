import { useId, useState } from "react";

type Todo = { id: string; text: string };

const initial: Todo[] = [
  { id: "todo-a", text: "Buy milk" },
  { id: "todo-b", text: "Walk dog" },
  { id: "todo-c", text: "Ship PR" },
];

function shuffle(list: Todo[]) {
  return [...list].sort(() => Math.random() - 0.5);
}

/**
 * Each row owns local state (the input's current text) that's tied to
 * whichever key React mounted it under — that's what makes a bad key
 * visible: shuffle the array and see whether the text follows its todo
 * or stays behind on the row.
 */
function Row({ text }: { text: string }) {
  const [value, setValue] = useState(text);
  return (
    <li>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <span style={{ marginLeft: 8, opacity: 0.6, fontSize: 12 }}>
        (original: {text})
      </span>
    </li>
  );
}

/**
 * Scenario 2: useId() cannot be called once per array item — Hooks can't
 * run inside a loop — so the realistic misuse is calling it once for the
 * whole list and appending the index. That's functionally identical to
 * key={index}: it's stable across re-renders but not tied to the data, so
 * reordering the array silently reassigns rows to the wrong DOM node.
 */
export const ListKeyMisuse = () => {
  const [todos, setTodos] = useState(initial);
  const listId = useId();

  return (
    <div className="demo-card">
      <h4>2. Why useId() isn't a substitute for a data-derived key</h4>
      <p>
        Type something in each input on both lists, then hit shuffle.
        The left list keys by <code>item.id</code> from the data — text
        stays attached to its todo. The right list keys by{" "}
        <code>{"listId + index"}</code> — a common "I'll just use useId for
        my key" mistake. Because that key only reflects position, not
        identity, React reuses each DOM row for whatever todo now sits at
        that index, and the text stays behind on the row.
      </p>
      <div className="demo-actions">
        <button onClick={() => setTodos(shuffle)}>shuffle</button>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        <div>
          <strong>key={"{item.id}"} (correct)</strong>
          <ul>
            {todos.map((todo) => (
              <Row key={todo.id} text={todo.text} />
            ))}
          </ul>
        </div>
        <div>
          <strong>key={"{listId + index}"} (misuse)</strong>
          <ul>
            {todos.map((todo, index) => (
              <Row key={`${listId}-${index}`} text={todo.text} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
