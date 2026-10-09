import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ConsentManager, type ConsentConfig, type ConsentStorage, type Consumer } from "./consentManager";

const STORAGE_KEY = "demo-cookie-consent";

// Demo storage: localStorage, so "Reload page" really reads the saved decision back.
// Production uses cookieStorage() from the model.
const demoStorage: ConsentStorage = {
  read: () => localStorage.getItem(STORAGE_KEY),
  write: (value) => localStorage.setItem(STORAGE_KEY, value),
};

const configFor = (version: number): ConsentConfig => ({
  version,
  expiryDays: 180,
  categories: [
    { id: "necessary", label: "Strictly necessary", description: "Login, cart, security. Always on.", required: true },
    { id: "analytics", label: "Analytics", description: "Which pages are used, so we can improve them.", cookies: ["_demo_ga"] },
    { id: "marketing", label: "Marketing", description: "Personalised offers and emails.", cookies: ["_demo_mkt"] },
    { id: "advertising", label: "Advertising", description: "Ads on other sites based on your visits.", cookies: ["_demo_ads"] },
  ],
});

/** Fake Configuration Service: 600 ms of "network", honours the abort signal like real fetch. */
const fakeConfigService =
  (version: number, fail: boolean) =>
  (signal: AbortSignal) =>
    new Promise<ConsentConfig>((resolve, reject) => {
      const timer = setTimeout(() => (fail ? reject(new Error("Config service returned 503")) : resolve(configFor(version))), 600);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(signal.reason);
      });
    });

const demoCookies = () =>
  document.cookie
    .split("; ")
    .filter((c) => c.startsWith("_demo_"))
    .join("; ") || "(none)";

export const ConsentView = () => {
  const [version, setVersion] = useState(1);
  const [fail, setFail] = useState(false);
  const [pageLoad, setPageLoad] = useState(0);
  // One SDK instance per "page load". A new instance = what a real reload gives you.
  const [manager, setManager] = useState(() => new ConsentManager({ fetchConfig: fakeConfigService(1, false), storage: demoStorage }));
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  const [log, setLog] = useState<string[]>([]);
  const [showPrefs, setShowPrefs] = useState(false);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const prefsRef = useRef<HTMLDivElement>(null);

  const reload = (nextVersion = version, nextFail = fail) => {
    // Tell the old instance's consumers nothing — the "page" is gone, like a real navigation.
    setManager(new ConsentManager({ fetchConfig: fakeConfigService(nextVersion, nextFail), storage: demoStorage }));
    setPageLoad((n) => n + 1);
    setShowPrefs(false);
  };

  // The dependent services. In a real app these are separate scripts that each call register().
  useEffect(() => {
    const write = (line: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${line}`, ...l].slice(0, 12));
    const consumers: Consumer[] = [
      {
        name: "Analytics",
        categories: ["analytics"],
        onGrant: () => {
          document.cookie = "_demo_ga=GA1.1.123; path=/";
          write("Analytics ▶ started, set _demo_ga");
        },
        onRevoke: () => write("Analytics ■ stopped"),
      },
      {
        name: "Marketing",
        categories: ["marketing"],
        onGrant: () => {
          document.cookie = "_demo_mkt=1; path=/";
          write("Marketing ▶ started, set _demo_mkt");
        },
        onRevoke: () => write("Marketing ■ stopped"),
      },
      {
        name: "Ad-Tracking",
        categories: ["marketing", "advertising"], // needs both
        onGrant: () => {
          document.cookie = "_demo_ads=1; path=/";
          write("Ad-Tracking ▶ started, set _demo_ads");
        },
        onRevoke: () => write("Ad-Tracking ■ stopped"),
      },
    ];
    // Registered BEFORE init: they wait, denied, until the user decides.
    const unregister = consumers.map((c) => manager.register(c));
    manager.init();
    return () => unregister.forEach((off) => off());
  }, [manager]);

  const openPrefs = () => {
    setDraft(state.choices);
    setShowPrefs(true);
    requestAnimationFrame(() => prefsRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus());
  };

  return (
    <div>
      <div className="demo-actions">
        <button onClick={() => reload()}>Reload page (new SDK instance)</button>
        <button
          onClick={() => {
            setVersion(version + 1);
            reload(version + 1);
          }}
        >
          Publish config v{version + 1}
        </button>
        <label>
          <input
            type="checkbox"
            checked={fail}
            onChange={(e) => {
              setFail(e.target.checked);
              reload(version, e.target.checked);
            }}
          />{" "}
          Config service down
        </label>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            reload();
          }}
        >
          Clear saved consent
        </button>
      </div>

      <p>
        Page load #{pageLoad + 1} · config v{version} · status <strong>{state.status}</strong>
        {state.error && <> · <span style={{ color: "crimson" }}>{state.error} — everything optional stays off</span></>}
      </p>
      <p>
        Granted:{" "}
        {Object.entries(state.choices)
          .filter(([, on]) => on)
          .map(([id]) => id)
          .join(", ") || "(nothing)"}
        <br />
        Demo cookies: <code>{demoCookies()}</code>
      </p>

      {state.status === "ready" && state.needsDecision && !showPrefs && (
        <div role="region" aria-label="Cookie consent" style={{ border: "2px solid #888", padding: 12, borderRadius: 8 }}>
          <p style={{ marginTop: 0 }}>We use cookies for analytics and ads. Nothing optional runs until you choose.</p>
          {/* Reject is as easy to find as Accept — regulators check this. */}
          <div className="demo-actions">
            <button onClick={() => manager.acceptAll()}>Accept all</button>
            <button onClick={() => manager.rejectAll()}>Reject all</button>
            <button onClick={openPrefs}>Customise</button>
          </div>
        </div>
      )}

      {state.status === "ready" && !state.needsDecision && !showPrefs && <button onClick={openPrefs}>Cookie settings</button>}

      {showPrefs && state.config && (
        <div ref={prefsRef} role="dialog" aria-label="Cookie preferences" style={{ border: "2px solid #888", padding: 12, borderRadius: 8 }}>
          {state.config.categories.map((c) => (
            <label key={c.id} style={{ display: "block", marginBottom: 8 }}>
              <input
                type="checkbox"
                disabled={c.required}
                checked={c.required || draft[c.id] === true}
                onChange={(e) => setDraft({ ...draft, [c.id]: e.target.checked })}
              />{" "}
              <strong>{c.label}</strong> — {c.description}
            </label>
          ))}
          <div className="demo-actions">
            <button
              onClick={() => {
                manager.save(draft);
                setShowPrefs(false);
              }}
            >
              Save choices
            </button>
            <button onClick={() => setShowPrefs(false)}>Cancel</button>
          </div>
        </div>
      )}

      <h4>Consumer events</h4>
      <ol style={{ fontFamily: "monospace", fontSize: 13 }}>
        {log.length === 0 ? <li>(no consumer has been told anything yet)</li> : log.map((line, i) => <li key={i}>{line}</li>)}
      </ol>
    </div>
  );
};
