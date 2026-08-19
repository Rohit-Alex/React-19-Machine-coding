import { createContext, useContext, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<Theme>("light");

/**
 * Scenario 1: no prop drilling — Toolbar/Panel pass nothing theme-related.
 * Panel wraps its subtree in a second, overriding provider: the closest
 * provider above a consumer always wins, so only buttons inside Panel flip.
 */
export const ThemeDrilling = () => {
  const [theme, setTheme] = useState<Theme>("light");

  return (
    <div className="demo-card">
      <h4>1. Passing data deeply + closest-provider-wins override</h4>
      <p>
        Toggle the root theme — every <code>ThemedButton</code> updates
        except the one inside <code>Panel</code>, which sits under its own
        nested <code>dark</code> override and ignores the root value
        entirely.
      </p>
      <div className="demo-actions">
        <button
          onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        >
          toggle root theme (currently {theme})
        </button>
      </div>
      <ThemeContext value={theme}>
        <Toolbar />
      </ThemeContext>
    </div>
  );
};

const Toolbar = () => (
  <div className="demo-actions">
    <ThemedButton label="root theme" />
    <ThemeContext value="dark">
      <Panel />
    </ThemeContext>
  </div>
);

const Panel = () => <ThemedButton label="Panel (forced dark)" />;

const ThemedButton = ({ label }: { label: string }) => {
  const theme = useContext(ThemeContext);
  return (
    <button
      style={{
        background: theme === "dark" ? "#222" : "#eee",
        color: theme === "dark" ? "#eee" : "#222",
      }}
    >
      {label}: {theme}
    </button>
  );
};
