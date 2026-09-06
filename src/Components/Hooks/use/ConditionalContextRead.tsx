import { createContext, use, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<Theme>("light");

function Button({ show }: { show: boolean }) {
  if (show) {
    const theme = use(ThemeContext);
    return <button>Themed button ({theme})</button>;
  }
  return null;
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = use(ThemeContext);
  return (
    <div
      style={{
        border: `1px solid ${theme === "dark" ? "#666" : "#ccc"}`,
        background: theme === "dark" ? "#222" : "#fff",
        color: theme === "dark" ? "#eee" : "#111",
        padding: 8,
      }}
    >
      <strong>{title}</strong>
      {children}
    </div>
  );
}

function Form() {
  const [showButton, setShowButton] = useState(true);
  return (
    <Panel title="Sign up">
      <p>
        <label>
          <input
            type="checkbox"
            checked={showButton}
            onChange={(e) => setShowButton(e.target.checked)}
          />{" "}
          Show button
        </label>
      </p>
      <Button show={showButton} />
    </Panel>
  );
}

export const ConditionalContextRead = () => {
  const [theme, setTheme] = useState<Theme>("dark");

  return (
    <div>
      <h3>Reading Context conditionally</h3>
      <p>
        Unlike other Hooks, <code>use</code> can be called inside conditions
        and loops. <code>Button</code> only calls{" "}
        <code>use(ThemeContext)</code> when <code>show</code> is true —
        uncheck "Show button" and it unmounts without calling{" "}
        <code>use</code> at all. <code>Panel</code> still calls it
        unconditionally at its top level, which remains the default
        recommendation.
      </p>
      <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
        Toggle theme (currently {theme})
      </button>
      <ThemeContext value={theme}>
        <Form />
      </ThemeContext>
    </div>
  );
};
