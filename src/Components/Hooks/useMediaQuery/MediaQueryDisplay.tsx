import { useMediaQuery } from "./useMediaQuery";

const queries = [
  "(max-width: 600px)",
  "(prefers-color-scheme: dark)",
  "(prefers-reduced-motion: reduce)",
  "(pointer: coarse)",
];

const QueryRow = ({ query }: { query: string }) => {
  const matches = useMediaQuery(query);
  return (
    <li>
      <code>{query}</code>: <strong>{matches ? "matches" : "no match"}</strong>
    </li>
  );
};

export const MediaQueryDisplay = () => {
  const isNarrow = useMediaQuery("(max-width: 600px)");

  return (
    <div className="demo-card">
      <h4>Live media queries</h4>
      <p>
        Resize the window past 600px, switch your OS to dark mode, or toggle
        "reduce motion" in accessibility settings. Each row updates on its own.
      </p>
      <ul>
        {queries.map((q) => (
          <QueryRow key={q} query={q} />
        ))}
      </ul>
      <p>
        Rendering a different component, not just a different style:{" "}
        <strong>{isNarrow ? "📱 compact menu" : "🖥️ full sidebar"}</strong>
      </p>
    </div>
  );
};
